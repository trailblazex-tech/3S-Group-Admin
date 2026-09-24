import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, extractYoutubeId, routeSiteRequest } from '../src/core/engine.js';
import { alice, memoryStore, testCollections } from './helpers.js';

function setup(initial) {
  const store = memoryStore(initial);
  return { store, engine: createEngine({ store, collections: testCollections }) };
}

test('create assigns a slug id, next sort order, published by default', async () => {
  const { engine, store } = setup({ gallery: { records: [{ id: 'a', title: 'A', category: 'X', sortOrder: 4 }], categories: ['X'] } });
  const record = await engine.create('gallery', { title: 'Sports Day 2026', category: 'X' }, alice);

  assert.equal(record.id, 'sports-day-2026');
  assert.equal(record.sortOrder, 5);
  assert.equal(record.isActive, true);
  assert.equal(store.entries.at(-1).action, 'create');
});

test('ids stay unique when titles collide', async () => {
  const { engine } = setup({ gallery: { records: [{ id: 'sports', title: 'Sports', category: 'X', sortOrder: 1 }], categories: ['X'] } });
  const record = await engine.create('gallery', { title: 'Sports', category: 'X' }, alice);
  assert.equal(record.id, 'sports-2');
});

test('a new category typed into a form becomes an option', async () => {
  const { engine, store } = setup({ gallery: { records: [], categories: ['X'] } });
  await engine.create('gallery', { title: 'T', category: 'Annual Day' }, alice);
  assert.deepEqual(store.data.gallery.categories, ['X', 'Annual Day']);
});

test('validation messages are written for people', async () => {
  const { engine } = setup();
  await assert.rejects(engine.create('gallery', { category: 'X' }), { status: 400, message: 'Title is required.' });
  await assert.rejects(engine.create('gallery', { title: 'T', category: 'X', src: 'javascript:alert(1)' }), { status: 400 });
  await assert.rejects(engine.create('gallery', { title: 'T', category: 'X', src: 'http://insecure.example/a.jpg' }), {
    status: 400,
  });
  await assert.rejects(engine.create('gallery', { title: 'T', category: 'X', src: '//evil.example/a.jpg' }), { status: 400 });
});

test('dates must be real and in order', async () => {
  const { engine } = setup();
  await assert.rejects(engine.create('events', { title: 'E', startDate: '2026-02-30', endDate: '2026-03-01' }), { status: 400 });
  await assert.rejects(engine.create('events', { title: 'E', startDate: '2026-02-01x', endDate: '2026-03-01' }), { status: 400 });
  await assert.rejects(engine.create('events', { title: 'E', startDate: '2026-11-10', endDate: '2026-11-01' }), {
    status: 400,
    message: 'Show until cannot be before the start date.',
  });
  const ok = await engine.create('events', { title: 'E', startDate: '2026-11-01', endDate: '2026-11-10' }, alice);
  assert.equal(ok.endDate, '2026-11-10');
});

test('youtube links are reduced to the video id', async () => {
  assert.equal(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ?si=abc'), 'dQw4w9WgXcQ');
  assert.equal(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1'), 'dQw4w9WgXcQ');
  assert.equal(extractYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  const { engine } = setup();
  await assert.rejects(engine.create('events', { title: 'E', startDate: '2026-01-01', endDate: '2026-01-02', video: 'nope' }), {
    status: 400,
  });
});

test('update keeps fields the client did not send', async () => {
  const { engine } = setup({ gallery: { records: [{ id: 'a', title: 'A', src: '/a.jpg', category: 'X', sortOrder: 1, isActive: true }], categories: ['X'] } });
  const record = await engine.update('gallery', 'a', { isActive: false }, alice);
  assert.equal(record.src, '/a.jpg');
  assert.equal(record.isActive, false);
});

test('remove is soft, and restoring clears the removal stamp', async () => {
  const { engine, store } = setup({ gallery: { records: [{ id: 'a', title: 'A', category: 'X', sortOrder: 1, isActive: true }], categories: ['X'] } });
  await engine.remove('gallery', 'a', alice);
  assert.equal(store.data.gallery.records[0].isActive, false);
  assert.ok(store.data.gallery.records[0].deletedAt);

  await engine.update('gallery', 'a', { isActive: true }, alice);
  assert.equal(store.data.gallery.records[0].deletedAt, undefined);
});

test('fixed collections cannot gain or lose rows', async () => {
  const { engine } = setup({ info: { records: [{ id: 'r', label: 'Row', sortOrder: 1 }] } });
  await assert.rejects(engine.create('info', { label: 'New' }), { status: 400 });
  await assert.rejects(engine.remove('info', 'r'), { status: 400 });
});

test('reorder rewrites only records whose position changed', async () => {
  const records = ['a', 'b', 'c', 'd'].map((id, index) => ({ id, title: id, category: 'X', sortOrder: index + 1 }));
  const { engine, store } = setup({ gallery: { records, categories: ['X'] } });
  let saved = 0;
  const save = store.save;
  store.save = async (name, payload) => {
    saved = payload.records.length;
    return save(name, payload);
  };

  await engine.reorder('gallery', ['b', 'a'], alice);
  const order = store.data.gallery.records.sort((x, y) => x.sortOrder - y.sortOrder).map((r) => r.id);
  assert.deepEqual(order, ['b', 'a', 'c', 'd']);
  assert.equal(saved, 2);
  await assert.rejects(engine.reorder('gallery', ['zzz']), { status: 400 });
});

test('router maps methods and paths, and hides internals on failure', async () => {
  const { engine } = setup({ gallery: { records: [], categories: [] } });
  const created = await routeSiteRequest(engine, { method: 'POST', path: '/gallery', body: { title: 'T', category: 'X' }, user: alice });
  assert.equal(created.status, 201);

  assert.equal((await routeSiteRequest(engine, { method: 'GET', path: '/gallery/t' })).status, 200);
  assert.equal((await routeSiteRequest(engine, { method: 'GET', path: '/nope' })).status, 404);
  assert.equal((await routeSiteRequest(engine, { method: 'PATCH', path: '/gallery' })).status, 405);
  assert.equal((await routeSiteRequest(engine, { method: 'GET', path: '/gallery/t/extra' })).status, 404);

  const broken = createEngine({ store: { load: () => Promise.reject(new Error('db down: secret-host')) }, collections: testCollections });
  const failure = await routeSiteRequest(broken, { method: 'GET', path: '/gallery' });
  assert.equal(failure.status, 500);
  assert.doesNotMatch(JSON.stringify(failure.body), /secret-host/);
});

test('collection summary carries counts', async () => {
  const { engine } = setup({ gallery: { records: [{ id: 'a', isActive: true }, { id: 'b', isActive: false }], categories: [] } });
  const summary = await engine.listCollections();
  const gallery = summary.find((entry) => entry.name === 'gallery');
  assert.deepEqual([gallery.total, gallery.published], [2, 1]);
  assert.equal(summary.find((entry) => entry.name === 'info').total, 0);
});
