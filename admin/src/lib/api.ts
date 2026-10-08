/**
 * The 3S Admin API. Every content call is scoped to one site:
 * /sites/<site>/... - the server re-checks access on each request.
 */
import { auth } from './auth';
import { config } from './config';

export interface Me {
  email: string;
  name: string;
  isPlatformAdmin: boolean;
}

/** How the signed-in person is shown in the admin: by their role, never their name. */
export function roleLabel(user: Me) {
  return user.isPlatformAdmin ? 'Platform admin' : 'Admin';
}

export interface Site {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  publicUrl: string;
  accent: string;
  /** The site has public forms (feedback, enquiries) the admin can read. */
  hasForms?: boolean;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'image' | 'file' | 'select' | 'tags' | 'boolean';
  label: string;
  required?: boolean;
  help?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: FieldOption[];
  optionsFrom?: string;
  allowCustom?: boolean;
  adminOnly?: boolean;
  default?: unknown;
  /** Image fields: offer the ready-made banner library. */
  library?: 'greetings';
  /** Only applies (shown, and then required) while another field has one of these values. */
  showWhen?: { field: string; is: (string | null)[] };
  /** Selects: big tappable choices instead of a dropdown. */
  appearance?: 'choices';
}

/** Names the date/time fields that decide when a record is on the website. */
export interface ScheduleFields {
  start: string;
  end: string;
  startTime?: string;
  endTime?: string;
}

export interface CollectionSummary {
  name: string;
  label: string;
  description: string;
  titleField: string;
  subtitleField: string;
  imageField: string;
  groupField: string | null;
  groups: FieldOption[] | null;
  /** Sidebar heading this section sits under. */
  group: string | null;
  /** Off the sidebar and dashboard: an admin page edits it in place. */
  hidden: boolean;
  /** The row set is prescribed: rows are edited, never added or removed. */
  fixed: boolean;
  schedule: ScheduleFields | null;
  /** New records can start from a ready-made greeting. */
  templates: 'greetings' | null;
  /** list: rows open their own form; form: one row edited in place; cards: every row's form on one page. */
  display: 'list' | 'form' | 'cards';
  /** Rows the website works out itself: id -> where the value comes from. */
  derivedRows: Record<string, string> | null;
  fields: FieldDefinition[];
  total: number;
  published: number;
}

export type AdminRecord = Record<string, unknown> & { id: string; sortOrder: number; isActive: boolean };

export interface ActivityEntry {
  at: string;
  user: string;
  email?: string | null;
  action: string;
  collection: string | null;
  recordId: string | null;
  title: string | null;
}

export interface FormFieldDefinition {
  name: string;
  type: 'text' | 'textarea' | 'phone' | 'email' | 'select' | 'ratings' | 'datetime';
  label: string;
  required?: boolean;
  options?: FieldOption[];
  items?: { name: string; label: string }[];
}

export interface FormSummary {
  name: string;
  label: string;
  description: string;
  titleField: string;
  phoneField: string | null;
  emailField: string | null;
  ratingsField: string | null;
  interestField: string | null;
  fields: FormFieldDefinition[];
  statuses: FieldOption[];
  total: number;
  unread: number;
}

export type Submission = Record<string, unknown> & { id: string; at: string; status: string; note: string };

export interface AnalyticsTotals {
  screenPageViews: number;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  engagedSessions: number;
  engagementRate: number;
  averageSessionDuration: number;
}

export type AnalyticsReport =
  | { configured: false }
  | {
      configured: true;
      range: { start: string; end: string; days: number };
      days: number;
      /** hour: each point's date is "YYYY-MM-DDTHH"; day: "YYYY-MM-DD". */
      granularity: 'hour' | 'day';
      generatedAt: string;
      totals: AnalyticsTotals;
      previous: AnalyticsTotals;
      today: { views: number; visitors: number };
      daily: { date: string; views: number; visitors: number; sessions: number }[];
      pages: { path: string; title: string; views: number; visitors: number }[];
      channels: { name: string; sessions: number }[];
      devices: { name: string; visitors: number }[];
      places: Record<'city' | 'region' | 'country', { known: { name: string; visitors: number }[]; unknown: number }>;
      actions: { name: string; label: string; count: number }[];
    };

export interface GreetingTemplate {
  id: string;
  group: string;
  label: string;
  theme: string;
  /** Fixed calendar day as [month, day]; absent when the date moves each year. */
  on?: [number, number];
  moving?: boolean;
  /** Days to show before and after the day. */
  around: [number, number];
  title: string;
  message: string;
  alt: string;
  cta?: { label: string; href: string };
}

export interface GreetingBanner {
  id: string;
  theme: string;
  url: string;
  still: string;
  thumb: string;
  credit: { title: string; creator: string | null; license: string; url: string } | null;
}

export interface GreetingLibrary {
  templates: GreetingTemplate[];
  banners: GreetingBanner[];
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Fired when the session is gone, so the app can return to sign-in. */
export const sessionExpired = new EventTarget();

/** Fired when a submission is read, followed up or deleted, so the menu's unread count catches up. */
export const leadsChanged = new EventTarget();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await auth.idToken();
  if (!token) {
    sessionExpired.dispatchEvent(new Event('expired'));
    throw new ApiError(401, 'Please sign in again.');
  }

  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    });
  } catch {
    throw new ApiError(0, 'Could not reach the admin service. Check your connection and try again.');
  }

  const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
  if (!response.ok) {
    if (response.status === 401) sessionExpired.dispatchEvent(new Event('expired'));
    throw new ApiError(response.status, data?.error ?? data?.message ?? 'Something went wrong. Please try again.');
  }
  return data as T;
}

export function me() {
  return request<{ user: Me; sites: Site[]; upcoming?: Site[] }>('/me');
}

export function siteApi(siteId: string) {
  const base = `/sites/${encodeURIComponent(siteId)}`;
  const item = (collection: string, id?: string) =>
    `${base}/${encodeURIComponent(collection)}${id ? `/${encodeURIComponent(id)}` : ''}`;

  return {
    collections: () => request<{ collections: CollectionSummary[] }>(`${base}/collections`).then((r) => r.collections),

    list: (collection: string, group?: string) =>
      request<{ records: AdminRecord[]; groups: FieldOption[] }>(
        `${item(collection)}${group ? `?group=${encodeURIComponent(group)}` : ''}`,
      ),

    get: (collection: string, id: string) => request<AdminRecord>(item(collection, id)),

    create: (collection: string, values: Record<string, unknown>) =>
      request<AdminRecord>(item(collection), { method: 'POST', body: JSON.stringify(values) }),

    update: (collection: string, id: string, values: Record<string, unknown>) =>
      request<AdminRecord>(item(collection, id), { method: 'PUT', body: JSON.stringify(values) }),

    /** Hides the record (restorable), or with `permanent` deletes it for good. */
    remove: (collection: string, id: string, permanent = false) =>
      request<{ ok: true }>(`${item(collection, id)}${permanent ? '?permanent=1' : ''}`, { method: 'DELETE' }),

    reorder: (collection: string, ids: string[]) =>
      request<{ ok: true }>(`${item(collection)}/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),

    activity: (limit = 25) =>
      request<{ activity: ActivityEntry[] }>(`${base}/activity?limit=${limit}`).then((r) => r.activity),

    publish: () => request<{ queued: boolean; message: string }>(`${base}/publish`, { method: 'POST' }),

    library: () => request<GreetingLibrary>(`${base}/library`),

    forms: () => request<{ forms: FormSummary[] }>(`${base}/forms`).then((r) => r.forms),

    submissions: (form: string) =>
      request<{ submissions: Submission[] }>(`${base}/forms/${encodeURIComponent(form)}`).then((r) => r.submissions),

    updateSubmission: (form: string, id: string, changes: { status?: string; note?: string }) =>
      request<{ ok: true }>(`${base}/forms/${encodeURIComponent(form)}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(changes) }),

    deleteSubmission: (form: string, id: string) =>
      request<{ ok: true }>(`${base}/forms/${encodeURIComponent(form)}/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    analytics: (range: { start: string; end: string }, refresh = false) =>
      request<AnalyticsReport>(`${base}/analytics?start=${range.start}&end=${range.end}${refresh ? '&refresh=1' : ''}`),

    /** Asks for a one-time grant, then uploads the file straight to storage. */
    async upload(collection: string, file: File) {
      const grant = await request<{ upload: { url: string; fields: Record<string, string> }; publicUrl: string }>(
        `${base}/uploads`,
        {
          method: 'POST',
          body: JSON.stringify({ collection, filename: file.name, contentType: file.type, size: file.size }),
        },
      );

      const form = new FormData();
      for (const [key, value] of Object.entries(grant.upload.fields)) form.append(key, value);
      form.append('file', file);

      let response: Response;
      try {
        response = await fetch(grant.upload.url, { method: 'POST', body: form });
      } catch {
        throw new ApiError(0, 'The upload was interrupted. Check your connection and try again.');
      }
      if (!response.ok) throw new ApiError(response.status, 'The upload was rejected. Try a smaller file.');

      return grant.publicUrl;
    },
  };
}

export type SiteApi = ReturnType<typeof siteApi>;
