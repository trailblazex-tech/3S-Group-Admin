/**
 * Takes a site guide's screenshots and records where each numbered mark goes.
 *
 *   node docs/client-guide/capture/capture.mjs <site> [shot ...]
 *
 * Needs the local harness running (see README.md here): the admin on :5173
 * signed in as a test editor, the API on :8787 serving copies of the sites'
 * content. Writes sites/<site>/img/<shot>.webp and sites/<site>/callouts.json.
 * Shots and their marks are declared in sites/<site>.mjs (`shots`).
 *
 * A mark is found by:
 *   { text: 'Publish to website' }  visible element whose own text is exactly this
 *   { label: 'Phone number' }       the form field with this label (label + input)
 *   { aria: 'Move up' }             element whose aria-label starts with this
 *   { css: 'aside' }                a CSS selector
 * Add { nth: 1 } to take a later match, { pad: [x, y] } to grow the box.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Not a dependency of the repo: `npm i --no-save puppeteer-core`, or point
// PUPPETEER at an installed copy's entry file.
const { default: puppeteer } = await import(process.env.PUPPETEER ? pathToFileURL(process.env.PUPPETEER).href : 'puppeteer-core');

const dir = path.dirname(fileURLToPath(import.meta.url));
const [siteId, ...only] = process.argv.slice(2);
const site = (await import(pathToFileURL(path.join(dir, '..', 'sites', `${siteId}.mjs`)).href)).default;
const outDir = path.join(dir, '..', 'sites', siteId);
await mkdir(path.join(outDir, 'img'), { recursive: true });
const calloutsFile = path.join(outDir, 'callouts.json');
const callouts = JSON.parse(await readFile(calloutsFile, 'utf8').catch(() => '{}'));
const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

/** Box of one mark, in page coordinates. */
async function locate(spec) {
  return page.evaluate((spec) => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    let matches = [];
    if (spec.css) matches = [...document.querySelectorAll(spec.css)];
    else if (spec.aria) matches = [...document.querySelectorAll('[aria-label]')].filter((el) => el.getAttribute('aria-label').startsWith(spec.aria));
    else if (spec.label) {
      matches = [...document.querySelectorAll('label')]
        .filter((el) => el.textContent.replace(/\*$/, '').trim().replace(/\s*\*$/, '') === spec.label)
        .map((label) => label.parentElement);
    } else if (spec.text) {
      matches = [...document.querySelectorAll('body *')].filter((el) => ownText(el) === spec.text || (el.children.length === 0 && el.textContent.trim() === spec.text));
      // The clickable thing around the text, when there is one.
      matches = matches.map((el) => el.closest('button, a, [role="tab"], [role="radio"], label') ?? el);
    }
    matches = matches.filter(visible);
    const el = matches[spec.nth ?? 0];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const [px, py] = spec.pad ?? [0, 0];
    return { x: r.x - px, y: r.y - py, w: r.width + 2 * px, h: r.height + 2 * py };
  }, spec);
}

for (const shot of site.shots) {
  if (only.length && !only.includes(shot.id)) continue;
  await page.setViewport({ width: shot.width ?? 1440, height: shot.height ?? 900 });
  await page.goto(`http://localhost:5173${shot.path}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 600));
  if (shot.prepare) {
    await shot.prepare(page);
    await new Promise((r) => setTimeout(r, 600));
  }
  // Scroll (the window or whichever panel scrolls) so this sits near the top.
  if (shot.scrollTo) {
    const box = await locate(shot.scrollTo);
    if (!box) throw new Error(`${shot.id}: scrollTo not found`);
    await page.mouse.move(box.x + 5, Math.min(box.y, (shot.height ?? 900) - 5));
    await page.mouse.wheel({ deltaY: box.y - 24 });
    await new Promise((r) => setTimeout(r, 600));
  }
  let clip;
  if (shot.element) {
    const box = await locate(shot.element);
    if (!box) throw new Error(`${shot.id}: element not found`);
    clip = { x: box.x, y: box.y, width: Math.round(box.w), height: Math.round(box.h) };
  } else {
    clip = { x: 0, y: 0, width: shot.width ?? 1440, height: shot.height ?? 900 };
  }
  const marks = [];
  for (const spec of shot.marks ?? []) {
    const box = await locate(spec);
    if (!box) throw new Error(`${shot.id}: mark not found ${JSON.stringify(spec)}`);
    const mark = { x: Math.round(box.x - clip.x), y: Math.round(box.y - clip.y), w: Math.round(box.w), h: Math.round(box.h) };
    if (mark.x < 0 || mark.y < 0 || mark.x + mark.w > clip.width + 2 || mark.y + mark.h > clip.height + 2) {
      throw new Error(`${shot.id}: mark ${JSON.stringify(spec)} is outside the picture ${JSON.stringify(mark)}`);
    }
    marks.push(mark);
  }
  await page.screenshot({ path: path.join(outDir, 'img', `${shot.id}.webp`), type: 'webp', quality: 82, clip, captureBeyondViewport: false });
  callouts[shot.id] = { width: clip.width, height: clip.height, callouts: marks };
  // Saved after every shot, so a failing later shot keeps the earlier ones.
  await writeFile(calloutsFile, `${JSON.stringify(callouts, null, 1)}
`);
  console.log(`${shot.id.padEnd(16)} ${clip.width}x${clip.height}  ${marks.length} marks`);
}

await writeFile(calloutsFile, `${JSON.stringify(callouts, null, 1)}\n`);
await browser.close();
