// The Konark Academy - the guide's page text and screenshots (img/, callouts.json).
// Built by: node docs/client-guide/build.mjs konark

export default {
  name: 'The Konark Academy',
  domain: 'thekonarkacademy.com',
  description: 'How to use 3S Admin to update thekonarkacademy.com.',
  intro: '3S Admin lets the school update thekonarkacademy.com without a developer: staff, photos, news, notices, fees, CBSE documents and more. This guide walks through every screen with pictures.',
  goesLive: 'About 10 seconds after Publish',
  liveStep: 'Refresh thekonarkacademy.com after about 10 seconds.',
  /** Where the published copies go: docs dist/ and the admin's public/ folder. */
  distFile: 'index.html',
  adminFile: 'guide.html',
  content: ({ figure, steps, tip }) => {
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

    return { sections, faq };
  },
};
