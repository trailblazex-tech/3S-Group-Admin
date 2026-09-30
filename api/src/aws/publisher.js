/**
 * "Publish to website" does two things:
 *
 *   1. Writes the site's published snapshot (see snapshot.js). Pages read it
 *      at load time, so visitors see the change within seconds. This is the
 *      step that makes a publish "live" - if it fails, nothing is published.
 *   2. Triggers the site's rebuild, so the pre-rendered HTML that search
 *      engines index catches up a few minutes later. Optional per site.
 *
 * The rebuild trigger lives in SSM Parameter Store as a SecureString at
 *   /3s-admin/sites/<site>/publish-webhook
 * as either a bare URL (POSTed to, e.g. an Amplify incoming webhook) or a
 * JSON object { url, method?, headers?, body? } for anything that needs auth,
 * like a GitHub Actions repository_dispatch.
 */
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export function createWebhookResolver({ region = process.env.AWS_REGION || 'eu-north-1' } = {}) {
  const ssm = new SSMClient({ region });

  return async function resolveWebhook(siteId) {
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
    return parseWebhook(stored);
  };
}

export function parseWebhook(stored) {
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed.url === 'string') {
      return { url: parsed.url, method: parsed.method ?? 'POST', headers: parsed.headers ?? {}, body: parsed.body };
    }
  } catch {
    // Not JSON - the whole value is a bare webhook URL.
  }
  return { url: stored, method: 'POST', headers: {}, body: undefined };
}

async function triggerRebuild(request) {
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.body ? { 'Content-Type': 'application/json', ...request.headers } : request.headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  return response.ok;
}

export function createPublisher({ snapshot, resolveWebhook, rebuild = triggerRebuild }) {
  return {
    async publish(site, files) {
      try {
        await snapshot.write(site.id, { site: site.id, publishedAt: new Date().toISOString(), ...files });
      } catch (error) {
        console.error('[publish] snapshot write failed', site.id, error);
        return { queued: false, message: 'Could not publish right now. Your changes are saved - try again in a moment.' };
      }

      let rebuildStarted = false;
      try {
        const request = await resolveWebhook(site.id);
        rebuildStarted = request ? await rebuild(request) : false;
        if (request && !rebuildStarted) console.error('[publish] rebuild trigger failed', site.id);
      } catch (error) {
        console.error('[publish] rebuild trigger error', site.id, error);
      }

      return {
        queued: true,
        rebuildStarted,
        message: `Published - visitors to ${site.name} see the changes within a minute.`,
      };
    },
  };
}
