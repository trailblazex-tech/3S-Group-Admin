/**
 * Helpers over one site's collection declarations.
 *
 * A site declares its collections once (see sites/<site>/collections.js).
 * Each collection says where its records live, how to label them, and which
 * fields they have. That single declaration drives server-side validation,
 * the admin panel's list and edit screens, and the shape of the content files
 * the site's public build pulls - so the three can never drift apart.
 *
 * Collection options:
 *   file, key     - the content file and top-level key the records live under
 *                   in the site's content/*.json (used by the local file store
 *                   and by the delivery endpoint that rebuilds those files)
 *   titleField, subtitleField, imageField - what the admin list shows
 *   groupField    - field the admin list can filter by
 *   groups        - fixed filter options for groupField
 *   groupsFrom    - key of an editable category list stored with the
 *                   collection; a select field with optionsFrom set to the
 *                   same key draws its options from it, and a new value typed
 *                   into that field becomes a new category
 *   group         - sidebar heading the collection sits under
 *   fixed         - the row set is prescribed: rows are edited, never added
 *                   or removed
 *   schedule      - records that show on the website only between two moments:
 *                   { start, end, startTime?, endTime? } naming date / time
 *                   fields (India time). The admin shows each record's status
 *                   (live, scheduled, ended) and a plain-words summary.
 *   templates     - "greetings": new records can start from a ready-made
 *                   festival or school occasion (core/greeting-library.js)
 *   display       - how the admin opens the section:
 *                   "list"  (default) a list; each row opens its own form
 *                   "form"  one row, edited in place - the form opens directly
 *                   "cards" every row's form open on one page, for short
 *                           sections like announcements
 *   check(record) - extra rule across fields; returns a message for the
 *                   person filling the form, or nothing when the record is fine
 *   derivedRows   - { [record id]: "where it comes from" } rows the website
 *                   works out by itself; the admin shows them as automatic
 *
 * Field types: text | textarea | number | date | time | image | file | select | tags | boolean
 * Field options beyond the obvious ones:
 *   library       - on an image field, "greetings" offers the ready-made
 *                   banner library alongside uploading
 *   showWhen      - { field, is: [values] }: the field only applies (is shown,
 *                   and only then required) while another field has one of
 *                   those values
 *   appearance    - "choices" on a select: big tappable choices instead of a
 *                   dropdown, for a decision that changes the rest of the form
 */

export const displayModes = new Set(['list', 'form', 'cards']);

export const fieldTypes = new Set(['text', 'textarea', 'number', 'date', 'time', 'image', 'file', 'select', 'tags', 'boolean']);

export function getCollection(collections, name) {
  return Object.prototype.hasOwnProperty.call(collections, name) ? collections[name] : null;
}

/** Whether a field applies to this record (see showWhen). */
export function fieldApplies(field, record) {
  if (!field.showWhen) return true;
  const value = record[field.showWhen.field] ?? null;
  return field.showWhen.is.includes(value);
}

/** Fields a client may send values for. sortOrder is admin-only but set by reordering. */
export function editableFields(collection) {
  return collection.fields.filter((field) => !field.adminOnly || field.name === 'sortOrder');
}

export function hasField(collection, name) {
  return collection.fields.some((field) => field.name === name);
}

export function describeCollections(collections) {
  return Object.entries(collections).map(([name, collection]) => ({
    name,
    label: collection.label,
    description: collection.description ?? '',
    titleField: collection.titleField,
    subtitleField: collection.subtitleField ?? '',
    imageField: collection.imageField ?? '',
    groupField: collection.groupField ?? null,
    groups: collection.groups ?? null,
    group: collection.group ?? null,
    fixed: Boolean(collection.fixed),
    schedule: collection.schedule ?? null,
    templates: collection.templates ?? null,
    display: collection.display ?? 'list',
    derivedRows: collection.derivedRows ?? null,
    fields: collection.fields,
  }));
}

/**
 * Catches declaration mistakes at startup (and in tests) instead of as a
 * confusing failure the first time someone edits that section.
 */
export function assertValidCollections(siteId, collections) {
  const problems = [];

  for (const [name, collection] of Object.entries(collections)) {
    const where = `${siteId}/${name}`;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) problems.push(`${where}: collection names must be lowercase-kebab`);
    if (!collection.label) problems.push(`${where}: missing label`);
    if (!collection.file || !collection.key) problems.push(`${where}: missing file/key`);
    if (!Array.isArray(collection.fields) || collection.fields.length === 0) {
      problems.push(`${where}: needs at least one field`);
      continue;
    }

    const names = new Set();
    for (const field of collection.fields) {
      if (names.has(field.name)) problems.push(`${where}: duplicate field "${field.name}"`);
      names.add(field.name);
      if (!fieldTypes.has(field.type)) problems.push(`${where}.${field.name}: unknown type "${field.type}"`);
      if (field.library && (field.type !== 'image' || field.library !== 'greetings')) {
        problems.push(`${where}.${field.name}: library "greetings" is only for image fields`);
      }
      if (field.showWhen && (!field.showWhen.field || !Array.isArray(field.showWhen.is))) {
        problems.push(`${where}.${field.name}: showWhen needs { field, is: [...] }`);
      }
      if (field.appearance && (field.appearance !== 'choices' || field.type !== 'select')) {
        problems.push(`${where}.${field.name}: appearance "choices" is only for select fields`);
      }
      if (field.optionsFrom && field.optionsFrom !== collection.groupsFrom) {
        problems.push(`${where}.${field.name}: optionsFrom must match the collection's groupsFrom`);
      }
    }

    if (!names.has(collection.titleField)) problems.push(`${where}: titleField "${collection.titleField}" is not a field`);
    if (!names.has('sortOrder')) problems.push(`${where}: every collection needs a sortOrder field`);
    if (collection.groupField && !names.has(collection.groupField)) {
      problems.push(`${where}: groupField "${collection.groupField}" is not a field`);
    }
    if (collection.schedule) {
      const { start, end, startTime, endTime } = collection.schedule;
      for (const [role, fieldName, type] of [['start', start, 'date'], ['end', end, 'date'], ['startTime', startTime, 'time'], ['endTime', endTime, 'time']]) {
        if (!fieldName && (role === 'start' || role === 'end')) problems.push(`${where}: schedule.${role} is required`);
        if (fieldName && collection.fields.find((field) => field.name === fieldName)?.type !== type) {
          problems.push(`${where}: schedule.${role} "${fieldName}" must be a ${type} field`);
        }
      }
    }
    for (const field of collection.fields) {
      if (field.showWhen && !names.has(field.showWhen.field)) {
        problems.push(`${where}.${field.name}: showWhen field "${field.showWhen.field}" is not a field`);
      }
    }
    if (collection.display && !displayModes.has(collection.display)) {
      problems.push(`${where}: unknown display "${collection.display}"`);
    }
    if (collection.check && typeof collection.check !== 'function') problems.push(`${where}: check must be a function`);
    if (collection.templates && collection.templates !== 'greetings') {
      problems.push(`${where}: unknown templates "${collection.templates}"`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid collection declarations:\n  ${problems.join('\n  ')}`);
  }
}
