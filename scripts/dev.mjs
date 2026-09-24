/**
 * Local development: the API on :8787 (file store + local uploads, real
 * Cognito sign-in) and the admin panel on :5173.
 *
 * Configure in .env.local (see .env.example). For each site you want to edit
 * locally, point LOCAL_SITE_<ID> at that site's repo: its content/*.json is
 * what gets edited, and uploads land in its public/uploads/.
 */
import http from 'node:http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { userFromClaims } from '../api/src/core/access.js';
import { createRouter } from '../api/src/core/router.js';
import { sites } from '../api/src/sites/index.js';
import { createFileStore } from '../api/src/local/file-store.js';
import { createLocalUploader } from '../api/src/local/local-uploader.js';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const port = Number(process.env.API_PORT || 8787);
const adminOrigin = 'http://localhost:5173';
const apiOrigin = `http://localhost:${port}`;
const { COGNITO_USER_POOL_ID: userPoolId, COGNITO_CLIENT_ID: clientId } = process.env;

if (!userPoolId || !clientId) {
  console.error('Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in .env.local (copy .env.example).');
  process.exit(1);
}

const envKey = (siteId) => `LOCAL_SITE_${siteId.toUpperCase().replace(/-/g, '_')}`;
const siteDir = (site) => path.resolve(process.env[envKey(site.id)] || path.join('.dev-data', site.id));

// Relative media paths preview against the locally running website.
for (const site of sites.values()) {
  const localUrl = process.env[`${envKey(site.id)}_URL`];
  if (localUrl) site.publicUrl = localUrl;
  console.log(`  ${site.id.padEnd(12)} ${path.join(siteDir(site), 'content')}${localUrl ? `  (preview ${localUrl})` : ''}`);
}

const verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'id' });
const uploader = createLocalUploader({ apiOrigin, publicDirFor: (site) => path.join(siteDir(site), 'public') });
const router = createRouter({
  sites,
  storeFor: (site) =>
    createFileStore(site, { contentDir: path.join(siteDir(site), 'content'), dataDir: path.resolve('.dev-data') }),
  uploader,
});

function send(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': adminOrigin,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  response.end(body === null ? undefined : JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

http
  .createServer(async (request, response) => {
    try {
      const url = new URL(request.url, apiOrigin);
      if (request.method === 'OPTIONS') return send(response, 204, null);
      if (url.pathname === '/local-uploads' && request.method === 'POST') {
        return uploader.handleUpload(request, response, send);
      }

      let user = null;
      const token = (request.headers.authorization || '').replace(/^Bearer /, '');
      if (token) {
        try {
          user = userFromClaims(await verifier.verify(token));
        } catch {
          return send(response, 401, { error: 'Please sign in again.' });
        }
      }

      const body = request.method === 'POST' || request.method === 'PUT' ? await readBody(request) : {};
      const result = await router.routeRequest({
        method: request.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body,
        user,
      });
      send(response, result.status, result.body);
    } catch (error) {
      console.error(error);
      send(response, 500, { error: 'Local API failed.' });
    }
  })
  .listen(port, () => console.log(`\nAPI    ${apiOrigin}`));

const vite = spawn('npm', ['run', 'dev', '--workspace', 'admin'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    VITE_API_URL: apiOrigin,
    VITE_COGNITO_USER_POOL_ID: userPoolId,
    VITE_COGNITO_CLIENT_ID: clientId,
  },
});
process.on('SIGINT', () => {
  vite.kill();
  process.exit(0);
});
