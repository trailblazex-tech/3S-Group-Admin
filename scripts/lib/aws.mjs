/** Small helpers shared by the ops scripts. They use your local AWS CLI credentials. */
import { execFileSync } from 'node:child_process';

export const region = process.env.AWS_REGION || 'eu-north-1';
// Stack names must start with a letter; the resources inside are named 3s-admin-*.
export const stackName = process.env.STACK_NAME || 'admin-3s';

export function aws(args, { json = true, quiet = false } = {}) {
  const output = execFileSync('aws', [...args, '--region', region, ...(json ? ['--output', 'json'] : [])], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', quiet ? 'pipe' : 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  });
  return json && output.trim() ? JSON.parse(output) : output;
}

let cachedOutputs;
export function stackOutputs() {
  if (cachedOutputs) return cachedOutputs;
  const { Stacks } = aws(['cloudformation', 'describe-stacks', '--stack-name', stackName]);
  cachedOutputs = Object.fromEntries((Stacks[0].Outputs ?? []).map((output) => [output.OutputKey, output.OutputValue]));
  return cachedOutputs;
}

export function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : true;
}

export function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}
