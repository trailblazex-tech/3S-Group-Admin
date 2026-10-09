// Builds index.html for the 3S Admin client guide from the screenshots and
// the callout positions the capture script recorded.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const shots = JSON.parse(readFileSync(path.join(dir, 'callouts.json'), 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// One self-contained file: the screenshots travel inside it.
const imageData = (id) => `data:image/webp;base64,${readFileSync(path.join(dir, 'img', `${id}.webp`)).toString('base64')}`;

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

const sections = [
  {
    id: 'sign-in',
    group: 'Getting started',
    title: 'Signing in',
    lead: 'Open <b>3sgroupadmin.com</b> in any browser - computer or phone. There is one login for the admin.',
    body: () =>
      figure('signin', ['Your email: <b>cfo@3sgroup.co.in</b>.', 'Your password.', 'Press <b>Continue</b>. You will then be asked for the 6-digit code from your authenticator app.', '<b>Forgot password?</b> sends a reset code to the cfo@3sgroup.co.in inbox.'], {
        caption: 'The sign-in screen at 3sgroupadmin.com',
      }) +
      `<div class="mfa">
        <h3>The first sign-in: set up the authenticator app</h3>
        <p>The admin asks for a second, 6-digit code every time you sign in. It comes from a free app on your phone, so nobody can get in with the password alone.</p>
        <div class="mfa-grid">
          <div><span class="chip">1</span><b>Install the app</b><p>Google Authenticator or Microsoft Authenticator, from the Play Store or App Store.</p></div>
          <div><span class="chip">2</span><b>Scan the QR code</b><p>After your password, the admin shows a QR code once. In the app tap <i>+</i> and scan it.</p></div>
          <div><span class="chip">3</span><b>Type the code</b><p>The app now shows a 6-digit code that changes every 30 seconds. Type it in to finish.</p></div>
          <div><span class="chip">4</span><b>Every time after</b><p>Email, password, then the current code from the app. That's it.</p></div>
        </div>
      </div>` +
      tip('Sharing the login', 'If two people will use the admin, scan the same QR code on both phones during that first setup - the QR code is shown only once.') +
      tip('You are signed out automatically', 'Closing the browser signs you out, and so do 2 hours without any activity. This keeps the admin safe on shared or office computers. Just sign in again.', 'info'),
  },
  {
    id: 'websites',
    group: 'Getting started',
    title: 'Choosing the website',
    lead: 'After signing in you see every 3S Group website. Today The Konark Academy is connected; the others will appear here as they join.',
    body: () =>
      figure('picker', ['<b>The Konark Academy</b> - click the card to open its admin.', 'Websites marked <b>Coming soon</b> are not connected yet.', '<b>Sign out</b> when you are done on a shared computer.'], {
        caption: 'The website picker',
      }),
  },
  {
    id: 'dashboard',
    group: 'Getting started',
    title: 'The dashboard and the Publish button',
    lead: 'The dashboard is the home of each website: everything you can edit, new enquiries, and recent changes.',
    body: () =>
      figure('dashboard', [
        '<b>Publish to website</b> - sends everything you have saved to the live website. Visitors see it within about 10 seconds.',
        'New feedback and admission enquiries from the website, with the count of new ones.',
        'Each tile is a section you can edit. Click one to open it. The number is how many items it holds.',
        'Switch between 3S Group websites from here.',
      ], { caption: 'Dashboard of The Konark Academy' }) +
      tip('Save, then Publish', '<b>Save</b> keeps your change in the admin. <b>Publish to website</b> puts all saved changes on thekonarkacademy.com. You can save many changes and publish once at the end.', 'key'),
  },
  {
    id: 'menu',
    group: 'Getting started',
    title: 'Finding your way around',
    lead: 'The menu on the left lists every part of the website. On a phone, open it with the menu button at the top.',
    body: () =>
      figure(
        'sidebar',
        [
          '<b>Dashboard</b> - the overview and the Publish button.',
          '<b>Feedback &amp; Leads</b> - forms sent by parents and visitors. The orange badge counts new ones.',
          '<b>Analytics</b> - who visits the website and what they do.',
          '<b>Content</b> - staff, wings, photos, news, achievements, homepage, contact details, videos, greetings.',
          '<b>CBSE Disclosure</b> - the mandatory disclosure page: school information, documents, academic and staff details, infrastructure. Fees and Career sections follow below it.',
          '<b>Activity log</b> - every change made in the admin, newest first.',
          '<b>View live website</b> - opens thekonarkacademy.com in a new tab.',
          '<b>Sign out</b>.',
        ],
        { narrow: true, caption: 'The menu' },
      ),
  },
  {
    id: 'staff',
    group: 'Everyday tasks',
    title: 'Staff Directory',
    lead: 'Teachers, office staff and leadership shown on the website. Teaching staff appear on the Teaching Staff page, grouped by wing.',
    body: () =>
      figure('staff-list', [
        '<b>Add</b> a new person.',
        '<b>Search</b> by name or designation.',
        '<b>Filter</b>: Teaching Staff, Office &amp; Administrative, or Leadership.',
        '<b>Move up / down</b> - changes the order on the website.',
        '<b>Hide</b> (eye icon) - takes the person off the website but keeps them in the admin. Click again to show.',
        '<b>Delete</b> - removes for good. You will be offered "Just hide it" instead.',
        'Click a name to edit that person.',
      ], { caption: 'Staff Directory list' }) +
      `<h3 class="sub">Add a new teacher</h3>` +
      steps([
        'Open <b>Staff Directory</b> and click <b>Add</b>.',
        'Type the <b>Full name</b> (e.g. Ms. Priya Sharma) and <b>Designation</b> (e.g. PRT Teacher).',
        'Set <b>Directory</b> to <b>Teaching Staff</b> and pick the <b>Wing / Department</b>.',
        'Click <b>Upload a photo</b> and choose the photo from your computer or phone.',
        'Click <b>Save</b>, then <b>Publish to website</b> on the dashboard.',
      ]) +
      figure('staff-edit', ['Name as it should appear on the website.', '<b>Wing / Department</b> - the wing on the Teaching Staff page. Choose <i>Something new...</i> to type a new wing; it is created for you.', '<b>Upload a photo</b> - JPG, PNG or WEBP, up to 10 MB. A portrait photo looks best.', '<b>Save</b>.', '<b>Delete</b> this person.'], {
        caption: 'Editing a staff member',
      }) +
      tip('Photos', 'Use a clear, upright portrait with the face near the top. Photos from a phone are fine.'),
  },
  {
    id: 'wings',
    group: 'Everyday tasks',
    title: 'Teaching Wings',
    lead: 'The sections of the Teaching Staff page: Primary Wing, Middle Wing, Senior Wing, Sports Wing and so on.',
    body: () =>
      figure('wings', ['<b>Add</b> a new wing.', 'Click a wing to rename it, change its small heading or icon, or hide it.'], { caption: 'Teaching Wings' }) +
      figure('wing-edit', ['<b>Wing name</b> - the heading on the website. Renaming a wing moves all its teachers with it.', '<b>Small heading</b> - the line above the name, e.g. "Fitness &amp; Discipline".', '<b>Icon</b> shown next to the wing.'], {
        caption: 'Editing a wing',
      }) +
      tip('A wing with teachers cannot be deleted', 'Move its teachers to another wing first (in Staff Directory), then hide or delete the wing. This way no teacher disappears from the website by accident.', 'info') +
      tip('Order', 'The order of wings in this list is the order on the website. Use the up/down arrows to change it.'),
  },
  {
    id: 'gallery',
    group: 'Everyday tasks',
    title: 'Photo Gallery, News, Achievements and Videos',
    lead: 'These sections all work the same way: a list you can search, filter, reorder, hide and add to.',
    body: () =>
      figure('gallery', ['<b>Add</b> a photo: give it a title, upload it, and pick a category.', '<b>Filter</b> by category, e.g. Sports Day or Annual Function.', 'Hide a photo without deleting it.'], { caption: 'Photo Gallery' }) +
      `<div class="table-wrap"><table>
        <thead><tr><th>Section</th><th>What you add</th><th>Where it shows on the website</th></tr></thead>
        <tbody>
          <tr><td>Photo Gallery</td><td>Title, photo, category. Type a new category to create it.</td><td>Gallery page, with category filters</td></tr>
          <tr><td>News &amp; Events</td><td>Headline, month (e.g. August 2026), newspaper clipping image</td><td>News &amp; Events page, grouped by month</td></tr>
          <tr><td>Achievements</td><td>Title, photo, short photo description, category</td><td>Achievements page</td></tr>
          <tr><td>Video Gallery</td><td>Title, YouTube link, category</td><td>Video gallery</td></tr>
        </tbody>
      </table></div>`,
  },
  {
    id: 'homepage',
    group: 'Everyday tasks',
    title: 'The homepage: announcement and highlights',
    lead: 'Two small sections control what visitors see first on the homepage.',
    body: () =>
      figure('announcement', ['<b>Announcement</b> - one short line shown above the main headline, e.g. "Registration Open for Classes Nursery to IX &amp; XI".', 'The same line in Hindi, shown when a visitor switches the website to Hindi.', 'Optional link - makes the line clickable, e.g. /admissions/guidelines.', 'Untick to hide the line.', '<b>Save</b>.'], {
        caption: 'Homepage Announcement',
      }) +
      figure('highlights', ['<b>Add another</b> tile (up to four show).', '<b>Caption</b> under the number, e.g. "Students".', '<b>Number to show</b>, e.g. 800+.', 'The <b>icon</b> above the number.', 'Change the order of the tiles.'], { caption: 'Homepage Highlights - the number tiles on the homepage picture' }),
  },
  {
    id: 'greetings',
    group: 'Everyday tasks',
    title: 'Event Greetings (pop-ups)',
    lead: 'A pop-up on the website for a festival, a national day, an exam notice or admissions. Each one shows only between the start and end dates you choose.',
    body: () =>
      figure('greetings', ['Pick an occasion - the headline, message, banner and dates are filled in for you. Or start from a blank form for your own notice.'], { caption: 'Choosing a ready-made greeting' }) +
      steps([
        'Open <b>Event Greetings</b> and click <b>Add</b>.',
        'Pick an occasion (Diwali, Independence Day, Sports Day...) or <b>Start from a blank form</b>.',
        'Check the wording, choose a banner, and set <b>Show from</b> and <b>Show until</b>.',
        'Use <b>Preview</b> to see the pop-up as visitors will, then <b>Save</b> and <b>Publish</b>.',
      ]) +
      tip('It switches itself off', 'After the end date the pop-up stops showing by itself. You don\'t need to delete it.', 'info'),
  },
  {
    id: 'contact',
    group: 'Everyday tasks',
    title: 'Contact details and office hours',
    lead: 'Phone numbers, WhatsApp, emails, address and office timings used across the whole website.',
    body: () =>
      figure('contact', ['Phone numbers shown in the header, footer and contact page.', 'The <b>WhatsApp number</b> behind the WhatsApp buttons.', '<b>Save</b>, then Publish.'], { caption: 'Contact & Office Hours' }) +
      tip('Check before saving', 'A wrong number here changes it everywhere on the website. Type numbers exactly as they should be dialled.', 'warn'),
  },
  {
    id: 'cbse',
    group: 'Everyday tasks',
    title: 'CBSE Mandatory Disclosure',
    lead: 'The disclosure page CBSE requires. Its rows are fixed by CBSE: you update the values and upload documents, but don\'t add or remove rows.',
    body: () =>
      figure('cbse-doc', ['<b>Upload a PDF</b> of the document (up to 20 MB). Until a file is uploaded, the website shows the row as "Pending".', '<b>Save</b>, then Publish.'], { caption: 'Uploading a disclosure document' }) +
      tip('Staff numbers update themselves', 'The teacher counts on the disclosure page are worked out from the Staff Directory, so keep the directory up to date and the counts follow.', 'info'),
  },
  {
    id: 'leads',
    group: 'Enquiries and reports',
    title: 'Feedback & Leads',
    lead: 'Everything parents and visitors send from the website: admission enquiries and parent feedback. Enquiries are also emailed to the school as before.',
    body: () =>
      figure('leads', ['Switch between <b>Parent Feedback</b> and <b>Admission Enquiries</b>.', '<b>Export to Excel</b> downloads the list as a spreadsheet.', 'Search by name, phone, class or comment, and filter by status or date.', 'Click an entry to open it.'], { caption: 'Feedback & Leads', sample: true }) +
      figure('lead-detail', ['<b>Call</b> or <b>WhatsApp</b> the parent straight from here.', 'Mark the follow-up: <b>New</b>, <b>Contacted</b>, <b>Follow-up</b> or <b>Closed</b>.', 'Write an office note, e.g. "Called on 2 Oct, visiting Saturday", then <b>Save note</b>.', null], {
        caption: 'One enquiry, opened',
        sample: true,
      }),
  },
  {
    id: 'analytics',
    group: 'Enquiries and reports',
    title: 'Analytics',
    lead: 'How many people visit the website, which pages they read, where they come from and what they do - straight from Google Analytics.',
    body: () =>
      figure('analytics', ['Choose the period: Today, Yesterday, 7, 28 or 90 days, or <b>Custom</b> for any two dates.', '<b>Refresh</b> fetches the latest numbers.', '<b>Export</b> downloads the numbers as a spreadsheet.', 'Each tile compares with the same length of time just before.'], {
        caption: 'Analytics',
        sample: true,
      }) +
      `<div class="table-wrap"><table>
        <thead><tr><th>On the page</th><th>What it tells you</th></tr></thead>
        <tbody>
          <tr><td>Traffic over time</td><td>Page views, visitors or visits per day (hour by hour for Today and Yesterday). Hover for exact numbers.</td></tr>
          <tr><td>Admission interest journey</td><td>From visits to enquiries: how many visitors started a form, reached out on WhatsApp or phone, and sent an enquiry.</td></tr>
          <tr><td>How they found the website</td><td>Google search, typed the address, social media, links on other websites...</td></tr>
          <tr><td>Most viewed pages, Devices, Where visitors are</td><td>The popular pages, mobile vs computer, and the visitors' city, state or country.</td></tr>
          <tr><td>What visitors did</td><td>WhatsApp chats, phone taps, forms started, enquiries sent, parent login clicks.</td></tr>
        </tbody>
      </table></div>` +
      tip('Why today looks low', 'Google can take a few hours to count the latest visits, so today\'s numbers keep rising through the day.', 'info'),
  },
  {
    id: 'activity',
    group: 'Enquiries and reports',
    title: 'Activity log',
    lead: 'A record of every change made in the admin - what was changed, in which section, and when. It cannot be edited, so it is a reliable history.',
    body: () => figure('activity', ['Each line: who, what they did, which item, which section, and how long ago.'], { caption: 'Activity log' }),
  },
];

const faq = [
  ['I saved a change but the website still shows the old one.', 'Press <b>Publish to website</b> on the dashboard, wait about 10 seconds and refresh the website. Saving alone does not change the live website.'],
  ['I forgot the password.', 'On the sign-in screen click <b>Forgot password?</b>. A code is emailed to cfo@3sgroup.co.in. Enter it and choose a new password.'],
  ['The phone with the authenticator app was lost or changed.', 'Contact the 3S Group web team. They can reset the authenticator so you can scan a new QR code.'],
  ['A photo will not upload.', 'Photos must be JPG, PNG, WEBP or GIF and under 10 MB. Large phone photos can be sent to yourself on WhatsApp first, which makes them smaller.'],
  ['I cannot delete a wing.', 'A wing that still has teachers cannot be hidden or deleted. Move its teachers to another wing in Staff Directory first.'],
  ['I deleted something by mistake.', 'If you chose <b>Just hide it</b>, open the item and tick Published again. A permanent delete cannot be undone - add the item again.'],
  ['I was signed out.', 'This happens when the browser is closed or after 2 hours without activity. Sign in again; your saved work is safe.'],
];

const toc = [...new Set(sections.map((s) => s.group))]
  .map((group) => `<div class="toc-group"><p>${group}</p>${sections.filter((s) => s.group === group).map((s) => `<a href="#${s.id}">${s.title}</a>`).join('')}</div>`)
  .join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="How to use 3S Admin to update thekonarkacademy.com.">
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
      <h1>How to use <em>3S Admin</em> for The Konark Academy</h1>
      <p class="intro">3S Admin lets the school update thekonarkacademy.com without a developer: staff, photos, news, notices, fees, CBSE documents and more. This guide walks through every screen with pictures.</p>
    </div>
    <div class="facts">
      <div class="fact"><span>Admin address</span><b>3sgroupadmin.com</b></div>
      <div class="fact"><span>Login</span><b>cfo@3sgroup.co.in</b></div>
      <div class="fact"><span>Website it updates</span><b>thekonarkacademy.com</b></div>
      <div class="fact"><span>Changes go live</span><b>About 10 seconds after Publish</b></div>
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
    <div class="flow-step live"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/></svg><b>4. Live</b><p>Refresh thekonarkacademy.com after about 10 seconds.</p></div>
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
<footer>3S Admin guide for The Konark Academy. Screens marked "Example data" use sample entries to show the layout; your admin shows your real enquiries and visitor numbers.</footer>
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
writeFileSync(path.join(dir, 'dist', 'index.html'), shared);
console.log('dist/index.html', Buffer.byteLength(shared));
