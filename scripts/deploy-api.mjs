/**
 * Builds the Lambda bundle and ships it.
 *
 *   npm run deploy:api
 */
import { execFileSync } from 'node:child_process';
import { aws, stackOutputs } from './lib/aws.mjs';

execFileSync('node', ['build.mjs'], { cwd: 'api', stdio: 'inherit' });

const functionName = stackOutputs().ApiFunctionName;
aws(['lambda', 'update-function-code', '--function-name', functionName, '--zip-file', 'fileb://api/dist/lambda.zip'], {
  quiet: true,
});
aws(['lambda', 'wait', 'function-updated-v2', '--function-name', functionName], { json: false });
console.log(`Deployed ${functionName}.`);
