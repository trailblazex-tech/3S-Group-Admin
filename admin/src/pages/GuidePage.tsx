import { ExternalLink } from 'lucide-react';

/**
 * The how-to guide for editors, shown inside the admin. It is a self-contained
 * page built from docs/client-guide (`node build.mjs` writes public/guide.html),
 * so it is framed here rather than rewritten as components.
 */
export function GuidePage() {
  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col gap-4 lg:h-[calc(100dvh-5rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Guide</h1>
          <p className="text-sm text-muted-foreground">Step-by-step help for every screen, with pictures.</p>
        </div>
        <a
          href="/guide.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" />
          Open in a new tab
        </a>
      </div>
      <iframe
        src="/guide.html"
        title="3S Admin guide"
        className="min-h-0 w-full flex-1 rounded-xl border border-border bg-card"
      />
    </div>
  );
}
