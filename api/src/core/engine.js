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
 *   purge(collection, id)                 deletes one record for good
 *   counts()                              -> { [collection]: { total, published } }
 *   log(entry)                            records an activity entry
 *   activity(limit)                       -> recent entries, newest first
 *   publish(user)                         -> { queued, message }
 */
import { describeCollections, editableFields, fieldApplies, getCollection } from './schema.js';
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

    case 'time': {
      const value = cleanString(raw, 10);
      if (field.required && !value) throw new ApiError(400, `${label} is required.`);
      if (value && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new ApiError(400, `${label} must be a time like 09:30.`);
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
      if (field.parseAs === 'ga4MeasurementId') {
        const ids = [...new Set(cleaned.map((entry) => entry.toUpperCase()))];
        const wrong = ids.find((id) => !/^G-[A-Z0-9]{4,20}$/.test(id));
        if (wrong) throw new ApiError(400, `"${wrong}" is not a GA4 measurement ID - they look like G-XXXXXXXXXX.`);
        return ids.length > 0 ? ids : null;
      }
      return cleaned.length > 0 ? cleaned : null;
    }

    default:
      throw new ApiError(500, `Unknown field type "${field.type}" on ${field.name}.`);
  }
}

function validateRecord(collection, body, { existing, categories }) {
  const record = existing ? { ...existing } : {};
  // What the record will look like, so a field that only applies in some
  // cases (showWhen) is only required in those cases.
  const probe = { ...record, ...body };

  for (const field of editableFields(collection)) {
    // On update, a field the client did not send keeps its stored value.
    if (existing && !(field.name in body)) continue;
    const rule = field.required && !fieldApplies(field, probe) ? { ...field, required: false } : field;
    record[field.name] = validateField(rule, body[field.name], categories);
  }

  const problem = collection.check?.(record);
  if (problem) throw new ApiError(400, problem);

  return record;
}

function validateDateRange(collection, record) {
  const { start = 'startDate', end = 'endDate', startTime, endTime } = collection.schedule ?? {};
  if (!record[start] || !record[end]) return;

  // Times are optional: a missing start time means the start of the day, a
  // missing end time the end of it. "HH:MM" strings compare correctly as text.
  const from = `${record[start]}T${(startTime && record[startTime]) || '00:00'}`;
  const until = `${record[end]}T${(endTime && record[endTime]) || '23:59'}`;
  if (until < from) {
    const label = collection.fields.find((field) => field.name === end)?.label ?? 'End date';
    throw new ApiError(400, `${label} cannot be before the start.`);
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

function isLive(record) {
  return record.isActive !== false && !record.deletedAt;
}

function sameText(a, b) {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}

function listNames(names, total) {
  const shown = names.slice(0, 3).map((name) => `"${name}"`);
  if (total > shown.length) return `${shown.join(', ')} and ${total - shown.length} more`;
  if (shown.length <= 1) return shown.join('');
  return `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`;
}

/** Every select field, anywhere on the site, whose options are this section's records. */
function linksInto(collections, name) {
  const links = [];
  for (const [from, collection] of Object.entries(collections)) {
    for (const field of collection.fields) {
      if (field.optionsFromSection?.collection === name) links.push({ from, collection, field, link: field.optionsFromSection });
    }
  }
  return links;
}

/** Whether a record counts towards a link (see optionsFromSection.addWhen). */
function linkApplies(link, record) {
  return !link.addWhen || link.addWhen.is.includes(record[link.addWhen.field] ?? null);
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

  function assertUnique(collection, record, records) {
    for (const field of collection.fields) {
      if (!field.unique || !record[field.name]) continue;
      const clash = records.find((entry) => entry.id !== record.id && sameText(entry[field.name], record[field.name]));
      if (clash) {
        const hidden = isLive(clash) ? '' : ' (it is hidden - publish it again instead)';
        throw new ApiError(400, `There is already "${clash[field.name]}" in ${collection.label}${hidden}.`);
      }
    }
  }

  /**
   * A record pointing at another section (optionsFromSection) must point at
   * something that exists there. A new value typed in is added to that
   * section; a hidden one is published again, so the record shows up.
   */
  async function syncLinkedOptions(collection, record, user) {
    // A hidden record shows nowhere, so it has no say over the other section.
    if (!isLive(record)) return;
    for (const field of collection.fields) {
      const link = field.optionsFromSection;
      const value = record[field.name];
      if (!link || !value) continue;

      const source = getCollection(collections, link.collection);
      const { records } = await store.load(link.collection);
      const match = records.find((entry) => sameText(entry[link.field], value));
      if (match) {
        // Same option, maybe typed in a different case: store its exact spelling.
        record[field.name] = match[link.field];
        if (!isLive(match) && linkApplies(link, record)) {
          const { deletedAt, ...restored } = match;
          await store.save(link.collection, { records: [{ ...restored, isActive: true }] });
          await store.log({ user, action: 'update', collection: link.collection, recordId: match.id, title: match[source.titleField] });
        }
        continue;
      }

      if (!linkApplies(link, record)) {
        if (!field.allowCustom) throw new ApiError(400, `"${value}" is not one of the ${(field.label ?? field.name).toLowerCase()} choices.`);
        continue;
      }

      const added = {
        [link.field]: value,
        id: uniqueId(slugify(value), new Set(records.map((entry) => entry.id))),
        sortOrder: nextSortOrder(records),
        isActive: true,
      };
      await store.save(link.collection, { records: [added] });
      await store.log({ user, action: 'create', collection: link.collection, recordId: added.id, title: added[source.titleField] });
    }
  }

  /** Records elsewhere that still use this record as their option. */
  async function usersOf(name, record) {
    const found = [];
    for (const { from, collection, field, link } of linksInto(collections, name)) {
      const { records } = await store.load(from);
      const using = records.filter((entry) => isLive(entry) && linkApplies(link, entry) && sameText(entry[field.name], record[link.field]));
      if (using.length > 0) found.push({ collection, using });
    }
    return found;
  }

  async function assertUnused(name, record, verb) {
    const found = await usersOf(name, record);
    if (found.length === 0) return;
    const { collection, using } = found[0];
    const titles = using.map((entry) => entry[collection.titleField]).filter(Boolean);
    throw new ApiError(
      400,
      `"${record[getCollection(collections, name).titleField]}" cannot be ${verb} while ${collection.label} still lists ${listNames(titles, using.length)} under it. Move them to another choice first.`,
    );
  }

  /** Renaming an option renames it on every record that uses it. */
  async function cascadeRename(name, before, after, user) {
    for (const { from, field, link } of linksInto(collections, name)) {
      if (before[link.field] === after[link.field]) continue;
      const { records } = await store.load(from);
      const changed = records
        .filter((entry) => sameText(entry[field.name], before[link.field]))
        .map((entry) => ({ ...entry, [field.name]: after[link.field] }));
      if (changed.length === 0) continue;
      await store.save(from, { records: changed });
      await store.log({
        user,
        action: 'update',
        collection: from,
        recordId: null,
        title: `${changed.length} moved to "${after[link.field]}"`,
      });
    }
  }

  async function withLinkedOptions(entry) {
    const fields = [];
    for (const field of entry.fields) {
      const link = field.optionsFromSection;
      if (!link) {
        fields.push(field);
        continue;
      }
      const { records } = await store.load(link.collection);
      const options = records
        .filter((record) => isLive(record) && record[link.field])
        .sort(bySortOrder)
        .map((record) => ({ value: record[link.field], label: record[link.field] }));
      fields.push({ ...field, options });
    }
    return { ...entry, fields };
  }

  return {
    async listCollections() {
      const counts = await store.counts();
      const described = await Promise.all(describeCollections(collections).map(withLinkedOptions));
      return described.map((entry) => ({
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

      assertUnique(collection, record, records);
      record.id = uniqueId(slugify(record[collection.titleField]), new Set(records.map((entry) => entry.id)));
      record.sortOrder = record.sortOrder ?? nextSortOrder(records);
      if (record.isActive === undefined || record.isActive === null) record.isActive = true;
      await syncLinkedOptions(collection, record, user);

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
      assertUnique(collection, record, records);
      if (isLive(existing) && !isLive(record)) await assertUnused(name, existing, 'hidden');
      await syncLinkedOptions(collection, record, user);

      await store.save(name, { records: [record], categories: withNewCategory(collection, record, categories) });
      await store.log({ user, action: 'update', collection: name, recordId: id, title: record[collection.titleField] });
      await cascadeRename(name, existing, record, user);
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
      await assertUnused(name, existing, 'deleted');

      const record = { ...existing, isActive: false, deletedAt: new Date().toISOString() };
      await store.save(name, { records: [record] });
      await store.log({ user, action: 'delete', collection: name, recordId: id, title: existing[collection.titleField] });
      return { ok: true };
    },

    /** Gone for good - for mistakes and old records nobody needs back. */
    async purge(name, id, user) {
      const { collection, records } = await loadCollection(name);
      if (collection.fixed) throw new ApiError(400, `${collection.label} rows cannot be deleted - edit the row instead.`);

      const existing = records.find((entry) => entry.id === id);
      if (!existing) throw new ApiError(404, 'That record no longer exists.');
      await assertUnused(name, existing, 'deleted');

      await store.purge(name, id);
      await store.log({ user, action: 'purge', collection: name, recordId: id, title: existing[collection.titleField] });
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
      if (method === 'DELETE') {
        const permanent = query.permanent === '1' || query.permanent === 'true';
        return { status: 200, body: await (permanent ? engine.purge(first, second, user) : engine.remove(first, second, user)) };
      }
    }

    throw new ApiError(405, `${method} is not allowed here.`);
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, body: { error: error.message } };
    console.error('[engine] unexpected failure', error);
    return { status: 500, body: { error: 'Something went wrong saving that. Please try again.' } };
  }
}
