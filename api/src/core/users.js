/**
 * The Users page: who has an account, who is waiting for approval, and which
 * websites each person may edit. Only platform admins reach it.
 *
 *   GET    /users                 every account + the websites access can be given to
 *   PUT    /users/<id>            { sites: [ids] } - approve, or change access
 *   POST   /users/<id>/disable    block sign-in (the account and its access stay)
 *   POST   /users/<id>/enable     allow sign-in again
 *   DELETE /users/<id>            remove the account (also how a request is rejected)
 *
 * Anyone may ask for an account from the sign-in page; a new account belongs
 * to no group, and signing in alone grants nothing (access.js). Approving is
 * putting the person in a site-<id> group. Platform admins are set up outside
 * the admin and cannot be changed here - not even by themselves - so the
 * platform always keeps its approver.
 *
 * `userAdmin` does the directory work: aws/users.js (Cognito) in the Lambda,
 * local/memory-users.js in local dev and tests.
 */
import { platformAdminGroup, siteGroup } from './access.js';
import { ApiError } from './engine.js';

const sitePrefix = 'site-';

/** What one account looks like on the Users page. */
export function describeAccount(account, { siteIds, me }) {
  const groups = account.groups ?? [];
  const sites = groups.filter((group) => group.startsWith(sitePrefix)).map((group) => group.slice(sitePrefix.length)).filter((id) => siteIds.has(id));
  const isPlatformAdmin = groups.includes(platformAdminGroup);
  let status;
  if (!account.enabled) status = 'disabled';
  else if (account.status === 'UNCONFIRMED') status = 'unverified';
  else if (!isPlatformAdmin && sites.length === 0) status = 'pending';
  else status = 'active';
  return {
    id: account.username,
    email: account.email ?? '',
    name: account.name ?? '',
    status,
    sites,
    isPlatformAdmin,
    isYou: Boolean(me) && (account.username === me.id || (account.email && account.email.toLowerCase() === me.email.toLowerCase())),
    createdAt: account.createdAt ?? null,
  };
}

const statusOrder = { pending: 0, unverified: 1, active: 2, disabled: 3 };

export async function handleUsers({ method, rest, body = {}, user, sites, userAdmin }) {
  if (!user?.isPlatformAdmin) throw new ApiError(403, 'Only the main admin can manage users.');
  if (!userAdmin) throw new ApiError(501, 'Managing users is not available here.');
  const poolId = user.userPoolId;
  const siteIds = new Set(sites.keys());
  const groupsToRead = [platformAdminGroup, ...[...siteIds].map(siteGroup)];
  const [id, action, extra] = rest;
  if (extra) throw new ApiError(404, 'Unknown endpoint.');

  const accounts = await userAdmin.list(poolId, groupsToRead);
  const described = accounts.map((account) => describeAccount(account, { siteIds, me: user }));

  if (!id) {
    if (method !== 'GET') throw new ApiError(405, `${method} is not allowed here.`);
    described.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || String(b.createdAt).localeCompare(String(a.createdAt)));
    return {
      users: described,
      sites: [...sites.values()].map((site) => ({ id: site.id, name: site.name })),
    };
  }

  const target = described.find((entry) => entry.id === id);
  if (!target) throw new ApiError(404, 'That account no longer exists.');
  if (target.isYou) throw new ApiError(400, 'You cannot change your own account here.');
  if (target.isPlatformAdmin) throw new ApiError(400, 'The main admin account cannot be changed here.');

  if (!action && method === 'PUT') {
    if (!Array.isArray(body.sites)) throw new ApiError(400, 'Choose the websites this person may edit.');
    const wanted = [...new Set(body.sites.map(String))];
    for (const siteId of wanted) if (!siteIds.has(siteId)) throw new ApiError(400, `Unknown website "${siteId}".`);
    if (target.status === 'unverified') throw new ApiError(400, 'This person has not verified their email yet.');
    const add = wanted.filter((siteId) => !target.sites.includes(siteId)).map(siteGroup);
    const remove = target.sites.filter((siteId) => !wanted.includes(siteId)).map(siteGroup);
    await userAdmin.setGroups(poolId, id, { add, remove });
    // Taking access away also ends their sessions, so it applies at their
    // next token refresh rather than days later.
    if (remove.length > 0) await userAdmin.signOutEverywhere(poolId, id);
    return { ok: true };
  }

  if (action === 'disable' && method === 'POST') {
    await userAdmin.disable(poolId, id);
    return { ok: true };
  }
  if (action === 'enable' && method === 'POST') {
    await userAdmin.enable(poolId, id);
    return { ok: true };
  }
  if (!action && method === 'DELETE') {
    await userAdmin.remove(poolId, id);
    return { ok: true };
  }

  throw new ApiError(405, `${method} is not allowed here.`);
}

/** The email the main admin gets when someone asks for an account. */
export function accessRequestMessage({ name, email, adminUrl }) {
  const who = name ? `${name} (${email})` : email;
  return {
    subject: '3S Admin: new access request',
    message: [
      `${who} has asked for access to 3S Admin.`,
      '',
      'They cannot see or change anything until you approve them.',
      `To approve (and choose which websites they may edit) or reject: ${adminUrl ? `${adminUrl.replace(/\/$/, '')}/users` : 'open 3S Admin > Users'}`,
    ].join('\n'),
  };
}
