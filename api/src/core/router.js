/**
 * The platform's HTTP surface, independent of where it runs. Lambda
 * (src/lambda.js) and the local dev server (scripts/dev.mjs) both adapt their
 * requests into routeRequest(); neither contains routing of its own.
 *
 *   GET  /me                          who you are + the sites you can edit
 *   GET  /delivery/<site>             published content files (no auth; what a
 *                                     site's public build pulls)
 *   POST /forms/<site>/<form>         a visitor's form submission (no auth; CORS
 *                                     limited to the site's own origins)
 *   POST /sites/<site>/uploads        a one-time direct-upload grant
 *   GET  /sites/<site>/library        ready-made greeting templates + banners
 *   GET  /sites/<site>/forms          the site's forms, with new/total counts
 *   GET  /sites/<site>/forms/<form>   that form's submissions, newest first
 *   PUT|DELETE /sites/<site>/forms/<form>/<id>   follow-up status / delete
 *   GET  /sites/<site>/analytics      Google Analytics summary (?days=7|28|90, &refresh=1 skips the cache)
 *   *    /sites/<site>/...            that site's content (see engine.js)
 *
 * `user` is already authenticated by the caller (API Gateway's JWT
 * authorizer, or local token verification); this layer does authorization.
 */
import { accessibleSites, canAccessSite } from './access.js';
import { buildDeliveryFiles } from './delivery.js';
import { ApiError, createEngine, routeSiteRequest } from './engine.js';
import { greetingLibrary } from './greeting-library.js';
import { acceptSubmission, describeForms, formCorsHeaders, submissionStatuses } from './forms.js';
import { analyticsReport } from './analytics.js';
import { planUpload } from './uploads.js';
import { describeSite, describeUpcoming } from '../sites/index.js';

const json = (status, body, headers = {}) => ({ status, body, headers });

export function createRouter({ sites, storeFor, uploader, mediaBaseUrl = '', upcoming = [], analyticsCredentials = async () => null }) {
  function siteOr404(siteId) {
    const site = sites.get(siteId);
    if (!site) throw new ApiError(404, 'That site is not managed here.');
    return site;
  }

  async function handlePublicForm({ method, site, formName, body, headers, ip }) {
    const cors = formCorsHeaders(site, headers.origin);
    if (method === 'OPTIONS') return json(204, null, cors);
    if (method !== 'POST') return json(405, { error: 'Method not allowed.' }, cors);
    try {
      return json(200, await acceptSubmission({ site, formName, payload: body, ip, store: storeFor(site) }), cors);
    } catch (error) {
      if (error instanceof ApiError) return json(error.status, { error: error.message }, cors);
      console.error('[forms] submission failed', site.id, formName, error);
      return json(500, { error: 'Could not send that right now. Please try again.' }, cors);
    }
  }

  async function handleSubmissions({ method, site, rest, query, body, actor }) {
    const forms = site.forms ?? {};
    const store = storeFor(site);
    const [, formName, id, extra] = rest;
    if (extra) throw new ApiError(404, 'Unknown endpoint.');

    if (!formName) {
      if (method !== 'GET') throw new ApiError(405, `${method} is not allowed here.`);
      return json(200, { forms: describeForms(forms, Object.keys(forms).length ? await store.submissionCounts() : {}) });
    }

    const form = forms[formName];
    if (!form) throw new ApiError(404, 'That form does not exist.');

    if (!id) {
      if (method !== 'GET') throw new ApiError(405, `${method} is not allowed here.`);
      const limit = Math.min(Math.max(Number(query.limit) || 2000, 1), 5000);
      return json(200, { submissions: await store.submissions(formName, limit) });
    }

    if (method === 'PUT') {
      const changes = {};
      if (body.status !== undefined) {
        if (!submissionStatuses.some((status) => status.value === body.status)) throw new ApiError(400, 'Unknown status.');
        changes.status = body.status;
      }
      if (body.note !== undefined) changes.note = String(body.note ?? '').slice(0, 2000);
      if (!(await store.updateSubmission(formName, id, changes))) throw new ApiError(404, 'That submission no longer exists.');
      return json(200, { ok: true });
    }

    if (method === 'DELETE') {
      if (!(await store.deleteSubmission(formName, id))) throw new ApiError(404, 'That submission no longer exists.');
      await store.log({ user: actor, action: 'purge', collection: null, recordId: id, title: `${form.label} ${id}` });
      return json(200, { ok: true });
    }

    throw new ApiError(405, `${method} is not allowed here.`);
  }

  async function handle({ method, path, query = {}, body = {}, user, headers = {}, ip }) {
    const segments = path.split('/').filter(Boolean);
    const [first, siteId, ...rest] = segments;

    if (first === 'forms' && siteId && rest.length === 1) {
      return handlePublicForm({ method, site: siteOr404(siteId), formName: rest[0], body, headers, ip });
    }

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
        // Group websites not on the platform yet - only platform admins see
        // them, as "coming soon" on the website picker.
        upcoming: user.isPlatformAdmin ? upcoming.filter((entry) => !sites.has(entry.id)).map(describeUpcoming) : [],
      });
    }

    if (first === 'sites' && siteId) {
      const site = siteOr404(siteId);
      if (!canAccessSite(user, site.id)) throw new ApiError(403, 'You do not have access to this site.');

      const sitePath = `/${rest.join('/')}`;
      const actor = { id: user.id, email: user.email, name: user.name };

      if (sitePath === '/library' && method === 'GET') {
        return json(200, greetingLibrary(mediaBaseUrl), { 'Cache-Control': 'private, max-age=300' });
      }

      if (rest[0] === 'forms') return handleSubmissions({ method, site, rest, query, body, actor });

      if (sitePath === '/analytics' && method === 'GET') {
        return json(200, await analyticsReport({ site, credentialsFor: analyticsCredentials, days: query.days, refresh: query.refresh === '1' }), { 'Cache-Control': 'private, no-store' });
      }

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
