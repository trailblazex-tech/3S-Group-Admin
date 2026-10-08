import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileInput,
  FileCheck2,
  Globe2,
  Loader2,
  LogIn,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Monitor,
  MousePointerClick,
  PartyPopper,
  Phone,
  Plus,
  RefreshCw,
  Settings2,
  Smartphone,
  Sparkles,
  Tablet,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminRecord, AnalyticsReport, AnalyticsTotals } from '../lib/api';
import { useSite } from '../lib/site';

type Report = Extract<AnalyticsReport, { configured: true }>;
type Day = Report['daily'][number];

const ranges = [
  { days: 7, label: '7 days' },
  { days: 28, label: '28 days' },
  { days: 90, label: '90 days' },
];

/**
 * Chart colours. One measure is one hue (slot 1); the device split is the
 * only categorical chart and uses the first three slots of the validated
 * palette (all-pairs safe, every segment also labelled in text).
 */
const series = { primary: '#2a78d6', devices: ['#2a78d6', '#eb6834', '#1baf7a'] };

const number = (value: number) => Math.round(value).toLocaleString('en-IN');
const percent = (value: number) => `${Math.round(value * 100)}%`;

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${Math.round(seconds % 60)}s` : `${Math.round(seconds)}s`;
}

function shortDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function longDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** A tidy top for a chart with four gridline steps, so every gridline lands on a round value. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const quarter = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(quarter));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= quarter)! * magnitude;
  return Math.ceil(step) * 4;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Change against the previous period of the same length; nothing to compare with shows nothing. */
function Change({ now, before }: { now: number; before: number }) {
  if (!before) return <span className="text-xs text-muted-foreground">No earlier data</span>;
  const change = ((now - before) / before) * 100;
  if (Math.abs(change) < 0.5) return <span className="text-xs font-medium text-muted-foreground">Same as before</span>;
  const up = change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${up ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(0)}%
      <span className="font-medium opacity-80">vs previous</span>
    </span>
  );
}

function Kpi({ icon: Icon, label, field, totals, previous, format = number, hint }: { icon: LucideIcon; label: string; field: keyof AnalyticsTotals; totals: AnalyticsTotals; previous: AnalyticsTotals; format?: (value: number) => string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" title={hint}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none tabular-nums text-foreground">{format(totals[field])}</p>
      <div className="mt-3 min-h-5">
        <Change now={totals[field]} before={previous[field]} />
      </div>
    </div>
  );
}

/** A ranked list with a bar behind each value - the job is comparing magnitudes. */
function RankedBars({ rows, empty, total }: { rows: { key: string; label: ReactNode; value: number; title?: string }[]; empty: string; total?: number }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} title={row.title}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-foreground">{row.label}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-foreground">{number(row.value)}</span>
              {total ? <span className="ml-1.5 text-xs text-muted-foreground">{percent(row.value / total)}</span> : null}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${Math.max((row.value / max) * 100, row.value ? 1.5 : 0)}%`, backgroundColor: series.primary }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Traffic trend: one measure at a time on one axis, crosshair + tooltip
// ---------------------------------------------------------------------------

const trendMeasures = [
  { key: 'views', label: 'Page views' },
  { key: 'visitors', label: 'Visitors' },
  { key: 'sessions', label: 'Visits' },
] as const;
type TrendKey = (typeof trendMeasures)[number]['key'];

function TrendChart({ daily, measure }: { daily: Day[]; measure: TrendKey }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const height = 240;
  const pad = { top: 12, right: 8, bottom: 28, left: 40 };

  if (daily.length === 0) return <p className="py-16 text-center text-sm text-muted-foreground">No visits in this period yet.</p>;

  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = height - pad.top - pad.bottom;
  const top = niceMax(Math.max(...daily.map((day) => day[measure]), 1));
  const x = (index: number) => pad.left + (daily.length === 1 ? plotW / 2 : (index / (daily.length - 1)) * plotW);
  const y = (value: number) => pad.top + plotH - (value / top) * plotH;
  const line = daily.map((day, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(day[measure]).toFixed(1)}`).join(' ');
  const area = `${line} L${x(daily.length - 1).toFixed(1)},${pad.top + plotH} L${x(0).toFixed(1)},${pad.top + plotH} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => top * fraction);
  const labelEvery = Math.max(1, Math.ceil(daily.length / Math.max(2, Math.floor(plotW / 72))));
  const point = active === null ? null : daily[active];

  const pick = (clientX: number, element: Element) => {
    const box = element.getBoundingClientRect();
    const ratio = (clientX - box.left - pad.left) / plotW;
    setActive(Math.min(daily.length - 1, Math.max(0, Math.round(ratio * (daily.length - 1)))));
  };

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${trendMeasures.find((entry) => entry.key === measure)!.label} per day`}
          onMouseMove={(event) => pick(event.clientX, event.currentTarget)}
          onTouchStart={(event) => pick(event.touches[0].clientX, event.currentTarget)}
          onTouchMove={(event) => pick(event.touches[0].clientX, event.currentTarget)}
          className="block touch-pan-y"
        >
          <defs>
            <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={series.primary} stopOpacity="0.22" />
              <stop offset="100%" stopColor={series.primary} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={pad.left + plotW} y1={y(tick)} y2={y(tick)} stroke="hsl(var(--border))" strokeDasharray={tick ? '3 4' : undefined} />
              <text x={pad.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
                {number(tick)}
              </text>
            </g>
          ))}
          {daily.map((day, index) =>
            index % labelEvery === 0 ? (
              <text
                key={day.date}
                x={x(index)}
                y={height - 8}
                textAnchor={index === 0 ? 'start' : x(index) > pad.left + plotW - 28 ? 'end' : 'middle'}
                className="fill-muted-foreground text-[10px]"
              >
                {shortDay(day.date)}
              </text>
            ) : null,
          )}
          <path d={area} fill="url(#trend-fill)" />
          <path d={line} fill="none" stroke={series.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {point && (
            <>
              <line x1={x(active!)} x2={x(active!)} y1={pad.top} y2={pad.top + plotH} stroke="hsl(var(--foreground) / 0.35)" strokeWidth={1} />
              <circle cx={x(active!)} cy={y(point[measure])} r={5} fill={series.primary} stroke="white" strokeWidth={2} />
            </>
          )}
        </svg>
      )}
      {point && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-44 rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(active!) - 88, 0), Math.max(width - 176, 0)) }}
        >
          <p className="font-semibold text-foreground">{longDay(point.date)}</p>
          <dl className="mt-1.5 space-y-1">
            {trendMeasures.map((entry) => (
              <div key={entry.key} className="flex justify-between gap-3">
                <dt className={entry.key === measure ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{entry.label}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{number(point[entry.key])}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function TrendPanel({ daily }: { daily: Day[] }) {
  const [measure, setMeasure] = useState<TrendKey>('views');
  const [showTable, setShowTable] = useState(false);
  const total = daily.reduce((sum, day) => sum + day[measure], 0);
  const best = daily.reduce<Day | null>((top, day) => (!top || day[measure] > top[measure] ? day : top), null);
  const label = trendMeasures.find((entry) => entry.key === measure)!.label;

  return (
    <Panel
      title="Traffic over time"
      subtitle="Hover or tap a day for its numbers."
      action={
        <div role="tablist" aria-label="Measure" className="inline-flex rounded-lg border border-border bg-background p-0.5">
          {trendMeasures.map((entry) => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={measure === entry.key}
              onClick={() => setMeasure(entry.key)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${measure === entry.key ? 'bg-navy text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Total {label.toLowerCase()}</span>{' '}
          <span className="font-bold tabular-nums text-foreground">{number(total)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Daily average</span>{' '}
          <span className="font-bold tabular-nums text-foreground">{number(daily.length ? total / daily.length : 0)}</span>
        </p>
        {best && best[measure] > 0 && (
          <p>
            <span className="text-muted-foreground">Busiest day</span>{' '}
            <span className="font-bold text-foreground">{shortDay(best.date)}</span>{' '}
            <span className="tabular-nums text-muted-foreground">({number(best[measure])})</span>
          </p>
        )}
      </div>
      <TrendChart daily={daily} measure={measure} />
      <button type="button" onClick={() => setShowTable((open) => !open)} className="mt-3 text-xs font-semibold text-muted-foreground underline hover:text-foreground">
        {showTable ? 'Hide the numbers' : 'Show as a table'}
      </button>
      {showTable && (
        <div className="scroll-slim mt-3 max-h-72 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Day</th>
                {trendMeasures.map((entry) => (
                  <th key={entry.key} className="px-3 py-2 text-right font-semibold">
                    {entry.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...daily].reverse().map((day) => (
                <tr key={day.date}>
                  <td className="px-3 py-1.5 text-foreground">{longDay(day.date)}</td>
                  {trendMeasures.map((entry) => (
                    <td key={entry.key} className="px-3 py-1.5 text-right tabular-nums text-foreground">
                      {number(day[entry.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Admission interest journey
// ---------------------------------------------------------------------------

function Journey({ report }: { report: Report }) {
  const count = (name: string) => report.actions.find((action) => action.name === name)?.count ?? 0;
  const visits = report.totals.sessions;
  const steps = [
    { label: 'Visits', detail: 'Times someone opened the website', value: visits, icon: Globe2 },
    { label: 'Engaged visits', detail: 'Stayed 10s+, saw 2+ pages, or took an action', value: report.totals.engagedSessions, icon: Eye },
    { label: 'Forms started', detail: 'Began an enquiry or registration form', value: count('form_start'), icon: FileInput },
    { label: 'Reached out', detail: 'WhatsApp, phone call or registration click', value: count('whatsapp_click') + count('phone_click') + count('registration_click'), icon: MessageCircle },
    { label: 'Enquiries sent', detail: 'Enquiry forms submitted', value: count('generate_lead'), icon: FileCheck2 },
  ];
  const max = Math.max(visits, 1);

  return (
    <Panel title="Admission interest journey" subtitle="From a visit to an enquiry. Each bar is measured against all visits.">
      <ol className="space-y-3.5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const share = visits ? step.value / visits : 0;
          return (
            <li key={step.label} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-foreground">
                    <span className="mr-1.5 text-xs font-bold text-muted-foreground">{index + 1}</span>
                    {step.label}
                  </p>
                  <p className="shrink-0 tabular-nums">
                    <span className="text-sm font-bold text-foreground">{number(step.value)}</span>
                    {index > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{share < 0.01 && step.value ? '<1%' : percent(share)}</span>}
                  </p>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted" title={step.detail}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max((step.value / max) * 100, step.value ? 1.5 : 0)}%`, backgroundColor: series.primary }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Devices: part-to-whole of at most three, as one stacked bar with labels
// ---------------------------------------------------------------------------

const deviceIcons: Record<string, LucideIcon> = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };
const deviceOrder = ['mobile', 'desktop', 'tablet'];

function Devices({ devices }: { devices: Report['devices'] }) {
  const total = devices.reduce((sum, device) => sum + device.visitors, 0);
  if (!total) return <p className="py-8 text-center text-sm text-muted-foreground">No visits yet.</p>;
  // Colour follows the device, not its rank, so a quiet week never repaints
  // them. Anything beyond the three (smart TVs...) is a neutral grey, last.
  const position = (name: string) => (deviceOrder.includes(name) ? deviceOrder.indexOf(name) : deviceOrder.length);
  const sorted = [...devices].sort((a, b) => position(a.name) - position(b.name));
  const colour = (name: string) => series.devices[position(name)] ?? '#8b8f98';

  return (
    <div>
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={sorted.map((device) => `${device.name} ${percent(device.visitors / total)}`).join(', ')}>
        {sorted.map((device) => (
          <div key={device.name} style={{ width: `${(device.visitors / total) * 100}%`, backgroundColor: colour(device.name) }} title={`${device.name}: ${percent(device.visitors / total)}`} />
        ))}
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {sorted.map((device) => {
          const Icon = deviceIcons[device.name] ?? Monitor;
          return (
            <li key={device.name} className="rounded-xl border border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm capitalize text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colour(device.name) }} />
                <Icon className="h-4 w-4" />
                {device.name}
              </div>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{percent(device.visitors / total)}</p>
              <p className="text-xs tabular-nums text-muted-foreground">{number(device.visitors)} visitors</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const actionIcons: Record<string, LucideIcon> = {
  whatsapp_click: MessageCircle,
  phone_click: Phone,
  generate_lead: FileCheck2,
  form_start: FileInput,
  registration_click: MousePointerClick,
  event_greeting_shown: PartyPopper,
  event_greeting_cta_click: Sparkles,
  parent_feedback_submitted: MessageSquareText,
  parent_login_click: LogIn,
};

function Actions({ actions }: { actions: Report['actions'] }) {
  const sorted = [...actions].sort((a, b) => b.count - a.count);
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {sorted.map((action) => {
        const Icon = actionIcons[action.name] ?? MousePointerClick;
        return (
          <li key={action.name} className={`rounded-xl border border-border p-3.5 ${action.count ? 'bg-card' : 'bg-muted/40'}`}>
            <Icon className={`h-4 w-4 ${action.count ? 'text-brand-blue' : 'text-muted-foreground'}`} />
            <p className={`mt-2 text-2xl font-bold tabular-nums ${action.count ? 'text-foreground' : 'text-muted-foreground'}`}>{number(action.count)}</p>
            <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{action.label}</p>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function exportCsv(report: Report, siteName: string) {
  const first = report.daily[0]?.date ?? '';
  const last = report.daily.at(-1)?.date ?? '';
  const rows: (string | number)[][] = [
    [`${siteName} - Google Analytics`],
    ['Period', `${first} to ${last}`, `${report.days} days`],
    [],
    ['Overview', 'This period', 'Previous period'],
    ['Visitors', report.totals.activeUsers, report.previous.activeUsers],
    ['New visitors', report.totals.newUsers, report.previous.newUsers],
    ['Page views', report.totals.screenPageViews, report.previous.screenPageViews],
    ['Visits', report.totals.sessions, report.previous.sessions],
    ['Engaged visits', report.totals.engagedSessions, report.previous.engagedSessions],
    ['Engagement rate', percent(report.totals.engagementRate), percent(report.previous.engagementRate)],
    ['Time per visit', duration(report.totals.averageSessionDuration), duration(report.previous.averageSessionDuration)],
    [],
    ['Day', 'Page views', 'Visitors', 'Visits'],
    ...report.daily.map((day) => [day.date, day.views, day.visitors, day.sessions]),
    [],
    ['Page', 'Title', 'Views', 'Visitors'],
    ...report.pages.map((page) => [page.path, page.title, page.views, page.visitors]),
    [],
    ['How they found the website', 'Visits'],
    ...report.channels.map((channel) => [channel.name, channel.sessions]),
    [],
    ['City', 'Visitors'],
    ...report.cities.map((city) => [city.name, city.visitors]),
    [],
    ['Device', 'Visitors'],
    ...report.devices.map((device) => [device.name, device.visitors]),
    [],
    ['Action', 'Count'],
    ...report.actions.map((action) => [action.label, action.count]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `analytics-${report.days}d-${last || new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Tracking setup: the GA4 measurement IDs the website sends visits to
// ---------------------------------------------------------------------------

const measurementIdPattern = /^G-[A-Z0-9]{4,20}$/;

function TrackingSetup({ connected }: { connected: boolean }) {
  const { api } = useSite();
  const [record, setRecord] = useState<AdminRecord | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [state, setState] = useState<{ busy: 'load' | 'save' | 'publish' | null; error: string; notice: string }>({ busy: 'load', error: '', notice: '' });
  const saved = (record?.measurementIds as string[] | null | undefined) ?? [];
  const isDirty = ids.join(',') !== saved.join(',');

  useEffect(() => {
    let alive = true;
    api
      .list('site-analytics')
      .then(({ records }) => {
        if (!alive) return;
        const first = records[0] ?? null;
        setRecord(first);
        setIds((first?.measurementIds as string[] | null | undefined) ?? []);
        setState({ busy: null, error: '', notice: '' });
      })
      .catch((problem) => alive && setState({ busy: null, error: problem instanceof Error ? problem.message : 'Could not load the tracking settings.', notice: '' }));
    return () => {
      alive = false;
    };
  }, [api]);

  const add = (event?: FormEvent) => {
    event?.preventDefault();
    const entries = draft
      .split(/[\s,]+/)
      .map((entry) => entry.trim().toUpperCase())
      .filter(Boolean);
    if (entries.length === 0) return;
    const wrong = entries.find((entry) => !measurementIdPattern.test(entry));
    if (wrong) {
      setState((current) => ({ ...current, error: `"${wrong}" is not a GA4 measurement ID - they look like G-XXXXXXXXXX.`, notice: '' }));
      return;
    }
    setIds((current) => [...new Set([...current, ...entries])]);
    setDraft('');
    setState((current) => ({ ...current, error: '', notice: '' }));
  };

  const save = async () => {
    if (!record) return;
    setState({ busy: 'save', error: '', notice: '' });
    try {
      const next = await api.update('site-analytics', record.id, { measurementIds: ids });
      setRecord(next);
      setIds((next.measurementIds as string[] | null | undefined) ?? []);
      setState({ busy: null, error: '', notice: 'Saved. Publish the website to start sending visits to these IDs.' });
    } catch (problem) {
      setState({ busy: null, error: problem instanceof Error ? problem.message : 'Could not save.', notice: '' });
    }
  };

  const publish = async () => {
    setState({ busy: 'publish', error: '', notice: '' });
    try {
      const result = await api.publish();
      setState({ busy: null, error: result.queued ? '' : result.message, notice: result.queued ? result.message : '' });
    } catch (problem) {
      setState({ busy: null, error: problem instanceof Error ? problem.message : 'Could not publish.', notice: '' });
    }
  };

  return (
    <Panel
      title="Tracking setup"
      subtitle="Where the website sends its visits. Changes here reach the website when you publish."
      action={
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${connected ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
          {connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
          {connected ? 'Reports connected' : 'Reports not connected'}
        </span>
      }
    >
      {state.busy === 'load' ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </p>
      ) : !record ? (
        <p className="text-sm text-muted-foreground">{state.error || 'Tracking is not set up for this website.'}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div>
            <p className="text-sm font-semibold text-foreground">GA4 measurement IDs</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Every visit is sent to each ID. With none, the website uses the ID built into it.</p>
            <ul className="mt-3 flex min-h-9 flex-wrap gap-2">
              {ids.length === 0 && <li className="text-sm italic text-muted-foreground">None - using the built-in ID</li>}
              {ids.map((id) => (
                <li key={id} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 py-1 pl-3 pr-1.5 font-mono text-sm text-foreground">
                  {id}
                  <button type="button" onClick={() => setIds((current) => current.filter((entry) => entry !== id))} className="rounded p-0.5 text-muted-foreground hover:bg-border hover:text-foreground" aria-label={`Remove ${id}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={add} className="mt-3 flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="G-XXXXXXXXXX"
                aria-label="Add a measurement ID"
                spellCheck={false}
                autoCapitalize="characters"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm uppercase outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button type="submit" disabled={!draft.trim()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={save} disabled={!isDirty || state.busy !== null} className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-50">
                {state.busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
              <button type="button" onClick={publish} disabled={isDirty || state.busy !== null} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50">
                {state.busy === 'publish' && <Loader2 className="h-4 w-4 animate-spin" />}
                Publish website
              </button>
              {isDirty && <span className="text-xs font-medium text-muted-foreground">Unsaved changes</span>}
            </div>
            {state.error && (
              <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {state.error}
              </p>
            )}
            {state.notice && (
              <p role="status" className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">
                {state.notice}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-muted/50 p-4 text-xs leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">Where to find a measurement ID</p>
            <p className="mt-1">In Google Analytics: Admin, then Data streams, then the website's stream. It starts with G-.</p>
            <p className="mt-3 font-semibold text-foreground">Reports on this page</p>
            <p className="mt-1">
              {connected
                ? 'This page reads the GA4 property directly, through a read-only Google service account.'
                : 'To show reports here, a platform administrator adds the service account as a Viewer on the GA4 property, then runs npm run analytics:connect with the property ID (digits only, from Admin > Property details).'}
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** Website traffic from Google Analytics 4, for people who don't use GA itself. */
export function AnalyticsPage() {
  const { api, site } = useSite();
  const [days, setDays] = useState(28);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    (refresh: boolean) => {
      let alive = true;
      setError('');
      if (refresh) setRefreshing(true);
      else setReport(null);
      api
        .analytics(days, refresh)
        .then((next) => alive && setReport(next))
        .catch((problem) => alive && setError(problem instanceof Error ? problem.message : 'Could not load analytics.'))
        .finally(() => alive && setRefreshing(false));
      return () => {
        alive = false;
      };
    },
    [api, days],
  );

  useEffect(() => load(false), [load]);

  const ready = report?.configured ? report : null;
  const first = ready?.daily[0]?.date;
  const last = ready?.daily.at(-1)?.date;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Who visits {site.name}, what they look at, and what they do.</p>
        </div>
        {report?.configured !== false && (
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              onClick={() => load(true)}
              disabled={!ready || refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              title="Fetch the latest numbers from Google"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => ready && exportCsv(ready, site.name)}
              disabled={!ready}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              title="Download these numbers as a spreadsheet (CSV)"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {!report && !error && (
        <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the last {days} days from Google Analytics...
        </p>
      )}

      {ready && (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
            <span className="inline-flex items-center gap-2 font-semibold text-foreground">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
              Live from Google Analytics
            </span>
            <span className="text-muted-foreground">
              Today so far: <span className="font-semibold tabular-nums text-foreground">{number(ready.today.visitors)}</span> visitors,{' '}
              <span className="font-semibold tabular-nums text-foreground">{number(ready.today.views)}</span> page views
            </span>
            {first && last && (
              <span className="text-muted-foreground">
                {shortDay(first)} - {shortDay(last)}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground sm:ml-auto" title="Google can take a few hours to count the most recent visits.">
              <Clock3 className="h-3.5 w-3.5" />
              Updated {new Date(ready.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className={`grid grid-cols-2 gap-3 lg:grid-cols-5 ${refreshing ? 'opacity-60' : ''}`}>
            <Kpi icon={Users} label="Visitors" field="activeUsers" totals={ready.totals} previous={ready.previous} hint="People who visited at least once" />
            <Kpi icon={UserPlus} label="New visitors" field="newUsers" totals={ready.totals} previous={ready.previous} hint="First-time visitors" />
            <Kpi icon={Eye} label="Page views" field="screenPageViews" totals={ready.totals} previous={ready.previous} hint="Pages opened, counting repeats" />
            <Kpi icon={MousePointerClick} label="Engaged visits" field="engagementRate" format={percent} totals={ready.totals} previous={ready.previous} hint="Visits that lasted 10s+, saw 2+ pages, or took an action" />
            <Kpi icon={Clock3} label="Time per visit" field="averageSessionDuration" format={duration} totals={ready.totals} previous={ready.previous} hint="Average length of a visit" />
          </div>

          <TrendPanel key={days} daily={ready.daily} />

          <div className="grid gap-5 lg:grid-cols-2">
            <Journey report={ready} />
            <Panel title="How they found the website" subtitle="Visits by where they came from.">
              <RankedBars
                empty="No visits yet."
                total={ready.channels.reduce((sum, channel) => sum + channel.sessions, 0)}
                rows={ready.channels.map((channel) => ({ key: channel.name, label: channel.name, value: channel.sessions }))}
              />
            </Panel>
          </div>

          <Panel title="Most viewed pages" subtitle="Top 10 pages by views. Open one to see it on the website.">
            {ready.pages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No page views yet.</p>
            ) : (
              <ol className="divide-y divide-border">
                {ready.pages.map((page, index) => {
                  const max = ready.pages[0].views || 1;
                  return (
                    <li key={page.path} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                      <span className="text-sm font-bold tabular-nums text-muted-foreground">{index + 1}</span>
                      <div className="min-w-0">
                        <a
                          href={`${site.publicUrl.replace(/\/$/, '')}${page.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1 text-sm font-semibold text-foreground hover:underline"
                          title={page.path}
                        >
                          <span className="truncate">{page.path === '/' ? 'Home page' : page.title.split(' | ')[0].trim() || page.path}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </a>
                        <p className="truncate text-xs text-muted-foreground">{page.path}</p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${(page.views / max) * 100}%`, backgroundColor: series.primary }} />
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <p className="text-sm font-bold text-foreground">{number(page.views)}</p>
                        <p className="text-[11px] text-muted-foreground">{number(page.visitors)} visitors</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Devices" subtitle="What visitors used to open the website.">
              <Devices devices={ready.devices} />
            </Panel>
            <Panel title="Where they are" subtitle="Top cities by visitors." action={<MapPin className="h-4 w-4 text-muted-foreground" />}>
              <RankedBars empty="No visits yet." rows={ready.cities.map((city) => ({ key: city.name, label: city.name, value: city.visitors }))} />
            </Panel>
          </div>

          <Panel title="What visitors did" subtitle="Actions that matter to the school, counted on the website.">
            <Actions actions={ready.actions} />
          </Panel>
        </>
      )}

      {(report || error) && <TrackingSetup connected={Boolean(ready)} />}
    </div>
  );
}
