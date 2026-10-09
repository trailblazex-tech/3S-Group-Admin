/**
 * Starts a site over: backs up the site's rows, deletes them - content,
 * categories, activity log and form submissions - and loads a content folder
 * in their place, all in one transaction. For handing a site to its owner
 * after testing; other sites are never touched.
 *
 *   npm run db:reset -- --site konark --from backups/reset-content --yes [--publish]
 *
 * Without --yes it only prints what it would do. The backup lands in
 * backups/db-backup-<site>-<time>.json first, whatever happens next.
 * --publish then writes the site's published snapshot from the new content,
 * as "Publish to website" does (without triggering a rebuild).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { arg, fail } from './lib/aws.mjs';
import { getSite } from '../api/src/sites/index.js';

const siteId = arg('site');
const from = arg('from');
const confirmed = Boolean(arg('yes', false));
const publish = Boolean(arg('publish', false));
const tables = ['content_records', 'collection_meta', 'activity_log', 'form_submissions'];

const site = getSite(siteId);
if (!site) fail('Usage: npm run db:reset -- --site <id> --from <content folder> [--yes]');
if (!from || !existsSync(from)) fail(`Content folder not found: ${from}`);

const plan = [];
for (const [name, collection] of Object.entries(site.collections)) {
  const file = path.join(from, `${collection.file}.json`);
  if (!existsSync(file)) fail(`${name}: ${file} does not exist - every section needs its file, even if empty`);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const records = (data[collection.key] ?? []).map((record, index) => ({
    ...record,
    sortOrder: record.sortOrder ?? index + 1,
    isActive: record.isActive !== false,
  }));
  if (records.some((record) => !record.id)) fail(`${name}: every record needs an id`);
  if (new Set(records.map((record) => record.id)).size !== records.length) fail(`${name}: duplicate ids`);
  const categories = collection.groupsFrom ? (data[collection.groupsFrom] ?? []) : null;
  plan.push({ name, records, categories });
  console.log(`${name.padEnd(22)} ${String(records.length).padStart(4)} records${categories ? `, ${categories.length} categories` : ''}`);
}

const { connectAsAdmin } = await import('./lib/db.mjs');
const { upsertCategories, upsertRecords } = await import('../api/src/aws/dsql-store.js');
const client = await connectAsAdmin();

try {
  const backup = { site: site.id, takenAt: new Date().toISOString() };
  for (const table of tables) backup[table] = (await client.query(`SELECT * FROM ${table} WHERE site = $1`, [site.id])).rows;
  mkdirSync('backups', { recursive: true });
  const backupFile = path.join('backups', `db-backup-${site.id}-${backup.takenAt.replace(/[:.]/g, '-')}.json`);
  writeFileSync(backupFile, JSON.stringify(backup, null, 1));
  console.log(`\nBacked up to ${backupFile}: ${tables.map((table) => `${table} ${backup[table].length}`).join(', ')}`);

  if (!confirmed) {
    console.log(`\nNothing changed. Add --yes to delete those rows and load ${from}.`);
    process.exit(0);
  }

  await client.query('BEGIN');
  for (const table of tables) {
    const { rowCount } = await client.query(`DELETE FROM ${table} WHERE site = $1`, [site.id]);
    console.log(`cleared ${table.padEnd(18)} ${rowCount}`);
  }
  for (const { name, records, categories } of plan) {
    if (records.length > 0) await upsertRecords(client, site.id, name, records);
    if (categories) await upsertCategories(client, site.id, name, categories);
  }
  await client.query('COMMIT');

  const { rows } = await client.query('SELECT collection, count(*)::int AS n FROM content_records WHERE site = $1 GROUP BY 1 ORDER BY 1', [site.id]);
  console.log(`\n${site.id} now holds:`);
  for (const row of rows) console.log(`  ${row.collection.padEnd(22)} ${row.n}`);

  if (publish) {
    // What "Publish to website" writes, minus the rebuild: pages read this
    // snapshot at load, so the site shows the reset content right away.
    const everything = {};
    for (const row of (await client.query('SELECT collection, id, sort_order, is_active, data FROM content_records WHERE site = $1', [site.id])).rows) {
      (everything[row.collection] ??= { records: [], categories: [] }).records.push({
        ...JSON.parse(row.data),
        id: row.id,
        sortOrder: row.sort_order,
        isActive: row.is_active,
      });
    }
    for (const row of (await client.query('SELECT collection, categories FROM collection_meta WHERE site = $1', [site.id])).rows) {
      (everything[row.collection] ??= { records: [], categories: [] }).categories = JSON.parse(row.categories);
    }
    const { buildDeliveryFiles } = await import('../api/src/core/delivery.js');
    const { createSnapshotWriter } = await import('../api/src/aws/snapshot.js');
    const { stackOutputs } = await import('./lib/aws.mjs');
    await createSnapshotWriter({ bucket: stackOutputs().MediaBucket }).write(site.id, {
      site: site.id,
      publishedAt: new Date().toISOString(),
      ...buildDeliveryFiles(site.collections, everything),
    });
    console.log(`\nPublished the snapshot - ${site.id}'s pages show this content within seconds.`);
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
