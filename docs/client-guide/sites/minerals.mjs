// 3S Minerals - the guide's page text, and the screenshots it uses
// (sites/minerals/img, callouts.json; taken by capture/capture.mjs).
// Built by: node docs/client-guide/build.mjs minerals

const main = 'main';
const sidebar = 'aside';

export default {
  name: '3S Minerals',
  domain: '3sminerals.co.in',
  description: 'How to use 3S Admin to update 3sminerals.co.in.',
  intro:
    '3S Admin lets the 3S Minerals team update 3sminerals.co.in without a developer: contact details, photos, products, the plant process, ESG, annual reports, career openings and more - and read the enquiries the website receives. This guide walks through every screen with pictures.',
  goesLive: 'About 10 seconds after Publish',
  liveStep: 'Refresh 3sminerals.co.in after about 10 seconds.',
  distFile: 'minerals.html',
  adminFile: 'guide-minerals.html',

  /** Screens, and the parts each numbered mark points at, in legend order. */
  shots: [
    {
      id: 'picker',
      path: '/',
      height: 860,
      marks: [{ css: 'a[href="/minerals"]' }, { css: 'a[href="/globalgreens"]' }, { text: 'Sign out' }],
    },
    {
      id: 'dashboard',
      path: '/minerals',
      height: 900,
      marks: [
        { text: 'Publish to website' },
        { css: `${main} a[href="/minerals/leads"]` },
        { css: `${main} a[href="/minerals/contact-details"]` },
        { css: `${sidebar} a[title="All websites"]` },
      ],
    },
    {
      id: 'sidebar',
      path: '/minerals',
      height: 1720,
      width: 1440,
      element: { css: sidebar },
      marks: [
        { css: `${sidebar} a[href="/minerals"]` },
        { css: `${sidebar} a[href="/minerals/leads"]` },
        { css: `${sidebar} a[href="/minerals/analytics"]` },
        { css: `${sidebar} a[href="/minerals/contact-details"]` },
        { css: `${sidebar} a[href="/minerals/home-banner"]` },
        { css: `${sidebar} a[href="/minerals/annual-reports"]` },
        { css: `${sidebar} a[href="/minerals/activity"]` },
        { css: `${sidebar} a[href="/minerals/guide"]` },
      ],
    },
    {
      id: 'contact',
      path: '/minerals/contact-details',
      height: 900,
      marks: [{ label: 'Phone number' }, { label: 'Main email' }, { label: 'HR / careers email' }, { text: 'Save' }],
    },
    {
      id: 'map',
      path: '/minerals/contact-details',
      height: 900,
      scrollTo: { label: 'Plant - state' },
      marks: [{ label: 'Plant - map location' }, { label: 'LinkedIn page' }],
    },
    {
      id: 'banner',
      path: '/minerals/home-banner',
      height: 900,
      marks: [{ label: 'Badge' }, { label: 'Headline - line 2 (gold)' }, { label: '"Watch Our Story" video' }, { text: 'Save' }],
    },
    {
      id: 'slides',
      path: '/minerals/home-slides',
      height: 760,
      marks: [{ text: 'Add' }, { aria: 'Move Rock Phosphate Processing Facility 2 up' }, { aria: 'Hide Rock Phosphate Processing Facility 1' }, { aria: 'Delete Rock Phosphate Processing Facility 1' }, { text: 'Rock Phosphate Processing Facility 3' }],
    },
    {
      id: 'stats',
      path: '/minerals/home-stats',
      height: 760,
      marks: [{ label: 'Number to show' }, { label: 'Caption' }, { text: 'Add another' }],
    },
    {
      id: 'about',
      path: '/minerals/about',
      height: 900,
      scrollTo: { label: 'Paragraphs' },
      marks: [{ label: 'Paragraphs' }, { label: 'Key points (with ticks)' }],
    },
    {
      id: 'report',
      path: '/minerals/annual-reports/fy-2025-2026',
      height: 640,
      marks: [{ label: 'Financial year' }, { text: 'Upload a PDF' }, { text: 'Published' }, { text: 'Save' }],
    },
    {
      id: 'openings',
      path: '/minerals/career-openings',
      height: 700,
      marks: [{ text: 'Add' }, { aria: 'Hide Plant Operators' }],
    },
    {
      id: 'leads',
      path: '/minerals/leads',
      height: 760,
      marks: [{ text: 'Contact Enquiries' }, { text: 'Vendor Enquiries' }, { text: 'Export to Excel' }, { aria: 'Search submissions' }, { css: 'main ul li button' }],
    },
    {
      id: 'lead-detail',
      path: '/minerals/leads',
      height: 860,
      prepare: async (page) => {
        await page.click('main ul li:nth-child(2) button');
      },
      marks: [{ css: '[role="dialog"] a[href^="tel:"]' }, { css: '[role="dialog"] a[href^="mailto:"]' }, { text: 'Following up' }, { text: 'Save note' }],
    },
    {
      id: 'analytics',
      path: '/minerals/analytics',
      height: 520,
      marks: [],
    },
  ],

  content: ({ figure, steps, tip }) => {
    const sections = [
      {
        id: 'sign-in',
        group: 'Getting started',
        title: 'Signing in',
        lead: 'Open <b>3sgroupadmin.com</b> in any browser - computer or phone. Use the admin login shared with you.',
        body: () =>
          figure('signin', ['Your email: <b>cfo@3sgroup.co.in</b>.', 'Your password.', 'Press <b>Continue</b>. You will then be asked for the 6-digit code from your authenticator app.', '<b>Forgot password?</b> sends a reset code to the cfo@3sgroup.co.in inbox.'], {
            caption: 'The sign-in screen at 3sgroupadmin.com',
          }) +
          tip('The 6-digit code', 'Every sign-in asks for the code from the authenticator app on your phone (Google or Microsoft Authenticator). The first time, the admin shows a QR code to scan with the app.', 'info') +
          tip('You are signed out automatically', 'Closing the browser signs you out, and so do 2 hours without any activity. Just sign in again - saved work is safe.', 'info'),
      },
      {
        id: 'websites',
        group: 'Getting started',
        title: 'Choosing the website',
        lead: 'After signing in you see every 3S Group website your login can edit.',
        body: () =>
          figure('picker', ['<b>3S Minerals</b> - click the card to open its admin.', 'Other 3S Group websites. You can switch between them any time.', '<b>Sign out</b> when you are done on a shared computer.'], {
            caption: 'The website picker',
          }),
      },
      {
        id: 'dashboard',
        group: 'Getting started',
        title: 'The dashboard and the Publish button',
        lead: 'The dashboard is the home of the website: everything you can edit, new enquiries, and recent changes.',
        body: () =>
          figure('dashboard', [
            '<b>Publish to website</b> - sends everything you have saved to 3sminerals.co.in. Visitors see it within about 10 seconds.',
            'New contact and vendor enquiries from the website, with the count of new ones.',
            'Each tile is a section you can edit. Click one to open it. The number is how many items it holds.',
            'Switch to another 3S Group website.',
          ], { caption: 'Dashboard of 3S Minerals' }) +
          tip('Save, then Publish', '<b>Save</b> keeps your change in the admin. <b>Publish to website</b> puts all saved changes on 3sminerals.co.in. You can save many changes and publish once at the end.', 'key'),
      },
      {
        id: 'menu',
        group: 'Getting started',
        title: 'Finding your way around',
        lead: 'The menu on the left lists every part of the website, grouped the way the website is: Company, Home Page, About & Process, Products, ESG, Investor Relations, Careers and Vendors. On a phone, open it with the menu button at the top.',
        body: () =>
          figure(
            'sidebar',
            [
              '<b>Dashboard</b> - the overview and the Publish button.',
              '<b>Feedback &amp; Leads</b> - enquiries sent from the website. The orange badge counts new ones.',
              '<b>Analytics</b> - website visitor numbers (switched on by the 3S Group team).',
              '<b>Contact Details</b> - phone, emails, addresses and map pins used across the site.',
              '<b>Home Page</b> - the big banner at the top: headline, photos, numbers and video.',
              '<b>Investor Relations</b> - annual reports, corporate details and compliance text.',
              '<b>Activity log</b> - every change made in the admin, newest first.',
              '<b>Guide</b> - this guide, inside the admin.',
            ],
            { narrow: true, caption: 'The menu' },
          ) +
          `<div class="table-wrap"><table>
            <thead><tr><th>Menu item</th><th>Where it shows on 3sminerals.co.in</th></tr></thead>
            <tbody>
              <tr><td>Contact Details</td><td>Contact section (addresses, map, emails, visiting hours), career section (HR email), footer (description, LinkedIn)</td></tr>
              <tr><td>Home Banner Text / Photos / Numbers</td><td>The big picture at the top of the home page</td></tr>
              <tr><td>About Us, About Us Highlights</td><td>"About Our Company"</td></tr>
              <tr><td>Manufacturing Facility, Plant Stages, Process Steps</td><td>"Our Manufacturing Facility" and "From Ore to Product"</td></tr>
              <tr><td>Why Choose Us, Industries We Serve</td><td>"The 3S Advantage"</td></tr>
              <tr><td>Products Introduction, Products, Product Applications, Plant Capacity</td><td>"Products &amp; Services"</td></tr>
              <tr><td>ESG Commitment, Environmental Practices</td><td>"Our ESG Commitment"</td></tr>
              <tr><td>Investor Relations Text, Annual Reports, Corporate Details</td><td>"Investor Relations"</td></tr>
              <tr><td>Career Openings, Why Work With Us</td><td>"Build Your Career With Us" and the application form</td></tr>
              <tr><td>Vendor Empanelment, Vendor Requirements, Supply Types</td><td>"Vendor Empanelment" and the Vendor Enquiry page</td></tr>
            </tbody>
          </table></div>`,
      },
      {
        id: 'contact',
        group: 'Everyday tasks',
        title: 'Contact details, addresses and maps',
        lead: 'Phone, emails, both addresses, the map pins and visiting hours - used across the whole website.',
        body: () =>
          figure('contact', [
            '<b>Phone number</b> - shown as a card in the Contact section. Leave it empty to show no phone number (as now).',
            'The email visitors are given for enquiries.',
            'The HR email shown under the career form.',
            '<b>Save</b>, then Publish.',
          ], { caption: 'Contact Details' }) +
          figure('map', [
            '<b>Map location</b> - open the place in Google Maps, copy the link from the address bar and paste it here. Typing the latitude and longitude (24.44723, 73.87068) also works. Leave it empty to hide that map.',
            '<b>LinkedIn page</b> - the full link. Leave it empty to hide the LinkedIn button in the footer.',
          ], { caption: 'Map pins and LinkedIn, further down the same page' }) +
          tip('Check before saving', 'A wrong email or address here changes it everywhere on the website.', 'warn'),
      },
      {
        id: 'home',
        group: 'Everyday tasks',
        title: 'The home page banner',
        lead: 'Three small sections control the big picture visitors see first.',
        body: () =>
          figure('banner', [
            '<b>Badge</b> - the small line above the headline.',
            'The headline is three lines; the middle one is shown in gold.',
            '<b>"Watch Our Story" video</b> - upload an MP4. A video under 25 MB plays quickly on phones.',
            '<b>Save</b>, then Publish.',
          ], { caption: 'Home Banner Text' }) +
          figure('slides', [
            '<b>Add</b> a photo. Wide landscape photos work best.',
            'Move a photo up or down - the slides follow this order.',
            '<b>Hide</b> a photo without deleting it.',
            '<b>Delete</b> a photo for good.',
            'Click a photo to change the picture or its description.',
          ], { caption: 'Home Banner Photos - they change every 5 seconds' }) +
          figure('stats', [
            '<b>Number to show</b> - start with the number, e.g. <i>10 Lakh</i> or <i>+30%</i>. It counts up when the page opens.',
            '<b>Caption</b> under the number.',
            '<b>Add another</b> number. Up to four look best.',
          ], { caption: 'Home Banner Numbers' }),
      },
      {
        id: 'text',
        group: 'Everyday tasks',
        title: 'Paragraphs, lists and bold words',
        lead: 'Some fields hold several lines - paragraphs or bullet points. Each line becomes its own paragraph or point on the website.',
        body: () =>
          figure('about', [
            '<b>Paragraphs</b> - one paragraph per line. Press Enter to start a new paragraph. Wrap words in <b>**double stars**</b> to show them in bold, e.g. <i>our **zero new mining** approach</i>.',
            '<b>Key points</b> - one point per line; each gets a tick on the website.',
          ], { caption: 'About Us' }) +
          tip('Lists everywhere', 'The same "one per line" boxes are used for plant stage labels, ESG points, statutory laws, vendor steps and benefits.', 'info'),
      },
      {
        id: 'sections',
        group: 'Everyday tasks',
        title: 'Products, process, ESG, vendors',
        lead: 'These sections all work the same way: a list you can add to, reorder, hide and delete from - or a single form you edit and save.',
        body: () =>
          `<div class="table-wrap"><table>
            <thead><tr><th>Section</th><th>What you edit</th></tr></thead>
            <tbody>
              <tr><td>Products</td><td>Each product grade gets its own large card: grade (e.g. +30%), compound, name, specification, what it is used for, and whether it shows the "Premium" badge.</td></tr>
              <tr><td>Plant Stages</td><td>The photo cards of the plant: photo, title and short labels.</td></tr>
              <tr><td>Process Steps</td><td>The numbered "From Ore to Product" steps, each with an icon. Reorder to renumber.</td></tr>
              <tr><td>About Us Highlights, Why Choose Us, Environmental Practices, Why Work With Us, Vendor Requirements</td><td>Cards with a title, a line of text and an icon you pick from a list.</td></tr>
              <tr><td>Supply Types</td><td>The choices on the vendor form. "Other (please specify)" is always offered last.</td></tr>
            </tbody>
          </table></div>` +
          steps([
            'Open the section in the menu.',
            'Click an item to change it, or <b>Add</b> for a new one.',
            'Use the arrows to change the order on the website.',
            'Click <b>Save</b>, then <b>Publish to website</b> on the dashboard.',
          ]),
      },
      {
        id: 'investors',
        group: 'Everyday tasks',
        title: 'Annual reports',
        lead: 'One row per financial year, each with its report as a PDF. Visitors pick a year in Investor Relations and download the report. The year picker appears on the website once at least one report is published.',
        body: () =>
          figure('report', [
            '<b>Financial year</b>, e.g. 2025-2026.',
            '<b>Upload a PDF</b> of the report (up to 20 MB).',
            'Tick <b>Published</b> to show this year on the website.',
            '<b>Save</b>, then Publish.',
          ], { caption: 'One annual report' }) +
          tip('The years already listed', 'The four years that came from the old website all pointed at the same sample PDF, so they start hidden. Upload each real report and tick Published.', 'warn'),
      },
      {
        id: 'careers',
        group: 'Everyday tasks',
        title: 'Career openings',
        lead: 'The openings listed in "Current Opportunities". The same list is offered in the "Position Applied For" choice on the application form.',
        body: () =>
          figure('openings', ['<b>Add</b> an opening.', '<b>Hide</b> one that is filled - bring it back any time.'], { caption: 'Career Openings' }) +
          tip('Applications', 'Career applications (with the resume) are emailed to the HR team as before; they do not appear under Leads.', 'info'),
      },
      {
        id: 'leads',
        group: 'Enquiries and reports',
        title: 'Feedback & Leads',
        lead: 'Everything visitors send from the website\'s Contact form ("Send us a Message") and the Vendor Enquiry page.',
        body: () =>
          figure('leads', [
            '<b>Contact Enquiries</b> - from the Contact section.',
            '<b>Vendor Enquiries</b> - from vendors and suppliers.',
            '<b>Export to Excel</b> downloads the list as a spreadsheet.',
            'Search, and filter by status or date.',
            'Click an entry to open it.',
          ], { caption: 'Feedback & Leads', sample: true }) +
          figure('lead-detail', [
            '<b>Call</b> the person straight from here (or message them on <b>WhatsApp</b>, next to it).',
            '<b>Email</b> them.',
            'Mark the follow-up: <b>New</b>, <b>Following up</b> or <b>Done</b>.',
            'Write a note for the team, then <b>Save note</b>.',
          ], { caption: 'One enquiry, opened', sample: true }),
      },
      {
        id: 'analytics',
        group: 'Enquiries and reports',
        title: 'Analytics',
        lead: 'Visitor numbers from Google Analytics. For 3S Minerals this is not switched on yet - the 3S Group team connects it, and the numbers then appear here.',
        body: () => figure('analytics', [], { caption: 'Analytics, before it is switched on' }),
      },
      {
        id: 'activity',
        group: 'Enquiries and reports',
        title: 'Activity log',
        lead: 'A record of every change made in the admin - what was changed, in which section, and when. It cannot be edited, so it is a reliable history. Open it from the menu.',
        body: () => '',
      },
    ];

    const faq = [
      ['I saved a change but the website still shows the old one.', 'Press <b>Publish to website</b> on the dashboard, wait about 10 seconds and refresh the website. Saving alone does not change the live website.'],
      ['I forgot the password.', 'On the sign-in screen click <b>Forgot password?</b>. A code is emailed to the admin inbox. Enter it and choose a new password.'],
      ['The phone with the authenticator app was lost or changed.', 'Contact the 3S Group web team. They can reset the authenticator so you can scan a new QR code.'],
      ['A photo will not upload.', 'Photos must be JPG, PNG, WEBP or GIF and under 10 MB. Large phone photos can be sent to yourself on WhatsApp first, which makes them smaller.'],
      ['The map shows the wrong place.', 'Open the place in Google Maps, drop a pin on it, copy the link from the address bar and paste it into the map location field. Save and Publish.'],
      ['Words show with ** around them.', 'Bold needs a pair of double stars: one before the words and one after. Check that each ** has its partner.'],
      ['I deleted something by mistake.', 'If you chose <b>Just hide it</b>, open the item and tick Published again. A permanent delete cannot be undone - add the item again.'],
    ];

    return { sections, faq };
  },
};
