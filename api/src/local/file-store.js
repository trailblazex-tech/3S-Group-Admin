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
  const submissionsFile = path.join(dataDir, `${site.id}-submissions.json`);

  /** Every form's submissions in one small JSON file, newest last. */
  function editSubmissions(work) {
    return queued(submissionsFile, async () => {
      const all = await readJson(submissionsFile);
      const result = work(all);
      await mkdir(dataDir, { recursive: true });
      await writeFile(submissionsFile, `${JSON.stringify(all, null, 2)}
`, 'utf8');
      return result;
    });
  }

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

    purge(name, id) {
      const collection = site.collections[name];
      const file = fileFor(name);

      return queued(file, async () => {
        const data = await readJson(file);
        data[collection.key] = (data[collection.key] ?? []).filter((record) => record.id !== id);
        await writeFile(file, `${JSON.stringify(data, null, 2)}
`, 'utf8');
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

    addSubmission(form, submission) {
      return editSubmissions((all) => {
        (all[form] ??= []).push({ status: 'new', note: '', ...submission });
      });
    },

    async submissions(form, limit) {
      const all = await readJson(submissionsFile);
      return (all[form] ?? []).slice(-limit).reverse();
    },

    async submissionCounts() {
      const all = await readJson(submissionsFile);
      return Object.fromEntries(
        Object.entries(all).map(([form, list]) => [form, { total: list.length, unread: list.filter((entry) => entry.status === 'new').length }]),
      );
    },

    updateSubmission(form, id, changes) {
      return editSubmissions((all) => {
        const entry = (all[form] ?? []).find((item) => item.id === id);
        if (!entry) return false;
        if (changes.status) entry.status = changes.status;
        if ('note' in changes) entry.note = changes.note ?? '';
        return true;
      });
    },

    deleteSubmission(form, id) {
      return editSubmissions((all) => {
        const before = (all[form] ?? []).length;
        all[form] = (all[form] ?? []).filter((item) => item.id !== id);
        return all[form].length < before;
      });
    },

    async publish() {
      return { queued: false, message: 'Local development - the local website already reads these files, no publish needed.' };
    },
  };
}
