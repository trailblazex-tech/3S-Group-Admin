/**
 * Rebuilds a site's content/*.json files from the store, published records
 * only. This is what a site's public build pulls right before it compiles,
 * so the website is always built from exactly what the admin saved.
 *
 * Output: { files: { "<file>": { "<key>": [...records], "<groupsFrom>": [...] } } }
 */
import { hasField } from './schema.js';

function isPublished(record) {
  return record.isActive !== false && !record.deletedAt;
}

/** Drops bookkeeping the admin needs but the website's content files never had. */
function toPublicRecord(collection, record) {
  const { deletedAt, ...rest } = record;
  if (!hasField(collection, 'isActive')) delete rest.isActive;
  return rest;
}

export function buildDeliveryFiles(collections, everything) {
  const files = {};

  for (const [name, collection] of Object.entries(collections)) {
    const { records = [], categories = [] } = everything[name] ?? {};
    const file = (files[collection.file] ??= {});

    file[collection.key] = records
      .filter(isPublished)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((record) => toPublicRecord(collection, record));

    if (collection.groupsFrom) file[collection.groupsFrom] = categories;
  }

  return { files };
}
