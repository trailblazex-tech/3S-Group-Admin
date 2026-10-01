import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ArrowUpRight, Loader2, LogOut } from 'lucide-react';
import { ApiError, me, sessionExpired, siteApi, type CollectionSummary, type Me, type Site } from './lib/api';
import { BrandLockup, BrandMark } from './components/Brand';
import { hasOwnLogo, siteLogo } from './lib/siteLogos';
import { auth } from './lib/auth';
import { SiteContext, mediaUrl, type SiteContextValue } from './lib/site';
import { AdminLayout } from './components/AdminLayout';
import { SignInPage } from './pages/SignInPage';
import { ActivityPage, DashboardPage } from './pages/DashboardPage';
import { CollectionPage } from './pages/CollectionPage';
import { RecordPage } from './pages/RecordPage';
import { LeadsPage } from './pages/LeadsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

function FullPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 text-center text-sm text-muted-foreground">
      <div className="flex flex-col items-center gap-3">{children}</div>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <FullPage>
      <span className="relative flex h-14 w-14 items-center justify-center">
        <Loader2 className="absolute h-14 w-14 animate-spin text-gold/60" strokeWidth={1.25} />
        <BrandMark className="h-9 w-9" />
      </span>
      {label}
    </FullPage>
  );
}

function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <button
      type="button"
      onClick={onSignOut}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}

function domainOf(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function SiteTile({ site, upcoming = false }: { site: Site; upcoming?: boolean }) {
  const style = { '--tile-accent': site.accent } as CSSProperties;
  // A site with its own logo gets its own colour; the other group companies
  // share the 3S mark, so they share its navy, blue and gold too.
  const band = hasOwnLogo(site.id)
    ? `linear-gradient(135deg, hsl(${site.accent}), hsl(${site.accent} / 0.55) 60%, hsl(${site.accent} / 0.15))`
    : 'linear-gradient(120deg, hsl(var(--admin-navy)) 0%, hsl(var(--brand-blue)) 70%, hsl(var(--brand-gold) / 0.85) 130%)';
  const body = (
    <>
      <span aria-hidden className="absolute inset-x-0 top-0 h-28" style={{ background: band }} />
      <span aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
      <span className="relative flex items-start justify-between gap-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg ring-4 ring-white/40">
          <img src={siteLogo(site.id)} alt={`${site.name} logo`} className="h-full w-full object-contain" draggable={false} />
        </span>
        {upcoming ? (
          <span className="rounded-full border border-gold-light/50 bg-navy-deep/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gold-light backdrop-blur">
            Coming soon
          </span>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-navy transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        )}
      </span>
      <span className="relative mt-auto block pt-10">
        <span className="block font-display text-2xl font-semibold leading-tight text-foreground">{site.name}</span>
        {site.tagline && <span className="mt-1 block text-sm text-muted-foreground">{site.tagline}</span>}
        <span className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
          <span className="truncate font-medium text-muted-foreground">{site.publicUrl ? domainOf(site.publicUrl) : 'Website not connected yet'}</span>
          <span className={`shrink-0 font-bold ${upcoming ? 'text-muted-foreground' : 'text-foreground'}`}>{upcoming ? 'Setup pending' : 'Open admin'}</span>
        </span>
      </span>
    </>
  );

  const shell = 'group relative flex min-h-[15rem] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 text-left';
  if (upcoming) {
    return (
      <div style={style} className={`${shell} shadow-sm`} aria-label={`${site.name} - coming soon`}>
        {body}
      </div>
    );
  }
  return (
    <Link to={`/s/${site.id}`} style={style} className={`${shell} shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[hsl(var(--tile-accent))] hover:shadow-xl`}>
      {body}
    </Link>
  );
}

function SitePicker({ user, sites, upcoming, onSignOut }: { user: Me; sites: Site[]; upcoming: Site[]; onSignOut: () => void }) {
  useEffect(() => {
    document.title = '3S Group - Website admin';
    document.documentElement.style.removeProperty('--site-accent');
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-brand-night">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <BrandLockup />
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-semibold text-white">{user.name}</span>
              <span className="block text-xs text-white/55">{user.email}</span>
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-light/80">Namaste, {user.name.split(' ')[0]}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-5xl">
            Which website are you <span className="text-brand-gold">working on?</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
            Every 3S Group website in one place. Pick one to edit its content - you can switch any time from the top of the menu.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-12 max-w-6xl px-5 pb-16 sm:px-8">
        <ul className="grid gap-5 sm:grid-cols-2">
          {sites.map((site) => (
            <li key={site.id} className="flex">
              <SiteTile site={site} />
            </li>
          ))}
          {upcoming.map((site) => (
            <li key={site.id} className="flex">
              <SiteTile site={site} upcoming />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

function Home({ user, sites, upcoming, onSignOut }: { user: Me; sites: Site[]; upcoming: Site[]; onSignOut: () => void }) {
  // Someone who edits a single website goes straight to it.
  if (sites.length === 1 && upcoming.length === 0) return <Navigate to={`/s/${sites[0].id}`} replace />;
  return <SitePicker user={user} sites={sites} upcoming={upcoming} onSignOut={onSignOut} />;
}

function SiteWorkspace({ user, sites, upcoming, onSignOut }: { user: Me; sites: Site[]; upcoming: Site[]; onSignOut: () => void }) {
  const { siteId = '' } = useParams();
  const site = sites.find((entry) => entry.id === siteId);
  const [collections, setCollections] = useState<CollectionSummary[] | null>(null);
  const [error, setError] = useState('');

  const api = useMemo(() => siteApi(siteId), [siteId]);

  const refreshCollections = useCallback(() => {
    api
      .collections()
      .then((next) => {
        setCollections(next);
        setError('');
      })
      .catch((problem) => setError(problem instanceof ApiError ? problem.message : 'Could not load this website.'));
  }, [api]);

  useEffect(() => {
    if (!site) return;
    setCollections(null);
    refreshCollections();
    document.documentElement.style.setProperty('--site-accent', site.accent);
    document.title = `${site.name} - 3S Admin`;
  }, [site, refreshCollections]);

  const context = useMemo<SiteContextValue | null>(
    () =>
      site && collections
        ? {
            site,
            api,
            collections,
            refreshCollections,
            path: (to: string) => `/s/${site.id}${to === '/' ? '' : to}`,
            media: (src) => mediaUrl(site.publicUrl, src),
          }
        : null,
    [site, api, collections, refreshCollections],
  );

  if (!site) return <Navigate to="/" replace />;
  if (error) {
    return (
      <FullPage>
        <p className="font-semibold text-foreground">{error}</p>
        <button type="button" onClick={refreshCollections} className="text-sm font-semibold underline">
          Try again
        </button>
      </FullPage>
    );
  }
  if (!context) return <Spinner label={`Loading ${site.name}...`} />;

  return (
    <SiteContext.Provider value={context}>
      <AdminLayout user={user} sites={sites} upcoming={upcoming} onSignOut={onSignOut}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="c/:name" element={<CollectionPage />} />
          <Route path="c/:name/:id" element={<RecordPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<p className="text-sm text-muted-foreground">Page not found.</p>} />
        </Routes>
      </AdminLayout>
    </SiteContext.Provider>
  );
}

type Session =
  | { state: 'checking' }
  | { state: 'signedOut' }
  | { state: 'error'; message: string }
  | { state: 'ready'; user: Me; sites: Site[]; upcoming: Site[] };

export default function App() {
  const [session, setSession] = useState<Session>({ state: 'checking' });

  const load = useCallback(async () => {
    if (!(await auth.idToken())) {
      setSession({ state: 'signedOut' });
      return;
    }
    setSession({ state: 'checking' });
    try {
      const result = await me();
      setSession({ state: 'ready', user: result.user, sites: result.sites, upcoming: result.upcoming ?? [] });
    } catch (problem) {
      if (problem instanceof ApiError && problem.status === 401) setSession({ state: 'signedOut' });
      else setSession({ state: 'error', message: problem instanceof Error ? problem.message : 'Could not load the admin.' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onExpired = () => setSession({ state: 'signedOut' });
    sessionExpired.addEventListener('expired', onExpired);
    return () => sessionExpired.removeEventListener('expired', onExpired);
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setSession({ state: 'signedOut' });
  }, []);

  if (session.state === 'checking') return <Spinner label="Checking your session..." />;
  if (session.state === 'signedOut') return <SignInPage onSignedIn={load} />;
  if (session.state === 'error') {
    return (
      <FullPage>
        <p className="font-semibold text-foreground">{session.message}</p>
        <button type="button" onClick={load} className="text-sm font-semibold underline">
          Try again
        </button>
      </FullPage>
    );
  }

  if (session.sites.length === 0) {
    return (
      <FullPage>
        <p className="max-w-sm text-base font-semibold text-foreground">Your account is not linked to any website yet.</p>
        <p className="max-w-sm">Ask a platform administrator to give {session.user.email} access, then sign in again.</p>
        <SignOutButton onSignOut={signOut} />
      </FullPage>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home user={session.user} sites={session.sites} upcoming={session.upcoming} onSignOut={signOut} />} />
        <Route path="/s/:siteId/*" element={<SiteWorkspace user={session.user} sites={session.sites} upcoming={session.upcoming} onSignOut={signOut} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
