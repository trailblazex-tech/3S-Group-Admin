/**
 * Every website this admin manages. Onboarding a site = add its folder here
 * (see docs/onboarding-a-site.md); nothing else in the engine changes.
 */
import { assertValidCollections } from '../core/schema.js';
import konark from './konark/site.js';

const all = [konark];

export const sites = new Map();
for (const site of all) {
  if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(site.id)) throw new Error(`Invalid site id "${site.id}"`);
  if (sites.has(site.id)) throw new Error(`Duplicate site id "${site.id}"`);
  assertValidCollections(site.id, site.collections);
  sites.set(site.id, site);
}

export function getSite(id) {
  return sites.get(id) ?? null;
}

/** What the admin panel needs to show a site in the switcher - never the collections. */
export function describeSite(site) {
  return { id: site.id, name: site.name, shortName: site.shortName, publicUrl: site.publicUrl, accent: site.accent };
}
