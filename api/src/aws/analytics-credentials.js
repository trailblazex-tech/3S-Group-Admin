/**
 * Where the Lambda finds a site's Google Analytics access: an SSM
 * SecureString at /3s-admin/sites/<site>/ga4 holding
 *   { "propertyId": "123456789", "serviceAccount": { ...Google key JSON... } }
 * (scripts/connect-analytics.mjs writes it). No parameter = the Analytics
 * page explains how to connect. Read once per container for 10 minutes.
 */
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { parseCredentials } from '../core/analytics.js';

export function createAnalyticsCredentials({ region = process.env.AWS_REGION || 'eu-north-1' } = {}) {
  const ssm = new SSMClient({ region });
  const cache = new Map();

  return async function credentialsFor(site) {
    const hit = cache.get(site.id);
    if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.value;

    let value = null;
    try {
      const { Parameter } = await ssm.send(new GetParameterCommand({ Name: `/3s-admin/sites/${site.id}/ga4`, WithDecryption: true }));
      value = parseCredentials(Parameter?.Value);
    } catch (error) {
      if (error.name !== 'ParameterNotFound') throw error;
    }
    cache.set(site.id, { at: Date.now(), value });
    return value;
  };
}
