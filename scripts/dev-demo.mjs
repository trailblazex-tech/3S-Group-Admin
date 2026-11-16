/**
 * Local demo of the admin with NO sign-in: opens already signed in as a test
 * editor, so it can be tried without a Cognito account or authenticator code.
 *
 *   npm run dev:demo
 *
 * Uses the same sites as `npm run dev` (LOCAL_SITE_<ID> and _URL in
 * .env.local): edits change those repos' content/*.json, uploads land in
 * their public/uploads/. Only the admin's sign-in is replaced, by
 * docs/client-guide/capture/fake-auth.ts, inside this local dev server. The
 * live admin and its API never accept the demo login, and nothing here
 * touches production data.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { sites } from '../api/src/sites/index.js';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const siteArgs = [];
for (const site of sites.values()) {
  const key = `LOCAL_SITE_${site.id.toUpperCase().replace(/-/g, '_')}`;
  const root = process.env[key];
  if (!root) continue;
  const url = process.env[`${key}_URL`];
  siteArgs.push(`${site.id}=${root}${url ? `,${url}` : ''}`);
  console.log(`  ${site.id.padEnd(12)} ${root}${url ? `  (preview ${url})` : ''}`);
}
if (siteArgs.length === 0) {
  console.error('Set LOCAL_SITE_<ID> in .env.local for each site to demo (see .env.example).');
  process.exit(1);
}

console.log('\nDemo admin - no sign-in. Open http://localhost:5173\n');
const child = spawn(process.execPath, ['docs/client-guide/capture/serve.mjs', '.', '.dev-data', ...siteArgs], { stdio: 'inherit' });
process.on('SIGINT', () => {
  child.kill();
  process.exit(0);
});
child.on('exit', (code) => process.exit(code ?? 0));
