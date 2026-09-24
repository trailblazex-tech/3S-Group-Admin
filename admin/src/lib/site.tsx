import { createContext, useContext } from 'react';
import type { CollectionSummary, Site, SiteApi } from './api';

export interface SiteContextValue {
  site: Site;
  api: SiteApi;
  collections: CollectionSummary[];
  refreshCollections: () => void;
  /** Builds a link inside the current site: path('/c/gallery') -> /s/konark/c/gallery */
  path: (to: string) => string;
  /** Resolves a stored media value for preview: relative paths live on the site's public domain. */
  media: (src: string | null | undefined) => string;
}

export const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite() {
  const value = useContext(SiteContext);
  if (!value) throw new Error('useSite must be used inside a site workspace');
  return value;
}

export function mediaUrl(publicUrl: string, src: string | null | undefined) {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return `${publicUrl.replace(/\/$/, '')}${src.startsWith('/') ? '' : '/'}${src}`;
}
