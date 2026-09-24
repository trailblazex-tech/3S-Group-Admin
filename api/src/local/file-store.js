/**
 * Local development store: reads and writes a site's own content/*.json
 * files, so editing in the local admin changes the local website directly.
 * Same interface as the DSQL store. Never deployed.
 */
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const writeQueues = new Map();

/** Serializes read-modify-write per file so two quick saves can't clobber each other. */
function queued(file, work) {
  const previous = writeQueues.get(file) ?? Promise.resolve();
  const next = previous.then(work, work);
  writeQueues.set(
    file,
    next.catch(() => undefined),
  );
  return next;
}

async function readJson(file) {
  if (!existsSync(file)) return {};
  return JSON.parse(await readFile(file, 'utf8'));
}

export function createFileStore(site, { contentDir, dataDir }) {
  const fileFor = (collection) => path.join(contentDir, `${site.collections[collection].file}.json`);
  const activityFile = path.join(dataDir, `${site.id}-activity.jsonl`);

  async function load(name) {
    const collection = site.collections[name];
    const data = await readJson(fileFor(name));
    return {
      records: data[collection.key] ?? [],
      categories: collection.groupsFrom ? (data[collection.groupsFrom] ?? []) : [],
    };
  }

  return {
    load,

    async loadAll() {
      const everything = {};
      for (const name of Object.keys(site.collections)) everything[name] = await load(name);
      return everything;
    },

    save(name, { records = [], categories }) {
      const collection = site.collections[name];
      const file = fileFor(name);

      return queued(file, async () => {
        const data = await readJson(file);
        const current = data[collection.key] ?? [];
        const changed = new Map(records.map((record) => [record.id, record]));

        const merged = current.map((record) => changed.get(record.id) ?? record);
        for (const record of records) if (!current.some((entry) => entry.id === record.id)) merged.push(record);

        data[collection.key] = merged;
        if (categories && collection.groupsFrom) data[collection.groupsFrom] = categories;

        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      });
    },

    async counts() {
      const counts = {};
      for (const name of Object.keys(site.collections)) {
        const { records } = await load(name);
        counts[name] = { total: records.length, published: records.filter((record) => record.isActive !== false).length };
      }
      return counts;
    },

    async log(entry) {
      const line = {
        at: new Date().toISOString(),
        user: entry.user?.name ?? 'unknown',
        email: entry.user?.email ?? null,
        action: entry.action,
        collection: entry.collection,
        recordId: entry.recordId,
        title: entry.title ?? null,
      };
      await mkdir(dataDir, { recursive: true });
      await appendFile(activityFile, `${JSON.stringify(line)}\n`, 'utf8');
    },

    async activity(limit) {
      if (!existsSync(activityFile)) return [];
      const lines = (await readFile(activityFile, 'utf8')).trim().split('\n').filter(Boolean);
      return lines
        .slice(-limit)
        .reverse()
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    },

    async publish() {
      return { queued: false, message: 'Local development - the local website already reads these files, no publish needed.' };
    },
  };
}
