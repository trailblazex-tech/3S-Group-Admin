import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Save, Upload } from 'lucide-react';
import type { AdminRecord, FieldDefinition, FieldOption } from '../lib/api';
import { useSite } from '../lib/site';

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
  const accept = kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'application/pdf';

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

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
        {kind === 'image' ? 'JPG, PNG or WEBP, up to 10 MB.' : 'PDF, up to 20 MB.'}
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

export function RecordPage() {
  const { name = '', id = '' } = useParams();
  const navigate = useNavigate();
  const { api, collections, refreshCollections, path } = useSite();
  const collection = collections.find((entry) => entry.name === name);
  const isNew = id === 'new';

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
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    api
      .get(collection.name, id)
      .then((record: AdminRecord) => setValues(Object.fromEntries(fields.map((field) => [field.name, toFormValue(field, record[field.name])]))))
      .catch((problem) => setError(problem instanceof Error ? problem.message : 'Could not load that record.'))
      .finally(() => setIsLoading(false));
  }, [api, collection, fields, id, isNew]);

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

      <h1 className="mt-3 break-words text-2xl font-bold text-foreground">{title}</h1>

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
          {fields.map((field) => (
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
          ))}

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
