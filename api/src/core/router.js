/**
 * The platform's HTTP surface, independent of where it runs. Lambda
 * (src/lambda.js) and the local dev server (scripts/dev.mjs) both adapt their
 * requests into routeRequest(); neither contains routing of its own.
 *
 *   GET  /me                          who you are + the sites you can edit
 *   GET  /delivery/<site>             published content files (no auth; what a
 *                                     site's public build pulls)
 *   POST /sites/<site>/uploads        a one-time direct-upload grant
 *   *    /sites/<site>/...            that site's content (see engine.js)
 *
 * `user` is already authenticated by the caller (API Gateway's JWT
 * authorizer, or local token verification); this layer does authorization.
 */
import { accessibleSites, canAccessSite } from './access.js';
import { buildDeliveryFiles } from './delivery.js';
import { ApiError, createEngine, routeSiteRequest } from './engine.js';
import { planUpload } from './uploads.js';
import { describeSite } from '../sites/index.js';

const json = (status, body, headers = {}) => ({ status, body, headers });

export function createRouter({ sites, storeFor, uploader }) {
  function siteOr404(siteId) {
    const site = sites.get(siteId);
    if (!site) throw new ApiError(404, 'That site is not managed here.');
    return site;
  }

  async function handle({ method, path, query = {}, body = {}, user }) {
    const segments = path.split('/').filter(Boolean);
    const [first, siteId, ...rest] = segments;

    if (first === 'delivery' && siteId && rest.length === 0 && method === 'GET') {
      const site = siteOr404(siteId);
      const everything = await storeFor(site).loadAll();
      // Short shared cache: repeated builds don't each hit the database, and a
      // publish is never more than a minute behind.
      return json(200, buildDeliveryFiles(site.collections, everything), { 'Cache-Control': 'public, max-age=60' });
    }

    if (!user) throw new ApiError(401, 'Please sign in again.');

    if (first === 'me' && !siteId && method === 'GET') {
      const mySites = accessibleSites(user, sites).map(describeSite);
      return json(200, {
        user: { email: user.email, name: user.name, isPlatformAdmin: user.isPlatformAdmin },
        sites: mySites,
      });
    }

    if (first === 'sites' && siteId) {
      const site = siteOr404(siteId);
      if (!canAccessSite(user, site.id)) throw new ApiError(403, 'You do not have access to this site.');

      const sitePath = `/${rest.join('/')}`;
      const actor = { id: user.id, email: user.email, name: user.name };

      if (sitePath === '/uploads' && method === 'POST') {
        const plan = planUpload({ siteId: site.id, collections: site.collections, ...body });
        return json(200, await uploader.presign(plan, site));
      }

      const engine = createEngine({ store: storeFor(site), collections: site.collections });
      const result = await routeSiteRequest(engine, { method, path: sitePath, query, body, user: actor });
      return json(result.status, result.body);
    }

    throw new ApiError(404, 'Unknown endpoint.');
  }

  return {
    async routeRequest(request) {
      try {
        return await handle(request);
      } catch (error) {
        if (error instanceof ApiError) return json(error.status, { error: error.message });
        console.error('[router] unexpected failure', error);
        return json(500, { error: 'Something went wrong. Please try again.' });
      }
    },
  };
}
