import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  /** Red, for anything that cannot be undone. */
  danger?: boolean;
  /** A gentler way out offered beside the main action, e.g. "Just hide it". */
  alternative?: { label: string; onChoose: () => Promise<void> | void };
  onConfirm: () => Promise<void> | void;
}

/**
 * Asks before anything destructive. Keeps itself open (with a spinner) while
 * the action runs, shows the error inside if it fails, and closes on success.
 */
export function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: () => void }) {
  const [busy, setBusy] = useState<'' | 'confirm' | 'alternative'>('');
  const [error, setError] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // Safe default: Enter on an open dialog cancels rather than deletes.
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose, busy]);

  const run = async (which: 'confirm' | 'alternative') => {
    setBusy(which);
    setError('');
    try {
      await (which === 'confirm' ? options.onConfirm() : options.alternative?.onChoose());
      onClose();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That did not work. Please try again.');
      setBusy('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-deep/60 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start gap-4">
          {options.danger && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="font-display text-lg font-semibold text-foreground">
              {options.title}
            </h2>
            <div className="mt-1.5 text-sm leading-6 text-muted-foreground">{options.message}</div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={Boolean(busy)}
            className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          {options.alternative && (
            <button
              type="button"
              onClick={() => run('alternative')}
              disabled={Boolean(busy)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 sm:ml-auto"
            >
              {busy === 'alternative' && <Loader2 className="h-4 w-4 animate-spin" />}
              {options.alternative.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => run('confirm')}
            disabled={Boolean(busy)}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-60 ${
              options.alternative ? '' : 'sm:ml-auto'
            } ${options.danger ? 'bg-destructive hover:bg-destructive/90' : 'bg-navy hover:bg-navy-deep'}`}
          >
            {busy === 'confirm' && <Loader2 className="h-4 w-4 animate-spin" />}
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** `const [confirm, dialog] = useConfirm()` - call confirm({...}) and render {dialog}. */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const dialog = options ? <ConfirmDialog options={options} onClose={() => setOptions(null)} /> : null;
  return [setOptions as (options: ConfirmOptions) => void, dialog] as const;
}
