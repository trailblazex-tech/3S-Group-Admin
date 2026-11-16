import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from '../src/core/router.js';
import { accessRequestMessage } from '../src/core/users.js';
import { userFromClaims } from '../src/core/access.js';
import { createMemoryUserAdmin } from '../src/local/memory-users.js';
import { memoryStore } from './helpers.js';

const sites = new Map([
  ['konark', { id: 'konark', name: 'The Konark Academy', collections: {} }],
  ['minerals', { id: 'minerals', name: '3S Minerals', collections: {} }],
]);

const mainAdmin = { id: 'boss', email: 'boss@example.com', name: 'Boss', groups: ['platform-admins'], isPlatformAdmin: true, userPoolId: 'pool' };
const editor = { id: 'ed', email: 'ed@example.com', name: 'Ed', groups: ['site-konark'], isPlatformAdmin: false, userPoolId: 'pool' };

function setup() {
  const userAdmin = createMemoryUserAdmin([
    { username: 'boss', email: 'boss@example.com', name: 'Boss', groups: ['platform-admins'] },
    { username: 'ed', email: 'ed@example.com', name: 'Ed', groups: ['site-konark'] },
    { username: 'new', email: 'new@example.com', name: 'New', groups: [] },
    { username: 'unv', email: 'unv@example.com', name: 'Unverified', status: 'UNCONFIRMED', groups: [] },
  ]);
  const router = createRouter({ sites, storeFor: () => memoryStore(), uploader: null, userAdmin });
  const call = (method, path, user = mainAdmin, body = {}) => router.routeRequest({ method, path, user, body });
  return { userAdmin, call };
}

test('only the main admin can see or change users', async () => {
  const { call } = setup();
  assert.equal((await call('GET', '/users', editor)).status, 403);
  assert.equal((await call('PUT', '/users/new', editor, { sites: ['konark'] })).status, 403);
  assert.equal((await call('GET', '/me', editor)).body.user.canManageUsers, false);
  assert.equal((await call('GET', '/me', mainAdmin)).body.user.canManageUsers, true);
});

test('the list puts requests first and says who is waiting', async () => {
  const { call } = setup();
  const { body } = await call('GET', '/users');
  assert.deepEqual(body.users.map((u) => [u.id, u.status]), [['new', 'pending'], ['unv', 'unverified'], ['boss', 'active'], ['ed', 'active']]);
  assert.equal(body.users.find((u) => u.id === 'boss').isYou, true);
  assert.deepEqual(body.users.find((u) => u.id === 'ed').sites, ['konark']);
  assert.deepEqual(body.sites.map((s) => s.id), ['konark', 'minerals']);
});

test('approving gives site groups; changing access adds and removes them', async () => {
  const { call, userAdmin } = setup();
  assert.equal((await call('PUT', '/users/new', mainAdmin, { sites: ['minerals'] })).status, 200);
  assert.deepEqual(userAdmin.users.get('new').groups, ['site-minerals']);
  await call('PUT', '/users/ed', mainAdmin, { sites: ['minerals'] });
  assert.deepEqual(userAdmin.users.get('ed').groups, ['site-minerals']);
});

test('bad requests are refused: unknown site, unverified email, own or main-admin account', async () => {
  const { call } = setup();
  assert.equal((await call('PUT', '/users/new', mainAdmin, { sites: ['nope'] })).status, 400);
  assert.equal((await call('PUT', '/users/new', mainAdmin, {})).status, 400);
  assert.equal((await call('PUT', '/users/unv', mainAdmin, { sites: ['konark'] })).status, 400);
  assert.equal((await call('PUT', '/users/boss', mainAdmin, { sites: ['konark'] })).status, 400);
  assert.equal((await call('DELETE', '/users/boss')).status, 400);
  assert.equal((await call('POST', '/users/boss/disable')).status, 400);
  assert.equal((await call('PUT', '/users/ghost', mainAdmin, { sites: ['konark'] })).status, 404);
});

test('disable, enable and remove', async () => {
  const { call, userAdmin } = setup();
  await call('POST', '/users/ed/disable');
  assert.equal(userAdmin.users.get('ed').enabled, false);
  assert.equal((await call('GET', '/users')).body.users.find((u) => u.id === 'ed').status, 'disabled');
  await call('POST', '/users/ed/enable');
  assert.equal(userAdmin.users.get('ed').enabled, true);
  await call('DELETE', '/users/new');
  assert.equal(userAdmin.users.has('new'), false);
});

test('without a user directory the Users page says so', async () => {
  const router = createRouter({ sites, storeFor: () => memoryStore(), uploader: null });
  assert.equal((await router.routeRequest({ method: 'GET', path: '/users', user: mainAdmin })).status, 501);
});

test('the token says which user pool to manage', () => {
  const user = userFromClaims({ sub: 'x', token_use: 'id', email: 'a@b.c', iss: 'https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_ABC123' });
  assert.equal(user.userPoolId, 'eu-north-1_ABC123');
});

test('the access-request email names the person and links to Users', () => {
  const { subject, message } = accessRequestMessage({ name: 'Priya', email: 'p@x.com', adminUrl: 'https://3sgroupadmin.com/' });
  assert.match(subject, /access request/);
  assert.match(message, /Priya \(p@x\.com\)/);
  assert.match(message, /https:\/\/3sgroupadmin\.com\/users/);
});
