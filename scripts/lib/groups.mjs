import { aws } from './aws.mjs';

/** Returns the Cognito group for a site, creating it the first time. */
export function ensureSiteGroup(userPoolId, siteId) {
  const group = `site-${siteId}`;
  try {
    aws(['cognito-idp', 'get-group', '--user-pool-id', userPoolId, '--group-name', group], { quiet: true });
  } catch {
    aws(
      ['cognito-idp', 'create-group', '--user-pool-id', userPoolId, '--group-name', group, '--description', `Can edit the ${siteId} website.`],
      { quiet: true },
    );
    console.log(`Created group ${group}.`);
  }
  return group;
}
