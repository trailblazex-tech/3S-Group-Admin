import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSite } from '../lib/site';

/** The guide page for each website, built from docs/client-guide (node build.mjs <site>). */
function guideFile(siteId: string) {
  return siteId === 'konark' ? '/guide.html' : `/guide-${siteId}.html`;
}

/**
 * The how-to guide for editors, shown inside the admin. It is a self-contained
 * page built from docs/client-guide, so it is shown in a frame rather than
 * rewritten as components. The page is handed to the frame as text (srcdoc):
 * the admin's security headers forbid loading any page of its own in a frame,
 * and this needs no exception.
 */
export function GuidePage() {
  const { site } = useSite();
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setHtml(null);
    setFailed(false);
    fetch(guideFile(site.id))
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
      // A missing file can come back as the app's own page; only a guide counts.
      .then((text) => (text.includes('How to use') ? text : Promise.reject(new Error('not a guide'))))
      .then((text) => alive && setHtml(text))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [site.id]);

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-4 lg:h-[calc(100dvh-5.5rem)]">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Guide</h1>
        <p className="text-sm text-muted-foreground">Step-by-step help for every screen of {site.name}, with pictures.</p>
      </div>
      {failed ? (
        <p className="text-sm text-muted-foreground">The guide could not be loaded. Please refresh the page.</p>
      ) : html === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the guide…
        </p>
      ) : (
        <iframe srcDoc={html} title={`3S Admin guide for ${site.name}`} className="min-h-0 w-full flex-1 rounded-xl border border-border bg-card" />
      )}
    </div>
  );
}
