import type { ScheduleStatus } from '../lib/schedule';
import { formatMoment } from '../lib/schedule';

const tone = {
  live: 'bg-success/10 text-success ring-success/25',
  scheduled: 'bg-brand-blue/10 text-brand-blue ring-brand-blue/25',
  ended: 'bg-muted text-muted-foreground ring-border',
  hidden: 'bg-muted text-muted-foreground ring-border',
  incomplete: 'bg-destructive/10 text-destructive ring-destructive/25',
  invalid: 'bg-destructive/10 text-destructive ring-destructive/25',
};

export function scheduleLabel(status: ScheduleStatus) {
  switch (status.kind) {
    case 'live':
      return { text: 'Live now', detail: `until ${formatMoment(status.until)}` };
    case 'scheduled':
      return {
        text: status.inDays <= 0 ? 'Starts today' : status.inDays === 1 ? 'Starts tomorrow' : `Starts in ${status.inDays} days`,
        detail: formatMoment(status.from),
      };
    case 'ended':
      return { text: 'Ended', detail: '' };
    case 'hidden':
      return { text: 'Hidden', detail: '' };
    case 'incomplete':
      return { text: 'No dates', detail: '' };
    case 'invalid':
      return { text: 'Dates reversed', detail: '' };
  }
}

export function ScheduleBadge({ status, compact = false }: { status: ScheduleStatus; compact?: boolean }) {
  const { text, detail } = scheduleLabel(status);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${tone[status.kind]}`} title={detail || undefined}>
      {status.kind === 'live' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
      )}
      {text}
      {!compact && detail && <span className="font-medium opacity-75">· {detail}</span>}
    </span>
  );
}
