// 3S Global Greens - the guide's page text, and the screenshots it uses
// (sites/globalgreens/img, callouts.json; taken by capture/capture.mjs).
// Built by: node docs/client-guide/build.mjs globalgreens

const main = 'main';
const sidebar = 'aside';

export default {
  name: '3S Global Greens',
  domain: '3sglobalgreens.com',
  description: 'How to use 3S Admin to update 3sglobalgreens.com.',
  intro:
    '3S Admin lets the 3S Global Greens team update 3sglobalgreens.com without a developer. The admin is laid out page by page, like the website: company details, the Home page, About Us, Products & Services, ESG, Certifications and Careers. This guide walks through every screen with pictures.',
  goesLive: 'About 5 minutes after Publish',
  liveStep: 'The website is rebuilt with your changes. Refresh 3sglobalgreens.com after about 5 minutes.',
  distFile: 'globalgreens.html',
  adminFile: 'guide-globalgreens.html',

  shots: [
    {
      id: 'picker',
      path: '/',
      height: 860,
      marks: [{ css: 'a[href="/globalgreens"]' }, { css: 'a[href="/minerals"]' }, { text: 'Sign out' }],
    },
    {
      id: 'dashboard',
      path: '/globalgreens',
      height: 900,
      marks: [
        { text: 'Publish to website' },
        { css: `${main} section h2`, nth: 0 },
        { css: `${main} a[href="/globalgreens/company-profile"]` },
        { css: `${main} section a[target="_blank"]`, nth: 0 },
        { css: `${sidebar} a[title="All websites"]` },
      ],
    },
    {
      id: 'sidebar',
      path: '/globalgreens/leadership',
      height: 1080,
      element: { css: sidebar },
      marks: [
        { css: `${sidebar} a[href="/globalgreens"]` },
        { css: `${sidebar} nav button[aria-expanded="true"]` },
        { css: `${sidebar} a[href="/globalgreens/leadership"]` },
        { css: `${sidebar} nav button[aria-controls="menu-esg"]` },
        { css: `${sidebar} a[href="/globalgreens/activity"]` },
      ],
    },
    {
      id: 'profile',
      path: '/globalgreens/company-profile',
      height: 900,
      scrollTo: { label: 'Company description' },
      marks: [{ label: 'Year operations began' }, { label: 'Mission points' }],
    },
    {
      id: 'contact',
      path: '/globalgreens/contact-details',
      height: 900,
      marks: [{ label: 'Contact person' }, { label: "Contact person's mobile" }, { label: 'Business enquiries email' }, { label: 'HR / careers email' }, { text: 'Save' }],
    },
    {
      id: 'leader',
      path: '/globalgreens/leadership/ashu-tripathi',
      height: 1000,
      scrollTo: { label: 'Portrait photo' },
      marks: [{ label: 'Portrait photo' }, { label: 'Photo framing' }, { label: 'Badge colour' }, { label: 'Strengths' }],
    },
    {
      id: 'certificate',
      path: '/globalgreens/certifications/iso-9001',
      height: 900,
      scrollTo: { label: 'Accreditation' },
      marks: [{ label: 'Second surveillance audit' }, { label: 'Status' }, { text: 'Upload a PDF' }, { text: 'Save' }],
    },
    {
      id: 'figures',
      path: '/globalgreens/impact-figures',
      height: 900,
      marks: [{ label: 'Number' }, { label: 'After the number' }, { label: 'Unit' }],
    },
    {
      id: 'gallery',
      path: '/globalgreens/plant-gallery',
      height: 760,
      marks: [{ text: 'Add' }, { aria: 'Filter' }, { aria: 'Hide', nth: 0 }],
    },
    {
      id: 'product',
      path: '/globalgreens/products/refined-lead-ingots',
      height: 900,
      scrollTo: { label: 'Description' },
      marks: [{ label: 'Applications' }, { label: 'Specification details offered' }, { label: 'Photo' }],
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
          figure('picker', ['<b>3S Global Greens</b> - click the card to open its admin.', 'Other 3S Group websites. You can switch between them any time.', '<b>Sign out</b> when you are done on a shared computer.'], {
            caption: 'The website picker',
          }),
      },
      {
        id: 'dashboard',
        group: 'Getting started',
        title: 'The dashboard and the Publish button',
        lead: 'The dashboard is the home of the website. It is laid out page by page, the same way as 3sglobalgreens.com: first what is used on every page, then the Home page, About Us, Products &amp; Services, ESG, Certifications and Careers.',
        body: () =>
          figure('dashboard', [
            '<b>Publish to website</b> - rebuilds 3sglobalgreens.com with everything you have saved. The changes appear about 5 minutes later.',
            'Each heading is one page of the website, with a line on what it covers.',
            'Each tile is a section of that page, in the order it appears on the page. Click one to open it. The number is how many items are shown on the website; <b>Settings</b> means a single form.',
            '<b>View page</b> opens that page of the live website in a new tab, to compare.',
            'Switch to another 3S Group website.',
          ], { caption: 'Dashboard of 3S Global Greens' }) +
          tip('Save, then Publish', '<b>Save</b> keeps your change in the admin. <b>Publish to website</b> rebuilds 3sglobalgreens.com with all saved changes. Make all your changes first and publish once at the end - each Publish takes about 5 minutes.', 'key') +
          tip('If Publish says the website could not be rebuilt', 'Your changes are still saved. Try Publish again after a few minutes; if it keeps failing, contact the 3S Group team.', 'warn'),
      },
      {
        id: 'menu',
        group: 'Getting started',
        title: 'Finding your way around',
        lead: 'The menu on the left has one entry per page of the website. Click a page to fold out its sections; click it again to fold them away. The page you are working on opens by itself. On a phone, open the menu with the button at the top.',
        body: () =>
          figure(
            'sidebar',
            [
              '<b>Dashboard</b> - the overview and the Publish button.',
              'A website page, folded out. The number is how many sections it has.',
              'The section that is open now is highlighted.',
              'A folded page - click it to see its sections.',
              '<b>Activity log</b> - every change made in the admin, newest first. Below it: <b>Guide</b> (this guide) and <b>View live website</b>.',
            ],
            { narrow: true, caption: 'The menu, with About Us folded out' },
          ) +
          `<div class="table-wrap"><table>
            <thead><tr><th>Menu</th><th>Sections, in the order they appear on the page</th></tr></thead>
            <tbody>
              <tr><td>Whole Website</td><td>Company Profile, Contact Details, Locations</td></tr>
              <tr><td>Home Page</td><td>Impact Statements, Material Journey, Industries We Serve, Recovery Figures</td></tr>
              <tr><td>About Us</td><td>Our Promises, Company History, Our Expertise, Plant Gallery, Sell To Us, Selling Steps, Leadership, Our People</td></tr>
              <tr><td>Products &amp; Services</td><td>Products, Services, Manufacturing Process, Quality, Batch Record</td></tr>
              <tr><td>ESG</td><td>ESG Pillars, ESG Commitments, Responsible Sourcing, Sourcing Principles, Future Initiatives, Impact Figures</td></tr>
              <tr><td>Certifications</td><td>Certifications</td></tr>
              <tr><td>Careers</td><td>Careers Page, Why Work With Us, Departments</td></tr>
            </tbody>
          </table></div>` +
          tip('Shown on more than one page', 'A few sections also appear on the home page - products, services, the plant photos, the ESG pillars and the certificates. Each is edited once, under the page it belongs to, and the home page follows. The top of every section says which page it is on, with a <b>View on website</b> link.', 'info'),
      },
      {
        id: 'everyday',
        group: 'Getting started',
        title: 'Adding, changing and hiding',
        lead: 'Every section works one of three ways: a list (click an item to edit it), a page of short cards (edit them all on one page), or a single form.',
        body: () =>
          steps([
            'Open the page in the menu, then the section.',
            'Click an item to change it, or <b>Add</b> for a new one.',
            'Use the arrows to change the order on the website. Numbered items (process stages, selling steps) renumber themselves.',
            'The eye button hides an item from the website without deleting it. Click it again to bring it back.',
            'Click <b>Save</b>, then <b>Publish to website</b> on the dashboard.',
          ]) +
          tip('Lists', 'Boxes that say "One per line" hold a list: each line becomes one point on the website. Press Enter to start the next point.', 'info'),
      },
      {
        id: 'whole-website',
        group: 'Website pages',
        title: 'Whole Website',
        lead: 'Company details used on every page: the header, footer, contact buttons and legal pages.',
        body: () =>
          figure('profile', [
            '<b>Year operations began</b> - the "Years of Operation" figure on the home page is worked out from this.',
            '<b>Mission points</b> - one point per line, shown on About Us.',
          ], { caption: 'Company Profile - the slogan, description, vision and mission' }) +
          figure('contact', [
            '<b>Contact person</b> shown next to the direct number, e.g. Sanjit.',
            "<b>Contact person's mobile</b> - used for calls and for the WhatsApp button. Type it with the country code, e.g. +91 98931 62454.",
            'The email visitors are given for business enquiries.',
            'The HR email on the Careers page (with the HR contact name and mobile next to it).',
            '<b>Save</b>, then Publish.',
          ], { caption: 'Contact Details' }) +
          tip('Check before saving', 'A wrong number or email here changes it everywhere on the website, including the WhatsApp button.', 'warn') +
          '<p><b>Locations</b> holds the corporate office and the manufacturing unit: address, photo and directions. They show on the Contact page, About Us and in the footer.</p>',
      },
      {
        id: 'home-page',
        group: 'Website pages',
        title: 'Home Page',
        lead: 'The sections that are only on the home page.',
        body: () =>
          `<div class="table-wrap"><table>
            <thead><tr><th>Section</th><th>What it is</th></tr></thead>
            <tbody>
              <tr><td>Impact Statements</td><td>The photo statements under the figures, e.g. "Reduced dependence on primary mining". They also show on the ESG page.</td></tr>
              <tr><td>Material Journey</td><td>Recover - Refine - Verify - Deliver - Repeat.</td></tr>
              <tr><td>Industries We Serve</td><td>Each industry with its photo and uses.</td></tr>
              <tr><td>Recovery Figures</td><td>The figures in the circular-economy panel. A figure only shows once it has a number.</td></tr>
            </tbody>
          </table></div>`,
      },
      {
        id: 'about-us',
        group: 'Website pages',
        title: 'About Us',
        lead: 'The About Us page, top to bottom: Our Promises, Company History, Our Expertise, Plant Gallery, Sell To Us, Selling Steps, Leadership and Our People.',
        body: () =>
          figure('leader', [
            '<b>Portrait photo</b> - upload a portrait (taller than wide) photo, up to 10 MB.',
            '<b>Photo framing</b> - which part of the photo stays in view when it is cropped.',
            '<b>Badge colour</b> of the small label at the top of the card.',
            '<b>Strengths</b> - the short tags at the bottom of the card, one per line. Three fit best.',
          ], { caption: 'Leadership - editing a leader' }) +
          figure('gallery', [
            '<b>Add</b> a photo: title, photo, description, where it is shown, and its category.',
            '<b>Filter</b> - show one place at a time: the home page slider or one of the two About Us galleries.',
            '<b>Hide</b> a photo without deleting it.',
          ], { caption: 'Plant Gallery - each photo is shown in one place: the home page slider, or the pollution-control or storage gallery on About Us' }),
      },
      {
        id: 'products-services',
        group: 'Website pages',
        title: 'Products & Services',
        lead: 'The Products &amp; Services page, top to bottom: Products, Services, Manufacturing Process, Quality and Batch Record. Products and services are also listed on the home page.',
        body: () =>
          figure('product', [
            '<b>Applications</b> - one per line.',
            '<b>Specification details offered</b> - what the specification sheet covers, one per line.',
            '<b>Photo</b> - upload a new photo, and describe what it shows.',
          ], { caption: 'Products - editing a product' }) +
          '<p><b>Quality</b> holds the "Quality You Can Verify" text and the technical details list; <b>Batch Record</b> holds its steps, in order.</p>',
      },
      {
        id: 'esg',
        group: 'Website pages',
        title: 'ESG',
        lead: 'The ESG page, top to bottom: ESG Pillars (Environmental, Social, Governance) and the commitments under each, Responsible Sourcing and its principles, Future Initiatives, and the Impact Figures at the end. The pillars also show on the home page.',
        body: () =>
          figure('figures', [
            '<b>Number</b> - type the verified figure, e.g. 98.5. Leave it empty to keep the figure hidden.',
            '<b>After the number</b>, e.g. %.',
            '<b>Unit</b>, shown after the label, e.g. TPA.',
          ], { caption: 'Impact Figures - a figure only appears once it has a number, so nothing unverified is ever shown' }),
      },
      {
        id: 'certifications',
        group: 'Website pages',
        title: 'Certifications',
        lead: 'Each ISO certificate on the Certifications page and the home page, with its number, dates, issuer and scope. Add a certificate when a new one is issued; update the dates when one is renewed.',
        body: () =>
          figure('certificate', [
            'Audit dates as printed on the certificate, e.g. 6th January 2028. The website shows them as "Jan 2028".',
            '<b>Status</b> - Active or Verified, shown on the card.',
            '<b>Upload a PDF</b> of the certificate. The card then gets a "View certificate (PDF)" link.',
            '<b>Save</b>, then Publish.',
          ], { caption: 'One certificate' }),
      },
      {
        id: 'careers',
        group: 'Website pages',
        title: 'Careers',
        lead: 'The Careers page: its heading and introduction (Careers Page), the photo cards (Why Work With Us), and the Departments people can choose on the application form.',
        body: () => tip('Applications', 'Career applications with a resume are emailed to HR by the website; they are not stored in the admin.', 'info'),
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
      ['I published but the website still shows the old version.', 'Publishing rebuilds the website, which takes about 5 minutes. Wait, then refresh the page. If it still shows the old version after 10 minutes, press Publish again.'],
      ['I forgot the password.', 'On the sign-in screen click <b>Forgot password?</b>. A code is emailed to the admin inbox. Enter it and choose a new password.'],
      ['The phone with the authenticator app was lost or changed.', 'Contact the 3S Group web team. They can reset the authenticator so you can scan a new QR code.'],
      ['A photo will not upload.', 'Photos must be JPG, PNG, WEBP or GIF and under 10 MB. Large phone photos can be sent to yourself on WhatsApp first, which makes them smaller.'],
      ['A figure does not show on the website.', 'A figure only shows once it has a number. Open Impact Figures (under ESG) or Recovery Figures (under Home Page), type the number, Save and Publish.'],
      ['I cannot find a section in the menu.', 'Click the website page it is on to fold it out - see the table under <b>Finding your way around</b>. The dashboard also shows every section, page by page.'],
      ['I deleted something by mistake.', 'If you chose <b>Just hide it</b>, open the item and tick Published again. A permanent delete cannot be undone - add the item again.'],
    ];

    return { sections, faq };
  },
};
