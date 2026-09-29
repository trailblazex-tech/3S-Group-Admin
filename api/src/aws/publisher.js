/**
 * "Publish to website" = trigger that site's hosting build. Each site's
 * webhook lives in SSM Parameter Store as a SecureString at
 *   /3s-admin/sites/<site>/publish-webhook
 * so it can be set or rotated without a redeploy, and never sits in code.
 *
 * The stored value is either:
 *   - a bare URL - POSTed to with no body (an Amplify incoming webhook), or
 *   - a JSON object { url, method?, headers?, body? } - for anything that
 *     needs auth, e.g. a GitHub Actions repository_dispatch call.
 */
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export function createPublisher({ region = process.env.AWS_REGION || 'eu-north-1' } = {}) {
  const ssm = new SSMClient({ region });

  async function requestFor(siteId) {
    let stored;
    try {
      const { Parameter } = await ssm.send(
        new GetParameterCommand({ Name: `/3s-admin/sites/${siteId}/publish-webhook`, WithDecryption: true }),
      );
      stored = Parameter?.Value || null;
    } catch (error) {
      if (error.name === 'ParameterNotFound') return null;
      throw error;
    }
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.url === 'string') {
        return { url: parsed.url, method: parsed.method ?? 'POST', headers: parsed.headers ?? {}, body: parsed.body };
      }
    } catch {
      // Not JSON - treat the whole value as a bare webhook URL.
    }
    return { url: stored, method: 'POST', headers: {}, body: undefined };
  }

  return {
    async publish(site) {
      const request = await requestFor(site.id);
      if (!request) {
        return { queued: false, message: `Publishing is not switched on for ${site.name} yet. Your changes are saved.` };
      }

      const response = await fetch(request.url, {
        method: request.method,
        headers: request.body ? { 'Content-Type': 'application/json', ...request.headers } : request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        console.error('[publish] webhook failed', site.id, response.status);
        return { queued: false, message: 'The website build could not be started. Your changes are saved - try again shortly.' };
      }

      return { queued: true, message: `Publishing ${site.name} - the live website updates in a few minutes.` };
    },
  };
}
