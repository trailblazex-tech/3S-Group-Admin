/**
 * Gives an existing user access to one more site, or takes it away.
 * Takes effect at their next sign-in (or within the hour, when their token refreshes).
 *
 *   npm run site:grant -- --email a@b.com --site konark
 *   npm run site:grant -- --email a@b.com --site konark --revoke
 */
import { arg, aws, fail, stackOutputs } from './lib/aws.mjs';
import { ensureSiteGroup } from './lib/groups.mjs';
import { getSite } from '../api/src/sites/index.js';

const email = arg('email');
const siteId = arg('site');
const revoke = Boolean(arg('revoke', false));

if (typeof email !== 'string' || typeof siteId !== 'string') fail('Give --email and --site.');
if (!getSite(siteId)) fail(`Unknown site "${siteId}".`);

const userPoolId = stackOutputs().UserPoolId;
const group = ensureSiteGroup(userPoolId, siteId);
const action = revoke ? 'admin-remove-user-from-group' : 'admin-add-user-to-group';
aws(['cognito-idp', action, '--user-pool-id', userPoolId, '--username', email, '--group-name', group], { json: false });

console.log(`${revoke ? 'Removed' : 'Granted'} ${email} ${revoke ? 'from' : 'to'} ${siteId}.`);
