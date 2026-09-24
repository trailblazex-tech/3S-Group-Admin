/**
 * Production store: Aurora DSQL. One set of tables serves every site; every
 * query is keyed by site, and a store instance is bound to exactly one site,
 * so the engine above it cannot reach another site's rows.
 *
 * Schema: scripts/db/schema.sql. The Lambda connects as the least-privilege
 * database role admin_api (SELECT/INSERT/UPDATE only - no DELETE, deletes in
 * the admin are soft), never as the cluster superuser.
 */
import crypto from 'node:crypto';
import pg from 'pg';
import { DsqlSigner } from '@aws-sdk/dsql-signer';

const region = process.env.AWS_REGION || 'eu-north-1';
const maxRowsPerStatement = 200;

let pool;

function getPool() {
  if (pool) return pool;

  const hostname = process.env.DSQL_ENDPOINT;
  if (!hostname) throw new Error('DSQL_ENDPOINT is not set');
  const signer = new DsqlSigner({ hostname, region });

  pool = new pg.Pool({
    host: hostname,
    port: 5432,
    user: 'admin_api',
    database: 'postgres',
    ssl: { rejectUnauthorized: true },
    // A fresh IAM token per new connection; tokens only matter at connect time.
    password: () => signer.getDbConnectAuthToken(),
    max: 3,
    idleTimeoutMillis: 5 * 60 * 1000,
    connectionTimeoutMillis: 5000,
    // DSQL closes connections after 60 minutes; retire them well before.
    maxLifetimeSeconds: 50 * 60,
  });
  pool.on('error', (error) => console.error('[dsql] idle connection error', error.message));
  return pool;
}

/** DSQL uses optimistic concurrency: a conflicting commit fails with 40001 and is safe to retry. */
async function withTransaction(work) {
  for (let attempt = 1; ; attempt += 1) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error.code === '40001' && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 40 * attempt + Math.random() * 60));
        continue;
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

function rowToRecord(row) {
  return { ...JSON.parse(row.data), id: row.id, sortOrder: row.sort_order, isActive: row.is_active };
}

function recordToRow(record) {
  const { id, sortOrder, isActive, ...data } = record;
  return [id, Number.isFinite(sortOrder) ? sortOrder : 0, isActive !== false, JSON.stringify(data)];
}

export async function upsertRecords(client, site, collection, records) {
  for (let start = 0; start < records.length; start += maxRowsPerStatement) {
    const chunk = records.slice(start, start + maxRowsPerStatement);
    const params = [site, collection];
    const values = chunk.map((record) => {
      const base = params.length;
      params.push(...recordToRow(record));
      return `($1, $2, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, now())`;
    });

    await client.query(
      `INSERT INTO content_records (site, collection, id, sort_order, is_active, data, updated_at)
       VALUES ${values.join(', ')}
       ON CONFLICT (site, collection, id) DO UPDATE SET
         sort_order = EXCLUDED.sort_order,
         is_active = EXCLUDED.is_active,
         data = EXCLUDED.data,
         updated_at = now()`,
      params,
    );
  }
}

export async function upsertCategories(client, site, collection, categories) {
  await client.query(
    `INSERT INTO collection_meta (site, collection, categories, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (site, collection) DO UPDATE SET categories = EXCLUDED.categories, updated_at = now()`,
    [site, collection, JSON.stringify(categories)],
  );
}

export function createDsqlStore(site, { publisher }) {
  const siteId = site.id;

  return {
    async load(collection) {
      const db = getPool();
      const [records, meta] = await Promise.all([
        db.query('SELECT id, sort_order, is_active, data FROM content_records WHERE site = $1 AND collection = $2', [
          siteId,
          collection,
        ]),
        db.query('SELECT categories FROM collection_meta WHERE site = $1 AND collection = $2', [siteId, collection]),
      ]);
      return {
        records: records.rows.map(rowToRecord),
        categories: meta.rows[0] ? JSON.parse(meta.rows[0].categories) : [],
      };
    },

    async loadAll() {
      const db = getPool();
      const [records, meta] = await Promise.all([
        db.query('SELECT collection, id, sort_order, is_active, data FROM content_records WHERE site = $1', [siteId]),
        db.query('SELECT collection, categories FROM collection_meta WHERE site = $1', [siteId]),
      ]);

      const everything = {};
      for (const row of records.rows) {
        (everything[row.collection] ??= { records: [], categories: [] }).records.push(rowToRecord(row));
      }
      for (const row of meta.rows) {
        (everything[row.collection] ??= { records: [], categories: [] }).categories = JSON.parse(row.categories);
      }
      return everything;
    },

    async save(collection, { records = [], categories }) {
      await withTransaction(async (client) => {
        if (records.length > 0) await upsertRecords(client, siteId, collection, records);
        if (categories) await upsertCategories(client, siteId, collection, categories);
      });
    },

    async counts() {
      const { rows } = await getPool().query(
        `SELECT collection,
                count(*)::int AS total,
                sum(CASE WHEN is_active THEN 1 ELSE 0 END)::int AS published
         FROM content_records WHERE site = $1 GROUP BY collection`,
        [siteId],
      );
      return Object.fromEntries(rows.map((row) => [row.collection, { total: row.total, published: row.published }]));
    },

    async log(entry) {
      await getPool().query(
        `INSERT INTO activity_log (site, at, id, user_email, user_name, action, collection, record_id, title)
         VALUES ($1, now(), $2, $3, $4, $5, $6, $7, $8)`,
        [
          siteId,
          crypto.randomUUID(),
          entry.user?.email?.slice(0, 254) ?? null,
          (entry.user?.name ?? 'unknown').slice(0, 120),
          entry.action,
          entry.collection,
          entry.recordId,
          entry.title ? String(entry.title).slice(0, 300) : null,
        ],
      );
    },

    async activity(limit) {
      const { rows } = await getPool().query(
        `SELECT at, user_name AS "user", user_email AS "email", action, collection, record_id AS "recordId", title
         FROM activity_log WHERE site = $1 ORDER BY at DESC LIMIT $2`,
        [siteId, limit],
      );
      return rows.map((row) => ({ ...row, at: new Date(row.at).toISOString() }));
    },

    publish(user) {
      return publisher.publish(site, user);
    },
  };
}
