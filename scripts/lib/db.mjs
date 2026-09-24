/**
 * Superuser database connection for one-off operations (schema, imports).
 * The Lambda never uses this - it connects as the least-privilege admin_api role.
 */
import pg from 'pg';
import { DsqlSigner } from '@aws-sdk/dsql-signer';
import { region, stackOutputs } from './aws.mjs';

export async function connectAsAdmin() {
  const host = stackOutputs().DatabaseEndpoint;
  const token = await new DsqlSigner({ hostname: host, region }).getDbConnectAdminAuthToken();
  const client = new pg.Client({ host, port: 5432, user: 'admin', password: token, database: 'postgres', ssl: { rejectUnauthorized: true } });
  await client.connect();
  return client;
}
