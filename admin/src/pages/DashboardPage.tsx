import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { ActivityEntry } from '../lib/api';
import { useSite } from '../lib/site';
import { relativeTime } from '../lib/time';

const actionWording: Record<string, string> = {
  create: 'added',
  update: 'updated',
  delete: 'removed',
  reorder: 'reordered',
  publish: 'published the website',
};

export function ActivityList({ entries, isLoading }: { entries: ActivityEntry[]; isLoading?: boolean }) {
  const { collections } = useSite();
  const labelFor = (name: string | null) => collections.find((entry) => entry.name === name)?.label ?? name;

  if (isLoading) {
    return (
      <ul className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index} className="flex animate-pulse gap-3 px-5 py-3.5">
            <div className="h-3.5 w-1/2 rounded bg-muted" />
            <div className="ml-auto h-3.5 w-16 rounded bg-muted" />
          </li>
        ))}
      </ul>
    );
  }

  if (entries.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nothing has been changed yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 px-5 py-3 text-sm">
          <span className="font-semibold text-foreground" title={entry.email ?? undefined}>
            {entry.user}
          </span>
          <span className="text-muted-foreground">{actionWording[entry.action] ?? entry.action}</span>
          {entry.title && entry.action !== 'publish' && <span className="font-medium text-foreground">{entry.title}</span>}
          {entry.collection && <span className="text-muted-foreground">in {labelFor(entry.collection)}</span>}
          <time
            dateTime={entry.at}
            title={new Date(entry.at).toLocaleString()}
            className="ml-auto whitespace-nowrap text-xs text-muted-foreground"
          >
            {relativeTime(entry.at)}
          </time>
        </li>
      ))}
    </ul>
  );
}

export function DashboardPage() {
  const { site, api, collections, path } = useSite();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [publishState, setPublishState] = useState<{ busy: boolean; ok: boolean; message: string }>({
    busy: false,
    ok: true,
    message: '',
  });

  const loadActivity = useCallback(() => {
    api
      .activity(8)
      .then(setActivity)
      .catch(() => setActivity([]))
      .finally(() => setIsLoading(false));
  }, [api]);

  useEffect(() => {
    setIsLoading(true);
    setPublishState({ busy: false, ok: true, message: '' });
    loadActivity();
  }, [loadActivity]);

  const publish = async () => {
    setPublishState({ busy: true, ok: true, message: '' });
    try {
      const result = await api.publish();
      setPublishState({ busy: false, ok: result.queued, message: result.message });
      loadActivity();
    } catch (error) {
      setPublishState({ busy: false, ok: false, message: error instanceof Error ? error.message : 'Publish failed.' });
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything you can edit on {site.name}.</p>
        </div>
        <button
          type="button"
          onClick={publish}
          disabled={publishState.busy}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-navy-deep shadow-sm transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {publishState.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Publish to website
        </button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Saved changes go live on the website when you publish.
      </p>

      {publishState.message && (
        <p
          role="status"
          className={`mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
            publishState.ok ? 'border-success/30 bg-success/5 text-foreground' : 'border-destructive/30 bg-destructive/5 text-foreground'
          }`}
        >
          {publishState.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          )}
          {publishState.message}
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {collections.map((collection) => {
          const hidden = collection.total - collection.published;
          return (
            <Link
              key={collection.name}
              to={path(`/c/${collection.name}`)}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent"
            >
              <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="truncate">{collection.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{collection.published}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {collection.fixed ? 'rows' : hidden > 0 ? `${hidden} hidden` : 'all published'}
              </p>
            </Link>
          );
        })}
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-bold text-foreground">Recent activity</h2>
          <Link to={path('/activity')} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </header>
        <ActivityList entries={activity} isLoading={isLoading} />
      </section>
    </div>
  );
}

export function ActivityPage() {
  const { site, api } = useSite();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .activity(100)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setIsLoading(false));
  }, [api]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Activity log</h1>
      <p className="mt-1 text-sm text-muted-foreground">Who changed what on {site.name}, and when.</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <ActivityList entries={entries} isLoading={isLoading} />
      </div>
    </div>
  );
}
