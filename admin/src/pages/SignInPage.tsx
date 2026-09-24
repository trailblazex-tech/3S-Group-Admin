import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, KeyRound, Loader2, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react';
import { auth, authErrorMessage, type SignInStep } from '../lib/auth';

type Screen =
  | { kind: 'credentials'; notice?: string }
  | { kind: 'newPassword' }
  | { kind: 'totpSetup'; setupUri: string; secret: string }
  | { kind: 'totp' }
  | { kind: 'forgot' }
  | { kind: 'forgotConfirm' };

const inputClass =
  'h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring';
const codeClass = `${inputClass} text-center font-mono text-lg tracking-[0.5em]`;

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      id="code"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      autoFocus
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
      className={codeClass}
    />
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
      {message}
    </p>
  );
}

export function SignInPage({ onSignedIn }: { onSignedIn: () => void }) {
  const [screen, setScreen] = useState<Screen>({ kind: 'credentials' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const go = (next: Screen) => {
    setError('');
    setCode('');
    setScreen(next);
  };

  const follow = (step: SignInStep) => {
    if (step.kind === 'done') onSignedIn();
    else if (step.kind === 'resetPassword') go({ kind: 'forgot' });
    else go(step);
  };

  const run = (work: () => Promise<void>) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (problem) {
      setError(authErrorMessage(problem));
    } finally {
      setBusy(false);
    }
  };

  const passwordsMatch = () => {
    if (newPassword !== confirmPassword) throw new Error('The two passwords do not match.');
  };

  const submit = (idle: string, working: string) => (
    <button
      type="submit"
      disabled={busy}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-navy text-sm font-bold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {busy ? working : idle}
    </button>
  );

  const backToStart = (
    <button
      type="button"
      onClick={() => go({ kind: 'credentials' })}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to sign in
    </button>
  );

  const newPasswordFields = (
    <>
      <Field id="new-password" label="New password">
        <input id="new-password" type="password" autoComplete="new-password" required minLength={12} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
      </Field>
      <Field id="confirm-password" label="Type it again">
        <input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
      </Field>
      <p className="text-xs text-muted-foreground">At least 12 characters, with upper and lower case letters, a number and a symbol.</p>
    </>
  );

  let icon = <LockKeyhole className="h-5 w-5" />;
  let title = 'Sign in';
  let intro = 'Use the account your administrator created for you.';
  let body: ReactNode;

  switch (screen.kind) {
    case 'credentials':
      body = (
        <form className="space-y-4" onSubmit={run(async () => follow(await auth.start(email.trim(), password)))}>
          {screen.notice && (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">{screen.notice}</p>
          )}
          <Field id="email" label="Email">
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          <Field id="password" label="Password">
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </Field>
          {error && <ErrorNote message={error} />}
          {submit('Continue', 'Checking...')}
          <button type="button" onClick={() => go({ kind: 'forgot' })} className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground">
            Forgot password?
          </button>
        </form>
      );
      break;

    case 'newPassword':
      icon = <KeyRound className="h-5 w-5" />;
      title = 'Choose your password';
      intro = 'Your account was created with a temporary password. Pick your own to continue.';
      body = (
        <form
          className="space-y-4"
          onSubmit={run(async () => {
            passwordsMatch();
            follow(await auth.answer(newPassword, email.trim()));
          })}
        >
          {newPasswordFields}
          {error && <ErrorNote message={error} />}
          {submit('Save password', 'Saving...')}
        </form>
      );
      break;

    case 'totpSetup':
      icon = <Smartphone className="h-5 w-5" />;
      title = 'Set up your authenticator';
      intro = 'Every sign-in needs a code from an authenticator app. Scan this with Google Authenticator, Microsoft Authenticator or a similar app.';
      body = (
        <form className="space-y-4" onSubmit={run(async () => follow(await auth.answer(code, email.trim())))}>
          <div className="flex justify-center rounded-xl border border-border bg-white p-4">
            <QRCodeSVG value={screen.setupUri} size={176} marginSize={0} title="Authenticator setup code" />
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-semibold">Can't scan? Enter this key instead</summary>
            <p className="mt-2 break-all rounded-lg bg-muted px-3 py-2 font-mono text-foreground">{screen.secret}</p>
          </details>
          <Field id="code" label="6-digit code from the app">
            <CodeInput value={code} onChange={setCode} />
          </Field>
          {error && <ErrorNote message={error} />}
          {submit('Verify and sign in', 'Verifying...')}
        </form>
      );
      break;

    case 'totp':
      icon = <ShieldCheck className="h-5 w-5" />;
      title = 'Enter your code';
      intro = 'Open your authenticator app and enter the 6-digit code for 3S Admin.';
      body = (
        <form className="space-y-4" onSubmit={run(async () => follow(await auth.answer(code, email.trim())))}>
          <Field id="code" label="Code">
            <CodeInput value={code} onChange={setCode} />
          </Field>
          {error && <ErrorNote message={error} />}
          {submit('Sign in', 'Verifying...')}
          {backToStart}
        </form>
      );
      break;

    case 'forgot':
      icon = <KeyRound className="h-5 w-5" />;
      title = 'Reset your password';
      intro = "Enter your email and we'll send you a reset code.";
      body = (
        <form
          className="space-y-4"
          onSubmit={run(async () => {
            await auth.requestPasswordReset(email.trim());
            go({ kind: 'forgotConfirm' });
          })}
        >
          <Field id="email" label="Email">
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          {error && <ErrorNote message={error} />}
          {submit('Send reset code', 'Sending...')}
          {backToStart}
        </form>
      );
      break;

    case 'forgotConfirm':
      icon = <KeyRound className="h-5 w-5" />;
      title = 'Check your email';
      intro = `If ${email.trim()} has an account, a reset code is on its way.`;
      body = (
        <form
          className="space-y-4"
          onSubmit={run(async () => {
            passwordsMatch();
            await auth.confirmPasswordReset(email.trim(), code, newPassword);
            setPassword('');
            go({ kind: 'credentials', notice: 'Password changed. Sign in with your new password.' });
          })}
        >
          <Field id="code" label="Reset code">
            <CodeInput value={code} onChange={setCode} />
          </Field>
          {newPasswordFields}
          {error && <ErrorNote message={error} />}
          {submit('Change password', 'Saving...')}
          {backToStart}
        </form>
      );
      break;
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy p-10 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-base font-extrabold text-navy-deep">
            3S
          </span>
          <div>
            <p className="text-lg font-bold text-white">3S Admin</p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Content platform</p>
          </div>
        </div>

        <div className="relative max-w-sm">
          <h1 className="text-3xl font-bold leading-tight text-white">Every website, one place.</h1>
          <p className="mt-4 text-sm leading-7 text-white/70">
            Update photos, people, documents and announcements across the 3S Group websites - no developer needed.
          </p>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck className="h-4 w-4" />
          Protected with two-step verification.
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-xs font-extrabold text-accent">3S</span>
            <span className="text-sm font-bold text-foreground">3S Admin</span>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground">{icon}</span>
          <h2 className="mt-5 text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{intro}</p>
          <div className="mt-7">{body}</div>
        </div>
      </main>
    </div>
  );
}
