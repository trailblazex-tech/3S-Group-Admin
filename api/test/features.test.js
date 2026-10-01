import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, routeSiteRequest } from '../src/core/engine.js';
import { createRouter } from '../src/core/router.js';
import { parseCredentials } from '../src/core/analytics.js';
import { getSite } from '../src/sites/index.js';
import { alice, memoryStore, testCollections } from './helpers.js';

const user = { id: 'u1', email: 'a@b.com', name: 'A', groups: ['platform-admins'], isPlatformAdmin: true };

/** memoryStore plus the submissions half of the store contract. */
function storeWithSubmissions(initial) {
  const store = memoryStore(initial);
  store.forms = {};
  store.addSubmission = async (form, entry) => void (store.forms[form] ??= []).push(entry);
  store.submissions = async (form, limit) => (store.forms[form] ?? []).slice(-limit).reverse();
  store.submissionCounts = async () =>
    Object.fromEntries(Object.entries(store.forms).map(([form, list]) => [form, { total: list.length, unread: list.filter((e) => e.status === 'new').length }]));
  store.updateSubmission = async (form, id, changes) => {
    const entry = (store.forms[form] ?? []).find((e) => e.id === id);
    if (entry) Object.assign(entry, changes);
    return Boolean(entry);
  };
  store.deleteSubmission = async (form, id) => {
    const before = (store.forms[form] ?? []).length;
    store.forms[form] = (store.forms[form] ?? []).filter((e) => e.id !== id);
    return store.forms[form].length < before;
  };
  return store;
}

test('permanent delete removes the row; fixed rows cannot be deleted', async () => {
  const store = memoryStore({
    gallery: { records: [{ id: 'a', title: 'A', category: 'X', sortOrder: 1, isActive: true }], categories: ['X'] },
    info: { records: [{ id: 'r', label: 'Row', sortOrder: 1 }] },
  });
  const engine = createEngine({ store, collections: testCollections });

  const result = await routeSiteRequest(engine, { method: 'DELETE', path: '/gallery/a', query: { permanent: '1' }, user: alice });
  assert.equal(result.status, 200);
  assert.equal(store.data.gallery.records.length, 0);
  assert.equal(store.entries.at(-1).action, 'purge');

  await assert.rejects(engine.purge('info', 'r', alice), { status: 400 });
  await assert.rejects(engine.purge('gallery', 'missing', alice), { status: 404 });
});

test('a field required only when it applies (showWhen), and cross-field checks', async () => {
  const collections = {
    greetings: {
      label: 'Greetings',
      file: 'g',
      key: 'g',
      titleField: 'name',
      check: (record) => (record.layout === 'banner' && !record.banner ? 'Banner only needs a banner.' : null),
      fields: [
        { name: 'name', type: 'text', label: 'Name', required: true },
        { name: 'layout', type: 'select', label: 'Layout', options: [{ value: 'full', label: 'Full' }, { value: 'banner', label: 'Banner' }] },
        { name: 'title', type: 'text', label: 'Headline', required: true, showWhen: { field: 'layout', is: [null, '', 'full'] } },
        { name: 'banner', type: 'image', label: 'Banner' },
        { name: 'sortOrder', type: 'number', label: 'Order', adminOnly: true },
        { name: 'isActive', type: 'boolean', label: 'On', default: true },
      ],
    },
  };
  const engine = createEngine({ store: memoryStore(), collections });

  await assert.rejects(engine.create('greetings', { name: 'Diwali', layout: 'full' }, alice), /Headline is required/);
  await assert.rejects(engine.create('greetings', { name: 'Diwali', layout: 'banner' }, alice), /needs a banner/);
  const created = await engine.create('greetings', { name: 'Diwali', layout: 'banner', banner: 'https://x/y.webp' }, alice);
  assert.equal(created.title, null);
});

test('public forms: valid feedback is stored with a reference; honeypot and bad input are not', async () => {
  const konark = getSite('konark');
  const store = storeWithSubmissions();
  const router = createRouter({ sites: new Map([['konark', konark]]), storeFor: () => store, uploader: null });
  const origin = 'https://thekonarkacademy.com';
  const feedback = {
    parentName: 'Ravi Kumar',
    mobile: '98765 43210',
    studentName: 'Asha',
    interestedClass: 'Class 6',
    academicSession: '2026-27',
    ratings: { overallExperience: 5, infrastructure: 4 },
    admissionInterest: 'yes',
  };

  const ok = await router.routeRequest({ method: 'POST', path: '/forms/konark/feedback', body: feedback, headers: { origin }, ip: '1.1.1.1' });
  assert.equal(ok.status, 200);
  assert.match(ok.body.referenceId, /^KA-FB-\d{8}-[0-9A-F]{6}$/);
  assert.equal(ok.headers['Access-Control-Allow-Origin'], origin);
  assert.equal(store.forms.feedback[0].mobile, '9876543210');
  assert.equal(store.forms.feedback[0].ratings.cleanliness, 0);
  assert.equal(store.forms.feedback[0].status, 'new');

  const bot = await router.routeRequest({ method: 'POST', path: '/forms/konark/feedback', body: { website: 'spam' }, headers: { origin }, ip: '2.2.2.2' });
  assert.equal(bot.status, 200);
  assert.equal(store.forms.feedback.length, 1, 'honeypot answers ok but stores nothing');

  const bad = await router.routeRequest({ method: 'POST', path: '/forms/konark/feedback', body: { ...feedback, mobile: '123' }, headers: { origin }, ip: '3.3.3.3' });
  assert.equal(bad.status, 400);

  const foreign = await router.routeRequest({ method: 'OPTIONS', path: '/forms/konark/feedback', headers: { origin: 'https://evil.example' } });
  assert.equal(foreign.headers['Access-Control-Allow-Origin'], undefined);

  const missing = await router.routeRequest({ method: 'POST', path: '/forms/konark/nope', body: {}, headers: { origin } });
  assert.equal(missing.status, 404);
});

test('submissions: listed, followed up and deleted only by signed-in editors of that site', async () => {
  const konark = getSite('konark');
  const store = storeWithSubmissions();
  store.forms.enquiry = [{ id: 'KA-EN-1', at: '2026-10-01T00:00:00.000Z', status: 'new', note: '', parentName: 'A', phone: '9876543210' }];
  const router = createRouter({ sites: new Map([['konark', konark]]), storeFor: () => store, uploader: null });

  assert.equal((await router.routeRequest({ method: 'GET', path: '/sites/konark/forms' })).status, 401);

  const forms = await router.routeRequest({ method: 'GET', path: '/sites/konark/forms', user });
  assert.equal(forms.body.forms.find((form) => form.name === 'enquiry').unread, 1);

  const list = await router.routeRequest({ method: 'GET', path: '/sites/konark/forms/enquiry', user });
  assert.equal(list.body.submissions.length, 1);

  const bad = await router.routeRequest({ method: 'PUT', path: '/sites/konark/forms/enquiry/KA-EN-1', body: { status: 'weird' }, user });
  assert.equal(bad.status, 400);
  await router.routeRequest({ method: 'PUT', path: '/sites/konark/forms/enquiry/KA-EN-1', body: { status: 'done', note: 'Called back' }, user });
  assert.equal(store.forms.enquiry[0].status, 'done');
  assert.equal(store.forms.enquiry[0].note, 'Called back');

  const gone = await router.routeRequest({ method: 'DELETE', path: '/sites/konark/forms/enquiry/KA-EN-1', user });
  assert.equal(gone.status, 200);
  assert.equal(store.forms.enquiry.length, 0);
});

test('analytics: unconfigured sites say so; credentials parse from a service account key', async () => {
  const konark = getSite('konark');
  const router = createRouter({ sites: new Map([['konark', konark]]), storeFor: () => memoryStore(), uploader: null });
  const result = await router.routeRequest({ method: 'GET', path: '/sites/konark/analytics', user });
  assert.equal(result.status, 200);
  assert.equal(result.body.configured, false);

  assert.equal(parseCredentials({ propertyId: 'G-ABC', serviceAccount: { client_email: 'x', private_key: 'k' } }), null);
  assert.deepEqual(parseCredentials('{"propertyId":"properties/123","serviceAccount":{"client_email":"a@b","private_key":"line\\\\nline"}}'), {
    propertyId: '123',
    clientEmail: 'a@b',
    privateKey: 'line\nline',
  });
});
