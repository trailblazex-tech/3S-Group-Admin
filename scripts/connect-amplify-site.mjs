/**
 * Connects a site hosted on AWS Amplify to 3S Admin, so the admin's
 * "Publish" rebuilds it with what was published:
 *
 *   1. the branch's build pulls the published snapshot (CONTENT_DELIVERY_URL)
 *      and pages swap in the latest one at load (VITE_CONTENT_URL) - merged
 *      into the branch's existing environment variables, nothing dropped
 *   2. an Amplify incoming webhook for the branch (reused if it exists)
 *   3. that webhook stored as the site's publish webhook in SSM
 *   4. a rebuild of the branch, so the site picks it all up now
 *
 *   npm run site:connect-amplify -- --site konark --app <amplify app id> [--branch main] [--dry-run]
 */
import { arg, aws, fail, region, stackOutputs } from './lib/aws.mjs';
import { getSite } from '../api/src/sites/index.js';

const siteId = arg('site');
const appId = arg('app');
const branch = typeof arg('branch') === 'string' ? arg('branch') : 'main';
const dryRun = Boolean(arg('dry-run', false));

if (!getSite(siteId) || typeof appId !== 'string') fail('Usage: npm run site:connect-amplify -- --site <id> --app <amplify app id> [--branch main] [--dry-run]');

const media = stackOutputs().MediaBaseUrl.replace(/\/$/, '');
const wanted = {
  CONTENT_DELIVERY_URL: `${media}/delivery/${siteId}.json`,
  VITE_CONTENT_URL: `${media}/delivery/${siteId}.js`,
};

const current = aws(['amplify', 'get-branch', '--app-id', appId, '--branch-name', branch]).branch;
const env = { ...(current.environmentVariables ?? {}), ...wanted };
console.log(`Branch ${branch} of ${appId}: ${Object.keys(current.environmentVariables ?? {}).length} existing variable(s); setting ${Object.keys(wanted).join(', ')}`);

const webhooks = aws(['amplify', 'list-webhooks', '--app-id', appId]).webhooks ?? [];
const existing = webhooks.find((hook) => hook.branchName === branch && hook.description === '3s-admin-publish');
console.log(existing ? `Reusing webhook ${existing.webhookId}` : 'Creating a 3s-admin-publish webhook');

if (dryRun) {
  console.log('\nDry run - nothing changed.');
  process.exit(0);
}

aws(['amplify', 'update-branch', '--app-id', appId, '--branch-name', branch, '--environment-variables', JSON.stringify(env)], { quiet: true });

const webhook = existing ?? aws(['amplify', 'create-webhook', '--app-id', appId, '--branch-name', branch, '--description', '3s-admin-publish']).webhook;
aws(
  ['ssm', 'put-parameter', '--type', 'SecureString', '--overwrite', '--name', `/3s-admin/sites/${siteId}/publish-webhook`, '--value', webhook.webhookUrl],
  { quiet: true },
);

const job = aws(['amplify', 'start-job', '--app-id', appId, '--branch-name', branch, '--job-type', 'RELEASE']).jobSummary;
console.log(`\nConnected. Publish in the admin now rebuilds ${appId}/${branch}.`);
console.log(`Rebuild started: job ${job.jobId} - https://${region}.console.aws.amazon.com/amplify/apps/${appId}/branches/${branch}/deployments`);
