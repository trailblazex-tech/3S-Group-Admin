/**
 * Builds the admin app against the deployed stack and publishes it.
 *
 *   npm run deploy:admin
 */
import { execFileSync } from 'node:child_process';
import { aws, stackOutputs } from './lib/aws.mjs';

const outputs = stackOutputs();

execFileSync('npm', ['run', 'build', '--workspace', 'admin'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    VITE_API_URL: '/api',
    VITE_COGNITO_USER_POOL_ID: outputs.UserPoolId,
    VITE_COGNITO_CLIENT_ID: outputs.UserPoolClientId,
  },
});

const bucket = `s3://${outputs.AdminSiteBucket}`;
// Hashed assets never change; index.html must always be re-checked.
aws(['s3', 'sync', 'admin/dist/assets', `${bucket}/assets`, '--delete', '--cache-control', 'public, max-age=31536000, immutable'], {
  json: false,
});
aws(['s3', 'cp', 'admin/dist/index.html', `${bucket}/index.html`, '--cache-control', 'no-cache'], { json: false });
aws(['cloudfront', 'create-invalidation', '--distribution-id', outputs.AdminDistributionId, '--paths', '/index.html', '/'], {
  quiet: true,
});

console.log(`\nAdmin live at ${outputs.AdminUrl}`);
