import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Eye, EyeOff, ImageOff, Plus, Search, Trash2 } from 'lucide-react';
import type { AdminRecord, FieldOption } from '../lib/api';
import { useSite } from '../lib/site';

const pageSize = 40;

/**
 * One screen for every section of every site. The collection declaration on
 * the server says what to show - title, subtitle, photo, grouping - so a new
 * section appears here without a new page being written.
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

  const togglePublished = async (record: AdminRecord) => {
    setBusyId(record.id);
    try {
      await api.update(collection.name, record.id, { isActive: !record.isActive });
      await load();
      refreshCollections();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not update that.');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (record: AdminRecord) => {
    const title = String(record[collection.titleField] ?? 'this record');
    if (!window.confirm(`Remove "${title}" from the website? You can bring it back later with the eye button.`)) return;

    setBusyId(record.id);
    try {
      await api.remove(collection.name, record.id);
      await load();
      refreshCollections();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not remove that.');
    } finally {
      setBusyId('');
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= visible.length) return;

    const ordered = [...visible];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setRecords(ordered);

    try {
      await api.reorder(collection.name, ordered.map((record) => record.id));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not save the new order.');
      await load();
    }
  };

  const canReorder = !search;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{collection.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {collection.description} {isLoading ? '' : `${records.length} ${records.length === 1 ? 'record' : 'records'}.`}
          </p>
        </div>
        {!collection.fixed && (
          <Link
            to={path(`/c/${collection.name}/new`)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-bold text-white transition-colors hover:bg-navy-deep"
          >
            <Plus className="h-4 w-4" />
            Add
          </Link>
        )}
      </div>

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

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {isLoading ? (
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
            const title = String(record[collection.titleField] ?? 'Untitled');
            const subtitle = String(record[collection.subtitleField] ?? '');
            const image = collection.imageField ? (record[collection.imageField] as string | null) : null;
            const isBusy = busyId === record.id;

            return (
              <li key={record.id} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 sm:px-4">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || !canReorder}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-25"
                    aria-label={`Move ${title} up`}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === visible.length - 1 || !canReorder}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-25"
                    aria-label={`Move ${title} down`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {collection.imageField &&
                  (image ? (
                    <img
                      src={media(image)}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg border border-border bg-muted object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                      <ImageOff className="h-4 w-4" />
                    </span>
                  ))}

                <Link to={path(`/c/${collection.name}/${encodeURIComponent(record.id)}`)} className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${record.isActive === false ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {title}
                  </p>
                  {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                </Link>

                {!collection.fixed && record.isActive === false && (
                  <span className="hidden rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:inline">
                    Hidden
                  </span>
                )}

                {!collection.fixed && (
                  <>
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
                    <button
                      type="button"
                      onClick={() => remove(record)}
                      disabled={isBusy || record.isActive === false}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-25"
                      aria-label={`Remove ${title}`}
                      title="Remove"
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

      {!canReorder && visible.length > 1 && (
        <p className="mt-3 text-xs text-muted-foreground">Clear the search to change the order.</p>
      )}
    </div>
  );
}
