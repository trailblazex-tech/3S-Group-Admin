// Builds index.html for the 3S Admin client guide from the screenshots and
// the callout positions the capture script recorded.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
// node build.mjs [site] - konark (default), minerals, globalgreens. Each site's
// page text lives in sites/<site>.mjs; its screenshots in sites/<site>/img with
// sites/<site>/callouts.json. Screens a site does not have of its own (like
// sign-in) come from the shared img/ and callouts.json.
const siteId = process.argv[2] ?? 'konark';
const site = (await import(`./sites/${siteId}.mjs`)).default;
const siteDir = path.join(dir, 'sites', siteId);
const ownCallouts = path.join(siteDir, 'callouts.json');
const shots = {
  ...JSON.parse(readFileSync(path.join(dir, 'callouts.json'), 'utf8')),
  ...(existsSync(ownCallouts) ? JSON.parse(readFileSync(ownCallouts, 'utf8')) : {}),
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// One self-contained file: the screenshots travel inside it.
const imageFile = (id) => (existsSync(path.join(siteDir, 'img', `${id}.webp`)) ? path.join(siteDir, 'img', `${id}.webp`) : path.join(dir, 'img', `${id}.webp`));
const imageData = (id) => `data:image/webp;base64,${readFileSync(imageFile(id)).toString('base64')}`;

/** A screenshot with numbered rings over the parts the legend explains. */
function figure(id, notes, { caption = '', narrow = false, sample = false } = {}) {
  const shot = shots[id];
  const r = 21;
  const marks = notes
    .map((note, index) => {
      const box = shot.callouts[index];
      if (!box || note === null) return '';
      const pad = 6;
      const x = Math.max(box.x - pad, 2);
      const y = Math.max(box.y - pad, 2);
      const w = Math.min(box.w + pad * 2, shot.width - x - 2);
      const h = Math.min(box.h + pad * 2, shot.height - y - 2);
      // Badge sits off the ring's top-left corner, kept inside the picture.
      const cx = Math.min(Math.max(x - 4, r + 4), shot.width - r - 4);
      const cy = Math.min(Math.max(y - 4, r + 4), shot.height - r - 4);
      return `<g class="mark"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/><circle cx="${cx}" cy="${cy}" r="${r}"/><text x="${cx}" y="${cy}" dy="0.36em">${index + 1}</text></g>`;
    })
    .join('');
  const legend = notes
    .map((note, index) => (note === null ? '' : `<li><span class="num">${index + 1}</span><div>${note}</div></li>`))
    .join('');
  return `<figure class="shot${narrow ? ' shot--narrow' : ''}">
  <div class="frame">
    <button type="button" class="pic" style="aspect-ratio:${shot.width}/${shot.height}" aria-label="Enlarge: ${esc(caption || id)}">
      <img src="${imageData(id)}" alt="${esc(caption || id)}" width="${shot.width}" height="${shot.height}" decoding="async">
      <svg viewBox="0 0 ${shot.width} ${shot.height}" aria-hidden="true">${marks}</svg>
      <span class="zoom-hint" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/></svg>Click to enlarge</span>
    </button>
    ${sample ? '<span class="sample">Example data</span>' : ''}
  </div>
  <ol class="legend">${legend}</ol>
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>`;
}

const steps = (items) => `<ol class="steps">${items.map((item) => `<li>${item}</li>`).join('')}</ol>`;
const tip = (title, body, kind = 'tip') => `<aside class="note note--${kind}"><strong>${title}</strong><p>${body}</p></aside>`;

const { sections, faq } = site.content({ figure, steps, tip });


const toc = [...new Set(sections.map((s) => s.group))]
  .map((group) => `<div class="toc-group"><p>${group}</p>${sections.filter((s) => s.group === group).map((s) => `<a href="#${s.id}">${s.title}</a>`).join('')}</div>`)
  .join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="${site.description}">
<title>3S Admin Guide</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2321253f'/%3E%3Ctext x='32' y='42' font-family='Georgia' font-size='28' font-weight='700' text-anchor='middle' fill='%23e3c47c'%3E3S%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap">
<style>
/* Layout: a reading column with a sticky contents rail on wide screens; screenshots run the column's full width. */
:root{
  --bg:#f7f5f0; --surface:#ffffff; --ink:#1d2236; --muted:#5e6378; --line:#e4e0d6;
  --navy:#21253f; --gold:#c69a3c; --gold-soft:#f6ecd5; --mark:#e8590c; --info:#2a6fb0; --info-soft:#e7f0f9; --warn:#a85b00; --warn-soft:#fbefdc;
  --display:'Fraunces',Georgia,serif; --body:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#14172a;--surface:#1c2037;--ink:#ecebf3;--muted:#a3a7bd;--line:#2f3450;--navy:#0f1222;--gold:#d9b25f;--gold-soft:#33301f;--mark:#ff7a33;--info:#7fb3e6;--info-soft:#1d2b40;--warn:#f0b35a;--warn-soft:#3a2d18;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#14172a;--surface:#1c2037;--ink:#ecebf3;--muted:#a3a7bd;--line:#2f3450;--navy:#0f1222;--gold:#d9b25f;--gold-soft:#33301f;--mark:#ff7a33;--info:#7fb3e6;--info-soft:#1d2b40;--warn:#f0b35a;--warn-soft:#3a2d18;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:16px/1.65 var(--body);margin:0}
a{color:inherit}
.hero{background:linear-gradient(135deg,#1b1f36,#2b3160);color:#fff;padding-block:56px 64px;padding-inline:20px}
.hero-in{max-width:1180px;margin:0 auto;display:grid;gap:28px}
.eyebrow{font:600 12px/1 var(--body);letter-spacing:.22em;text-transform:uppercase;color:#e3c47c;margin:0}
.hero h1{font:600 clamp(34px,5vw,56px)/1.08 var(--display);margin:10px 0 0;text-wrap:balance}
.hero h1 em{font-style:normal;color:#e3c47c}
.hero p.intro{max-width:62ch;color:#cfd2e6;margin:14px 0 0;font-size:17px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
.fact{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:14px 16px}
.fact span{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#aeb3d0}
.fact b{display:block;font-size:17px;margin-top:4px;color:#fff;word-break:break-word}
.flow{max-width:1180px;margin:-34px auto 0;padding-inline:20px}
.flow-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:0 10px 30px rgba(20,24,50,.08)}
.flow-card h2{font:600 20px/1.3 var(--display);margin:0 0 4px}
.flow-card>p{margin:0 0 16px;color:var(--muted)}
.flow-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;counter-reset:f}
.flow-step{position:relative;background:var(--bg);border-radius:14px;padding:16px 16px 14px}
.flow-step:not(:last-child)::after{content:"";position:absolute;right:-12px;top:50%;width:14px;height:14px;border-top:3px solid var(--gold);border-right:3px solid var(--gold);transform:translateY(-50%) rotate(45deg);z-index:1}
.flow-step svg{width:30px;height:30px;color:var(--gold)}
.flow-step b{display:block;margin-top:8px}
.flow-step p{margin:2px 0 0;font-size:14px;color:var(--muted)}
.flow-step.live{background:var(--gold-soft)}
.layout{max-width:1180px;margin:0 auto;padding-inline:20px;padding-block:36px 80px;display:grid;grid-template-columns:230px minmax(0,1fr);gap:44px}
nav.toc{position:sticky;top:20px;align-self:start;font-size:14px;max-height:calc(100vh - 40px);overflow-y:auto;overscroll-behavior:contain;padding-right:6px;scrollbar-width:thin}
nav.toc summary{display:none}
.toc a.active{border-color:var(--gold);color:var(--gold);font-weight:600;background:var(--gold-soft)}
html{scroll-behavior:smooth}
section{scroll-margin-top:24px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
.progress{position:fixed;top:0;left:0;height:4px;width:100%;transform-origin:0 50%;transform:scaleX(0);background:var(--gold);z-index:30}
.to-top{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));width:46px;height:46px;border-radius:50%;border:0;background:var(--navy);color:#fff;box-shadow:0 8px 20px rgba(20,24,50,.25);cursor:pointer;opacity:0;pointer-events:none;transition:opacity .2s;z-index:30;display:grid;place-items:center}
.to-top.show{opacity:1;pointer-events:auto}
.to-top svg{width:22px;height:22px}
button.pic{border:0;padding:0;margin:0;background:none;cursor:zoom-in;font:inherit;color:inherit}
.zoom-hint{position:absolute;left:12px;bottom:12px;display:inline-flex;align-items:center;gap:6px;background:rgba(17,20,38,.82);color:#fff;font-size:12px;font-weight:600;padding:6px 10px;border-radius:999px;opacity:0;transition:opacity .2s}
.zoom-hint svg{position:static;width:15px;height:15px}
button.pic:hover .zoom-hint,button.pic:focus-visible .zoom-hint{opacity:1}
.lightbox{position:fixed;inset:0;z-index:50;background:rgba(10,12,24,.92);display:flex;flex-direction:column;padding:calc(12px + env(safe-area-inset-top,0px)) 12px calc(12px + env(safe-area-inset-bottom,0px))}
.lightbox[hidden]{display:none}
.lightbox-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#fff;padding:0 4px 10px}
.lightbox-bar p{margin:0;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lightbox-bar button{flex:none;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;border-radius:10px;padding:8px 14px;font:600 14px var(--body);cursor:pointer}
.lightbox-stage{flex:1;overflow:auto;display:flex;align-items:flex-start;justify-content:center;border-radius:12px}
.lightbox-stage .pic{width:min(100%,1600px);cursor:default;flex:none}
body.locked{overflow:hidden}
.toc-group p{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:18px 0 6px;font-weight:700}
.toc-group:first-child p{margin-top:0}
.toc a{display:block;text-decoration:none;color:var(--ink);padding:5px 10px;border-left:2px solid var(--line)}
.toc a:hover{border-color:var(--gold);color:var(--gold)}
main{min-width:0}
section{padding-top:28px;margin-top:28px;border-top:1px solid var(--line)}
section:first-of-type{border-top:0;margin-top:0;padding-top:0}
.group-label{font:700 12px/1 var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin:0 0 8px}
h2.title{font:600 clamp(26px,3vw,34px)/1.15 var(--display);margin:0;text-wrap:balance}
p.lead{color:var(--muted);max-width:68ch;margin:8px 0 18px;font-size:17px}
h3{font:600 20px/1.3 var(--display);margin:26px 0 10px}
.shot{margin:18px 0 24px}
.frame{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--surface);box-shadow:0 8px 26px rgba(20,24,50,.10)}
.pic{position:relative;width:100%;max-width:100%}
.pic img,.pic svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.mark rect{fill:rgba(232,89,12,.06);stroke:var(--mark);stroke-width:4}
.mark circle{fill:var(--mark);stroke:#fff;stroke-width:4}
.mark text{fill:#fff;font:700 22px var(--body);text-anchor:middle}
.sample{position:absolute;top:12px;right:12px;background:var(--navy);color:#fff;font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px;letter-spacing:.04em}
.legend{list-style:none;margin:14px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px 22px}
.legend li{display:flex;gap:10px;align-items:flex-start;font-size:15px;min-width:0}
.num{flex:none;width:24px;height:24px;border-radius:50%;background:var(--mark);color:#fff;font-weight:700;font-size:13px;display:grid;place-items:center;margin-top:1px}
figcaption{font-size:13px;color:var(--muted);margin-top:10px}
.shot--narrow{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:24px;align-items:start}
.shot--narrow .legend{grid-template-columns:1fr;margin:0}
.shot--narrow figcaption{grid-column:1/-1}
.steps{counter-reset:s;list-style:none;padding:0;margin:8px 0 18px;display:grid;gap:10px}
.steps li{counter-increment:s;position:relative;padding:12px 14px 12px 52px;background:var(--surface);border:1px solid var(--line);border-radius:12px}
.steps li::before{content:counter(s);position:absolute;left:14px;top:11px;width:26px;height:26px;border-radius:8px;background:var(--navy);color:#fff;font-weight:700;font-size:13px;display:grid;place-items:center}
.sub{margin-top:30px}
.note{border-radius:12px;padding:14px 16px;margin:14px 0;background:var(--gold-soft)}
.note strong{display:block;font-size:15px}
.note p{margin:4px 0 0;font-size:15px}
.note--info{background:var(--info-soft)}
.note--info strong{color:var(--info)}
.note--warn{background:var(--warn-soft)}
.note--warn strong{color:var(--warn)}
.note--key{background:var(--navy);color:#fff}
.note--key strong{color:#e3c47c}
.mfa{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;margin:20px 0}
.mfa h3{margin-top:0}
.mfa>p{color:var(--muted);margin:0 0 14px}
.mfa-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.mfa-grid div{background:var(--bg);border-radius:12px;padding:14px}
.mfa-grid p{margin:4px 0 0;font-size:14px;color:var(--muted)}
.chip{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--gold);color:#fff;font-weight:700;font-size:13px;margin-right:8px}
.table-wrap{overflow-x:auto;margin:16px 0;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:15px}
th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--bg)}
tr:last-child td{border-bottom:0}
.compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:12px 0}
.compare div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px}
.compare b{font-family:var(--display);font-size:18px}
.compare ul{margin:8px 0 0;padding-left:18px;font-size:15px}
details{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin:8px 0}
summary{cursor:pointer;font-weight:600}
details p{margin:8px 0 0;color:var(--muted)}
footer{max-width:1180px;margin:0 auto;padding:0 20px 48px;color:var(--muted);font-size:14px}
:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
@media (max-width:900px){.layout{grid-template-columns:1fr}nav.toc{position:static;max-height:none;overflow:visible;border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--surface)}nav.toc summary{display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-weight:700;list-style:none}nav.toc summary::-webkit-details-marker{display:none}nav.toc summary::after{content:"+";font-size:20px;color:var(--gold)}nav.toc details[open] summary::after{content:"-"}nav.toc details[open] summary{margin-bottom:6px}.zoom-hint{opacity:1}.shot--narrow{grid-template-columns:1fr}.shot--narrow .pic{max-width:300px}}
@media (max-width:700px){.mfa-grid{grid-template-columns:1fr 1fr}.flow-steps{grid-template-columns:1fr 1fr}.flow-step:nth-child(2)::after{display:none}}
@media (max-width:420px){.mfa-grid{grid-template-columns:1fr}.flow-steps{grid-template-columns:1fr}.flow-step::after{display:none}}
</style>

<header class="hero">
  <div class="hero-in">
    <div>
      <p class="eyebrow">3S Group &middot; Website admin</p>
      <h1>How to use <em>3S Admin</em> for ${site.name}</h1>
      <p class="intro">${site.intro}</p>
    </div>
    <div class="facts">
      <div class="fact"><span>Admin address</span><b>3sgroupadmin.com</b></div>
      <div class="fact"><span>Login</span><b>cfo@3sgroup.co.in</b></div>
      <div class="fact"><span>Website it updates</span><b>${site.domain}</b></div>
      <div class="fact"><span>Changes go live</span><b>${site.goesLive}</b></div>
    </div>
  </div>
</header>

<div class="flow"><div class="flow-card">
  <h2>How a change reaches the website</h2>
  <p>Every update follows the same four steps.</p>
  <div class="flow-steps">
    <div class="flow-step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><b>1. Sign in</b><p>Password plus the 6-digit code from your phone.</p></div>
    <div class="flow-step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg><b>2. Edit and Save</b><p>Open a section, change it, press Save.</p></div>
    <div class="flow-step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg><b>3. Publish</b><p>Dashboard &rarr; Publish to website.</p></div>
    <div class="flow-step live"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/></svg><b>4. Live</b><p>${site.liveStep}</p></div>
  </div>
</div></div>

<div class="layout">
  <nav class="toc" aria-label="Contents"><details open><summary>Contents</summary>${toc}<div class="toc-group"><p>Help</p><a href="#hide-delete">Hide or delete?</a><a href="#faq">Questions</a></div></details></nav>
  <main>
${sections
  .map(
    (s) => `<section id="${s.id}">
  <p class="group-label">${s.group}</p>
  <h2 class="title">${s.title}</h2>
  <p class="lead">${s.lead}</p>
  ${s.body()}
</section>`,
  )
  .join('\n')}
<section id="hide-delete">
  <p class="group-label">Help</p>
  <h2 class="title">Hide or delete?</h2>
  <p class="lead">Most items can be hidden or deleted. When in doubt, hide.</p>
  <div class="compare">
    <div><b>Hide</b> (eye icon)<ul><li>Disappears from the website after Publish.</li><li>Stays in the admin, greyed out.</li><li>Bring it back any time with one click.</li></ul></div>
    <div><b>Delete permanently</b> (bin icon)<ul><li>Removed from the admin and the website.</li><li>Cannot be undone.</li><li>Use for mistakes and old items nobody needs.</li></ul></div>
  </div>
</section>
<section id="faq">
  <p class="group-label">Help</p>
  <h2 class="title">Common questions</h2>
  ${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
</section>
  </main>
</div>
<footer>3S Admin guide for ${site.name}. Screens marked "Example data" use sample entries to show the layout; your admin shows your real enquiries and visitor numbers.</footer>
<div class="progress" aria-hidden="true"></div>
<button type="button" class="to-top" aria-label="Back to top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg></button>
<div class="lightbox" hidden role="dialog" aria-modal="true" aria-label="Enlarged screenshot">
  <div class="lightbox-bar"><p></p><button type="button">Close</button></div>
  <div class="lightbox-stage"></div>
</div>
<script>
(() => {
  const toc = document.querySelector('nav.toc details');
  const wide = matchMedia('(min-width: 901px)');
  const fit = () => { toc.open = wide.matches; };
  fit(); wide.addEventListener('change', fit);
  // On phones, picking a section folds the contents away.
  toc.addEventListener('click', (e) => { if (e.target.closest('a') && !wide.matches) toc.open = false; });
  // In-page links scroll here themselves. Inside the admin this page is a frame with no address of its own, where a plain "#section" link would try to open the admin's own page in it.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)))?.scrollIntoView();
  });

  // Highlight the section being read: the last one whose top has passed a third of the screen.
  const links = [...document.querySelectorAll('nav.toc a')];
  const targets = links.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
  let current = null;
  const spy = () => {
    let index = 0;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= innerHeight / 3) index = i; });
    if (current === index) return;
    current = index;
    links.forEach((a, i) => a.classList.toggle('active', i === index));
    // Keep it visible inside the rail only - never move the page itself.
    const nav = document.querySelector('nav.toc'); const link = links[index];
    if (wide.matches && (link.offsetTop < nav.scrollTop || link.offsetTop > nav.scrollTop + nav.clientHeight - link.offsetHeight)) nav.scrollTop = link.offsetTop - nav.clientHeight / 2;
  };
  // Reading progress and back-to-top.
  const bar = document.querySelector('.progress');
  const up = document.querySelector('.to-top');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    up.classList.toggle('show', scrollY > 900);
  };
  addEventListener('scroll', () => { onScroll(); spy(); }, { passive: true }); onScroll(); spy();
  up.addEventListener('click', () => scrollTo({ top: 0 }));

  // Screenshots open full size, with their numbered marks.
  const box = document.querySelector('.lightbox');
  const stage = box.querySelector('.lightbox-stage');
  const title = box.querySelector('.lightbox-bar p');
  let opener = null;
  const close = () => { box.hidden = true; stage.textContent = ''; document.body.classList.remove('locked'); opener?.focus(); };
  document.querySelectorAll('button.pic').forEach((pic) => pic.addEventListener('click', () => {
    if (pic.closest('.lightbox')) return;
    opener = pic;
    const copy = pic.cloneNode(true);
    copy.setAttribute('tabindex', '-1');
    copy.querySelector('.zoom-hint')?.remove();
    stage.replaceChildren(copy);
    title.textContent = pic.querySelector('img').alt;
    box.hidden = false; document.body.classList.add('locked');
    box.querySelector('.lightbox-bar button').focus();
  }));
  box.querySelector('.lightbox-bar button').addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box || e.target === stage) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) close(); });
})();
</script>
</body>
</html>
`;

const shared = html
  .replaceAll('<b>cfo@3sgroup.co.in</b>', '<b>the admin email shared with you</b>')
  .replaceAll('cfo@3sgroup.co.in', 'the admin email');
if (shared.includes('@3sgroup.co.in')) throw new Error('login email left in the page');
mkdirSync(path.join(dir, 'dist'), { recursive: true });
writeFileSync(path.join(dir, 'dist', site.distFile), shared);
console.log(`dist/${site.distFile}`, Buffer.byteLength(shared));

// The admin shows the same page under "Guide" in its menu, from its own static
// files. Its security policy allows only its own scripts and fonts, so that copy
// gets a guide.js and local font files instead of an inline script and Google Fonts.
const adminPublic = path.join(dir, '..', '..', 'admin', 'public');
const fontDir = path.join(adminPublic, 'guide-fonts');
mkdirSync(fontDir, { recursive: true });
const latin = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const latinExt = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
// The admin already ships these two variable fonts; the guide reuses them.
const fontFaces = [
  ['Fraunces', 'fraunces', 'latin', latin],
  ['Fraunces', 'fraunces', 'latin-ext', latinExt],
  ['Inter', 'inter', 'latin', latin],
  ['Inter', 'inter', 'latin-ext', latinExt],
]
  .map(([family, pkg, subset, range]) => {
    const file = `${pkg}-${subset}.woff2`;
    copyFileSync(path.join(dir, '..', '..', 'node_modules', '@fontsource-variable', pkg, 'files', `${pkg}-${subset}-wght-normal.woff2`), path.join(fontDir, file));
    return `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:100 900;src:url(/guide-fonts/${file}) format('woff2');unicode-range:${range}}`;
  })
  .join('\n');
const script = shared.match(/<script>([\s\S]*?)<\/script>/);
if (!script) throw new Error('guide script not found');
writeFileSync(path.join(adminPublic, 'guide.js'), script[1]);
const forAdmin = shared
  .replace(/<link rel="preconnect"[^\n]*\n<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^\n]*\n/, '')
  .replace('<style>', `<style>\n${fontFaces}`)
  .replace(script[0], '<script src="/guide.js"></script>');
if (forAdmin.includes('googleapis') || forAdmin.includes('<script>')) throw new Error('admin guide still needs outside resources');
writeFileSync(path.join(adminPublic, site.adminFile), forAdmin);
console.log(`admin/public/${site.adminFile}, guide.js, guide-fonts/`);
