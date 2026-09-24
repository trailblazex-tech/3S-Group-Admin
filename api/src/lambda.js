/**
 * Lambda entry point behind the 3s-admin HTTP API. Adapts API Gateway (v2
 * payload) events to the router. Authentication already happened: the
 * API's Cognito JWT authorizer rejects bad tokens before this runs (the
 * /api/delivery route is the only one without it).
 */
import { userFromClaims } from './core/access.js';
import { createRouter } from './core/router.js';
import { sites } from './sites/index.js';
import { createDsqlStore } from './aws/dsql-store.js';
import { createPublisher } from './aws/publisher.js';
import { createS3Uploader } from './aws/s3-uploader.js';

const maxBodyBytes = 512 * 1024;
const publisher = createPublisher();

const router = createRouter({
  sites,
  storeFor: (site) => createDsqlStore(site, { publisher }),
  uploader: createS3Uploader({ bucket: process.env.MEDIA_BUCKET, mediaBaseUrl: process.env.MEDIA_BASE_URL }),
});

function respond(status, body, headers = {}) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const method = event.requestContext?.http?.method ?? 'GET';
  // Browsers reach the API as /api/... on the admin's CloudFront domain.
  const path = (event.rawPath ?? '/').replace(/^\/api(?=\/|$)/, '') || '/';

  let body = {};
  if (event.body && (method === 'POST' || method === 'PUT')) {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    if (raw.length > maxBodyBytes) return respond(413, { error: 'That is too much data to save at once.' });
    try {
      body = JSON.parse(raw || '{}');
    } catch {
      return respond(400, { error: 'Could not read that request.' });
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return respond(400, { error: 'Could not read that request.' });
    }
  }

  const user = userFromClaims(event.requestContext?.authorizer?.jwt?.claims);
  const result = await router.routeRequest({
    method,
    path,
    query: event.queryStringParameters ?? {},
    body,
    user,
  });

  return respond(result.status, result.body, result.headers);
}
