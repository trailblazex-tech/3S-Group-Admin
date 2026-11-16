import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Clock, Loader2, MailWarning, RefreshCw, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';
import { usersApi, type Account } from '../lib/api';
import { useConfirm } from '../components/ConfirmDialog';
import { relativeTime } from '../lib/time';

type SiteOption = { id: string; name: string };

const statusBadge: Record<Account['status'], { label: string; className: string }> = {
  pending: { label: 'Waiting for approval', className: 'bg-[#f59f0a]/15 text-[#a15c00] ring-[#f59f0a]/40' },
  unverified: { label: 'Email not verified', className: 'bg-muted text-muted-foreground ring-border' },
  active: { label: 'Active', className: 'bg-success/10 text-success ring-success/30' },
  disabled: { label: 'Disabled', className: 'bg-destructive/10 text-destructive ring-destructive/30' },
};

function SiteChoices({ sites, chosen, onChange, idPrefix }: { sites: SiteOption[]; chosen: string[]; onChange: (next: string[]) => void; idPrefix: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold text-muted-foreground">Websites this person may edit</legend>
      <div className="flex flex-wrap gap-2">
        {sites.map((site) => {
          const on = chosen.includes(site.id);
          return (
            <label
              key={site.id}
              htmlFor={`${idPrefix}-${site.id}`}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                on ? 'border-navy bg-navy text-white' : 'border-border bg-card text-foreground hover:border-navy/50'
              }`}
            >
              <input
                id={`${idPrefix}-${site.id}`}
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => onChange(on ? chosen.filter((id) => id !== site.id) : [...chosen, site.id])}
              />
              <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? 'border-white bg-white text-navy' : 'border-border'}`}>
                {on && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              {site.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function AccountCard({ account, sites, onChanged }: { account: Account; sites: SiteOption[]; onChanged: () => Promise<void> }) {
  const [chosen, setChosen] = useState<string[]>(account.sites);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, confirmDialog] = useConfirm();
  const locked = account.isYou || account.isPlatformAdmin;
  const who = account.name || account.email;
  const changed = chosen.length !== account.sites.length || chosen.some((id) => !account.sites.includes(id));

  useEffect(() => setChosen(account.sites), [account.sites]);

  const act = (label: string, work: () => Promise<unknown>) => async () => {
    setBusy(label);
    setError('');
    try {
      await work();
      await onChanged();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That did not work. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const askRemove = (isReject: boolean) =>
    confirm({
      title: isReject ? 'Reject this request?' : 'Remove this account?',
      danger: true,
      message: (
        <>
          <span className="font-semibold text-foreground">{who}</span>
          {isReject
            ? "'s account will be deleted. They can ask again later."
            : ' will no longer be able to sign in, and the account is deleted for good. To stop them for now but keep the account, disable it instead.'}
        </>
      ),
      confirmLabel: isReject ? 'Reject' : 'Remove account',
      onConfirm: async () => {
        await usersApi.remove(account.id);
        await onChanged();
      },
    });

  const badge = statusBadge[account.status];

  return (
    <li className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-bold text-foreground">{account.name || account.email}</span>
            {account.isYou && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">You</span>}
            {account.isPlatformAdmin && (
              <span className="inline-flex items-center gap-1 rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                <ShieldCheck className="h-3 w-3" />
                Main admin
              </span>
            )}
          </p>
          {account.name && <p className="mt-0.5 break-all text-xs text-muted-foreground">{account.email}</p>}
          {account.createdAt && <p className="mt-0.5 text-xs text-muted-foreground">Account made {relativeTime(account.createdAt)}</p>}
        </div>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${badge.className}`}>{badge.label}</span>
      </div>

      {account.isPlatformAdmin ? (
        <p className="mt-3 text-xs text-muted-foreground">Can edit every website and approves new users. This account is managed by the 3S Group web team.</p>
      ) : account.status === 'unverified' ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MailWarning className="h-3.5 w-3.5" />
            Has not entered the code from their email yet, so cannot be approved.
          </p>
          <button
            type="button"
            onClick={() => askRemove(true)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <SiteChoices sites={sites} chosen={chosen} onChange={setChosen} idPrefix={account.id} />
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            {account.status === 'pending' ? (
              <>
                <button
                  type="button"
                  disabled={!!busy || chosen.length === 0 || locked}
                  onClick={act('approve', () => usersApi.setSites(account.id, chosen))}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-success px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  Approve
                </button>
                {chosen.length === 0 && <span className="text-xs text-muted-foreground">Choose at least one website to approve.</span>}
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => askRemove(true)}
                  className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <UserX className="h-4 w-4" />
                  Reject
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={!!busy || !changed || chosen.length === 0}
                  onClick={act('save', () => usersApi.setSites(account.id, chosen))}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-bold text-white transition-colors hover:bg-navy-deep disabled:opacity-50"
                >
                  {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save access
                </button>
                {changed && chosen.length === 0 && <span className="text-xs text-muted-foreground">Keep at least one website, or disable the account.</span>}
                <span className="ml-auto flex flex-wrap gap-1">
                  {account.status === 'disabled' ? (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={act('enable', () => usersApi.enable(account.id))}
                      className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {busy === 'enable' && <Loader2 className="h-4 w-4 animate-spin" />}
                      Enable
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={act('disable', () => usersApi.disable(account.id))}
                      className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      {busy === 'disable' && <Loader2 className="h-4 w-4 animate-spin" />}
                      Disable
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => askRemove(false)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    Remove
                  </button>
                </span>
              </>
            )}
          </div>
        </div>
      )}
      {confirmDialog}
    </li>
  );
}

/** Who can sign in, who is waiting, and which websites each person may edit. Main admin only. */
export function UsersPage() {
  const [users, setUsers] = useState<Account[] | null>(null);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await usersApi.list();
      setUsers(result.users);
      setSites(result.sites);
      setError('');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not load the users.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Users - 3S Admin';
    document.documentElement.style.removeProperty('--site-accent');
    void load();
  }, [load]);

  const { waiting, others } = useMemo(() => {
    const list = users ?? [];
    return { waiting: list.filter((user) => user.status === 'pending'), others: list.filter((user) => user.status !== 'pending') };
  }, [users]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-brand-night">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            All websites
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        <div className="mx-auto max-w-4xl px-5 pb-10 pt-4 sm:px-8">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-gold-light/80">
            <Users className="h-3.5 w-3.5" />
            Main admin
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">Users</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            Anyone can ask for an account from the sign-in page. They see nothing until you approve them here and choose which websites they may edit.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-10 px-5 py-8 sm:px-8">
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}

        {users === null && !error ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
          </p>
        ) : users && (
          <>
            <section aria-labelledby="waiting-heading">
              <h2 id="waiting-heading" className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
                <Clock className="h-4 w-4" />
                Waiting for approval
                {waiting.length > 0 && <span className="rounded-full bg-[#f59f0a] px-2 py-0.5 text-xs font-bold text-navy-deep">{waiting.length}</span>}
              </h2>
              {waiting.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No one is waiting. New requests appear here, and you also get an email.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {waiting.map((account) => (
                    <AccountCard key={account.id} account={account} sites={sites} onChanged={load} />
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="everyone-heading">
              <h2 id="everyone-heading" className="font-display text-xl font-semibold text-foreground">
                Everyone with an account
              </h2>
              <ul className="mt-3 space-y-3">
                {others.map((account) => (
                  <AccountCard key={account.id} account={account} sites={sites} onChanged={load} />
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
