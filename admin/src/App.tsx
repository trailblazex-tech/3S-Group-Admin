import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ArrowUpRight, Loader2, LogOut } from 'lucide-react';
import { ApiError, me, sessionExpired, siteApi, type CollectionSummary, type Me, type Site } from './lib/api';
import { auth } from './lib/auth';
import { SiteContext, mediaUrl, type SiteContextValue } from './lib/site';
import { AdminLayout } from './components/AdminLayout';
import { SignInPage } from './pages/SignInPage';
import { ActivityPage, DashboardPage } from './pages/DashboardPage';
import { CollectionPage } from './pages/CollectionPage';
import { RecordPage } from './pages/RecordPage';

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
      <Loader2 className="h-5 w-5 animate-spin" />
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

function SitePicker({ user, sites, onSignOut }: { user: Me; sites: Site[]; onSignOut: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-accent">3S</span>
          <div>
            <p className="text-sm font-bold text-foreground">3S Admin</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <SignOutButton onSignOut={onSignOut} />
      </div>

      <h1 className="mt-12 text-2xl font-bold text-foreground">Choose a website</h1>
      <p className="mt-1 text-sm text-muted-foreground">You can switch any time from the sidebar.</p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {sites.map((site) => (
          <li key={site.id}>
            <Link
              to={`/s/${site.id}`}
              style={{ '--site-accent': site.accent } as CSSProperties}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-extrabold text-navy-deep">
                {site.shortName}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">{site.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{site.publicUrl.replace(/^https?:\/\//, '')}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Home({ user, sites, onSignOut }: { user: Me; sites: Site[]; onSignOut: () => void }) {
  if (sites.length === 1) return <Navigate to={`/s/${sites[0].id}`} replace />;
  return <SitePicker user={user} sites={sites} onSignOut={onSignOut} />;
}

function SiteWorkspace({ user, sites, onSignOut }: { user: Me; sites: Site[]; onSignOut: () => void }) {
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
      <AdminLayout user={user} sites={sites} onSignOut={onSignOut}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="c/:name" element={<CollectionPage />} />
          <Route path="c/:name/:id" element={<RecordPage />} />
          <Route path="activity" element={<ActivityPage />} />
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
  | { state: 'ready'; user: Me; sites: Site[] };

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
      setSession({ state: 'ready', user: result.user, sites: result.sites });
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
        <Route path="/" element={<Home user={session.user} sites={session.sites} onSignOut={signOut} />} />
        <Route path="/s/:siteId/*" element={<SiteWorkspace user={session.user} sites={session.sites} onSignOut={signOut} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
