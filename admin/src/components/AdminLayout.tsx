import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Activity,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronsUpDown,
  ExternalLink,
  FileText,
  Inbox,
  LineChart,
  Images,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageSquareText,
  Menu,
  Newspaper,
  Phone,
  ReceiptText,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Video,
  X,
} from 'lucide-react';
import { leadsChanged, roleLabel, type Me, type Site } from '../lib/api';
import { useSite } from '../lib/site';
import { BrandMark } from './Brand';
import { siteLogo } from '../lib/siteLogos';

/** Icons for common section names; anything else gets a document icon. */
const collectionIcons: Record<string, typeof Users> = {
  staff: Users,
  team: Users,
  gallery: Images,
  news: Newspaper,
  achievements: Trophy,
  videos: Video,
  'site-settings': Phone,
  'site-analytics': BarChart3,
  'event-greetings': Megaphone,
  'home-announcement': MessageSquareText,
  'home-stats': Sparkles,
};

/**
 * Groups the website itself highlights get the same highlight here, so
 * editors find them where they expect: the Konark site marks "CBSE Mandatory
 * Disclosure" in its yellow, and so does this menu.
 */
const highlightedGroups = new Set(['CBSE Disclosure']);

const groupIcons: Record<string, typeof Users> = {
  'CBSE Disclosure': Shield,
  'Fee Structure': ReceiptText,
  Career: BriefcaseBusiness,
};

function SiteSwitcher({ sites, upcoming, current }: { sites: Site[]; upcoming: Site[]; current: Site }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const badge = (site: Site, size = 'h-9 w-9') => (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-white p-0.5 ${size}`}>
      <img src={siteLogo(site.id)} alt="" className="h-full w-full object-contain" draggable={false} />
    </span>
  );

  const header = (
    <>
      {badge(current)}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-bold text-white">{current.name}</span>
        <span className="block truncate text-[11px] text-white/55">{current.tagline || 'Switch website'}</span>
      </span>
    </>
  );

  if (sites.length === 1 && upcoming.length === 0) return <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-2.5">{header}</div>;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl bg-white/[0.06] p-2.5 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.11]"
      >
        {header}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/50" />
      </button>

      {open && (
        <div role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
          <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">3S Group websites</p>
          {sites.map((site) => (
            <Link
              key={site.id}
              to={`/${site.id}`}
              role="option"
              aria-selected={site.id === current.id}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted"
            >
              {badge(site, 'h-7 w-7')}
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">{site.name}</span>
              {site.id === current.id && <Check className="h-4 w-4 text-foreground" />}
            </Link>
          ))}
          {upcoming.map((site) => (
            <div key={site.id} role="option" aria-selected={false} aria-disabled className="flex cursor-not-allowed items-center gap-3 rounded-lg px-2 py-2 text-sm opacity-55">
              {badge(site, 'h-7 w-7')}
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">{site.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Soon</span>
            </div>
          ))}
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-3 rounded-lg border-t border-border px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LayoutGrid className="h-4 w-4" />
            All websites
          </Link>
        </div>
      )}
    </div>
  );
}

interface AdminLayoutProps {
  user: Me;
  sites: Site[];
  upcoming: Site[];
  onSignOut: () => void;
  children: ReactNode;
}

export function AdminLayout({ sites, upcoming, onSignOut, children }: AdminLayoutProps) {
  const { site, api, collections, path } = useSite();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [unreadLeads, setUnreadLeads] = useState(0);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Each page starts at the top, and the mobile menu closes on navigation.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    setIsNavOpen(false);
  }, [location.pathname]);

  // New feedback and enquiries since someone last went through them: checked
  // on every page change, when the tab comes back into view, and right after
  // a submission is read or followed up on the Feedback & Leads page.
  const [leadsVersion, setLeadsVersion] = useState(0);
  useEffect(() => {
    const bump = () => setLeadsVersion((version) => version + 1);
    const onVisible = () => document.visibilityState === 'visible' && bump();
    leadsChanged.addEventListener('changed', bump);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      leadsChanged.removeEventListener('changed', bump);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!site.hasForms) return;
    let alive = true;
    api
      .forms()
      .then((forms) => alive && setUnreadLeads(forms.reduce((total, form) => total + form.unread, 0)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [api, site.hasForms, location.pathname, leadsVersion]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-white/[0.14] text-white' : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
    }`;

  const highlightLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-[#f59f0a] text-navy-deep shadow-sm' : 'text-[#fbc04d] hover:bg-[#f59f0a]/15 hover:text-[#ffd27a]'
    }`;

  // Hidden sections are edited on an admin page of their own (e.g. Analytics).
  const listed = collections.filter((collection) => !collection.hidden);
  const ungrouped = listed.filter((collection) => !collection.group);
  const groups = [...new Set(listed.map((collection) => collection.group).filter(Boolean))] as string[];

  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col bg-brand-night transition-transform lg:static lg:h-dvh lg:translate-x-0 ${
          isNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-3 border-b border-white/10 px-4 pb-4 pt-4">
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5" title="All websites">
              <BrandMark className="h-8 w-8" />
              <span className="leading-tight">
                <span className="block font-display text-sm font-semibold text-white">
                  3S <span className="text-brand-gold">Group</span>
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">Website admin</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setIsNavOpen(false)}
              className="rounded p-1 text-white/70 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SiteSwitcher sites={sites} upcoming={upcoming} current={site} />
        </div>

        <nav className="scroll-slim-dark flex-1 overflow-y-auto overscroll-contain p-3" aria-label={`${site.name} sections`}>
          <NavLink to={path('/')} end className={linkClass}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Dashboard
          </NavLink>
          {site.hasForms && (
            <NavLink to={path('/leads')} className={linkClass}>
              <Inbox className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Feedback &amp; Leads</span>
              {unreadLeads > 0 && (
                <span className="rounded-full bg-[#f59f0a] px-1.5 py-px text-[10px] font-bold tabular-nums text-navy-deep" title={`${unreadLeads} new`}>
                  {unreadLeads > 99 ? '99+' : unreadLeads}
                </span>
              )}
            </NavLink>
          )}
          <NavLink to={path('/analytics')} className={linkClass}>
            <LineChart className="h-4 w-4 shrink-0" />
            Analytics
          </NavLink>

          {ungrouped.length > 0 && (
            <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Content</p>
          )}
          {ungrouped.map((collection) => {
            const Icon = collectionIcons[collection.name] ?? FileText;
            return (
              <NavLink key={collection.name} to={path(`/${collection.name}`)} className={linkClass}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{collection.label}</span>
                <span className="text-xs font-semibold tabular-nums text-white/40">{collection.published}</span>
              </NavLink>
            );
          })}

          {groups.map((group) => {
            const GroupIcon = groupIcons[group] ?? FileText;
            const isHighlighted = highlightedGroups.has(group);
            return (
              <div key={group} className={isHighlighted ? 'mt-4 rounded-xl bg-[#f59f0a]/[0.07] pb-1.5 ring-1 ring-inset ring-[#f59f0a]/25' : ''}>
                <p
                  className={`flex items-center gap-2 px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                    isHighlighted ? 'pt-3 text-[#fbc04d]' : 'pt-5 text-white/40'
                  }`}
                >
                  <GroupIcon className="h-3 w-3" />
                  {group}
                </p>
                {listed
                  .filter((collection) => collection.group === group)
                  .map((collection) => (
                    <NavLink key={collection.name} to={path(`/${collection.name}`)} className={isHighlighted ? highlightLinkClass : linkClass}>
                      <span className="flex-1 truncate pl-7">{collection.label}</span>
                      <span className={`text-xs font-semibold tabular-nums ${isHighlighted ? 'opacity-60' : 'text-white/40'}`}>{collection.total}</span>
                    </NavLink>
                  ))}
              </div>
            );
          })}

          <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Website</p>
          <NavLink to={path('/activity')} className={linkClass}>
            <Activity className="h-4 w-4 shrink-0" />
            Activity log
          </NavLink>
          <NavLink to={path('/guide')} className={linkClass}>
            <BookOpen className="h-4 w-4 shrink-0" />
            Guide
          </NavLink>
          <a href={site.publicUrl} target="_blank" rel="noopener noreferrer" className={linkClass({ isActive: false })}>
            <ExternalLink className="h-4 w-4 shrink-0" />
            View live website
          </a>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{roleLabel()}</p>
              <p className="truncate text-xs text-white/50">Signed in</p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="rounded p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {isNavOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setIsNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <div className="flex h-dvh min-w-0 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setIsNavOpen(true)}
            className="rounded-lg border border-border p-2"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <BrandMark className="h-7 w-7" />
          <span className="truncate text-sm font-bold">{site.name}</span>
        </header>

        {/* The only scrolling area for content. Padding lives on the inner box,
            not here: a sticky save bar sticks to the scroll area's padding edge,
            so padding here left a gap under it that content showed through.
            `relative` keeps any absolutely positioned child inside this pane. */}
        <main ref={mainRef} className="scroll-slim relative min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
            {children}
            <div aria-hidden className="h-8 lg:h-10" />
          </div>
        </main>
      </div>
    </div>
  );
}
