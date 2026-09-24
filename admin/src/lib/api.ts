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

export interface Site {
  id: string;
  name: string;
  shortName: string;
  publicUrl: string;
  accent: string;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'image' | 'file' | 'select' | 'tags' | 'boolean';
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
  /** The row set is prescribed: rows are edited, never added or removed. */
  fixed: boolean;
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

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Fired when the session is gone, so the app can return to sign-in. */
export const sessionExpired = new EventTarget();

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
  return request<{ user: Me; sites: Site[] }>('/me');
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

    remove: (collection: string, id: string) => request<{ ok: true }>(item(collection, id), { method: 'DELETE' }),

    reorder: (collection: string, ids: string[]) =>
      request<{ ok: true }>(`${item(collection)}/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),

    activity: (limit = 25) =>
      request<{ activity: ActivityEntry[] }>(`${base}/activity?limit=${limit}`).then((r) => r.activity),

    publish: () => request<{ queued: boolean; message: string }>(`${base}/publish`, { method: 'POST' }),

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
