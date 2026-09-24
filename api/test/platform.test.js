import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessSite, parseGroups, userFromClaims } from '../src/core/access.js';
import { buildDeliveryFiles } from '../src/core/delivery.js';
import { createRouter } from '../src/core/router.js';
import { planUpload } from '../src/core/uploads.js';
import { sites } from '../src/sites/index.js';
import { memoryStore, testCollections } from './helpers.js';

const claims = (groups) => ({ sub: 's1', token_use: 'id', email: 'a@b.com', 'cognito:groups': groups });

test('groups parse from API Gateway strings and from arrays', () => {
  assert.deepEqual(parseGroups('[platform-admins site-konark]'), ['platform-admins', 'site-konark']);
  assert.deepEqual(parseGroups(['site-a']), ['site-a']);
  assert.deepEqual(parseGroups(undefined), []);
});

test('only id tokens produce a user', () => {
  assert.equal(userFromClaims({ ...claims('[]'), token_use: 'access' }), null);
  assert.equal(userFromClaims(undefined), null);
});

test('site access comes from groups; signing in alone grants nothing', () => {
  assert.equal(canAccessSite(userFromClaims(claims('[site-konark]')), 'konark'), true);
  assert.equal(canAccessSite(userFromClaims(claims('[site-konark]')), 'other'), false);
  assert.equal(canAccessSite(userFromClaims(claims('[platform-admins]')), 'anything'), true);
  assert.equal(canAccessSite(userFromClaims(claims(undefined)), 'konark'), false);
});

test('delivery rebuilds content files with published records only', () => {
  const { files } = buildDeliveryFiles(testCollections, {
    gallery: {
      records: [
        { id: 'b', title: 'B', sortOrder: 2, isActive: true },
        { id: 'a', title: 'A', sortOrder: 1, isActive: true },
        { id: 'x', title: 'X', sortOrder: 3, isActive: false, deletedAt: '2026-01-01' },
      ],
      categories: ['One'],
    },
    info: { records: [{ id: 'r', label: 'Row', sortOrder: 1, isActive: true }] },
  });

  assert.deepEqual(files.gallery.photos.map((r) => r.id), ['a', 'b']);
  assert.deepEqual(files.gallery.categories, ['One']);
  assert.equal('isActive' in files.info.rows[0], false, 'collections without an isActive field never had one');
  assert.deepEqual(files.events.events, []);
});

test('upload plans pin site, section, type and size', () => {
  const plan = planUpload({ siteId: 's', collections: testCollections, collection: 'gallery', filename: 'My Photo!.JPG', contentType: 'image/jpeg', size: 1000 });
  assert.match(plan.key, /^s\/gallery\/my-photo-[0-9a-f]{10}\.jpg$/);
  assert.throws(() => planUpload({ siteId: 's', collections: testCollections, collection: 'nope', contentType: 'image/jpeg', size: 1 }), { status: 400 });
  assert.throws(() => planUpload({ siteId: 's', collections: testCollections, collection: 'gallery', contentType: 'text/html', size: 1 }), { status: 400 });
  assert.throws(() => planUpload({ siteId: 's', collections: testCollections, collection: 'gallery', contentType: 'image/png', size: 50e6 }), { status: 413 });
});

test('the router keeps sites apart', async () => {
  const testSites = new Map([
    ['one', { id: 'one', name: 'One', collections: testCollections }],
    ['two', { id: 'two', name: 'Two', collections: testCollections }],
  ]);
  const stores = { one: memoryStore(), two: memoryStore() };
  const router = createRouter({ sites: testSites, storeFor: (site) => stores[site.id], uploader: { presign: async () => ({}) } });
  const oneEditor = userFromClaims(claims('[site-one]'));

  const me = await router.routeRequest({ method: 'GET', path: '/me', user: oneEditor });
  assert.deepEqual(me.body.sites.map((site) => site.id), ['one']);

  const write = await router.routeRequest({ method: 'POST', path: '/sites/one/gallery', body: { title: 'T', category: 'C' }, user: oneEditor });
  assert.equal(write.status, 201);
  assert.equal(stores.one.data.gallery.records.length, 1);

  const denied = await router.routeRequest({ method: 'GET', path: '/sites/two/gallery', user: oneEditor });
  assert.equal(denied.status, 403);
  assert.equal(stores.two.data.gallery, undefined);

  assert.equal((await router.routeRequest({ method: 'GET', path: '/sites/one/gallery', user: null })).status, 401);
  assert.equal((await router.routeRequest({ method: 'GET', path: '/sites/zzz/gallery', user: oneEditor })).status, 404);

  const delivery = await router.routeRequest({ method: 'GET', path: '/delivery/one', user: null });
  assert.equal(delivery.status, 200);
  assert.equal(delivery.body.files.gallery.photos.length, 1);
});

test('every registered site declares valid collections', () => {
  assert.ok(sites.size >= 1);
  for (const site of sites.values()) assert.ok(site.publicUrl.startsWith('https://'), `${site.id} publicUrl`);
});
