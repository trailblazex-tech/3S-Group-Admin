/**
 * The content engine: validates, shapes and orders one site's records.
 *
 * It knows nothing about HTTP, auth, AWS, or which site it serves. It is
 * built per request from that site's collection declarations and a store
 * already scoped to that site, so one site can never read or write another
 * site's rows through it.
 *
 * A store provides:
 *   load(collection)                      -> { records, categories }
 *   save(collection, { records, categories? })
 *                                         upserts the given records (only the
 *                                         ones that changed) and, if given,
 *                                         replaces the category list
 *   counts()                              -> { [collection]: { total, published } }
 *   log(entry)                            records an activity entry
 *   activity(limit)                       -> recent entries, newest first
 *   publish(user)                         -> { queued, message }
 */
import { describeCollections, editableFields, getCollection } from './schema.js';
import { slugify } from './slugify.js';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return '';
  // Strip control characters; keep newlines for textareas.
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLength);
}

/** The 11-character id out of a pasted YouTube link (youtu.be/..., watch?v=..., /embed/..., /shorts/...). */
export function extractYoutubeId(raw) {
  const value = String(raw ?? '').trim();
  const match = value.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : value;
}

/** YYYY-MM-DD that exists on the calendar (Date would quietly roll 2026-02-30 into March). */
function isRealDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Validates one field and returns the value to store. Throws ApiError(400)
 * with a message written for the person filling the form, not for a log file.
 */
function validateField(field, raw, categories) {
  const label = field.label ?? field.name;

  switch (field.type) {
    case 'text':
    case 'textarea': {
      const parsed = field.parseAs === 'youtubeId' ? extractYoutubeId(raw) : raw;
      const value = cleanString(parsed, field.maxLength ?? 1000);
      if (field.required && !value) throw new ApiError(400, `${label} is required.`);
      if (field.parseAs === 'youtubeId' && value && !/^[a-zA-Z0-9_-]{11}$/.test(value)) {
        throw new ApiError(400, `${label} does not look like a valid YouTube link or video id.`);
      }
      return value || null;
    }

    case 'date': {
      const value = cleanString(raw, 40);
      if (field.required && !value) throw new ApiError(400, `${label} is required.`);
      if (value && !isRealDate(value)) throw new ApiError(400, `${label} must be a real date.`);
      return value || null;
    }

    case 'image':
    case 'file': {
      const value = cleanString(raw, 500);
      if (field.required && !value) throw new ApiError(400, `${label} is required.`);
      if (value && !/^(\/(?!\/)|https:\/\/)/.test(value)) {
        throw new ApiError(400, `${label} must be an uploaded file or a full https:// address.`);
      }
      return value || null;
    }

    case 'select': {
      const value = cleanString(raw, 120);
      if (field.required && !value) throw new ApiError(400, `Choose a ${label.toLowerCase()}.`);
      if (!value) return null;

      const allowed = field.optionsFrom ? categories : (field.options ?? []).map((option) => option.value);
      if (!field.allowCustom && allowed.length > 0 && !allowed.includes(value)) {
        throw new ApiError(400, `"${value}" is not one of the ${label.toLowerCase()} choices.`);
      }
      return value;
    }

    case 'number': {
      if (raw === undefined || raw === null || raw === '') {
        if (field.required) throw new ApiError(400, `${label} is required.`);
        return null;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new ApiError(400, `${label} must be a number.`);
      if (field.min !== undefined && value < field.min) throw new ApiError(400, `${label} must be ${field.min} or more.`);
      if (field.max !== undefined && value > field.max) throw new ApiError(400, `${label} must be ${field.max} or less.`);
      return Math.round(value);
    }

    case 'boolean':
      return raw === undefined || raw === null ? (field.default ?? false) : Boolean(raw);

    case 'tags': {
      if (raw === undefined || raw === null || raw === '') return null;
      const list = Array.isArray(raw) ? raw : String(raw).split(',');
      const cleaned = list.map((entry) => cleanString(entry, 120)).filter(Boolean).slice(0, 50);
      return cleaned.length > 0 ? cleaned : null;
    }

    default:
      throw new ApiError(500, `Unknown field type "${field.type}" on ${field.name}.`);
  }
}

function validateRecord(collection, body, { existing, categories }) {
  const record = existing ? { ...existing } : {};

  for (const field of editableFields(collection)) {
    // On update, a field the client did not send keeps its stored value.
    if (existing && !(field.name in body)) continue;
    record[field.name] = validateField(field, body[field.name], categories);
  }

  return record;
}

function validateDateRange(collection, record) {
  if (record.startDate && record.endDate && record.endDate < record.startDate) {
    const end = collection.fields.find((field) => field.name === 'endDate')?.label ?? 'End date';
    throw new ApiError(400, `${end} cannot be before the start date.`);
  }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function nextSortOrder(records) {
  return records.reduce((highest, record) => Math.max(highest, record.sortOrder ?? 0), 0) + 1;
}

function uniqueId(base, taken) {
  const seed = base || 'record';
  if (!taken.has(seed)) return seed;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${seed}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${seed}-${Date.now()}`;
}

function bySortOrder(a, b) {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
}

export function createEngine({ store, collections }) {
  async function loadCollection(name) {
    const collection = getCollection(collections, name);
    if (!collection) throw new ApiError(404, `There is no "${name}" section.`);

    const { records, categories } = await store.load(name);
    return { collection, records, categories: categories ?? [] };
  }

  /** A brand new category typed into a form becomes a real option. */
  function withNewCategory(collection, record, categories) {
    if (!collection.groupsFrom) return undefined;
    const value = record[collection.groupField];
    return value && !categories.includes(value) ? [...categories, value] : undefined;
  }

  return {
    async listCollections() {
      const counts = await store.counts();
      return describeCollections(collections).map((entry) => ({
        ...entry,
        total: counts[entry.name]?.total ?? 0,
        published: counts[entry.name]?.published ?? 0,
      }));
    },

    async list(name, { group } = {}) {
      const { collection, records, categories } = await loadCollection(name);
      const filtered = group ? records.filter((record) => record[collection.groupField] === group) : records;

      let groups;
      if (collection.groupsFrom) groups = categories.map((value) => ({ value, label: value }));
      else if (collection.groups) groups = collection.groups;
      else if (collection.groupField) {
        groups = [...new Set(records.map((record) => record[collection.groupField]).filter(Boolean))].map((value) => ({
          value,
          label: value,
        }));
      } else groups = [];

      return { records: [...filtered].sort(bySortOrder), groups };
    },

    async get(name, id) {
      const { records } = await loadCollection(name);
      const record = records.find((entry) => entry.id === id);
      if (!record) throw new ApiError(404, 'That record no longer exists.');
      return record;
    },

    async create(name, body, user) {
      const { collection, records, categories } = await loadCollection(name);
      if (collection.fixed) {
        throw new ApiError(400, `${collection.label} has a fixed set of rows - edit a row instead of adding one.`);
      }

      const record = validateRecord(collection, body, { existing: null, categories });
      validateDateRange(collection, record);

      record.id = uniqueId(slugify(record[collection.titleField]), new Set(records.map((entry) => entry.id)));
      record.sortOrder = record.sortOrder ?? nextSortOrder(records);
      if (record.isActive === undefined || record.isActive === null) record.isActive = true;

      await store.save(name, { records: [record], categories: withNewCategory(collection, record, categories) });
      await store.log({ user, action: 'create', collection: name, recordId: record.id, title: record[collection.titleField] });
      return record;
    },

    async update(name, id, body, user) {
      const { collection, records, categories } = await loadCollection(name);
      const existing = records.find((entry) => entry.id === id);
      if (!existing) throw new ApiError(404, 'That record no longer exists.');

      const record = { ...validateRecord(collection, body, { existing, categories }), id: existing.id };
      validateDateRange(collection, record);
      // Bringing a removed record back clears its removal stamp.
      if (record.isActive && record.deletedAt) delete record.deletedAt;

      await store.save(name, { records: [record], categories: withNewCategory(collection, record, categories) });
      await store.log({ user, action: 'update', collection: name, recordId: id, title: record[collection.titleField] });
      return record;
    },

    /**
     * Deletes are soft: the record stops appearing on the website but stays in
     * storage, so an accidental delete is one toggle away from being undone.
     */
    async remove(name, id, user) {
      const { collection, records } = await loadCollection(name);
      if (collection.fixed) throw new ApiError(400, `${collection.label} rows cannot be removed - edit the row instead.`);

      const existing = records.find((entry) => entry.id === id);
      if (!existing) throw new ApiError(404, 'That record no longer exists.');

      const record = { ...existing, isActive: false, deletedAt: new Date().toISOString() };
      await store.save(name, { records: [record] });
      await store.log({ user, action: 'delete', collection: name, recordId: id, title: existing[collection.titleField] });
      return { ok: true };
    },

    async reorder(name, ids, user) {
      if (!Array.isArray(ids) || ids.length === 0) throw new ApiError(400, 'Send the new order as a list of ids.');

      const { records } = await loadCollection(name);
      const known = new Set(records.map((record) => record.id));
      const unknown = ids.find((id) => !known.has(id));
      if (unknown) throw new ApiError(400, `Cannot reorder: "${unknown}" is not in this section.`);

      // Records outside the reordered set keep their relative order after it.
      const position = new Map(ids.map((id, index) => [id, index + 1]));
      let tail = ids.length;
      const changed = [...records]
        .sort(bySortOrder)
        .map((record) => {
          const sortOrder = position.get(record.id) ?? (tail += 1);
          return sortOrder === record.sortOrder ? null : { ...record, sortOrder };
        })
        .filter(Boolean);

      if (changed.length > 0) await store.save(name, { records: changed });
      await store.log({ user, action: 'reorder', collection: name, recordId: null, title: `${ids.length} items` });
      return { ok: true };
    },

    async activity(limit = 50) {
      return store.activity(Math.min(Math.max(Number(limit) || 50, 1), 200));
    },

    async publish(user) {
      const result = await store.publish(user);
      if (result.queued) await store.log({ user, action: 'publish', collection: null, recordId: null, title: 'Website rebuild' });
      return result;
    },
  };
}

/**
 * Routes one request for one site. `path` is everything after
 * /sites/<site>. Returns { status, body }.
 */
export async function routeSiteRequest(engine, { method, path, query = {}, body = {}, user }) {
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent);

  try {
    const [first, second, third] = segments;
    if (!first || third) throw new ApiError(404, 'Unknown admin endpoint.');

    if (first === 'collections' && !second && method === 'GET') {
      return { status: 200, body: { collections: await engine.listCollections() } };
    }
    if (first === 'activity' && !second && method === 'GET') {
      return { status: 200, body: { activity: await engine.activity(query.limit) } };
    }
    if (first === 'publish' && !second && method === 'POST') {
      return { status: 200, body: await engine.publish(user) };
    }
    if (second === 'reorder' && method === 'POST') {
      return { status: 200, body: await engine.reorder(first, body.ids, user) };
    }

    if (!second) {
      if (method === 'GET') return { status: 200, body: await engine.list(first, { group: query.group }) };
      if (method === 'POST') return { status: 201, body: await engine.create(first, body, user) };
    } else {
      if (method === 'GET') return { status: 200, body: await engine.get(first, second) };
      if (method === 'PUT') return { status: 200, body: await engine.update(first, second, body, user) };
      if (method === 'DELETE') return { status: 200, body: await engine.remove(first, second, user) };
    }

    throw new ApiError(405, `${method} is not allowed here.`);
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, body: { error: error.message } };
    console.error('[engine] unexpected failure', error);
    return { status: 500, body: { error: 'Something went wrong saving that. Please try again.' } };
  }
}
