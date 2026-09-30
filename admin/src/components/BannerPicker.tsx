import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { GreetingBanner } from '../lib/api';
import { useSite } from '../lib/site';
import { useGreetingLibrary } from '../lib/library';
import { Dialog } from './Dialog';

/** What each group of banners is for, in the order editors look for them. */
export const themeLabels: Record<string, string> = {
  diwali: 'Diwali',
  holi: 'Holi',
  republic: 'Republic / Independence Day',
  dussehra: 'Dussehra',
  christmas: 'Christmas',
  newyear: 'New Year',
  lohri: 'Lohri',
  sankranti: 'Makar Sankranti',
  baisakhi: 'Baisakhi',
  gurpurab: 'Guru Nanak Jayanti',
  eid: 'Eid',
  rakhi: 'Raksha Bandhan',
  janmashtami: 'Janmashtami',
  ganesh: 'Ganesh Chaturthi',
  shivratri: 'Maha Shivratri',
  basant: 'Basant Panchami',
  gandhi: 'Gandhi Jayanti',
  teachers: "Teachers' Day",
  children: "Children's Day",
  hindi: 'Hindi Diwas',
  women: "Women's Day",
  yoga: 'Yoga Day',
  environment: 'Environment Day',
  school: 'School / admissions',
  celebration: 'Celebrations',
  sports: 'Sports Day',
  exams: 'Exams & results',
  summer: 'Summer vacation',
  winter: 'Winter vacation',
};

export function BannerTile({ banner, selected, onSelect }: { banner: GreetingBanner; selected: boolean; onSelect: () => void }) {
  const [isAnimating, setIsAnimating] = useState(false);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setIsAnimating(true)}
      onMouseLeave={() => setIsAnimating(false)}
      onFocus={() => setIsAnimating(true)}
      onBlur={() => setIsAnimating(false)}
      aria-pressed={selected}
      className={`group relative aspect-video overflow-hidden rounded-xl border-2 bg-muted text-left transition ${
        selected ? 'border-accent shadow-[0_0_0_3px_hsl(var(--site-accent)/0.25)]' : 'border-transparent hover:border-border'
      }`}
    >
      {/* Thumbnails keep the grid light; the moving version loads on hover. */}
      <img src={isAnimating || selected ? banner.url : banner.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
      <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
        {themeLabels[banner.theme] ?? banner.theme}
      </span>
      {selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-navy-deep">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}

export function BannerPicker({ current, onPick, onClose }: { current: string; onPick: (url: string) => void; onClose: () => void }) {
  const { api } = useSite();
  const { library, error } = useGreetingLibrary(api);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(current);
  const [isStill, setIsStill] = useState(false);

  // Open on the festival of the banner already chosen, if it is one of ours.
  useEffect(() => {
    const existing = library?.banners.find((banner) => banner.url === current || banner.still === current);
    if (!existing) return;
    setFilter(existing.theme);
    setIsStill(existing.still === current);
  }, [library, current]);

  const themes = useMemo(() => {
    const present = new Set(library?.banners.map((banner) => banner.theme));
    return Object.keys(themeLabels).filter((key) => present.has(key));
  }, [library]);

  const shown = library?.banners.filter((banner) => !filter || banner.theme === filter) ?? [];
  const chosen = library?.banners.find((banner) => banner.url === selected || banner.still === selected) ?? null;

  const chip = (value: string, label: string) => (
    <button
      key={value || 'all'}
      type="button"
      onClick={() => setFilter(value)}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        filter === value ? 'border-navy bg-navy text-white' : 'border-border bg-card text-foreground hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Dialog
      title="Choose a banner"
      description="Free to use - no credit needed. Hover to see it move."
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={isStill} onChange={(event) => setIsStill(event.target.checked)} className="h-4 w-4 accent-[hsl(var(--site-accent))]" />
            Use it without animation
          </label>
          {chosen?.credit && (
            <a href={chosen.credit.url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-muted-foreground underline">
              Photo{chosen.credit.creator ? ` by ${chosen.credit.creator}` : ''} ({chosen.credit.license})
            </a>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">
              Cancel
            </button>
            <button
              type="button"
              disabled={!chosen}
              onClick={() => chosen && onPick(isStill ? chosen.still : chosen.url)}
              className="h-10 rounded-lg bg-navy px-5 text-sm font-bold text-white hover:bg-navy-deep disabled:opacity-40"
            >
              Use this banner
            </button>
          </div>
        </div>
      }
    >
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}
      {!library && !error && (
        <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading banners...
        </p>
      )}
      {library && (
        <>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-3">
            {chip('', 'All')}
            {themes.map((key) => chip(key, themeLabels[key]))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((banner) => (
              <BannerTile key={banner.id} banner={banner} selected={chosen?.id === banner.id} onSelect={() => setSelected(banner.url)} />
            ))}
          </div>
        </>
      )}
    </Dialog>
  );
}
