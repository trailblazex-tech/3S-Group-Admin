import { useEffect, useState } from 'react';
import type { GreetingLibrary, SiteApi } from './api';

/** The library is the same for the whole session - load it once per site. */
const cache = new Map<SiteApi, Promise<GreetingLibrary>>();

export function loadGreetingLibrary(api: SiteApi) {
  let pending = cache.get(api);
  if (!pending) {
    pending = api.library();
    pending.catch(() => cache.delete(api));
    cache.set(api, pending);
  }
  return pending;
}

export function useGreetingLibrary(api: SiteApi, enabled = true) {
  const [library, setLibrary] = useState<GreetingLibrary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadGreetingLibrary(api)
      .then((result) => alive && setLibrary(result))
      .catch((problem) => alive && setError(problem instanceof Error ? problem.message : 'Could not load the library.'));
    return () => {
      alive = false;
    };
  }, [api, enabled]);

  return { library, error };
}

/** Fills "{org}" in a template's text with the website's name. */
export function fillOrg(text: string, org: string) {
  return text.replaceAll('{org}', org);
}

/** Library banners are stored by their animated URL; this finds the entry again. */
export function bannerFor(library: GreetingLibrary | null, url: string) {
  return library?.banners.find((banner) => banner.url === url || banner.still === url) ?? null;
}
