import { useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useSite } from '../lib/site';

/**
 * Roughly what a visitor sees: the website's greeting pop-up, drawn from the
 * form as it is now (before saving). Banner-only greetings show the picture
 * large with nothing over it.
 */
export function GreetingPreview({ values, onClose }: { values: Record<string, unknown>; onClose: () => void }) {
  const { site, media } = useSite();
  const text = (name: string) => (typeof values[name] === 'string' ? (values[name] as string).trim() : '');
  const isBannerOnly = values.layout === 'banner';
  const banner = text('bannerImage');
  const ctaLabel = text('ctaLabel');
  const hasCta = Boolean(ctaLabel && text('ctaHref'));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-lg">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-white/70">Preview - how visitors see it</p>
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl">
          <button type="button" onClick={onClose} aria-label="Close preview" className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60">
            <X className="h-4 w-4" />
          </button>

          {isBannerOnly ? (
            banner ? (
              <img src={media(banner)} alt="" className="max-h-[70dvh] w-full bg-neutral-900 object-contain" />
            ) : (
              <p className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">Choose a banner to see it here.</p>
            )
          ) : (
            banner && (
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img src={media(banner)} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
              </div>
            )
          )}

          <div className={isBannerOnly ? 'flex items-center gap-2 px-4 py-3' : 'px-6 pb-6 pt-4'}>
            {!isBannerOnly && (
              <>
                <span className="inline-flex rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--site-accent))]">
                  {site.name}
                </span>
                {text('title') && <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-[#141b2d]">{text('title')}</h3>}
                {text('message') && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-600">{text('message')}</p>}
              </>
            )}
            <div className={`flex flex-wrap gap-2 ${isBannerOnly ? 'w-full justify-end' : 'mt-5'}`}>
              {hasCta && (
                <span className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-extrabold text-navy-deep">
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
              <span className="inline-flex items-center rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-extrabold text-neutral-800">Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
