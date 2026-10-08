import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileInput,
  FileCheck2,
  Globe2,
  LineChart,
  Loader2,
  LogIn,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Monitor,
  MousePointerClick,
  PartyPopper,
  Phone,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tablet,
  UserPlus,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AnalyticsReport, AnalyticsTotals } from '../lib/api';
import { useSite } from '../lib/site';

type Report = Extract<AnalyticsReport, { configured: true }>;
type Point = Report['daily'][number];
type Granularity = Report['granularity'];

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

// ---------------------------------------------------------------------------
// Dates: the school's day is India's day
// ---------------------------------------------------------------------------

function indiaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function shiftDay(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shortDay(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function longDay(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12} ${suffix}`;
}

/** A chart point's label: "8 Oct" for days, "3 PM" (or "8 Oct, 3 PM" in full) for hours. */
function pointLabel(point: string, granularity: Granularity, full = false) {
  if (granularity === 'day') return full ? longDay(point) : shortDay(point);
  const hour = hourLabel(Number(point.slice(11, 13)));
  return full ? `${shortDay(point)}, ${hour}` : hour;
}

type PresetKey = 'today' | 'yesterday' | '7' | '28' | '90';
type Period = { key: PresetKey | 'custom'; start: string; end: string };

const presets: { key: PresetKey; label: string; range: (today: string) => [string, string] }[] = [
  { key: 'today', label: 'Today', range: (today) => [today, today] },
  { key: 'yesterday', label: 'Yesterday', range: (today) => [shiftDay(today, -1), shiftDay(today, -1)] },
  { key: '7', label: '7 days', range: (today) => [shiftDay(today, -6), today] },
  { key: '28', label: '28 days', range: (today) => [shiftDay(today, -27), today] },
  { key: '90', label: '90 days', range: (today) => [shiftDay(today, -89), today] },
];

function presetPeriod(key: PresetKey): Period {
  const [start, end] = presets.find((preset) => preset.key === key)!.range(indiaToday());
  return { key, start, end };
}

function periodLabel(period: { start: string; end: string }) {
  if (period.start === period.end) return longDay(period.start);
  return `${shortDay(period.start)} - ${shortDay(period.end)}`;
}

/** What the "vs previous" figures compare against, in words. */
function previousLabel(days: number) {
  if (days === 1) return 'vs the day before';
  return `vs the ${days} days before`;
}

/** Rounds up to a tidy top with four gridline steps, so every gridline lands on a round value. */
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
// Plain words for Google's traffic-source names
// ---------------------------------------------------------------------------

const channelWords: Record<string, { label: string; hint: string }> = {
  'Organic Search': { label: 'Google & other search', hint: 'Searched on Google, Bing and the like, then clicked the website' },
  Direct: { label: 'Typed the address', hint: 'Typed the website address, used a bookmark, or opened a link from WhatsApp or an app' },
  'Organic Social': { label: 'Social media', hint: 'Came from a Facebook, Instagram or YouTube post' },
  Referral: { label: 'Links on other websites', hint: 'Clicked a link to the school on another website' },
  'Paid Search': { label: 'Google ads (search)', hint: 'Clicked a paid ad on Google search' },
  'Paid Social': { label: 'Social media ads', hint: 'Clicked a paid ad on Facebook or Instagram' },
  'Cross-network': { label: 'Google ads (all networks)', hint: 'Clicked a Google ad shown across search, YouTube and other sites' },
  Display: { label: 'Banner ads', hint: 'Clicked a picture ad on another website' },
  'Paid Video': { label: 'Video ads', hint: 'Clicked a paid video ad' },
  'Organic Video': { label: 'YouTube & videos', hint: 'Came from a YouTube or other video page' },
  Email: { label: 'Email', hint: 'Clicked a link in an email' },
  SMS: { label: 'SMS', hint: 'Clicked a link in a text message' },
  'Mobile Push Notifications': { label: 'Phone notifications', hint: 'Tapped a phone notification' },
  'Organic Shopping': { label: 'Google Shopping', hint: 'Came from a shopping listing' },
  'Paid Shopping': { label: 'Shopping ads', hint: 'Clicked a shopping ad' },
  Affiliates: { label: 'Partner websites', hint: 'Came through a partner website' },
  Audio: { label: 'Audio ads', hint: 'Came from an audio ad' },
  Unassigned: { label: 'Not known', hint: "Google couldn't tell where these visits came from" },
};

const channelWord = (name: string) => channelWords[name] ?? { label: name, hint: name };

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

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { key: T; label: string }[]; value: T; onChange: (key: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-border bg-background p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={value === option.key}
          onClick={() => onChange(option.key)}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${value === option.key ? 'bg-navy text-white' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Change against the previous period of the same length; nothing to compare with says so. */
function Change({ now, before, days }: { now: number; before: number; days: number }) {
  if (!before) return <span className="text-xs text-muted-foreground">No earlier data to compare</span>;
  const change = ((now - before) / before) * 100;
  if (Math.abs(change) < 0.5) return <span className="text-xs font-medium text-muted-foreground">Same as before</span>;
  const up = change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${up ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`} title={previousLabel(days)}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(0)}%
      <span className="font-medium opacity-80">{previousLabel(days)}</span>
    </span>
  );
}

function Kpi({ icon: Icon, label, field, report, format = number, hint }: { icon: LucideIcon; label: string; field: keyof AnalyticsTotals; report: Report; format?: (value: number) => string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" title={hint}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none tabular-nums text-foreground">{format(report.totals[field])}</p>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</p>
      <div className="mt-2.5 min-h-5">
        <Change now={report.totals[field]} before={report.previous[field]} days={report.range.days} />
      </div>
    </div>
  );
}

/** A ranked list with a bar behind each value - the job is comparing magnitudes. */
function RankedBars({ rows, empty, total }: { rows: { key: string; label: ReactNode; value: number; title?: string; note?: string }[]; empty: string; total?: number }) {
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
          {row.note && <p className="mt-1 text-[11px] text-muted-foreground">{row.note}</p>}
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

function TrendChart({ points, measure, granularity }: { points: Point[]; measure: TrendKey; granularity: Granularity }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const height = 240;
  const pad = { top: 12, right: 8, bottom: 28, left: 40 };

  if (points.length === 0) return <p className="py-16 text-center text-sm text-muted-foreground">No visits in this period yet.</p>;

  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = height - pad.top - pad.bottom;
  const top = niceMax(Math.max(...points.map((point) => point[measure]), 1));
  const x = (index: number) => pad.left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
  const y = (value: number) => pad.top + plotH - (value / top) * plotH;
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point[measure]).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${pad.top + plotH} L${x(0).toFixed(1)},${pad.top + plotH} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => top * fraction);
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(plotW / 72))));
  const point = active === null ? null : points[active];

  const pick = (clientX: number, element: Element) => {
    const box = element.getBoundingClientRect();
    const ratio = (clientX - box.left - pad.left) / plotW;
    setActive(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
  };

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${trendMeasures.find((entry) => entry.key === measure)!.label} per ${granularity}`}
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
          {points.map((entry, index) =>
            index % labelEvery === 0 ? (
              <text
                key={entry.date}
                x={x(index)}
                y={height - 8}
                textAnchor={index === 0 ? 'start' : x(index) > pad.left + plotW - 28 ? 'end' : 'middle'}
                className="fill-muted-foreground text-[10px]"
              >
                {pointLabel(entry.date, granularity)}
              </text>
            ) : null,
          )}
          <path d={area} fill="url(#trend-fill)" />
          <path d={line} fill="none" stroke={series.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.length <= 48 &&
            points.map((entry, index) => <circle key={entry.date} cx={x(index)} cy={y(entry[measure])} r={2.5} fill={series.primary} />)}
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
          className="pointer-events-none absolute top-0 z-10 w-48 rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(active!) - 96, 0), Math.max(width - 192, 0)) }}
        >
          <p className="font-semibold text-foreground">{pointLabel(point.date, granularity, true)}</p>
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

function TrendPanel({ report }: { report: Report }) {
  const [measure, setMeasure] = useState<TrendKey>('views');
  const [showTable, setShowTable] = useState(false);
  const points = report.daily;
  const granularity = report.granularity;
  const total = points.reduce((sum, point) => sum + point[measure], 0);
  const best = points.reduce<Point | null>((top, point) => (!top || point[measure] > top[measure] ? point : top), null);
  const label = trendMeasures.find((entry) => entry.key === measure)!.label;
  const unit = granularity === 'hour' ? 'hour' : 'day';

  return (
    <Panel
      title="Traffic over time"
      subtitle={`${granularity === 'hour' ? 'Hour by hour' : 'Day by day'}. Hover or tap the chart for the numbers.`}
      action={<Segmented label="Measure" options={trendMeasures.map((entry) => ({ key: entry.key, label: entry.label }))} value={measure} onChange={setMeasure} />}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">Total {label.toLowerCase()}</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{number(total)}</p>
        </div>
        <div className="rounded-xl bg-muted/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">Average per {unit}</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{number(points.length ? total / points.length : 0)}</p>
        </div>
        <div className="rounded-xl bg-muted/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">Busiest {unit}</p>
          <p className="mt-0.5 text-xl font-bold text-foreground">
            {best && best[measure] > 0 ? (
              <>
                {pointLabel(best.date, granularity, granularity === 'hour' && report.range.days > 1)}{' '}
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">({number(best[measure])})</span>
              </>
            ) : (
              '-'
            )}
          </p>
        </div>
      </div>
      <TrendChart points={points} measure={measure} granularity={granularity} />
      <button type="button" onClick={() => setShowTable((open) => !open)} className="mt-3 text-xs font-semibold text-muted-foreground underline hover:text-foreground">
        {showTable ? 'Hide the numbers' : 'Show as a table'}
      </button>
      {showTable && (
        <div className="scroll-slim mt-3 max-h-72 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">{granularity === 'hour' ? 'Hour' : 'Day'}</th>
                {trendMeasures.map((entry) => (
                  <th key={entry.key} className="px-3 py-2 text-right font-semibold">
                    {entry.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...points].reverse().map((point) => (
                <tr key={point.date}>
                  <td className="px-3 py-1.5 text-foreground">{pointLabel(point.date, granularity, true)}</td>
                  {trendMeasures.map((entry) => (
                    <td key={entry.key} className="px-3 py-1.5 text-right tabular-nums text-foreground">
                      {number(point[entry.key])}
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
  const reachedOut = count('whatsapp_click') + count('phone_click') + count('registration_click');
  const steps = [
    { label: 'Visits', detail: 'Times someone opened the website', value: visits, icon: Globe2 },
    { label: 'Engaged visits', detail: 'Stayed 10s+, saw 2+ pages, or took an action', value: report.totals.engagedSessions, icon: Eye },
    { label: 'Forms started', detail: 'Began an enquiry or registration form', value: count('form_start'), icon: FileInput },
    { label: 'Reached out', detail: 'WhatsApp, phone call or registration click', value: reachedOut, icon: MessageCircle },
    { label: 'Enquiries sent', detail: 'Enquiry forms submitted', value: count('generate_lead'), icon: FileCheck2 },
  ];
  const max = Math.max(visits, 1);

  return (
    <Panel
      title="Admission interest journey"
      subtitle="From a visit to an enquiry. Each bar is measured against all visits."
      action={
        visits > 0 ? (
          <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue" title="Visits that ended in WhatsApp, a call or a registration click">
            {((reachedOut / visits) * 100).toFixed(1)}% reached out
          </span>
        ) : null
      }
    >
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
// Where visitors are: city, state or country, without Google's "(not set)"
// ---------------------------------------------------------------------------

const placeLevels = [
  { key: 'city', label: 'City', noun: 'city' },
  { key: 'region', label: 'State', noun: 'state' },
  { key: 'country', label: 'Country', noun: 'country' },
] as const;
type PlaceLevel = (typeof placeLevels)[number]['key'];

function Places({ places }: { places: Report['places'] }) {
  // Start on the most detailed level Google could actually fill in.
  const [level, setLevel] = useState<PlaceLevel>(() => placeLevels.find((entry) => places[entry.key].known.length > 0)?.key ?? 'city');
  const current = places[level];
  const noun = placeLevels.find((entry) => entry.key === level)!.noun;

  return (
    <Panel
      title="Where visitors are"
      subtitle="Top places by visitors."
      action={<Segmented label="Place" options={placeLevels.map((entry) => ({ key: entry.key, label: entry.label }))} value={level} onChange={setLevel} />}
    >
      <RankedBars empty={`Google couldn't tell any visitor's ${noun} for this period - try State or Country.`} rows={current.known.map((place) => ({ key: place.name, label: place.name, value: place.visitors }))} />
      {current.unknown > 0 && (
        <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {number(current.unknown)} more {current.unknown === 1 ? 'visitor' : 'visitors'} - Google couldn't tell their {noun} (common with mobile data and privacy settings).
        </p>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Devices: part-to-whole of at most three, as one stacked bar with labels
// ---------------------------------------------------------------------------

const deviceIcons: Record<string, LucideIcon> = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };
const deviceNames: Record<string, string> = { desktop: 'Computer', mobile: 'Mobile', tablet: 'Tablet' };
const deviceOrder = ['mobile', 'desktop', 'tablet'];

function Devices({ devices }: { devices: Report['devices'] }) {
  const total = devices.reduce((sum, device) => sum + device.visitors, 0);
  if (!total) return <p className="py-8 text-center text-sm text-muted-foreground">No visits yet.</p>;
  // Colour follows the device, not its rank, so a quiet week never repaints
  // them. Anything beyond the three (smart TVs...) is a neutral grey, last.
  const position = (name: string) => (deviceOrder.includes(name) ? deviceOrder.indexOf(name) : deviceOrder.length);
  const sorted = [...devices].sort((a, b) => position(a.name) - position(b.name));
  const colour = (name: string) => series.devices[position(name)] ?? '#8b8f98';
  const name = (device: string) => deviceNames[device] ?? device;

  return (
    <div>
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={sorted.map((device) => `${name(device.name)} ${percent(device.visitors / total)}`).join(', ')}>
        {sorted.map((device) => (
          <div key={device.name} style={{ width: `${(device.visitors / total) * 100}%`, backgroundColor: colour(device.name) }} title={`${name(device.name)}: ${percent(device.visitors / total)}`} />
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
                {name(device.name)}
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
  const rows: (string | number)[][] = [
    [`${siteName} - Website analytics`],
    ['Period', `${report.range.start} to ${report.range.end}`, `${report.range.days} days`],
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
    [report.granularity === 'hour' ? 'Hour' : 'Day', 'Page views', 'Visitors', 'Visits'],
    ...report.daily.map((point) => [pointLabel(point.date, report.granularity, true), point.views, point.visitors, point.sessions]),
    [],
    ['Page', 'Title', 'Views', 'Visitors'],
    ...report.pages.map((page) => [page.path, page.title, page.views, page.visitors]),
    [],
    ['How they found the website', 'Visits'],
    ...report.channels.map((channel) => [channelWord(channel.name).label, channel.sessions]),
    [],
    ...placeLevels.flatMap((entry) => [
      [entry.label, 'Visitors'],
      ...report.places[entry.key].known.map((place) => [place.name, place.visitors]),
      ...(report.places[entry.key].unknown ? [[`(${entry.noun} not known)`, report.places[entry.key].unknown]] : []),
      [],
    ]),
    ['Device', 'Visitors'],
    ...report.devices.map((device) => [deviceNames[device.name] ?? device.name, device.visitors]),
    [],
    ['Action', 'Count'],
    ...report.actions.map((action) => [action.label, action.count]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `analytics-${report.range.start}-to-${report.range.end}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Period picker: quick choices, or any two dates
// ---------------------------------------------------------------------------

function PeriodPicker({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  const [isCustom, setIsCustom] = useState(period.key === 'custom');
  const [from, setFrom] = useState(period.start);
  const [to, setTo] = useState(period.end);
  const today = indiaToday();

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (!from || !to) return;
    const [start, end] = from <= to ? [from, to] : [to, from];
    onChange({ key: 'custom', start, end });
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div role="tablist" aria-label="Period" className="inline-flex flex-wrap rounded-lg border border-border bg-card p-1">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            role="tab"
            aria-selected={!isCustom && period.key === preset.key}
            onClick={() => {
              setIsCustom(false);
              onChange(presetPeriod(preset.key));
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${!isCustom && period.key === preset.key ? 'bg-navy text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={isCustom}
          onClick={() => {
            setIsCustom(true);
            setFrom(period.start);
            setTo(period.end);
          }}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${isCustom ? 'bg-navy text-white' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <CalendarDays className="h-4 w-4" />
          Custom
        </button>
      </div>
      {isCustom && (
        <form onSubmit={apply} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 text-sm">
          <label className="flex items-center gap-1.5 text-muted-foreground">
            From
            <input type="date" value={from} max={today} onChange={(event) => setFrom(event.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-foreground" />
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            To
            <input type="date" value={to} max={today} onChange={(event) => setTo(event.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-foreground" />
          </label>
          <button type="submit" disabled={!from || !to} className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-deep disabled:opacity-50">
            Show
          </button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** Website traffic from Google Analytics 4, for people who don't use GA itself. */
export function AnalyticsPage() {
  const { api, site } = useSite();
  const [period, setPeriod] = useState<Period>(() => presetPeriod('7'));
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
        .analytics({ start: period.start, end: period.end }, refresh)
        .then((next) => alive && setReport(next))
        .catch((problem) => alive && setError(problem instanceof Error ? problem.message : 'Could not load analytics.'))
        .finally(() => alive && setRefreshing(false));
      return () => {
        alive = false;
      };
    },
    [api, period.start, period.end],
  );

  useEffect(() => load(false), [load]);

  const ready = report?.configured ? report : null;
  const rangeKey = ready ? `${ready.range.start}:${ready.range.end}` : '';

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Who visits {site.name}, what they look at, and what they do.</p>
        </div>
        {report?.configured !== false && (
          <div className="flex flex-wrap items-start gap-2">
            <PeriodPicker period={period} onChange={setPeriod} />
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
          <Loader2 className="h-4 w-4 animate-spin" /> Loading {periodLabel(period)} from Google Analytics...
        </p>
      )}

      {report?.configured === false && (
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
            <LineChart className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Analytics is not switched on for this website yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Ask the 3S Group team to connect the website's Google Analytics, and the numbers will appear here.</p>
        </div>
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
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {periodLabel(ready.range)}
            </span>
            <span className="text-muted-foreground">
              Today so far: <span className="font-semibold tabular-nums text-foreground">{number(ready.today.visitors)}</span> visitors,{' '}
              <span className="font-semibold tabular-nums text-foreground">{number(ready.today.views)}</span> page views
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground sm:ml-auto" title="Google can take a few hours to count the most recent visits.">
              <Clock3 className="h-3.5 w-3.5" />
              Updated {new Date(ready.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className={`grid grid-cols-2 gap-3 lg:grid-cols-5 ${refreshing ? 'opacity-60' : ''}`}>
            <Kpi icon={Users} label="Visitors" field="activeUsers" report={ready} hint="People who opened the website" />
            <Kpi icon={UserPlus} label="New visitors" field="newUsers" report={ready} hint="Visiting for the first time" />
            <Kpi icon={Eye} label="Page views" field="screenPageViews" report={ready} hint="Pages opened, counting repeats" />
            <Kpi icon={MousePointerClick} label="Engaged visits" field="engagementRate" format={percent} report={ready} hint="Stayed 10s+, saw 2+ pages, or acted" />
            <Kpi icon={Clock3} label="Time per visit" field="averageSessionDuration" format={duration} report={ready} hint="How long a visit lasts on average" />
          </div>

          <TrendPanel key={rangeKey} report={ready} />

          <div className="grid gap-5 lg:grid-cols-2">
            <Journey report={ready} />
            <Panel title="How they found the website" subtitle="Where visits came from.">
              <RankedBars
                empty="No visits yet."
                total={ready.channels.reduce((sum, channel) => sum + channel.sessions, 0)}
                rows={ready.channels.map((channel) => {
                  const words = channelWord(channel.name);
                  return { key: channel.name, label: words.label, note: words.hint, value: channel.sessions, title: words.hint };
                })}
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
            <Places key={rangeKey} places={ready.places} />
          </div>

          <Panel title="What visitors did" subtitle="Actions that matter to the school, counted on the website.">
            <Actions actions={ready.actions} />
          </Panel>
        </>
      )}
    </div>
  );
}
