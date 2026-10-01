import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ExternalLink, LineChart, Loader2, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { AnalyticsReport, AnalyticsTotals } from '../lib/api';
import { useSite } from '../lib/site';

const ranges = [
  { days: 7, label: '7 days' },
  { days: 28, label: '28 days' },
  { days: 90, label: '90 days' },
];

const number = (value: number) => Math.round(value).toLocaleString('en-IN');

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${Math.round(seconds % 60)}s` : `${Math.round(seconds)}s`;
}

function shortDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Change against the previous period of the same length; nothing to compare with shows nothing. */
function Change({ now, before }: { now: number; before: number }) {
  if (!before) return null;
  const change = ((now - before) / before) * 100;
  if (Math.abs(change) < 0.5) return <span className="text-xs text-muted-foreground">same as before</span>;
  const up = change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-success' : 'text-destructive'}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(0)}% vs previous
    </span>
  );
}

function Kpi({ label, value, totals, previous, field, format = number }: { label: string; value?: ReactNode; totals: AnalyticsTotals; previous: AnalyticsTotals; field: keyof AnalyticsTotals; format?: (value: number) => string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value ?? format(totals[field])}</p>
      <div className="mt-1 min-h-4">
        <Change now={totals[field]} before={previous[field]} />
      </div>
    </div>
  );
}

/** Views per day: one series, bars from a shared baseline, a tooltip on hover or tap. */
function DailyChart({ daily }: { daily: { date: string; views: number; visitors: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (daily.length === 0) return <p className="py-16 text-center text-sm text-muted-foreground">No visits in this period yet.</p>;

  const max = Math.max(...daily.map((day) => day.views), 1);
  const step = Math.max(1, Math.ceil(daily.length / 7));
  const point = active === null ? null : daily[active];

  return (
    <div>
      <div className="relative h-48" onMouseLeave={() => setActive(null)}>
        {/* recessive grid: quarter lines */}
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <div key={fraction} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${fraction * 100}%` }}>
            <span className="absolute -top-2 right-0 bg-card pl-1 text-[10px] tabular-nums text-muted-foreground">{number(max * fraction)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] pr-10">
          {daily.map((day, index) => (
            <button
              key={day.date}
              type="button"
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
              aria-label={`${shortDay(day.date)}: ${day.views} views, ${day.visitors} visitors`}
              className="group flex h-full min-w-0 flex-1 items-end"
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${active === index ? 'bg-navy' : 'bg-brand-blue/70 group-hover:bg-navy'}`}
                style={{ height: `${Math.max((day.views / max) * 100, day.views ? 2 : 0)}%` }}
              />
            </button>
          ))}
        </div>
        {point && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-navy-deep px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `calc(${((active! + 0.5) / daily.length) * 100}% - ${((active! + 0.5) / daily.length) * 2.5}rem)` }}
          >
            <p className="font-semibold">{shortDay(point.date)}</p>
            <p className="tabular-nums text-white/80">
              {number(point.views)} views · {number(point.visitors)} visitors
            </p>
          </div>
        )}
      </div>
      <div className="mt-2 flex pr-10 text-[10px] text-muted-foreground">
        {daily.map((day, index) => (
          <span key={day.date} className="min-w-0 flex-1 truncate text-center">
            {index % step === 0 ? shortDay(day.date) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A ranked list with a bar behind each value - the job is comparing magnitudes. */
function RankedBars({ rows, empty }: { rows: { key: string; label: ReactNode; value: number; title?: string }[]; empty: string }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.key} title={row.title}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-foreground">{row.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{number(row.value)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand-blue/70" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

const deviceIcons: Record<string, typeof Monitor> = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

function NotConnected() {
  const { path } = useSite();
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-6 sm:p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
        <LineChart className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Google Analytics reports are not connected yet</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        The website already sends visits to Google Analytics (the measurement IDs are under{' '}
        <Link to={path('/c/site-analytics')} className="font-semibold text-foreground underline">
          Website Analytics
        </Link>
        ). To see the numbers here, a platform administrator connects the GA4 property once:
      </p>
      <ol className="mt-4 max-w-2xl list-decimal space-y-2 pl-5 text-sm leading-6 text-foreground">
        <li>In Google Analytics, open Admin, then Property access management, and add the service account's email as a Viewer.</li>
        <li>
          Note the property ID under Admin, then Property details - digits only, not the G-... measurement ID.
        </li>
        <li>
          Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run analytics:connect -- --site &lt;id&gt; --property &lt;property id&gt; --key &lt;key.json&gt;</code>
        </li>
      </ol>
    </div>
  );
}

/** Website traffic from Google Analytics 4, for people who don't use GA itself. */
export function AnalyticsPage() {
  const { api, site } = useSite();
  const [days, setDays] = useState(28);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    setReport(null);
    api
      .analytics(days)
      .then((next) => alive && setReport(next))
      .catch((problem) => alive && setError(problem instanceof Error ? problem.message : 'Could not load analytics.'));
    return () => {
      alive = false;
    };
  }, [api, days]);

  const ready = report?.configured ? report : null;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Who visits {site.name}, what they look at, and what they do. From Google Analytics.</p>
        </div>
        {report?.configured !== false && (
          <div role="tablist" aria-label="Period" className="inline-flex rounded-lg border border-border bg-card p-1">
            {ranges.map((range) => (
              <button
                key={range.days}
                type="button"
                role="tab"
                aria-selected={days === range.days}
                onClick={() => setDays(range.days)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${days === range.days ? 'bg-navy text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {!report && !error && (
        <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the last {days} days from Google Analytics...
        </p>
      )}

      {report?.configured === false && <NotConnected />}

      {ready && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Visitors" totals={ready.totals} previous={ready.previous} field="activeUsers" />
            <Kpi label="New visitors" totals={ready.totals} previous={ready.previous} field="newUsers" />
            <Kpi label="Page views" totals={ready.totals} previous={ready.previous} field="screenPageViews" />
            <Kpi label="Engaged visits" totals={ready.totals} previous={ready.previous} field="engagementRate" format={(value) => `${Math.round(value * 100)}%`} />
            <Kpi label="Time per visit" totals={ready.totals} previous={ready.previous} field="averageSessionDuration" format={duration} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Today so far: <span className="font-semibold text-foreground">{number(ready.today.visitors)}</span> visitors, {number(ready.today.views)} page views. Updated{' '}
            {new Date(ready.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}; Google can take a few hours to count the latest visits.
          </p>

          <Panel title="Page views per day" className="mt-5">
            <DailyChart daily={ready.daily} />
          </Panel>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Most viewed pages">
              <RankedBars
                empty="No page views yet."
                rows={ready.pages.map((page) => ({
                  key: page.path,
                  value: page.views,
                  title: page.title,
                  label: (
                    <a href={`${site.publicUrl.replace(/\/$/, '')}${page.path}`} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 hover:underline">
                      <span className="truncate">{page.path === '/' ? 'Home page' : page.path}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </a>
                  ),
                }))}
              />
            </Panel>
            <Panel title="What visitors did">
              <RankedBars empty="No actions recorded yet." rows={ready.actions.filter((action) => action.count > 0).map((action) => ({ key: action.name, label: action.label, value: action.count }))} />
            </Panel>
            <Panel title="How they found the website">
              <RankedBars empty="No visits yet." rows={ready.channels.map((channel) => ({ key: channel.name, label: channel.name, value: channel.sessions }))} />
            </Panel>
            <Panel title="Where they are">
              <RankedBars empty="No visits yet." rows={ready.cities.map((city) => ({ key: city.name, label: city.name, value: city.visitors }))} />
            </Panel>
          </div>

          <Panel title="Devices" className="mt-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {ready.devices.map((device) => {
                const Icon = deviceIcons[device.name] ?? Monitor;
                const total = ready.devices.reduce((sum, entry) => sum + entry.visitors, 0) || 1;
                return (
                  <div key={device.name} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                    <Icon className="h-5 w-5 text-brand-blue" />
                    <span className="flex-1 text-sm capitalize text-foreground">{device.name}</span>
                    <span className="text-sm font-bold tabular-nums text-foreground">{Math.round((device.visitors / total) * 100)}%</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
