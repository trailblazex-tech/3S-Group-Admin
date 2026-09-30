import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, FileText, ImagePlus, Loader2, Save, Sparkles, Upload } from 'lucide-react';
import type { AdminRecord, CollectionSummary, FieldDefinition, FieldOption, GreetingTemplate, ScheduleFields } from '../lib/api';
import { useSite } from '../lib/site';
import { fillOrg, loadGreetingLibrary } from '../lib/library';
import { addDays, describeWindow, istNow, scheduleStatus, suggestDates } from '../lib/schedule';
import { BannerPicker } from '../components/BannerPicker';
import { ScheduleBadge } from '../components/ScheduleBadge';

type Values = Record<string, unknown>;

const inputClass =
  'w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

function emptyValues(fields: FieldDefinition[]): Values {
  return Object.fromEntries(fields.map((field) => [field.name, field.type === 'boolean' ? (field.default ?? false) : '']));
}

function toFormValue(field: FieldDefinition, raw: unknown) {
  if (field.type === 'tags') return Array.isArray(raw) ? raw.join(', ') : (raw ?? '');
  if (field.type === 'boolean') return Boolean(raw);
  return raw ?? '';
}

function toPayload(fields: FieldDefinition[], values: Values) {
  const payload: Values = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.type === 'tags') {
      payload[field.name] = String(value ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    } else if (field.type === 'number') {
      payload[field.name] = value === '' || value === null ? null : Number(value);
    } else if (typeof value === 'string') {
      payload[field.name] = value.trim();
    } else {
      payload[field.name] = value;
    }
  }
  return payload;
}

function UploadButton({ kind, collectionName, onUploaded }: { kind: 'image' | 'file'; collectionName: string; onUploaded: (url: string) => void }) {
  const { api } = useSite();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const accept = kind === 'image' ? 'image/jpeg,image/png,image/webp,image/gif' : 'application/pdf';

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type === 'image/gif' && file.size > 3 * 1024 * 1024) {
      const ok = window.confirm(
        `This GIF is ${(file.size / 1024 / 1024).toFixed(1)} MB. Large GIFs make the website slow to open on phones - under 3 MB is best. Upload it anyway?`,
      );
      if (!ok) return;
    }

    setIsUploading(true);
    setError('');
    try {
      onUploaded(await api.upload(collectionName, file));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-1">
      <label
        className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-muted px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/70 ${
          isUploading ? 'pointer-events-none opacity-70' : ''
        }`}
      >
        {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {isUploading ? 'Uploading...' : kind === 'image' ? 'Upload a photo' : 'Upload a PDF'}
        <input type="file" accept={accept} onChange={handleChange} disabled={isUploading} className="sr-only" />
      </label>
      <p className="text-[11px] text-muted-foreground">
        {kind === 'image' ? 'JPG, PNG, WEBP or GIF, up to 10 MB.' : 'PDF, up to 20 MB.'}
      </p>
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  dynamicOptions,
  collectionName,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  dynamicOptions: Record<string, FieldOption[]>;
  collectionName: string;
}) {
  const { media } = useSite();

  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
        <input
          id={field.name}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-input accent-[hsl(var(--site-accent))]"
        />
        {field.label}
      </label>
    );
  }

  if (field.type === 'textarea') {
    const text = String(value ?? '');
    return (
      <div>
        <textarea id={field.name} rows={4} maxLength={field.maxLength} value={text} onChange={(event) => onChange(event.target.value)} className={inputClass} />
        {field.maxLength && (
          <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
            {text.length}/{field.maxLength}
          </p>
        )}
      </div>
    );
  }

  if (field.type === 'select') {
    const options = field.optionsFrom ? (dynamicOptions[field.optionsFrom] ?? []) : (field.options ?? []);
    const current = String(value ?? '');
    const isCustom = current !== '' && !options.some((option) => option.value === current);

    return (
      <div className="space-y-2">
        <select
          id={field.name}
          value={isCustom ? '__custom__' : current}
          onChange={(event) => onChange(event.target.value === '__custom__' ? ' ' : event.target.value)}
          className={inputClass}
        >
          <option value="">{field.required ? 'Choose...' : 'Not set'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {field.allowCustom && <option value="__custom__">Something new...</option>}
        </select>

        {field.allowCustom && isCustom && (
          <input
            type="text"
            autoFocus
            value={current.trimStart()}
            onChange={(event) => onChange(event.target.value || ' ')}
            placeholder="Type the new value"
            aria-label={`${field.label} (new value)`}
            className={inputClass}
          />
        )}
      </div>
    );
  }

  if (field.type === 'file') {
    const current = String(value ?? '');
    return (
      <div className="space-y-2">
        <UploadButton kind="file" collectionName={collectionName} onUploaded={onChange} />
        {current && (
          <a
            href={media(current)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">Open the current file</span>
          </a>
        )}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Or enter a link</summary>
          <input id={field.name} type="text" value={current} onChange={(event) => onChange(event.target.value)} placeholder="https://... or /documents/..." className={`${inputClass} mt-2`} />
        </details>
      </div>
    );
  }

  if (field.type === 'date') {
    return <input id={field.name} type="date" value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} className={inputClass} />;
  }

  if (field.type === 'time') {
    return (
      <div className="flex gap-2">
        <input id={field.name} type="time" value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} className={inputClass} />
        {Boolean(value) && (
          <button type="button" onClick={() => onChange('')} className="shrink-0 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted">
            Clear
          </button>
        )}
      </div>
    );
  }

  if (field.type === 'image' && field.library) {
    return <LibraryImageInput field={field} value={String(value ?? '')} onChange={onChange} collectionName={collectionName} />;
  }

  if (field.type === 'image') {
    const current = String(value ?? '');
    return (
      <div className="flex items-start gap-3">
        {current ? (
          <img src={media(current)} alt="" className="h-24 w-24 shrink-0 rounded-lg border border-border bg-muted object-cover" />
        ) : (
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
            No photo
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <UploadButton kind="image" collectionName={collectionName} onUploaded={onChange} />
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Or enter an image link</summary>
            <input id={field.name} type="text" value={current} onChange={(event) => onChange(event.target.value)} placeholder="https://... or /images/..." className={`${inputClass} mt-2`} />
          </details>
          {current && (
            <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-muted-foreground underline hover:text-destructive">
              Remove photo
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <input
      id={field.name}
      type={field.type === 'number' ? 'number' : 'text'}
      inputMode={field.type === 'number' ? 'numeric' : undefined}
      min={field.min}
      max={field.max}
      maxLength={field.maxLength}
      value={String(value ?? '')}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  );
}

/** A banner field: ready-made animated banners first, uploading second. */
function LibraryImageInput({ field, value, onChange, collectionName }: { field: FieldDefinition; value: string; onChange: (value: unknown) => void; collectionName: string }) {
  const { media } = useSite();
  const [isPicking, setIsPicking] = useState(false);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
        {value ? (
          <img src={media(value)} alt="" className="h-full w-full object-cover" />
        ) : (
          <button type="button" onClick={() => setIsPicking(true)} className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ImagePlus className="h-7 w-7" />
            No banner - the greeting shows as text only
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <button
          type="button"
          onClick={() => setIsPicking(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-navy px-3 text-xs font-bold text-white transition-colors hover:bg-navy-deep"
        >
          <Sparkles className="h-3.5 w-3.5 text-gold-light" />
          Choose a ready-made banner
        </button>
        <UploadButton kind="image" collectionName={collectionName} onUploaded={onChange} />
        {value && (
          <button type="button" onClick={() => onChange('')} className="h-9 text-xs font-semibold text-muted-foreground underline hover:text-destructive">
            Remove banner
          </button>
        )}
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Or paste an image or GIF link</summary>
        <input id={field.name} type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://..." className={`${inputClass} mt-2`} />
      </details>
      {isPicking && (
        <BannerPicker
          current={value}
          onClose={() => setIsPicking(false)}
          onPick={(url) => {
            onChange(url);
            setIsPicking(false);
          }}
        />
      )}
    </div>
  );
}

const rangePresets: { label: string; days: number }[] = [
  { label: 'Just that day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
];

/** Start and end together, with a sentence saying exactly when visitors see it. */
function ScheduleEditor({
  collection,
  schedule,
  values,
  setValue,
  dynamicOptions,
}: {
  collection: CollectionSummary;
  schedule: ScheduleFields;
  values: Values;
  setValue: (name: string, value: unknown) => void;
  dynamicOptions: Record<string, FieldOption[]>;
}) {
  const field = (name: string | undefined) => collection.fields.find((entry) => entry.name === name);
  const cells = [schedule.start, schedule.startTime, schedule.end, schedule.endTime].map(field).filter(Boolean) as FieldDefinition[];
  const summary = describeWindow(values, schedule);
  const status = scheduleStatus(values, schedule);
  const start = typeof values[schedule.start] === 'string' ? (values[schedule.start] as string) : '';

  return (
    <fieldset className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
        <CalendarClock className="h-4 w-4" />
        When it shows on the website
      </legend>

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Quick:</span>
        {rangePresets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              const from = start || istNow().date;
              if (!start) setValue(schedule.start, from);
              setValue(schedule.end, addDays(from, preset.days - 1));
              if (schedule.endTime) setValue(schedule.endTime, '');
            }}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground hover:border-accent"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {cells.map((cell) => (
          <div key={cell.name}>
            <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor={cell.name}>
              {cell.label}
              {cell.required && <span className="text-destructive"> *</span>}
            </label>
            <FieldInput field={cell} value={values[cell.name]} onChange={(next) => setValue(cell.name, next)} dynamicOptions={dynamicOptions} collectionName={collection.name} />
            {cell.help && <p className="mt-1.5 text-xs text-muted-foreground">{cell.help}</p>}
          </div>
        ))}
      </div>

      {summary && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-card px-3 py-2.5 text-sm text-foreground ring-1 ring-inset ring-border">
          <ScheduleBadge status={status} compact />
          <span>{summary}</span>
        </div>
      )}
    </fieldset>
  );
}

/** A template's values for a new record, with this website's name filled in. */
function valuesFromTemplate(template: GreetingTemplate, fields: FieldDefinition[], org: string, bannerUrl: string) {
  const has = (name: string) => fields.some((field) => field.name === name);
  const today = istNow().date;
  const dates = template.on ? suggestDates(template.on, template.around, today) : null;
  const year = (dates?.endDate ?? today).slice(0, 4);
  const values: Values = {
    eventName: `${template.label} ${year}`,
    title: template.title,
    message: fillOrg(template.message, org),
    bannerImage: bannerUrl,
    bannerAlt: template.alt,
    startDate: dates?.startDate ?? '',
    endDate: dates?.endDate ?? '',
    frequency: 'visit',
  };
  if (template.cta) {
    values.ctaLabel = template.cta.label;
    values.ctaHref = template.cta.href;
  }
  return Object.fromEntries(Object.entries(values).filter(([name]) => has(name)));
}

export function RecordPage() {
  const { name = '', id = '' } = useParams();
  const navigate = useNavigate();
  const { api, site, collections, refreshCollections, path } = useSite();
  const collection = collections.find((entry) => entry.name === name);
  const isNew = id === 'new';
  const [searchParams] = useSearchParams();
  const templateId = isNew ? searchParams.get('template') : null;
  const [templateNote, setTemplateNote] = useState('');

  const fields = useMemo(() => (collection?.fields ?? []).filter((field) => !field.adminOnly), [collection]);
  const [values, setValues] = useState<Values>(() => emptyValues(fields));
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, FieldOption[]>>({});

  useEffect(() => {
    if (!collection) return;
    setError('');
    setIsDirty(false);

    if (isNew) {
      setValues(emptyValues(fields));
      if (!templateId || !collection.templates) {
        setIsLoading(false);
        return;
      }
      // Starting from a festival or school occasion: fill in what we can.
      let alive = true;
      setIsLoading(true);
      loadGreetingLibrary(api)
        .then((library) => {
          const template = library.templates.find((entry) => entry.id === templateId);
          if (!alive || !template) return;
          const banner = library.banners.find((entry) => entry.theme === template.theme)?.url ?? '';
          setValues((current) => ({ ...current, ...valuesFromTemplate(template, fields, site.name, banner) }));
          setIsDirty(true);
          setTemplateNote(
            template.on
              ? `Filled in from "${template.label}". Check the wording and dates, then save.`
              : `Filled in from "${template.label}". Its date changes every year - set "Show from" and "Show until" before saving.`,
          );
        })
        .catch(() => alive && setTemplateNote('Could not load the ready-made greeting - fill the form in by hand.'))
        .finally(() => alive && setIsLoading(false));
      return () => {
        alive = false;
      };
    }

    setIsLoading(true);
    api
      .get(collection.name, id)
      .then((record: AdminRecord) => setValues(Object.fromEntries(fields.map((field) => [field.name, toFormValue(field, record[field.name])]))))
      .catch((problem) => setError(problem instanceof Error ? problem.message : 'Could not load that record.'))
      .finally(() => setIsLoading(false));
  }, [api, collection, fields, id, isNew, templateId, site.name]);

  useEffect(() => {
    if (!collection) return;
    const keys = new Set(collection.fields.map((field) => field.optionsFrom).filter(Boolean) as string[]);
    if (keys.size === 0) return;

    api
      .list(collection.name)
      .then((result) => setDynamicOptions(Object.fromEntries([...keys].map((key) => [key, result.groups]))))
      .catch(() => setDynamicOptions({}));
  }, [api, collection]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  if (!collection) return <p className="text-sm text-muted-foreground">That section does not exist.</p>;

  const listPath = path(`/c/${collection.name}`);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError('');

    try {
      const payload = toPayload(fields, values);
      if (isNew) await api.create(collection.name, payload);
      else await api.update(collection.name, id, payload);
      setIsDirty(false);
      refreshCollections();
      navigate(listPath);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not save.');
      setIsSaving(false);
    }
  };

  const title = isNew ? `Add to ${collection.label}` : String(values[collection.titleField] || 'Edit');

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={listPath} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {collection.label}
      </Link>

      <h1 className="mt-3 break-words font-display text-3xl font-semibold text-foreground">{title}</h1>

      {isLoading ? (
        <div className="mt-6 space-y-5 rounded-xl border border-border bg-card p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse space-y-2">
              <div className="h-3.5 w-24 rounded bg-muted" />
              <div className="h-10 rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <form className="mt-6 space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6" onSubmit={handleSubmit}>
          {templateNote && (
            <p className="flex items-start gap-2 rounded-lg bg-gold/15 px-3 py-2.5 text-sm text-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              {templateNote}
            </p>
          )}
          {fields.map((field) => {
            const schedule = collection.schedule;
            if (schedule && field.name === schedule.start) {
              return (
                <ScheduleEditor
                  key="schedule"
                  collection={collection}
                  schedule={schedule}
                  values={values}
                  dynamicOptions={dynamicOptions}
                  setValue={(fieldName, next) => {
                    setIsDirty(true);
                    setValues((current) => ({ ...current, [fieldName]: next }));
                  }}
                />
              );
            }
            if (schedule && [schedule.end, schedule.startTime, schedule.endTime].includes(field.name)) return null;
            return (
            <div key={field.name}>
              {field.type !== 'boolean' && (
                <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </label>
              )}
              <FieldInput
                field={field}
                value={values[field.name]}
                onChange={(next) => {
                  setIsDirty(true);
                  setValues((current) => ({ ...current, [field.name]: next }));
                }}
                dynamicOptions={dynamicOptions}
                collectionName={collection.name}
              />
              {field.help && <p className="mt-1.5 text-xs text-muted-foreground">{field.help}</p>}
            </div>
            );
          })}

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}

          <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-3 rounded-b-xl border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <Link to={listPath} className="inline-flex h-10 items-center rounded-lg border border-border px-5 text-sm font-semibold text-foreground hover:bg-muted">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
