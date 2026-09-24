/** Turns a title into a short, URL-safe id. Shared by record ids and upload keys. */
export function slugify(value) {
  const slug = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug.length <= 60) return slug;
  const trimmed = slug.slice(0, 60);
  const lastBreak = trimmed.lastIndexOf('-');
  return lastBreak > 30 ? trimmed.slice(0, lastBreak) : trimmed;
}
