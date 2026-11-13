/**
 * Local test harness for 3S Admin: the real router, engine, file store and
 * forms, with a signed-in test editor instead of Cognito, and the admin app
 * served by Vite with only its sign-in module swapped for a stub.
 *
 *   node docs/client-guide/capture/serve.mjs <admin repo> <dataDir> site=<content root> [site=<root> ...]
 *
 * Each site's content/*.json under <content root> is what gets edited. A
 * "Publish" writes <dataDir>/delivery/<site>.js|json, served at
 * http://localhost:8787/delivery/<site>.js like the media CDN serves it.
 */
import http from 'node:http';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const [repoArg, dataArg, ...siteArgs] = process.argv.slice(2);
// Absolute, because the admin dev server later changes the working directory.
const adminRepo = path.resolve(repoArg);
const dataDir = path.resolve(dataArg);
const imp = (rel) => import(pathToFileURL(path.join(adminRepo, rel)).href);
const { createRouter } = await imp('api/src/core/router.js');
const { sites, upcomingSites } = await imp('api/src/sites/index.js');
const { createFileStore } = await imp('api/src/local/file-store.js');
const { createLocalUploader } = await imp('api/src/local/local-uploader.js');
const { buildDeliveryFiles } = await imp('api/src/core/delivery.js');
const { snapshotScript } = await imp('api/src/aws/snapshot.js');

const roots = Object.fromEntries(siteArgs.map((arg) => [arg.slice(0, arg.indexOf('=')), path.resolve(arg.slice(arg.indexOf('=') + 1))]));
const port = 8787;
const apiOrigin = `http://localhost:${port}`;
const user = {
  id: 'harness',
  email: 'editor@example.com',
  name: 'Test Editor',
  groups: ['platform-admins', ...Object.keys(roots).map((id) => `site-${id}`)],
  isPlatformAdmin: true,
};

const uploader = createLocalUploader({ apiOrigin, publicDirFor: (site) => path.join(roots[site.id], 'public') });
const storeFor = (site) => {
  const store = createFileStore(site, { contentDir: path.join(roots[site.id], 'content'), dataDir });
  // Publish like production: write the snapshot the website loads.
  store.publish = async () => {
    const payload = { site: site.id, publishedAt: new Date().toISOString(), ...buildDeliveryFiles(site.collections, await store.loadAll()) };
    await mkdir(path.join(dataDir, 'delivery'), { recursive: true });
    await writeFile(path.join(dataDir, 'delivery', `${site.id}.json`), JSON.stringify(payload));
    await writeFile(path.join(dataDir, 'delivery', `${site.id}.js`), snapshotScript(payload));
    return { queued: true, rebuildStarted: false, message: `Published - visitors to ${site.name} see the changes within a minute.` };
  };
  return store;
};
const servedSites = new Map([...sites].filter(([id]) => roots[id]));
const router = createRouter({ sites: servedSites, storeFor, uploader, upcoming: upcomingSites });

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': headers['Access-Control-Allow-Origin'] ?? 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...headers,
  });
  res.end(body === null ? undefined : JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, apiOrigin);
      if (url.pathname.startsWith('/fake-mail/')) {
        // Stands in for the sites' mail services in tests: always fails.
        return send(res, 503, { message: 'Mail service unavailable (test)' }, { 'Access-Control-Allow-Origin': '*' });
      }
      if (url.pathname.startsWith('/delivery/') && /\.(js|json)$/.test(url.pathname)) {
        const file = path.join(dataDir, 'delivery', path.basename(url.pathname));
        try {
          const body = await readFile(file);
          res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(body);
        } catch {
          res.writeHead(404);
          return res.end();
        }
      }
      const isPublicForm = url.pathname.startsWith('/forms/');
      if (req.method === 'OPTIONS' && !isPublicForm) return send(res, 204, null);
      if (url.pathname === '/local-uploads' && req.method === 'POST') return uploader.handleUpload(req, res, send);
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf8');
      const result = await router.routeRequest({
        method: req.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: raw ? JSON.parse(raw) : {},
        user: token === 'harness-token' ? user : null,
        headers: req.headers,
        ip: req.socket.remoteAddress,
      });
      send(res, result.status, result.status === 204 ? null : result.body, result.headers);
    } catch (error) {
      console.error(error);
      send(res, 500, { error: 'Harness API failed.' });
    }
  })
  .listen(port, () => console.log(`API ${apiOrigin}  sites: ${[...servedSites.keys()].join(', ')}`));

// The admin app, with the sign-in module swapped for the stub.
const { createServer } = await import(pathToFileURL(path.join(adminRepo, 'node_modules/vite/dist/node/index.js')).href);
const fakeAuth = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'fake-auth.ts');
process.env.VITE_API_URL = apiOrigin;
process.env.VITE_COGNITO_USER_POOL_ID = 'harness';
process.env.VITE_COGNITO_CLIENT_ID = 'harness';
// PostCSS/Tailwind find their config from the working directory.
process.chdir(path.join(adminRepo, 'admin'));
const vite = await createServer({
  root: path.join(adminRepo, 'admin'),
  configFile: path.join(adminRepo, 'admin/vite.config.ts'),
  plugins: [
    {
      name: 'harness-auth',
      enforce: 'pre',
      async resolveId(source, importer) {
        if (importer && /admin[\\/]src/.test(importer) && /(^|\/)(lib\/)?auth$/.test(source) && !source.includes('aws-amplify')) {
          const resolved = await this.resolve(source, importer, { skipSelf: true });
          if (resolved && /[\\/]lib[\\/]auth\.ts$/.test(resolved.id)) return fakeAuth;
        }
        return null;
      },
    },
  ],
});
await vite.listen();
console.log('Admin http://localhost:5173');
