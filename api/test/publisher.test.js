import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPublisher, parseWebhook } from '../src/aws/publisher.js';

const site = { id: 'konark', name: 'The Konark Academy' };
const files = { files: { staff: { members: [] } } };

test('publishing writes the snapshot, then triggers the rebuild', async () => {
  const order = [];
  const publisher = createPublisher({
    snapshot: { write: async (siteId, payload) => order.push(['snapshot', siteId, payload.files.staff]) },
    resolveWebhook: async () => ({ url: 'https://example.com/hook', method: 'POST', headers: {} }),
    rebuild: async () => {
      order.push(['rebuild']);
      return true;
    },
  });

  const result = await publisher.publish(site, files);
  assert.equal(result.queued, true);
  assert.equal(result.rebuildStarted, true);
  assert.deepEqual(order.map((step) => step[0]), ['snapshot', 'rebuild']);
});

test('a failed snapshot means nothing was published', async () => {
  let rebuilt = false;
  const publisher = createPublisher({
    snapshot: { write: async () => { throw new Error('S3 down'); } },
    resolveWebhook: async () => ({ url: 'https://example.com/hook' }),
    rebuild: async () => { rebuilt = true; return true; },
  });

  const result = await publisher.publish(site, files);
  assert.equal(result.queued, false);
  assert.equal(rebuilt, false);
});

test('a failed rebuild still counts as published - visitors already see the snapshot', async () => {
  const publisher = createPublisher({
    snapshot: { write: async () => undefined },
    resolveWebhook: async () => ({ url: 'https://example.com/hook' }),
    rebuild: async () => false,
  });

  const result = await publisher.publish(site, files);
  assert.equal(result.queued, true);
  assert.equal(result.rebuildStarted, false);
});

test('no webhook configured is fine', async () => {
  const publisher = createPublisher({ snapshot: { write: async () => undefined }, resolveWebhook: async () => null });
  assert.equal((await publisher.publish(site, files)).queued, true);
});

test('webhooks parse as bare URLs or JSON requests', () => {
  assert.deepEqual(parseWebhook('https://amplify.example/hook'), {
    url: 'https://amplify.example/hook', method: 'POST', headers: {}, body: undefined,
  });
  const parsed = parseWebhook(JSON.stringify({ url: 'https://api.github.com/x', headers: { A: 'b' }, body: { event_type: 'publish' } }));
  assert.equal(parsed.url, 'https://api.github.com/x');
  assert.deepEqual(parsed.body, { event_type: 'publish' });
  assert.equal(parseWebhook(null), null);
});

test('a pre-rendered site counts as published only when its rebuild started', async () => {
  const rebuildSite = { id: 'globalgreens', name: '3S Global Greens', publishDelay: 'rebuild' };
  const make = (rebuild, hook = { url: 'https://api.github.com/repos/x/y/dispatches' }) =>
    createPublisher({ snapshot: { write: async () => undefined }, resolveWebhook: async () => hook, rebuild });

  const started = await make(async () => true).publish(rebuildSite, files);
  assert.equal(started.queued, true);
  assert.match(started.message, /being rebuilt/);

  const failed = await make(async () => false).publish(rebuildSite, files);
  assert.equal(failed.queued, false);
  assert.match(failed.message, /could not be rebuilt/);

  const noHook = await make(async () => true, null).publish(rebuildSite, files);
  assert.equal(noHook.queued, false, 'without a rebuild hook nothing would change on the site');
});
