import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Eye, EyeOff, ImageOff, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import type { AdminRecord, CollectionSummary, FieldOption } from '../lib/api';
import { useSite } from '../lib/site';
import { scheduleStatus } from '../lib/schedule';
import { ScheduleBadge } from '../components/ScheduleBadge';
import { TemplatePicker } from '../components/TemplatePicker';
import { useConfirm } from '../components/ConfirmDialog';
import { RecordForm } from './RecordPage';

const pageSize = 40;

function PageHeader({ collection, count, action }: { collection: CollectionSummary; count: number | null; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold text-foreground">{collection.label}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {collection.description} {count === null || collection.display === 'form' ? '' : `${count} ${count === 1 ? 'record' : 'records'}.`}
        </p>
      </div>
      {action}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="mt-4 space-y-1 overflow-hidden rounded-xl border border-border bg-card p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-3 py-1.5">
          <div className="h-11 w-11 shrink-0 rounded-lg bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded bg-muted" />
            <div className="h-3 w-1/4 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * One screen for every section of every site. The collection declaration on
 * the server says what to show - title, subtitle, photo, grouping, and
 * whether the section is a list, a single form, or a page of short cards -
 * so a new section appears here without a new page being written.
 */
export function CollectionPage() {
  const { name = '' } = useParams();
  const { api, collections, refreshCollections, path, media } = useSite();
  const collection = collections.find((entry) => entry.name === name);

  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [groups, setGroups] = useState<FieldOption[]>([]);
  const [group, setGroup] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isChoosingTemplate, setIsChoosingTemplate] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!collection) return;
    setError('');
    try {
      const result = await api.list(collection.name, group || undefined);
      setRecords(result.records);
      setGroups(result.groups);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not load this section.');
    } finally {
      setIsLoading(false);
    }
  }, [api, collection, group]);

  useEffect(() => {
    setGroup('');
    setSearch('');
    setIsAddingCard(false);
    setIsLoading(true);
  }, [name]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [name, group, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!collection) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((record) =>
      [collection.titleField, collection.subtitleField]
        .map((field) => String(record[field] ?? '').toLowerCase())
        .some((value) => value.includes(needle)),
    );
  }, [collection, records, search]);

  if (!collection) return <p className="text-sm text-muted-foreground">That section does not exist.</p>;

  const reloadAll = async () => {
    await load();
    refreshCollections();
  };

  const hasIsActive = collection.fields.some((field) => field.name === 'isActive');

  const togglePublished = async (record: AdminRecord) => {
    setBusyId(record.id);
    try {
      await api.update(collection.name, record.id, { isActive: !record.isActive });
      await reloadAll();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not update that.');
    } finally {
      setBusyId('');
    }
  };

  const askDelete = (record: AdminRecord) => {
    const title = String(record[collection.titleField] ?? 'this record');
    confirm({
      title: 'Delete permanently?',
      danger: true,
      message: (
        <>
          <span className="font-semibold text-foreground">"{title}"</span> will be deleted for good and cannot be brought back.
          {hasIsActive && record.isActive !== false && ' To take it off the website but keep it, hide it instead.'}
        </>
      ),
      confirmLabel: 'Delete permanently',
      alternative:
        hasIsActive && record.isActive !== false
          ? {
              label: 'Just hide it',
              onChoose: async () => {
                await api.update(collection.name, record.id, { isActive: false });
                await reloadAll();
              },
            }
          : undefined,
      onConfirm: async () => {
        await api.remove(collection.name, record.id, true);
        await reloadAll();
      },
    });
  };

  const move = async (list: AdminRecord[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;

    const ordered = [...list];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setRecords(ordered);

    try {
      await api.reorder(collection.name, ordered.map((record) => record.id));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not save the new order.');
      await load();
    }
  };

  const errorBox = error && (
    <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
      {error}
    </p>
  );

  // -------------------------------------------------------------------------
  // One row, edited in place: the form opens straight away.
  // -------------------------------------------------------------------------
  if (collection.display === 'form') {
    const record = records[0];
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader collection={collection} count={null} />
        {errorBox}
        {isLoading ? (
          <LoadingRows />
        ) : record ? (
          <RecordForm key={record.id} collection={collection} recordId={record.id} initialRecord={record} variant="page" onSaved={() => void reloadAll()} />
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
            This section has not been set up yet. Ask a platform administrator to import it.
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Short sections: every row's form open on one page.
  // -------------------------------------------------------------------------
  if (collection.display === 'cards') {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          collection={collection}
          count={isLoading ? null : records.length}
          action={
            !collection.fixed && (
              <button
                type="button"
                onClick={() => setIsAddingCard(true)}
                disabled={isAddingCard}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-bold text-white transition-colors hover:bg-navy-deep disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add another
              </button>
            )
          }
        />
        {errorBox}
        {isLoading ? (
          <LoadingRows />
        ) : (
          <ol className="mt-5 space-y-4">
            {records.map((record, index) => (
              <li key={record.id}>
                <div className="mb-1.5 flex items-center gap-2 px-1">
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-navy px-2 text-[11px] font-bold tabular-nums text-white">{index + 1}</span>
                  {hasIsActive && record.isActive === false && (
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Hidden</span>
                  )}
                  {records.length > 1 && (
                    <span className="ml-auto flex items-center gap-0.5">
                      <button type="button" onClick={() => move(records, index, -1)} disabled={index === 0} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-25" aria-label="Move up" title="Move up">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(records, index, 1)}
                        disabled={index === records.length - 1}
                        className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-25"
                        aria-label="Move down"
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </div>
                <RecordForm
                  key={`${record.id}-${String(record.isActive)}`}
                  collection={collection}
                  recordId={record.id}
                  initialRecord={record}
                  variant="card"
                  onSaved={() => void reloadAll()}
                  onDeleted={() => void reloadAll()}
                />
              </li>
            ))}
            {isAddingCard && (
              <li>
                <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">New</p>
                <RecordForm
                  collection={collection}
                  recordId={null}
                  variant="card"
                  onSaved={() => {
                    setIsAddingCard(false);
                    void reloadAll();
                  }}
                  onCancel={() => setIsAddingCard(false)}
                />
              </li>
            )}
            {records.length === 0 && !isAddingCard && (
              <li className="rounded-xl border border-dashed border-border py-14 text-center">
                <p className="text-sm font-semibold text-foreground">Nothing here yet.</p>
                {!collection.fixed && (
                  <button type="button" onClick={() => setIsAddingCard(true)} className="mt-2 text-sm font-semibold text-muted-foreground underline hover:text-foreground">
                    Add the first one
                  </button>
                )}
              </li>
            )}
          </ol>
        )}
        {confirmDialog}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // The list.
  // -------------------------------------------------------------------------
  const canReorder = !search;
  const derived = collection.derivedRows ?? {};

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        collection={collection}
        count={isLoading ? null : records.length}
        action={
          !collection.fixed &&
          (collection.templates ? (
            <button
              type="button"
              onClick={() => setIsChoosingTemplate(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-bold text-white transition-colors hover:bg-navy-deep"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          ) : (
            <Link
              to={path(`/c/${collection.name}/new`)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-bold text-white transition-colors hover:bg-navy-deep"
            >
              <Plus className="h-4 w-4" />
              Add
            </Link>
          ))
        }
      />
      {isChoosingTemplate && (
        <TemplatePicker
          onClose={() => setIsChoosingTemplate(false)}
          onBlank={() => navigate(path(`/c/${collection.name}/new`))}
          onPick={(template) => navigate(`${path(`/c/${collection.name}/new`)}?template=${encodeURIComponent(template.id)}`)}
        />
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${collection.label.toLowerCase()}...`}
            aria-label={`Search ${collection.label}`}
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {groups.length > 0 && (
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            aria-label="Filter"
            className="h-10 max-w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All</option>
            {groups.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {errorBox}

      {isLoading ? (
        <LoadingRows />
      ) : visible.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border py-14 text-center">
          <p className="text-sm font-semibold text-foreground">{search ? 'No matches.' : 'Nothing here yet.'}</p>
          {!search && !collection.fixed && (
            <Link to={path(`/c/${collection.name}/new`)} className="mt-2 inline-block text-sm font-semibold text-muted-foreground underline hover:text-foreground">
              Add the first one
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {visible.slice(0, visibleCount).map((record, index) => {
            const title = String(record[collection.titleField] || record[collection.subtitleField] || 'Untitled');
            const subtitle = String(record[collection.subtitleField] ?? '');
            const image = collection.imageField ? (record[collection.imageField] as string | null) : null;
            const isBusy = busyId === record.id;
            const derivedFrom = derived[record.id];

            return (
              <li key={record.id} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 sm:px-4">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(visible, index, -1)}
                    disabled={index === 0 || !canReorder}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-25"
                    aria-label={`Move ${title} up`}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(visible, index, 1)}
                    disabled={index === visible.length - 1 || !canReorder}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-25"
                    aria-label={`Move ${title} down`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {collection.imageField &&
                  (image ? (
                    <img src={media(image)} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-border bg-muted object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                      <ImageOff className="h-4 w-4" />
                    </span>
                  ))}

                {derivedFrom ? (
                  <div className="min-w-0 flex-1" title={derivedFrom}>
                    <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                    <p className="truncate text-xs text-muted-foreground">{derivedFrom}</p>
                  </div>
                ) : (
                  <Link to={path(`/c/${collection.name}/${encodeURIComponent(record.id)}`)} className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${record.isActive === false ? 'text-muted-foreground' : 'text-foreground'}`}>{title}</p>
                    {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                  </Link>
                )}

                {derivedFrom && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-blue ring-1 ring-inset ring-brand-blue/25">
                    <Sparkles className="h-3 w-3" />
                    Automatic
                  </span>
                )}

                {collection.schedule ? (
                  <>
                    <span className="sm:hidden">
                      <ScheduleBadge status={scheduleStatus(record, collection.schedule)} compact />
                    </span>
                    <span className="hidden sm:inline">
                      <ScheduleBadge status={scheduleStatus(record, collection.schedule)} />
                    </span>
                  </>
                ) : (
                  !collection.fixed &&
                  record.isActive === false && (
                    <span className="hidden rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:inline">Hidden</span>
                  )
                )}

                {!collection.fixed && (
                  <>
                    {hasIsActive && (
                      <button
                        type="button"
                        onClick={() => togglePublished(record)}
                        disabled={isBusy}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                        aria-label={record.isActive ? `Hide ${title}` : `Show ${title}`}
                        title={record.isActive ? 'Hide from website' : 'Show on website'}
                      >
                        {record.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => askDelete(record)}
                      disabled={isBusy}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-25"
                      aria-label={`Delete ${title}`}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && visible.length > visibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + pageSize)}
          className="mt-4 w-full rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
        >
          Show {Math.min(pageSize, visible.length - visibleCount)} more ({visible.length - visibleCount} remaining)
        </button>
      )}

      {!canReorder && visible.length > 1 && <p className="mt-3 text-xs text-muted-foreground">Clear the search to change the order.</p>}
      {confirmDialog}
    </div>
  );
}
