/**
 * Connects a site built by a GitHub Actions workflow to 3S Admin, so the
 * admin's "Publish" starts that workflow (a repository_dispatch event named
 * "publish-content"). Used for 3S Minerals and 3S Global Greens, whose
 * .github/workflows/publish.yml builds the site with the published content
 * and uploads it to S3 + CloudFront.
 *
 * The GitHub token is read from a file (never typed on the command line, so
 * it stays out of shell history) and stored encrypted in SSM. Use a
 * fine-grained token limited to that one repository with
 * "Contents: Read and write" (what repository_dispatch requires).
 *
 *   npm run site:connect-github -- --site globalgreens --repo trailblazex-tech/3S_GlobalGreen --token-file ./token.txt [--dry-run]
 *   npm run site:connect-github -- --site globalgreens --repo trailblazex-tech/3S_GlobalGreen --token-file ./token.txt --test
 *
 * --test also sends one dispatch, so a build starts now (check the repo's Actions tab).
 */
import { readFileSync } from 'node:fs';
import { arg, aws, fail } from './lib/aws.mjs';
import { getSite } from '../api/src/sites/index.js';

const siteId = arg('site');
const repo = arg('repo');
const tokenFile = arg('token-file');
const dryRun = Boolean(arg('dry-run', false));
const test = Boolean(arg('test', false));

const usage = 'Usage: npm run site:connect-github -- --site <id> --repo <owner/name> --token-file <path> [--dry-run] [--test]';
if (!getSite(siteId) || typeof repo !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(repo) || typeof tokenFile !== 'string') fail(usage);

const token = readFileSync(tokenFile, 'utf8').trim();
if (!/^(github_pat_|ghp_)\w+$/.test(token)) fail('That file does not look like a GitHub token (github_pat_... or ghp_...).');

const request = {
  url: `https://api.github.com/repos/${repo}/dispatches`,
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': '3s-admin-publish',
  },
  body: { event_type: 'publish-content' },
};

// Check the token can reach the repository before storing it.
const probe = await fetch(`https://api.github.com/repos/${repo}`, { headers: request.headers });
if (!probe.ok) fail(`GitHub refused the token for ${repo} (HTTP ${probe.status}). Check the token's repository access.`);
console.log(`Token can see ${repo}.`);

if (dryRun) {
  console.log('\nDry run - nothing stored.');
  process.exit(0);
}

aws(
  ['ssm', 'put-parameter', '--type', 'SecureString', '--overwrite', '--name', `/3s-admin/sites/${siteId}/publish-webhook`, '--value', JSON.stringify(request)],
  { quiet: true },
);
console.log(`Stored. Publish in the admin now starts the publish workflow of ${repo}.`);

if (test) {
  const response = await fetch(request.url, {
    method: 'POST',
    headers: { ...request.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body),
  });
  if (!response.ok) fail(`The test dispatch failed (HTTP ${response.status}): ${await response.text()}`);
  console.log(`Test dispatch sent - a build is starting: https://github.com/${repo}/actions`);
}
