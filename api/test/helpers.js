/** In-memory store with the same contract as the DSQL and file stores. */
export function memoryStore(initial = {}) {
  const data = structuredClone(initial);
  const entries = [];

  return {
    data,
    entries,
    async load(name) {
      const entry = data[name] ?? { records: [], categories: [] };
      return structuredClone({ records: entry.records ?? [], categories: entry.categories ?? [] });
    },
    async loadAll() {
      return structuredClone(data);
    },
    async save(name, { records = [], categories }) {
      const entry = (data[name] ??= { records: [], categories: [] });
      for (const record of records) {
        const index = entry.records.findIndex((existing) => existing.id === record.id);
        if (index >= 0) entry.records[index] = structuredClone(record);
        else entry.records.push(structuredClone(record));
      }
      if (categories) entry.categories = [...categories];
    },
    async counts() {
      return Object.fromEntries(
        Object.entries(data).map(([name, entry]) => [
          name,
          { total: entry.records.length, published: entry.records.filter((r) => r.isActive !== false).length },
        ]),
      );
    },
    async log(entry) {
      entries.push(entry);
    },
    async activity(limit) {
      return entries.slice(-limit).reverse();
    },
    async publish() {
      return { queued: true, message: 'ok' };
    },
  };
}

const recordFields = [
  { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
  { name: 'isActive', type: 'boolean', label: 'Published', default: true },
];

export const testCollections = {
  gallery: {
    label: 'Gallery',
    file: 'gallery',
    key: 'photos',
    titleField: 'title',
    groupField: 'category',
    groupsFrom: 'categories',
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 50 },
      { name: 'src', type: 'image', label: 'Photo' },
      { name: 'category', type: 'select', label: 'Category', required: true, allowCustom: true, optionsFrom: 'categories' },
      ...recordFields,
    ],
  },
  info: {
    label: 'Info',
    file: 'info',
    key: 'rows',
    titleField: 'label',
    fixed: true,
    fields: [
      { name: 'label', type: 'text', label: 'Row', required: true },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
    ],
  },
  events: {
    label: 'Events',
    file: 'events',
    key: 'events',
    titleField: 'title',
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'startDate', type: 'date', label: 'Show from', required: true },
      { name: 'endDate', type: 'date', label: 'Show until', required: true },
      { name: 'video', type: 'text', label: 'Video', parseAs: 'youtubeId' },
      ...recordFields,
    ],
  },
};

export const alice = { id: 'u1', email: 'alice@example.com', name: 'alice' };
