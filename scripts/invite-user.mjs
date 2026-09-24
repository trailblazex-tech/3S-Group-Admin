/**
 * Invites someone. Cognito emails them a temporary password; on first sign-in
 * they choose their own password and set up an authenticator app.
 *
 *   npm run user:invite -- --email a@b.com --name "A B" --sites konark[,other]
 *   npm run user:invite -- --email a@b.com --name "A B" --platform-admin
 */
import { arg, aws, fail, stackOutputs } from './lib/aws.mjs';
import { ensureSiteGroup } from './lib/groups.mjs';
import { getSite } from '../api/src/sites/index.js';

const email = arg('email');
const name = arg('name');
const sites = String(arg('sites', '') === true ? '' : arg('sites', '')).split(',').map((s) => s.trim()).filter(Boolean);
const platformAdmin = Boolean(arg('platform-admin', false));

if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('Give a valid --email.');
if (typeof name !== 'string') fail('Give the person\'s --name (in quotes if it has spaces).');
if (!platformAdmin && sites.length === 0) fail('Give --sites <id,...> or --platform-admin.');
for (const siteId of sites) if (!getSite(siteId)) fail(`Unknown site "${siteId}".`);

const userPoolId = stackOutputs().UserPoolId;

aws(
  [
    'cognito-idp',
    'admin-create-user',
    '--user-pool-id',
    userPoolId,
    '--username',
    email,
    '--user-attributes',
    `Name=email,Value=${email}`,
    'Name=email_verified,Value=true',
    `Name=name,Value=${name}`,
    '--desired-delivery-mediums',
    'EMAIL',
  ],
  { quiet: true },
);

const groups = platformAdmin ? ['platform-admins'] : sites.map((siteId) => ensureSiteGroup(userPoolId, siteId));
for (const group of groups) {
  aws(['cognito-idp', 'admin-add-user-to-group', '--user-pool-id', userPoolId, '--username', email, '--group-name', group], {
    json: false,
  });
}

console.log(`Invited ${email} (${groups.join(', ')}). They'll get an email with a temporary password.`);
console.log(`Admin: ${stackOutputs().AdminUrl}`);
