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
    '3S Admin lets the 3S Minerals team update 3sminerals.co.in without a developer: contact details, photos, products, the plant process, ESG, investor details, career openings and more. This guide walks through every screen with pictures.',
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
        { css: `${sidebar} a[href="/minerals/contact-details"]` },
        { css: `${sidebar} a[href="/minerals/home-banner"]` },
        { css: `${sidebar} a[href="/minerals/investor-text"]` },
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
      id: 'openings',
      path: '/minerals/career-openings',
      height: 700,
      marks: [{ text: 'Add' }, { aria: 'Hide Plant Operators' }],
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
        lead: 'The dashboard is the home of the website: everything you can edit and recent changes.',
        body: () =>
          figure('dashboard', [
            '<b>Publish to website</b> - sends everything you have saved to 3sminerals.co.in. Visitors see it within about 10 seconds.',
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
              '<b>Contact Details</b> - phone, emails, addresses and map pins used across the site.',
              '<b>Home Page</b> - the big banner at the top: headline, photos, numbers and video.',
              '<b>Investor Relations</b> - corporate details and compliance text.',
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
              <tr><td>Investor Relations Text, Corporate Details</td><td>"Investor Relations"</td></tr>
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
        id: 'careers',
        group: 'Everyday tasks',
        title: 'Career openings',
        lead: 'The openings listed in "Current Opportunities". The same list is offered in the "Position Applied For" choice on the application form.',
        body: () =>
          figure('openings', ['<b>Add</b> an opening.', '<b>Hide</b> one that is filled - bring it back any time.'], { caption: 'Career Openings' }) +
          tip('Applications', 'Career applications (with the resume) are emailed to the HR team as before.', 'info'),
      },
      {
        id: 'activity',
        group: 'History',
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
