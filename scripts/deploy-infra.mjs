/**
 * Creates or updates the whole platform stack from infra/template.yaml.
 *
 *   npm run deploy:infra [-- --alarm-email you@example.com]
 */
import { arg, aws, stackName, stackOutputs } from './lib/aws.mjs';

const alarmEmail = arg('alarm-email', '');

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
    `AlarmEmail=${alarmEmail === true ? '' : alarmEmail}`,
    '--tags',
    'Project=3s-admin',
  ],
  { json: false },
);

console.log('\nStack outputs:');
for (const [key, value] of Object.entries(stackOutputs())) console.log(`  ${key.padEnd(22)} ${value}`);
