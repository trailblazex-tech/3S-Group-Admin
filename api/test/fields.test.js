/**
 * Field types and options added for the 3S Minerals and 3S Global Greens
 * sites: one-per-line lists, map locations, MP4 uploads, any-phone forms.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, parseLatLng } from '../src/core/engine.js';
import { assertValidCollections } from '../src/core/schema.js';
import { validateSubmission } from '../src/core/forms.js';
import { planUpload } from '../src/core/uploads.js';
import { alice, memoryStore } from './helpers.js';

const collections = {
  places: {
    label: 'Places',
    file: 'places',
    key: 'places',
    titleField: 'name',
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'points', type: 'list', label: 'Points', maxItemLength: 50 },
      { name: 'map', type: 'text', label: 'Map location', parseAs: 'latLng' },
      { name: 'video', type: 'file', label: 'Video', accept: 'video' },
      { name: 'sortOrder', type: 'number', label: 'Order', adminOnly: true },
    ],
  },
};

test('list fields keep one item per line, commas and all', async () => {
  const engine = createEngine({ store: memoryStore(), collections });
  const created = await engine.create(
    'places',
    { name: 'Plant', points: 'Support for education, health, and sanitation\n\n   Water   recycling  \r\nSafety' },
    alice,
  );
  assert.deepEqual(created.points, ['Support for education, health, and sanitation', 'Water recycling', 'Safety']);

  const fromArray = await engine.create('places', { name: 'Office', points: ['One', '  ', 'Two'] }, alice);
  assert.deepEqual(fromArray.points, ['One', 'Two']);

  const empty = await engine.create('places', { name: 'Empty', points: '\n \n' }, alice);
  assert.equal(empty.points, null);

  await assert.rejects(engine.create('places', { name: 'Long', points: 'x'.repeat(51) }, alice), /each line can be up to 50 characters/);
  await assert.rejects(engine.create('places', { name: 'Many', points: Array.from({ length: 101 }, (_, i) => `p${i}`) }, alice), /up to 100 lines/);
});

test('a required list needs at least one real line', async () => {
  const required = structuredClone(collections);
  required.places.fields[1].required = true;
  const engine = createEngine({ store: memoryStore(), collections: required });
  await assert.rejects(engine.create('places', { name: 'A', points: '  \n ' }, alice), /needs at least one line/);
  await assert.rejects(engine.create('places', { name: 'A' }, alice), /needs at least one line/);
});

test('map locations accept coordinates or a pasted Google Maps link', async () => {
  assert.equal(parseLatLng('24.44723, 73.8706816'), '24.44723,73.8706816');
  assert.equal(parseLatLng('https://maps.google.com/maps?q=24.44723%2C73.8706816&z=17&hl=en'), '24.44723,73.8706816');
  assert.equal(parseLatLng('https://www.google.com/maps/place/Jaipur/@26.8499,75.7864,17z'), '26.8499,75.7864');
  // The exact pin (!3d/!4d) wins over the map's centre (@...).
  assert.equal(parseLatLng('https://www.google.com/maps/place/X/@26.1,75.1,17z/data=!3d26.8499!4d75.7864'), '26.8499,75.7864');
  assert.equal(parseLatLng('https://www.google.com/maps/dir/?api=1&destination=24.4,73.8'), '24.4,73.8');
  assert.equal(parseLatLng('-33.86, 151.2'), '-33.86,151.2');
  assert.equal(parseLatLng('somewhere in Udaipur'), null);
  assert.equal(parseLatLng('95, 10'), null, 'latitude out of range');
  assert.equal(parseLatLng('100%zz'), null, 'a broken % escape does not throw');

  const engine = createEngine({ store: memoryStore(), collections });
  const created = await engine.create('places', { name: 'Plant', map: 'https://maps.google.com/maps?q=24.44723%2C73.8706816' }, alice);
  assert.equal(created.map, '24.44723,73.8706816');
  const cleared = await engine.update('places', created.id, { map: '' }, alice);
  assert.equal(cleared.map, null);
  await assert.rejects(engine.create('places', { name: 'X', map: 'near the river' }, alice), /paste a Google Maps link/);
});

test('video file fields and MP4 uploads', async () => {
  const engine = createEngine({ store: memoryStore(), collections });
  const created = await engine.create('places', { name: 'Clip', video: 'https://cdn.example.com/minerals/places/story-ab12.mp4' }, alice);
  assert.match(created.video, /\.mp4$/);

  const plan = planUpload({ siteId: 'minerals', collections, collection: 'places', filename: 'Our Story.MP4', contentType: 'video/mp4', size: 30 * 1024 * 1024 });
  assert.match(plan.key, /^minerals\/places\/our-story-[0-9a-f]{10}\.mp4$/);
  assert.throws(
    () => planUpload({ siteId: 'minerals', collections, collection: 'places', filename: 'big.mp4', contentType: 'video/mp4', size: 101 * 1024 * 1024 }),
    /limit is 100 MB/,
  );
  assert.throws(
    () => planUpload({ siteId: 'minerals', collections, collection: 'places', filename: 'clip.mov', contentType: 'video/quicktime', size: 1000 }),
    /not allowed/,
  );
});

test('declaration checks catch misused list, accept and latLng options', () => {
  const bad = (field) => ({ x: { label: 'X', file: 'x', key: 'x', titleField: 'name', fields: [{ name: 'name', type: 'text', label: 'N' }, field, { name: 'sortOrder', type: 'number' }] } });
  assert.doesNotThrow(() => assertValidCollections('t', collections));
  assert.throws(() => assertValidCollections('t', bad({ name: 'v', type: 'image', accept: 'video' })), /accept "video" is only for file fields/);
  assert.throws(() => assertValidCollections('t', bad({ name: 'v', type: 'file', accept: 'audio' })), /accept "video" is only for file fields/);
  assert.throws(() => assertValidCollections('t', bad({ name: 'v', type: 'textarea', parseAs: 'latLng' })), /latLng/);
});

test('form phone fields: mobile by default, any number with format "any"', () => {
  const form = {
    fields: [
      { name: 'mobile', type: 'phone', label: 'Mobile' },
      { name: 'phone', type: 'phone', label: 'Phone', format: 'any' },
    ],
  };
  const ok = validateSubmission(form, { mobile: '+91 98765-43210', phone: '+91 (141) 222-3344' });
  assert.equal(ok.mobile, '+919876543210');
  assert.equal(ok.phone, '+911412223344');
  assert.equal(validateSubmission(form, { phone: '+44 20 7946 0958' }).phone, '+442079460958');
  assert.equal(validateSubmission(form, {}).phone, '');
  assert.throws(() => validateSubmission(form, { mobile: '0141 2223344' }), /10 digit mobile/);
  assert.throws(() => validateSubmission(form, { phone: '12345' }), /not a valid phone number/);
  assert.throws(() => validateSubmission(form, { phone: 'call me' }), /not a valid phone number/);
  assert.throws(() => validateSubmission({ fields: [{ name: 'p', type: 'phone', label: 'Phone', format: 'any', required: true }] }, {}), /Phone is required/);
});

test('number fields keep the decimal places they allow, and whole numbers otherwise', async () => {
  const withNumbers = {
    figures: {
      label: 'Figures',
      file: 'f',
      key: 'f',
      titleField: 'label',
      fields: [
        { name: 'label', type: 'text', label: 'Label', required: true },
        { name: 'value', type: 'number', label: 'Value', decimals: 2 },
        { name: 'count', type: 'number', label: 'Count' },
        { name: 'sortOrder', type: 'number', label: 'Order', adminOnly: true },
      ],
    },
  };
  assert.doesNotThrow(() => assertValidCollections('t', withNumbers));
  const engine = createEngine({ store: memoryStore(), collections: withNumbers });
  const saved = await engine.create('figures', { label: 'Recovery', value: '98.456', count: 7.6 }, alice);
  assert.equal(saved.value, 98.46);
  assert.equal(saved.count, 8);
  assert.throws(
    () => assertValidCollections('t', { x: { ...withNumbers.figures, fields: [...withNumbers.figures.fields, { name: 'bad', type: 'text', decimals: 2 }] } }),
    /decimals is 1-4/,
  );
});

test('form declarations: list/comment fields and phone formats are checked', async () => {
  const { assertValidForms } = await import('../src/core/forms.js');
  const base = { label: 'F', idPrefix: 'F', titleField: 'name', fields: [{ name: 'name', type: 'text' }, { name: 'phone', type: 'phone' }] };
  assert.doesNotThrow(() => assertValidForms('t', { enquiry: { ...base, listFields: ['phone'], commentField: 'name' } }));
  assert.throws(() => assertValidForms('t', { enquiry: { ...base, listFields: ['nope'] } }), /listFields "nope"/);
  assert.throws(() => assertValidForms('t', { enquiry: { ...base, commentField: 'nope' } }), /commentField "nope"/);
  assert.throws(() => assertValidForms('t', { enquiry: { ...base, fields: [...base.fields, { name: 'x', type: 'text', format: 'any' }] } }), /format "any"/);
});
