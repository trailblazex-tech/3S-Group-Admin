import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Inbox, Loader2, Mail, MessageCircle, Phone, RefreshCw, Search, Star, Trash2, X } from 'lucide-react';
import type { FormFieldDefinition, FormSummary, Submission } from '../lib/api';
import { useSite } from '../lib/site';
import { relativeTime } from '../lib/time';
import { useConfirm } from '../components/ConfirmDialog';

const statusTone: Record<string, string> = {
  new: 'bg-[#f59f0a]/15 text-[#a35f00] ring-[#f59f0a]/35',
  'following-up': 'bg-brand-blue/10 text-brand-blue ring-brand-blue/25',
  done: 'bg-success/10 text-success ring-success/25',
};

const periods = [
  { value: 0, label: 'All time' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

function text(value: unknown) {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function optionLabel(field: FormFieldDefinition | undefined, value: unknown) {
  return field?.options?.find((option) => option.value === value)?.label ?? text(value);
}

/** Average of the ratings actually given (0 = skipped). */
function averageOf(ratings: unknown) {
  const given = Object.values((ratings ?? {}) as Record<string, number>).filter((value) => value > 0);
  return given.length ? given.reduce((total, value) => total + value, 0) / given.length : 0;
}

function Stars({ value, size = 'h-3.5 w-3.5' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star key={index} className={`${size} ${index <= Math.round(value) ? 'fill-[#f59f0a] text-[#f59f0a]' : 'fill-muted text-muted'}`} />
      ))}
    </span>
  );
}

function StatusPill({ form, status }: { form: FormSummary; status: string }) {
  const label = form.statuses.find((entry) => entry.value === status)?.label ?? status;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${statusTone[status] ?? statusTone.done}`}>{label}</span>;
}

/** Digits for wa.me: Indian 10-digit numbers get the 91 country code. */
function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

function toCsv(form: FormSummary, rows: Submission[]) {
  const columns: { label: string; value: (row: Submission) => string }[] = [
    { label: 'Reference', value: (row) => row.id },
    { label: 'Received', value: (row) => formatWhen(row.at) },
    { label: 'Status', value: (row) => form.statuses.find((entry) => entry.value === row.status)?.label ?? row.status },
  ];
  for (const field of form.fields) {
    if (field.type === 'ratings') {
      for (const item of field.items ?? []) {
        columns.push({ label: item.label, value: (row) => String(((row[field.name] ?? {}) as Record<string, number>)[item.name] || '') });
      }
      columns.push({ label: 'Average rating', value: (row) => averageOf(row[field.name]).toFixed(1) });
    } else if (field.type === 'datetime') {
      columns.push({ label: field.label, value: (row) => (row[field.name] ? formatWhen(text(row[field.name])) : '') });
    } else if (field.type === 'select') {
      columns.push({ label: field.label, value: (row) => optionLabel(field, row[field.name]) });
    } else {
      columns.push({ label: field.label, value: (row) => text(row[field.name]) });
    }
  }
  columns.push({ label: 'Office note', value: (row) => row.note ?? '' });

  const escape = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const lines = [columns.map((column) => escape(column.label)).join(','), ...rows.map((row) => columns.map((column) => escape(column.value(row))).join(','))];
  // The BOM makes Excel read Hindi names and the rupee sign correctly.
  return `${String.fromCharCode(0xfeff)}${lines.join('\r\n')}`;
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</div>
      {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

function Insights({ form, rows }: { form: FormSummary; rows: Submission[] }) {
  const ratingsField = form.fields.find((field) => field.name === form.ratingsField);
  const interestField = form.fields.find((field) => field.name === form.interestField);
  if ((!ratingsField && !interestField) || rows.length === 0) return null;

  const averages = (ratingsField?.items ?? []).map((item) => {
    const given = rows.map((row) => ((row[ratingsField!.name] ?? {}) as Record<string, number>)[item.name] ?? 0).filter((value) => value > 0);
    return { ...item, average: given.length ? given.reduce((a, b) => a + b, 0) / given.length : 0, count: given.length };
  });
  const interest = (interestField?.options ?? []).map((option) => ({ ...option, count: rows.filter((row) => row[interestField!.name] === option.value).length }));
  const interestColors: Record<string, string> = { yes: 'bg-success', need_more_information: 'bg-[#f59f0a]', no: 'bg-muted-foreground/50' };

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {ratingsField && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground">Ratings by area</h3>
          <ul className="mt-4 space-y-3">
            {averages.map((item) => (
              <li key={item.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-foreground">{item.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    <span className="font-bold text-foreground">{item.count ? item.average.toFixed(1) : '-'}</span> / 5 · {item.count} rated
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[#f59f0a]" style={{ width: `${(item.average / 5) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {interestField && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground">{interestField.label}</h3>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
            {interest.map((option) =>
              option.count > 0 ? <div key={option.value} className={interestColors[option.value] ?? 'bg-brand-blue'} style={{ width: `${(option.count / rows.length) * 100}%` }} title={`${option.label}: ${option.count}`} /> : null,
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {interest.map((option) => (
              <li key={option.value} className="flex items-center gap-2.5 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${interestColors[option.value] ?? 'bg-brand-blue'}`} />
                <span className="flex-1 text-foreground">{option.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-bold text-foreground">{option.count}</span> · {Math.round((option.count / rows.length) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Detail({ form, submission, onClose, onChanged, onDeleted }: { form: FormSummary; submission: Submission; onClose: () => void; onChanged: (changes: Partial<Submission>) => void; onDeleted: () => void }) {
  const { api } = useSite();
  const [note, setNote] = useState(submission.note ?? '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, confirmDialog] = useConfirm();
  const name = text(submission[form.titleField]) || 'Visitor';
  const phone = form.phoneField ? text(submission[form.phoneField]) : '';
  const email = form.emailField ? text(submission[form.emailField]) : '';

  useEffect(() => setNote(submission.note ?? ''), [submission.id, submission.note]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async (changes: { status?: string; note?: string }, which: string) => {
    setBusy(which);
    setError('');
    try {
      await api.updateSubmission(form.name, submission.id, changes);
      onChanged(changes);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not save that.');
    } finally {
      setBusy('');
    }
  };

  const remove = () =>
    confirm({
      title: 'Delete permanently?',
      danger: true,
      message: (
        <>
          This {form.label.toLowerCase().replace(/s$/, '')} from <span className="font-semibold text-foreground">{name}</span> will be deleted for good. Export it first if you may need it.
        </>
      ),
      confirmLabel: 'Delete permanently',
      onConfirm: async () => {
        await api.deleteSubmission(form.name, submission.id);
        onDeleted();
      },
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-deep/50 backdrop-blur-[1px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={`${form.label} from ${name}`} className="flex h-full w-full max-w-xl flex-col bg-card shadow-2xl">
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-semibold text-foreground">{name}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {submission.id} · {formatWhen(submission.at)}
            </p>
          </div>
          <StatusPill form={form} status={submission.status} />
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {(phone || email) && (
            <div className="flex flex-wrap gap-2">
              {phone && (
                <a href={`tel:${phone}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-navy px-3 text-sm font-semibold text-white hover:bg-navy-deep">
                  <Phone className="h-4 w-4" /> Call {phone}
                </a>
              )}
              {phone && (
                <a href={`https://wa.me/${whatsappNumber(phone)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1f9d55] px-3 text-sm font-semibold text-white hover:bg-[#188046]">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted">
                  <Mail className="h-4 w-4" /> Email
                </a>
              )}
            </div>
          )}

          <dl className="mt-5 divide-y divide-border rounded-xl border border-border">
            {form.fields.map((field) => {
              if (field.type === 'ratings') {
                const ratings = (submission[field.name] ?? {}) as Record<string, number>;
                return (
                  <div key={field.name} className="px-4 py-3">
                    <dt className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {field.label}
                      <span className="normal-case tracking-normal">
                        Average <span className="font-bold text-foreground">{averageOf(ratings).toFixed(1)}</span>
                      </span>
                    </dt>
                    <dd className="mt-2 space-y-1.5">
                      {(field.items ?? []).map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-foreground">{item.label}</span>
                          {ratings[item.name] ? <Stars value={ratings[item.name]} /> : <span className="text-xs text-muted-foreground">Not rated</span>}
                        </div>
                      ))}
                    </dd>
                  </div>
                );
              }
              const value = field.type === 'select' ? optionLabel(field, submission[field.name]) : field.type === 'datetime' && submission[field.name] ? formatWhen(text(submission[field.name])) : text(submission[field.name]);
              if (!value) return null;
              return (
                <div key={field.name} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[150px_1fr] sm:gap-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:pt-0.5">{field.label}</dt>
                  <dd className="whitespace-pre-line break-words text-sm text-foreground">{value}</dd>
                </div>
              );
            })}
          </dl>

          <section className="mt-5">
            <h3 className="text-sm font-bold text-foreground">Follow-up</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {form.statuses.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => save({ status: status.value }, status.value)}
                  disabled={Boolean(busy) || submission.status === status.value}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                    submission.status === status.value ? 'border-navy bg-navy text-white' : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {busy === status.value && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {status.label}
                </button>
              ))}
            </div>
            <label htmlFor="lead-note" className="mt-4 block text-sm font-semibold text-foreground">
              Office note
            </label>
            <textarea
              id="lead-note"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Called on 2 Oct, visiting Saturday with the child."
              className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => save({ note }, 'note')}
              disabled={Boolean(busy) || note === (submission.note ?? '')}
              className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-bold text-white hover:bg-navy-deep disabled:opacity-40"
            >
              {busy === 'note' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save note
            </button>
            {error && <p className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
          </section>
        </div>

        <footer className="flex items-center border-t border-border px-5 py-3">
          <button type="button" onClick={remove} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete permanently
          </button>
        </footer>
        {confirmDialog}
      </aside>
    </div>
  );
}

/**
 * Everything visitors sent from the website's forms - parent feedback and
 * admission enquiries - with ratings at a glance, follow-up status, and an
 * Excel-ready export.
 */
export function LeadsPage() {
  const { api, site } = useSite();
  const [params, setParams] = useSearchParams();
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [rows, setRows] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState(0);
  const [interest, setInterest] = useState('');
  const [openId, setOpenId] = useState('');
  // "Now" for the date filters, taken when the list loads (not on every render).
  const [now, setNow] = useState(() => Date.now());

  const formName = params.get('form') ?? forms?.[0]?.name ?? '';
  const form = forms?.find((entry) => entry.name === formName) ?? forms?.[0] ?? null;

  const loadForms = useCallback(() => api.forms().then(setForms), [api]);

  const loadRows = useCallback(async () => {
    if (!form) return;
    setIsLoading(true);
    setError('');
    try {
      setRows(await api.submissions(form.name));
      setNow(Date.now());
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not load submissions.');
    } finally {
      setIsLoading(false);
    }
  }, [api, form?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadForms().catch((problem) => {
      setError(problem instanceof Error ? problem.message : 'Could not load forms.');
      setIsLoading(false);
    });
  }, [loadForms]);

  useEffect(() => {
    setSearch('');
    setStatus('');
    setInterest('');
    setOpenId('');
    void loadRows();
  }, [loadRows]);

  const filtered = useMemo(() => {
    if (!form) return [];
    const needle = search.trim().toLowerCase();
    const since = period ? now - period * 86400000 : 0;
    return rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (since && Date.parse(row.at) < since) return false;
      if (interest && form.interestField && row[form.interestField] !== interest) return false;
      if (!needle) return true;
      return Object.entries(row).some(([key, value]) => key !== 'ratings' && typeof value === 'string' && value.toLowerCase().includes(needle));
    });
  }, [form, rows, search, status, period, interest, now]);

  const open = rows.find((row) => row.id === openId) ?? null;

  if (!site.hasForms) return <p className="text-sm text-muted-foreground">{site.name} has no website forms connected.</p>;

  const weekAgo = now - 7 * 86400000;
  const ratingsField = form?.ratingsField;
  const overallKey = form?.fields.find((field) => field.name === ratingsField)?.items?.[0]?.name;
  const rated = ratingsField && overallKey ? filtered.map((row) => ((row[ratingsField] ?? {}) as Record<string, number>)[overallKey] ?? 0).filter((value) => value > 0) : [];
  const overall = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
  const interestField = form?.fields.find((field) => field.name === form.interestField);
  const interestedYes = interestField ? filtered.filter((row) => row[interestField.name] === 'yes').length : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Feedback &amp; Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">What parents and visitors sent through the website. Newest first.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void loadForms();
              void loadRows();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            disabled={!form || filtered.length === 0}
            onClick={() => form && download(`${site.id}-${form.name}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(form, filtered))}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-bold text-white hover:bg-navy-deep disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
        </div>
      </div>

      {forms && forms.length > 1 && (
        <div role="tablist" className="mt-5 flex gap-1 overflow-x-auto border-b border-border">
          {forms.map((entry) => {
            const isActive = entry.name === form?.name;
            return (
              <button
                key={entry.name}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setParams({ form: entry.name })}
                className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? 'border-navy text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {entry.label}
                <span className="rounded-full bg-muted px-2 py-px text-[11px] tabular-nums">{entry.total}</span>
                {entry.unread > 0 && <span className="rounded-full bg-[#f59f0a] px-1.5 py-px text-[10px] font-bold text-navy-deep">{entry.unread} new</span>}
              </button>
            );
          })}
        </div>
      )}
      {form && <p className="mt-3 text-xs text-muted-foreground">{form.description}</p>}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {form && !isLoading && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Showing" value={filtered.length} detail={filtered.length === rows.length ? 'all received' : `of ${rows.length} received`} />
            <StatCard label="New" value={filtered.filter((row) => row.status === 'new').length} detail="not followed up yet" />
            {ratingsField ? (
              <StatCard
                label="Overall rating"
                value={
                  <span className="flex items-center gap-2">
                    {rated.length ? overall.toFixed(1) : '-'}
                    {rated.length > 0 && <Stars value={overall} size="h-4 w-4" />}
                  </span>
                }
                detail={`from ${rated.length} ${rated.length === 1 ? 'parent' : 'parents'}`}
              />
            ) : (
              <StatCard label="This week" value={rows.filter((row) => Date.parse(row.at) >= weekAgo).length} detail="received in the last 7 days" />
            )}
            {interestField ? (
              <StatCard label="Want admission" value={interestedYes} detail={filtered.length ? `${Math.round((interestedYes / filtered.length) * 100)}% said yes` : 'no answers yet'} />
            ) : (
              <StatCard label="Followed up" value={filtered.filter((row) => row.status !== 'new').length} detail="following up or done" />
            )}
          </div>
          <Insights form={form} rows={filtered} />
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, phone, class, comments..."
            aria-label="Search submissions"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status" className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option value="">Any status</option>
          {form?.statuses.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
        {interestField && (
          <select value={interest} onChange={(event) => setInterest(event.target.value)} aria-label={interestField.label} className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="">Any interest</option>
            {interestField.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        <select value={period} onChange={(event) => setPeriod(Number(event.target.value))} aria-label="Period" className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
          {periods.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border py-16 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">{rows.length === 0 ? 'Nothing received yet.' : 'Nothing matches these filters.'}</p>
          {rows.length === 0 && <p className="mt-1 text-xs text-muted-foreground">New submissions from the website appear here as soon as they are sent.</p>}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((row) => {
            const name = text(row[form!.titleField]) || 'Visitor';
            const phone = form!.phoneField ? text(row[form!.phoneField]) : '';
            const details = form!.fields
              .filter((field) => ['studentName', 'interestedClass', 'classInterestedIn', 'city'].includes(field.name) && row[field.name])
              .map((field) => text(row[field.name]));
            const comment = text(row.suggestions || row.likedMost || row.message);
            return (
              <li key={row.id}>
                <button type="button" onClick={() => setOpenId(row.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.status === 'new' ? 'bg-[#f59f0a]' : 'bg-transparent'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className={`text-sm ${row.status === 'new' ? 'font-bold' : 'font-semibold'} text-foreground`}>{name}</span>
                      {phone && <span className="text-xs tabular-nums text-muted-foreground">{phone}</span>}
                    </span>
                    {details.length > 0 && <span className="block truncate text-xs text-muted-foreground">{details.join(' · ')}</span>}
                    {comment && <span className="mt-0.5 block truncate text-xs italic text-muted-foreground">"{comment}"</span>}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="flex items-center gap-2">
                      {ratingsField && <Stars value={averageOf(row[ratingsField])} />}
                      <StatusPill form={form!} status={row.status} />
                    </span>
                    <time dateTime={row.at} title={formatWhen(row.at)} className="text-[11px] text-muted-foreground">
                      {relativeTime(row.at)}
                    </time>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && form && (
        <Detail
          form={form}
          submission={open}
          onClose={() => setOpenId('')}
          onChanged={(changes) => {
            setRows((current) => current.map((row) => (row.id === open.id ? { ...row, ...changes } : row)));
            void loadForms();
          }}
          onDeleted={() => {
            setRows((current) => current.filter((row) => row.id !== open.id));
            setOpenId('');
            void loadForms();
          }}
        />
      )}
    </div>
  );
}
