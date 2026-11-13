/**
 * Checks a site's content/*.json against its declared sections, the way the
 * admin will: every record must pass the same validation an editor's save
 * does, so nothing imported is un-saveable later.
 *
 *   node scripts/check-content.mjs --site minerals --from ../3S_Minerals/content
 *
 * Also reports content keys no section covers (data the admin would never
 * show or publish) and sections with no records.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { arg, fail } from './lib/aws.mjs';
import { getSite } from '../api/src/sites/index.js';
import { createEngine } from '../api/src/core/engine.js';

const site = getSite(arg('site'));
const from = arg('from');
if (!site || !from || !existsSync(from)) fail('Usage: node scripts/check-content.mjs --site <id> --from <content folder>');

const user = { id: 'check', email: 'check@local', name: 'Content check', groups: ['platform-admins'], isPlatformAdmin: true };
const problems = [];
const covered = new Map();

for (const [name, collection] of Object.entries(site.collections)) {
  const file = path.join(from, `${collection.file}.json`);
  (covered.get(collection.file) ?? covered.set(collection.file, new Set()).get(collection.file)).add(collection.key);
  if (collection.groupsFrom) covered.get(collection.file).add(collection.groupsFrom);
  if (!existsSync(file)) {
    problems.push(`${name}: ${collection.file}.json is missing`);
    continue;
  }
  const records = JSON.parse(readFileSync(file, 'utf8'))[collection.key];
  if (!Array.isArray(records) || records.length === 0) {
    problems.push(`${name}: no records under "${collection.key}"`);
    continue;
  }

  // Save each record through the engine exactly as an editor would.
  const data = { [name]: { records: [], categories: JSON.parse(readFileSync(file, 'utf8'))[collection.groupsFrom] ?? [] } };
  const store = {
    async load(n) {
      return structuredClone(data[n] ?? { records: [], categories: [] });
    },
    async save(n, { records: changed = [], categories }) {
      const entry = (data[n] ??= { records: [], categories: [] });
      for (const record of changed) {
        const at = entry.records.findIndex((existing) => existing.id === record.id);
        if (at >= 0) entry.records[at] = record;
        else entry.records.push(record);
      }
      if (categories) entry.categories = categories;
    },
    async log() {},
  };
  data[name].records = records.map((record) => ({ ...record }));
  const engine = createEngine({ store, collections: site.collections });

  const fieldNames = new Set(collection.fields.map((field) => field.name));
  for (const record of records) {
    const extra = Object.keys(record).filter((key) => key !== 'id' && !fieldNames.has(key));
    if (extra.length) problems.push(`${name}/${record.id}: fields not in the declaration (never editable): ${extra.join(', ')}`);
    const body = Object.fromEntries(collection.fields.filter((field) => !field.adminOnly).map((field) => [field.name, record[field.name] ?? null]));
    try {
      const saved = await engine.update(name, record.id, body, user);
      for (const field of collection.fields) {
        if (field.adminOnly || field.type === 'boolean') continue;
        const before = JSON.stringify(record[field.name] ?? null);
        const after = JSON.stringify(saved[field.name] ?? null);
        if (before !== after) problems.push(`${name}/${record.id}.${field.name}: a save would change it from ${before.slice(0, 80)} to ${after.slice(0, 80)}`);
      }
    } catch (error) {
      problems.push(`${name}/${record.id}: ${error.message}`);
    }
  }
}

for (const file of readdirSync(from).filter((entry) => entry.endsWith('.json'))) {
  const name = file.replace(/\.json$/, '');
  const keys = Object.keys(JSON.parse(readFileSync(path.join(from, file), 'utf8')));
  const known = covered.get(name);
  if (!known) problems.push(`${file}: no section reads this file`);
  else for (const key of keys) if (!known.has(key)) problems.push(`${file}: key "${key}" is not covered by any section`);
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`${site.id}: every record in ${from} passes the admin's validation unchanged.`);
