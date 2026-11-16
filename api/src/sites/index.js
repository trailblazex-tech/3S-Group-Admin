/**
 * Every website this admin manages. Onboarding a site = add its folder here
 * (see docs/onboarding-a-site.md); nothing else in the engine changes.
 */
import { assertValidCollections } from '../core/schema.js';
import { assertValidForms } from '../core/forms.js';
import konark from './konark/site.js';
import minerals from './minerals/site.js';
import globalgreens from './globalgreens/site.js';

const all = [konark, minerals, globalgreens];

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

/** Icons the admin has for menu entries (admin/src/components/AdminLayout.tsx). */
const menuIcons = new Set(['globe', 'home', 'info', 'package', 'leaf', 'award', 'briefcase']);

/**
 * A site with a `menu` lists its sections page by page. This puts the
 * sections in menu order and sets each one's group to its menu entry, so
 * the admin's sidebar and dashboard follow the website. Every section the
 * menu can show must be in it exactly once.
 */
export function applyMenu(site) {
  if (!site.menu) return site;
  const seen = new Set();
  const ordered = {};
  for (const entry of site.menu) {
    if (!entry.name || !Array.isArray(entry.sections) || entry.sections.length === 0) {
      throw new Error(`${site.id}: every menu entry needs a name and sections`);
    }
    if (entry.icon && !menuIcons.has(entry.icon)) throw new Error(`${site.id}: menu "${entry.name}" has unknown icon "${entry.icon}"`);
    for (const name of entry.sections) {
      const collection = site.collections[name];
      if (!collection) throw new Error(`${site.id}: menu "${entry.name}" lists unknown section "${name}"`);
      if (collection.hidden) throw new Error(`${site.id}: menu "${entry.name}" lists hidden section "${name}"`);
      if (seen.has(name)) throw new Error(`${site.id}: section "${name}" is in the menu twice`);
      seen.add(name);
      ordered[name] = { ...collection, group: entry.name };
    }
  }
  for (const [name, collection] of Object.entries(site.collections)) {
    if (seen.has(name)) continue;
    if (!collection.hidden) throw new Error(`${site.id}: section "${name}" is missing from the menu`);
    ordered[name] = collection;
  }
  site.collections = ordered;
  return site;
}

export const sites = new Map();
for (const site of all) {
  if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(site.id)) throw new Error(`Invalid site id "${site.id}"`);
  if (sites.has(site.id)) throw new Error(`Duplicate site id "${site.id}"`);
  applyMenu(site);
  assertValidCollections(site.id, site.collections);
  assertValidForms(site.id, site.forms ?? {});
  sites.set(site.id, site);
}

export function getSite(id) {
  return sites.get(id) ?? null;
}

/** What the admin panel needs to show a site in the switcher - never the collections. */
export function describeSite(site) {
  return {
    id: site.id,
    name: site.name,
    shortName: site.shortName,
    tagline: site.tagline ?? '',
    publicUrl: site.publicUrl,
    accent: site.accent,
    // Shows the Feedback & Leads page. A site can keep its forms (the website
    // still posts them and they are stored) while hiding the page.
    hasForms: Object.keys(site.forms ?? {}).length > 0 && !site.hiddenPages?.includes('leads'),
    hasAnalytics: !site.hiddenPages?.includes('analytics'),
    // The page-by-page menu, without its section lists (the sections carry
    // their group). Absent = the admin's plain grouped menu.
    ...(site.menu && {
      menu: site.menu.map(({ name, icon, path, description }) => ({ name, icon: icon ?? null, path: path ?? null, description: description ?? '' })),
    }),
  };
}

export function describeUpcoming(site) {
  return { id: site.id, name: site.name, shortName: site.shortName, tagline: site.tagline ?? '', publicUrl: site.publicUrl ?? '', accent: site.accent };
}
