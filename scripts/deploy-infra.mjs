/**
 * Creates or updates the whole platform stack from infra/template.yaml, with
 * the values in infra/parameters.json.
 *
 *   npm run deploy:infra [-- --alarm-email you@example.com]
 */
import { readFileSync } from 'node:fs';
import { arg, aws, stackName, stackOutputs } from './lib/aws.mjs';

const parameters = JSON.parse(readFileSync('infra/parameters.json', 'utf8'));
const alarmEmail = arg('alarm-email', '');
if (typeof alarmEmail === 'string' && alarmEmail) parameters.AlarmEmail = alarmEmail;

aws(
  [
    'cloudformation',
    'deploy',
    '--template-file',
    'infra/template.yaml',
    '--stack-name',
    stackName,
    '--capabilities',
    'CAPABILITY_NAMED_IAM',
    '--no-fail-on-empty-changeset',
    '--parameter-overrides',
    ...Object.entries(parameters).map(([key, value]) => `${key}=${value}`),
    '--tags',
    'Project=3s-admin',
  ],
  { json: false },
);

console.log('\nStack outputs:');
for (const [key, value] of Object.entries(stackOutputs())) console.log(`  ${key.padEnd(22)} ${value}`);
