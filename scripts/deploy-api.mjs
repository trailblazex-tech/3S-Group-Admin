/**
 * Builds the Lambda bundles and ships them: the admin API, and Cognito's
 * custom email sender (once the stack has it).
 *
 *   npm run deploy:api
 */
import { execFileSync } from 'node:child_process';
import { aws, stackOutputs } from './lib/aws.mjs';

execFileSync('node', ['build.mjs'], { cwd: 'api', stdio: 'inherit' });

const outputs = stackOutputs();
const functions = [
  [outputs.ApiFunctionName, 'api/dist/lambda.zip'],
  [outputs.AuthMailerFunctionName, 'api/dist/auth-mailer.zip'],
].filter(([name]) => name);

for (const [functionName, zip] of functions) {
  aws(['lambda', 'update-function-code', '--function-name', functionName, '--zip-file', `fileb://${zip}`], { quiet: true });
  aws(['lambda', 'wait', 'function-updated-v2', '--function-name', functionName], { json: false });
  console.log(`Deployed ${functionName}.`);
}
