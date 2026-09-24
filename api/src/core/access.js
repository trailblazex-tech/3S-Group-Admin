/**
 * Who may edit which site, from Cognito groups:
 *
 *   platform-admins   every site
 *   site-<id>         that one site
 *
 * A signed-in user in neither gets nothing - signing in alone grants no access.
 */
export const platformAdminGroup = 'platform-admins';
export const siteGroup = (siteId) => `site-${siteId}`;

/**
 * API Gateway's JWT authorizer hands array claims to Lambda as one string,
 * "[platform-admins site-konark]"; a locally verified token has a real array.
 */
export function parseGroups(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  return raw
    .replace(/^\[|\]$/g, '')
    .split(/[\s,]+/)
    .map((group) => group.replace(/^"|"$/g, ''))
    .filter(Boolean);
}

export function userFromClaims(claims) {
  if (!claims?.sub || claims.token_use !== 'id') return null;
  const email = String(claims.email ?? '');
  const groups = parseGroups(claims['cognito:groups']);
  return {
    id: String(claims.sub),
    email,
    name: String(claims.name || email.split('@')[0] || 'Admin'),
    groups,
    isPlatformAdmin: groups.includes(platformAdminGroup),
  };
}

export function canAccessSite(user, siteId) {
  return Boolean(user) && (user.isPlatformAdmin || user.groups.includes(siteGroup(siteId)));
}

export function accessibleSites(user, sites) {
  return [...sites.values()].filter((site) => canAccessSite(user, site.id));
}
