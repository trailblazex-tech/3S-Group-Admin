/**
 * Creates the schema and the least-privilege admin_api role, and links that
 * role to the Lambda's IAM role. Safe to re-run.
 *
 *   npm run db:migrate
 */
import { readFileSync } from 'node:fs';
import { stackOutputs } from './lib/aws.mjs';
import { connectAsAdmin } from './lib/db.mjs';

const duplicateObject = '42710';
const lambdaRoleArn = stackOutputs().ApiFunctionRoleArn;

const statements = readFileSync(new URL('./db/schema.sql', import.meta.url), 'utf8')
  .replace(/--.*$/gm, '')
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

const client = await connectAsAdmin();
try {
  for (const statement of statements) {
    await client.query(statement);
    console.log('ok ', statement.split('\n')[0]);
  }

  try {
    await client.query('CREATE ROLE admin_api WITH LOGIN');
    console.log('ok  CREATE ROLE admin_api');
  } catch (error) {
    if (error.code !== duplicateObject) throw error;
    console.log('ok  role admin_api already exists');
  }

  // No DELETE anywhere: removals in the admin are soft.
  await client.query('GRANT SELECT, INSERT, UPDATE ON content_records, collection_meta TO admin_api');
  await client.query('GRANT SELECT, INSERT ON activity_log TO admin_api');
  console.log('ok  grants for admin_api');

  try {
    await client.query(`AWS IAM GRANT admin_api TO '${lambdaRoleArn}'`);
    console.log(`ok  admin_api <- ${lambdaRoleArn}`);
  } catch (error) {
    if (error.code !== duplicateObject && !/already/i.test(error.message)) throw error;
    console.log('ok  IAM mapping already in place');
  }
} finally {
  await client.end();
}
console.log('\nDatabase ready.');
