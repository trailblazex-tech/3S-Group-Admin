/**
 * Every website this admin manages. Onboarding a site = add its folder here
 * (see docs/onboarding-a-site.md); nothing else in the engine changes.
 */
import { assertValidCollections } from '../core/schema.js';
import konark from './konark/site.js';

const all = [konark];

/**
 * 3S Group websites that are not on the platform yet. Platform admins see
 * them on the website picker as "coming soon", so the picker already shows
 * the whole group. Onboarding one (docs/onboarding-a-site.md) takes it off
 * this list automatically - an id that is also in `all` is never shown here.
 */
export const upcomingSites = [
  { id: 'minerals', name: '3S Minerals', shortName: '3M', tagline: 'Minerals & mining', publicUrl: 'https://3sminerals.co.in', accent: '222 38% 45%' },
  { id: 'globalgreens', name: '3S Global Greens', shortName: 'GG', tagline: 'Logistics & green energy', publicUrl: 'https://3sglobalgreens.com', accent: '152 45% 36%' },
  { id: 'security', name: '3S Security', shortName: 'SE', tagline: 'Security services', publicUrl: '', accent: '0 62% 45%' },
];

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
  return { id: site.id, name: site.name, shortName: site.shortName, tagline: site.tagline ?? '', publicUrl: site.publicUrl, accent: site.accent };
}

export function describeUpcoming(site) {
  return { id: site.id, name: site.name, shortName: site.shortName, tagline: site.tagline ?? '', publicUrl: site.publicUrl ?? '', accent: site.accent };
}
