/**
 * Imports a site's existing content/*.json files into the database - the
 * one-time move when a site joins the platform. Re-running upserts the same
 * rows again (it never deletes), so it is safe to repeat.
 *
 *   npm run db:import -- --site konark --from ../konark-digital-academy/content [--dry-run]
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { arg, fail } from './lib/aws.mjs';
import { getSite } from '../api/src/sites/index.js';

const siteId = arg('site');
const from = arg('from');
const dryRun = Boolean(arg('dry-run', false));

const site = getSite(siteId);
if (!site) fail('Usage: npm run db:import -- --site <id> --from <path to content folder> [--dry-run]');
if (!from || !existsSync(from)) fail(`Content folder not found: ${from}`);

const plan = [];
for (const [name, collection] of Object.entries(site.collections)) {
  const file = path.join(from, `${collection.file}.json`);
  if (!existsSync(file)) {
    console.warn(`skip ${name}: ${file} does not exist`);
    continue;
  }
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const records = (data[collection.key] ?? []).map((record, index) => ({
    ...record,
    sortOrder: record.sortOrder ?? index + 1,
    isActive: record.isActive !== false,
  }));

  const missingIds = records.filter((record) => !record.id);
  if (missingIds.length > 0) fail(`${name}: ${missingIds.length} record(s) have no id`);
  const ids = new Set(records.map((record) => record.id));
  if (ids.size !== records.length) fail(`${name}: duplicate ids`);
  const tooLong = records.find((record) => String(record.id).length > 120);
  if (tooLong) fail(`${name}: id longer than 120 characters: ${tooLong.id}`);

  const categories = collection.groupsFrom ? (data[collection.groupsFrom] ?? []) : null;
  plan.push({ name, records, categories });
  console.log(`${name.padEnd(22)} ${String(records.length).padStart(4)} records${categories ? `, ${categories.length} categories` : ''}`);
}

if (dryRun) {
  console.log('\nDry run - nothing written.');
  process.exit(0);
}

const { connectAsAdmin } = await import('./lib/db.mjs');
const { upsertCategories, upsertRecords } = await import('../api/src/aws/dsql-store.js');

const client = await connectAsAdmin();
try {
  for (const { name, records, categories } of plan) {
    await client.query('BEGIN');
    await upsertRecords(client, site.id, name, records);
    if (categories) await upsertCategories(client, site.id, name, categories);
    await client.query('COMMIT');
  }

  const { rows } = await client.query(
    'SELECT collection, count(*)::int AS n FROM content_records WHERE site = $1 GROUP BY collection ORDER BY collection',
    [site.id],
  );
  console.log(`\nIn the database for ${site.id}:`);
  for (const row of rows) console.log(`  ${row.collection.padEnd(22)} ${row.n}`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
