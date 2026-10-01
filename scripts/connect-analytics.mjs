/**
 * Connects a site's Google Analytics 4 property to the admin's Analytics page.
 *
 *   npm run analytics:connect -- --site konark --property 123456789 --key path/to/service-account.json
 *
 * --property is the GA4 *property* id (Admin > Property details, digits
 * only) - not the G-XXXX measurement id. --key is the Google Cloud service
 * account's JSON key; add that account's email to the GA4 property as a
 * Viewer first. The key is stored encrypted in SSM Parameter Store at
 * /3s-admin/sites/<site>/ga4 and never printed. Re-run to replace it.
 */
import { readFileSync } from 'node:fs';
import { aws, arg, fail } from './lib/aws.mjs';
import { getSite } from '../api/src/sites/index.js';
import { parseCredentials } from '../api/src/core/analytics.js';

const siteId = arg('site');
const propertyId = String(arg('property', '')).replace(/^properties\//, '');
const keyFile = arg('key');

if (!getSite(siteId) || !propertyId || !keyFile) {
  fail('Usage: npm run analytics:connect -- --site <id> --property <GA4 property id> --key <service-account.json>');
}
if (/^G-/i.test(propertyId)) fail(`${propertyId} is a measurement id. Use the numeric property id (GA4 Admin > Property details).`);

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyFile, 'utf8'));
} catch {
  fail(`Could not read the key file ${keyFile}.`);
}

const value = { propertyId, serviceAccount: { client_email: serviceAccount.client_email, private_key: serviceAccount.private_key } };
if (!parseCredentials(value)) fail('That key file has no client_email/private_key, or the property id is not numeric.');

aws(
  ['ssm', 'put-parameter', '--name', `/3s-admin/sites/${siteId}/ga4`, '--type', 'SecureString', '--overwrite', '--value', JSON.stringify(value)],
  { quiet: true },
);
console.log(`Connected GA4 property ${propertyId} to ${siteId} as ${serviceAccount.client_email}.`);
console.log('Make sure that email is a Viewer on the property (GA4 Admin > Property access management).');
