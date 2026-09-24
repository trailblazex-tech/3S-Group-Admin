/**
 * "Publish to website" = trigger that site's hosting build (an Amplify
 * incoming webhook, or any URL that starts a build on POST). Each site's
 * webhook lives in SSM Parameter Store as a SecureString at
 *   /3s-admin/sites/<site>/publish-webhook
 * so it can be set or rotated without a redeploy, and never sits in code.
 */
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export function createPublisher({ region = process.env.AWS_REGION || 'eu-north-1' } = {}) {
  const ssm = new SSMClient({ region });

  async function webhookFor(siteId) {
    try {
      const { Parameter } = await ssm.send(
        new GetParameterCommand({ Name: `/3s-admin/sites/${siteId}/publish-webhook`, WithDecryption: true }),
      );
      return Parameter?.Value || null;
    } catch (error) {
      if (error.name === 'ParameterNotFound') return null;
      throw error;
    }
  }

  return {
    async publish(site) {
      const webhook = await webhookFor(site.id);
      if (!webhook) {
        return { queued: false, message: `Publishing is not switched on for ${site.name} yet. Your changes are saved.` };
      }

      const response = await fetch(webhook, { method: 'POST', signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        console.error('[publish] webhook failed', site.id, response.status);
        return { queued: false, message: 'The website build could not be started. Your changes are saved - try again shortly.' };
      }

      return { queued: true, message: `Publishing ${site.name} - the live website updates in a few minutes.` };
    },
  };
}
