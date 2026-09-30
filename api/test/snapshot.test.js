import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { snapshotKey, snapshotScript } from '../src/aws/snapshot.js';

test('the browser copy sets the snapshot global when run as a script', () => {
  const payload = { site: 'konark', files: { staff: { members: [{ id: 'a', name: 'Quote " and </script> and   line sep' }] } } };
  const sandbox = { window: {} };
  vm.runInNewContext(snapshotScript(payload), sandbox);
  // Objects from another vm context have a different Object prototype; compare by value.
  assert.equal(JSON.stringify(sandbox.window.__CONTENT_SNAPSHOT__), JSON.stringify(payload));
});

test('snapshot keys live under delivery/', () => {
  assert.equal(snapshotKey('konark'), 'delivery/konark.json');
  assert.equal(snapshotKey('konark', 'js'), 'delivery/konark.js');
});
