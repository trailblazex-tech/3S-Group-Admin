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
 *
 * Field types: text | textarea | number | date | image | file | select | tags | boolean
 */

export const fieldTypes = new Set(['text', 'textarea', 'number', 'date', 'image', 'file', 'select', 'tags', 'boolean']);

export function getCollection(collections, name) {
  return Object.prototype.hasOwnProperty.call(collections, name) ? collections[name] : null;
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
      if (field.optionsFrom && field.optionsFrom !== collection.groupsFrom) {
        problems.push(`${where}.${field.name}: optionsFrom must match the collection's groupsFrom`);
      }
    }

    if (!names.has(collection.titleField)) problems.push(`${where}: titleField "${collection.titleField}" is not a field`);
    if (!names.has('sortOrder')) problems.push(`${where}: every collection needs a sortOrder field`);
    if (collection.groupField && !names.has(collection.groupField)) {
      problems.push(`${where}: groupField "${collection.groupField}" is not a field`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid collection declarations:\n  ${problems.join('\n  ')}`);
  }
}
