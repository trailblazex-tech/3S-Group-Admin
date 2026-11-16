import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMenu, describeSite, getSite } from '../src/sites/index.js';

const site = (menu, collections) => ({
  id: 'demo',
  menu,
  collections: collections ?? { a: { label: 'A' }, b: { label: 'B' }, c: { label: 'C' }, x: { label: 'X', hidden: true } },
});

test('the menu orders sections and sets their group', () => {
  const result = applyMenu(site([
    { name: 'Second page', sections: ['c'] },
    { name: 'First page', sections: ['b', 'a'] },
  ]));
  assert.deepEqual(Object.keys(result.collections), ['c', 'b', 'a', 'x']);
  assert.equal(result.collections.a.group, 'First page');
  assert.equal(result.collections.c.group, 'Second page');
  assert.equal(result.collections.x.group, undefined);
});

test('a section missing from the menu, listed twice, unknown or hidden is refused', () => {
  assert.throws(() => applyMenu(site([{ name: 'P', sections: ['a', 'b'] }])), /"c" is missing/);
  assert.throws(() => applyMenu(site([{ name: 'P', sections: ['a', 'b', 'c', 'a'] }])), /"a" is in the menu twice/);
  assert.throws(() => applyMenu(site([{ name: 'P', sections: ['a', 'b', 'c', 'nope'] }])), /unknown section "nope"/);
  assert.throws(() => applyMenu(site([{ name: 'P', sections: ['a', 'b', 'c', 'x'] }])), /hidden section "x"/);
  assert.throws(() => applyMenu(site([{ name: 'P', icon: 'rocket', sections: ['a', 'b', 'c'] }])), /unknown icon/);
});

test('Global Greens: every section is in the page menu, which the admin receives without section lists', () => {
  const globalgreens = getSite('globalgreens');
  const groups = new Set(globalgreens.menu.map((entry) => entry.name));
  for (const [name, collection] of Object.entries(globalgreens.collections)) {
    if (!collection.hidden) assert.ok(groups.has(collection.group), `${name} has no menu entry`);
  }
  const described = describeSite(globalgreens);
  assert.equal(described.menu.length, globalgreens.menu.length);
  assert.equal(described.menu[0].sections, undefined);
  assert.equal(describeSite(getSite('konark')).menu, undefined);
});
