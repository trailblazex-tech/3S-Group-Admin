/**
 * Website traffic from Google Analytics 4, for the admin's Analytics page.
 *
 * Reads a site's GA4 property through the GA4 Data API as a Google service
 * account (the account's email must be added to the property as a Viewer).
 * The credentials never reach the browser: `credentialsFor(site)` resolves
 * them on the server (SSM Parameter Store in production, a local key file in
 * development) and returns { propertyId, clientEmail, privateKey } or null.
 *
 * No Google SDK: a signed JWT is exchanged for an access token, and reports
 * are plain runReport calls. Results are cached a few minutes per site, so
 * reopening the page doesn't spend Data API quota.
 */
import crypto from 'node:crypto';
import { ApiError } from './engine.js';

const tokenUrl = 'https://oauth2.googleapis.com/token';
const dataApiBaseUrl = 'https://analyticsdata.googleapis.com/v1beta';
const scope = 'https://www.googleapis.com/auth/analytics.readonly';
const cacheMs = 5 * 60 * 1000;

const tokens = new Map();
const reports = new Map();

const base64Url = (input) => Buffer.from(input).toString('base64url');

async function accessToken({ clientEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const cached = tokens.get(clientEmail);
  if (cached && cached.expiresAt - 60 > now) return cached.token;

  const unsigned = `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64Url(
    JSON.stringify({ iss: clientEmail, scope, aud: tokenUrl, exp: now + 3600, iat: now }),
  )}`;
  const assertion = `${unsigned}.${crypto.createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url')}`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal: AbortSignal.timeout(8000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error_description || payload.error || 'Google sign-in failed');

  tokens.set(clientEmail, { token: payload.access_token, expiresAt: now + Number(payload.expires_in || 3600) });
  return payload.access_token;
}

async function runReport({ token, propertyId, dateRange, dimensions = [], metrics = [], dimensionFilter, orderBys, limit }) {
  const response = await fetch(`${dataApiBaseUrl}/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [dateRange],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      ...(dimensionFilter ? { dimensionFilter } : {}),
      ...(orderBys ? { orderBys } : {}),
      ...(limit ? { limit: String(limit) } : {}),
    }),
    signal: AbortSignal.timeout(10000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'GA4 Data API request failed');
  return payload;
}

function column(report, kind, name) {
  return (report[kind === 'metric' ? 'metricHeaders' : 'dimensionHeaders'] ?? []).findIndex((header) => header.name === name);
}

function metric(report, row, name) {
  const index = column(report, 'metric', name);
  return index < 0 ? 0 : Number(row?.metricValues?.[index]?.value || 0);
}

function dimension(report, row, name) {
  const index = column(report, 'dimension', name);
  return index < 0 ? '' : row?.dimensionValues?.[index]?.value || '';
}

/** GA4 'YYYYMMDD' -> 'YYYY-MM-DD'. */
function isoDay(value) {
  return /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
}

const eventFilter = (names) => ({ filter: { fieldName: 'eventName', inListFilter: { values: names } } });

/** Visitor actions the Konark site sends (src/lib/analytics.ts trackEvent calls). */
const actionLabels = {
  whatsapp_click: 'WhatsApp chats opened',
  phone_click: 'Phone numbers tapped',
  generate_lead: 'Enquiries sent',
  form_start: 'Forms started',
  registration_click: 'Registration clicks',
  event_greeting_shown: 'Greeting pop-ups shown',
  event_greeting_cta_click: 'Greeting button clicks',
  parent_feedback_submitted: 'Feedback forms sent',
};

export async function analyticsReport({ site, credentialsFor, days: rawDays }) {
  const days = [7, 28, 90].includes(Number(rawDays)) ? Number(rawDays) : 28;
  const credentials = await credentialsFor(site);
  if (!credentials) return { configured: false, measurementHint: site.analytics ?? null };

  const cacheKey = `${site.id}:${days}`;
  const hit = reports.get(cacheKey);
  if (hit && Date.now() - hit.at < cacheMs) return hit.report;

  const dateRange = { startDate: `${days - 1}daysAgo`, endDate: 'today' };
  const previousRange = { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo` };

  let report;
  try {
    const token = await accessToken(credentials);
    const common = { token, propertyId: credentials.propertyId };
    const totalsMetrics = ['screenPageViews', 'activeUsers', 'newUsers', 'sessions', 'engagementRate', 'averageSessionDuration'];

    const [totals, previous, today, daily, pages, sources, devices, cities, actions] = await Promise.all([
      runReport({ ...common, dateRange, metrics: totalsMetrics }),
      runReport({ ...common, dateRange: previousRange, metrics: totalsMetrics }),
      runReport({ ...common, dateRange: { startDate: 'today', endDate: 'today' }, metrics: ['screenPageViews', 'activeUsers'] }),
      runReport({ ...common, dateRange, dimensions: ['date'], metrics: ['screenPageViews', 'activeUsers'], orderBys: [{ dimension: { dimensionName: 'date' } }] }),
      runReport({
        ...common,
        dateRange,
        dimensions: ['pagePath', 'pageTitle'],
        metrics: ['screenPageViews', 'activeUsers'],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
      runReport({
        ...common,
        dateRange,
        dimensions: ['sessionDefaultChannelGroup'],
        metrics: ['sessions'],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8,
      }),
      runReport({ ...common, dateRange, dimensions: ['deviceCategory'], metrics: ['activeUsers'] }),
      runReport({
        ...common,
        dateRange,
        dimensions: ['city'],
        metrics: ['activeUsers'],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 8,
      }),
      runReport({ ...common, dateRange, dimensions: ['eventName'], metrics: ['eventCount'], dimensionFilter: eventFilter(Object.keys(actionLabels)) }),
    ]);

    const sum = (source) => Object.fromEntries(totalsMetrics.map((name) => [name, metric(source, source.rows?.[0], name)]));
    const actionCounts = new Map((actions.rows ?? []).map((row) => [dimension(actions, row, 'eventName'), metric(actions, row, 'eventCount')]));

    report = {
      configured: true,
      days,
      generatedAt: new Date().toISOString(),
      totals: sum(totals),
      previous: sum(previous),
      today: { views: metric(today, today.rows?.[0], 'screenPageViews'), visitors: metric(today, today.rows?.[0], 'activeUsers') },
      daily: (daily.rows ?? []).map((row) => ({
        date: isoDay(dimension(daily, row, 'date')),
        views: metric(daily, row, 'screenPageViews'),
        visitors: metric(daily, row, 'activeUsers'),
      })),
      pages: (pages.rows ?? []).map((row) => ({
        path: dimension(pages, row, 'pagePath') || '/',
        title: dimension(pages, row, 'pageTitle') || '',
        views: metric(pages, row, 'screenPageViews'),
        visitors: metric(pages, row, 'activeUsers'),
      })),
      channels: (sources.rows ?? []).map((row) => ({ name: dimension(sources, row, 'sessionDefaultChannelGroup') || 'Other', sessions: metric(sources, row, 'sessions') })),
      devices: (devices.rows ?? []).map((row) => ({ name: dimension(devices, row, 'deviceCategory') || 'other', visitors: metric(devices, row, 'activeUsers') })),
      cities: (cities.rows ?? []).map((row) => ({ name: dimension(cities, row, 'city') || '(not set)', visitors: metric(cities, row, 'activeUsers') })),
      actions: Object.entries(actionLabels).map(([name, label]) => ({ name, label, count: actionCounts.get(name) ?? 0 })),
    };
  } catch (error) {
    console.error('[analytics]', site.id, error.message);
    throw new ApiError(
      502,
      /permission|PERMISSION_DENIED|403/i.test(error.message)
        ? 'Google Analytics refused access. Add the service account as a Viewer on the GA4 property.'
        : 'Could not load Google Analytics right now. Try again in a minute.',
    );
  }

  reports.set(cacheKey, { at: Date.now(), report });
  return report;
}

/** Accepts { propertyId, clientEmail, privateKey } or { propertyId, serviceAccount: <Google key JSON> }. */
export function parseCredentials(raw) {
  if (!raw) return null;
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const propertyId = String(value.propertyId ?? '').replace(/^properties\//, '').trim();
  const clientEmail = value.clientEmail ?? value.serviceAccount?.client_email;
  const privateKey = (value.privateKey ?? value.serviceAccount?.private_key ?? '').replace(/\\n/g, '\n');
  if (!/^\d+$/.test(propertyId) || !clientEmail || !privateKey) return null;
  return { propertyId, clientEmail, privateKey };
}
