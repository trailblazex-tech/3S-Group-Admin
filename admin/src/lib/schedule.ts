/**
 * When a scheduled record (an event greeting) is on the website. Schedules
 * are plain dates and optional "HH:MM" times in India time - the websites'
 * visitors are in India, and the sites read them the same way - so all the
 * comparisons here are done on IST wall-clock strings, never on the editor's
 * own timezone.
 */
import type { ScheduleFields } from './api';

type Values = Record<string, unknown>;

const istParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Now in India, as { date: 'YYYY-MM-DD', time: 'HH:MM' }. */
export function istNow(at = new Date()) {
  const parts = Object.fromEntries(istParts.formatToParts(at).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export function windowOf(values: Values, schedule: ScheduleFields) {
  const startDate = text(values[schedule.start]);
  const endDate = text(values[schedule.end]);
  const startTime = schedule.startTime ? text(values[schedule.startTime]) : '';
  const endTime = schedule.endTime ? text(values[schedule.endTime]) : '';
  return {
    startDate,
    endDate,
    startTime,
    endTime,
    from: startDate ? `${startDate}T${startTime || '00:00'}` : '',
    until: endDate ? `${endDate}T${endTime || '23:59'}` : '',
  };
}

export type ScheduleStatus =
  | { kind: 'hidden' }
  | { kind: 'incomplete' }
  | { kind: 'invalid' }
  | { kind: 'live'; until: string }
  | { kind: 'scheduled'; from: string; inDays: number }
  | { kind: 'ended' };

export function scheduleStatus(values: Values, schedule: ScheduleFields, at = new Date()): ScheduleStatus {
  if (values.isActive === false) return { kind: 'hidden' };
  const window = windowOf(values, schedule);
  if (!window.from || !window.until) return { kind: 'incomplete' };
  if (window.until < window.from) return { kind: 'invalid' };

  const now = istNow(at);
  const nowKey = `${now.date}T${now.time}`;
  if (nowKey < window.from) return { kind: 'scheduled', from: window.from, inDays: daysBetween(now.date, window.startDate) };
  if (nowKey > window.until) return { kind: 'ended' };
  return { kind: 'live', until: window.until };
}

function utcDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function daysBetween(from: string, to: string) {
  return Math.round((utcDay(to).getTime() - utcDay(from).getTime()) / 86_400_000);
}

export function addDays(date: string, days: number) {
  const next = utcDay(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

const dayFormat = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDayFormat = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });

export function formatDay(date: string, withYear = true) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return (withYear ? dayFormat : shortDayFormat).format(utcDay(date));
}

export function formatTime(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const hours = Number(match[1]);
  const suffix = hours < 12 ? 'AM' : 'PM';
  return `${hours % 12 || 12}:${match[2]} ${suffix}`;
}

/** "Mon, 19 Oct" or "Mon, 19 Oct, 6:00 PM" from a from/until key. */
export function formatMoment(key: string, withYear = false) {
  const [date, time] = key.split('T');
  const day = formatDay(date, withYear);
  if (!time || time === '00:00' || time === '23:59') return day;
  return `${day}, ${formatTime(time)}`;
}

/** One sentence an editor can check at a glance. */
export function describeWindow(values: Values, schedule: ScheduleFields) {
  const window = windowOf(values, schedule);
  if (!window.startDate || !window.endDate) return '';
  if (window.until < window.from) return 'The end is before the start - it will never show.';

  const start = `${formatDay(window.startDate)}${window.startTime ? ` at ${formatTime(window.startTime)}` : ''}`;
  const end = window.endTime ? `${formatDay(window.endDate)} at ${formatTime(window.endTime)}` : `the end of ${formatDay(window.endDate)}`;
  const days = daysBetween(window.startDate, window.endDate) + 1;
  const length = days === 1 ? 'one day' : `${days} days`;
  return `Shows from ${start} until ${end} (India time) - ${length}.`;
}

/**
 * Suggested dates for a template with a fixed day: the next time that day
 * comes round (this year if its window is still open, otherwise next year).
 */
export function suggestDates(on: [number, number], around: [number, number], today = istNow().date) {
  const year = Number(today.slice(0, 4));
  for (const candidate of [year, year + 1]) {
    const day = `${candidate}-${String(on[0]).padStart(2, '0')}-${String(on[1]).padStart(2, '0')}`;
    const endDate = addDays(day, around[1]);
    if (endDate >= today) {
      const startDate = addDays(day, -around[0]);
      return { startDate: startDate < today ? today : startDate, endDate };
    }
  }
  return null;
}
