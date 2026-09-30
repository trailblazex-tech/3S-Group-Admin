import { useMemo, useState } from 'react';
import { CalendarDays, Loader2, PenLine, Search } from 'lucide-react';
import type { GreetingTemplate } from '../lib/api';
import { useSite } from '../lib/site';
import { useGreetingLibrary } from '../lib/library';
import { formatDay, suggestDates } from '../lib/schedule';
import { Dialog } from './Dialog';

function dateHint(template: GreetingTemplate) {
  if (!template.on) return 'Date changes every year';
  const next = suggestDates(template.on, [0, 0]);
  return next ? formatDay(next.endDate) : '';
}

/** Start a greeting from a festival or school occasion, or from a blank form. */
export function TemplatePicker({ onPick, onBlank, onClose }: { onPick: (template: GreetingTemplate) => void; onBlank: () => void; onClose: () => void }) {
  const { api } = useSite();
  const { library, error } = useGreetingLibrary(api);
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = (library?.templates ?? []).filter((template) => !needle || template.label.toLowerCase().includes(needle) || template.title.toLowerCase().includes(needle));
    const byGroup = new Map<string, GreetingTemplate[]>();
    for (const template of matches) byGroup.set(template.group, [...(byGroup.get(template.group) ?? []), template]);
    return [...byGroup.entries()];
  }, [library, search]);

  const thumbFor = (theme: string) => library?.banners.find((banner) => banner.theme === theme)?.thumb;

  return (
    <Dialog title="What is the greeting for?" description="Pick an occasion and the headline, message, banner and dates are filled in for you - change anything before saving." onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Diwali, Sports Day..."
            aria-label="Search occasions"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button type="button" onClick={onBlank} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">
          <PenLine className="h-4 w-4" />
          Start from a blank form
        </button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}
      {!library && !error && (
        <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading occasions...
        </p>
      )}
      {library && groups.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No occasion matches "{search}".</p>}

      {groups.map(([group, templates]) => (
        <section key={group} className="mt-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{group}</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onPick(template)}
                className="group overflow-hidden rounded-xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg focus-visible:border-accent"
              >
                <span className="block aspect-video overflow-hidden bg-muted">
                  {thumbFor(template.theme) && <img src={thumbFor(template.theme)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                </span>
                <span className="block px-3 py-2.5">
                  <span className="block truncate text-sm font-semibold text-foreground">{template.label}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {dateHint(template)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </Dialog>
  );
}
