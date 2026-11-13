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
    '3S Admin lets the 3S Global Greens team update 3sglobalgreens.com without a developer: contact details, leadership, certificates, figures, products, the process, ESG, plant photos and careers - and follow up the buy and sell enquiries the website receives. This guide walks through every screen with pictures.',
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
        { css: `${main} a[href="/globalgreens/leads"]` },
        { css: `${main} a[href="/globalgreens/company-profile"]` },
        { css: `${sidebar} a[title="All websites"]` },
      ],
    },
    {
      id: 'sidebar',
      path: '/globalgreens',
      height: 2000,
      element: { css: sidebar },
      marks: [
        { css: `${sidebar} a[href="/globalgreens"]` },
        { css: `${sidebar} a[href="/globalgreens/leads"]` },
        { css: `${sidebar} a[href="/globalgreens/company-profile"]` },
        { css: `${sidebar} a[href="/globalgreens/impact-figures"]` },
        { css: `${sidebar} a[href="/globalgreens/products"]` },
        { css: `${sidebar} a[href="/globalgreens/plant-gallery"]` },
        { css: `${sidebar} a[href="/globalgreens/activity"]` },
        { css: `${sidebar} a[href="/globalgreens/guide"]` },
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
    {
      id: 'leads',
      path: '/globalgreens/leads',
      height: 900,
      marks: [{ text: 'Export to Excel' }, { aria: 'Wants to' }, { css: 'main ul li button' }],
    },
    {
      id: 'lead-detail',
      path: '/globalgreens/leads',
      height: 860,
      prepare: async (page) => {
        await page.click('main ul li:nth-child(3) button');
      },
      marks: [{ css: '[role="dialog"] a[href^="tel:"]' }, { css: '[role="dialog"] a[href*="wa.me"]' }, { text: 'Following up' }, { text: 'Save note' }],
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
        lead: 'The dashboard is the home of the website: everything you can edit, new enquiries, and recent changes.',
        body: () =>
          figure('dashboard', [
            '<b>Publish to website</b> - rebuilds 3sglobalgreens.com with everything you have saved. The changes appear about 5 minutes later.',
            'New buy and sell enquiries from the website, with the count of new ones.',
            'Each tile is a section you can edit. Click one to open it. The number is how many items it holds.',
            'Switch to another 3S Group website.',
          ], { caption: 'Dashboard of 3S Global Greens' }) +
          tip('Save, then Publish', '<b>Save</b> keeps your change in the admin. <b>Publish to website</b> rebuilds 3sglobalgreens.com with all saved changes. Make all your changes first and publish once at the end - each Publish takes about 5 minutes.', 'key') +
          tip('If Publish says the website could not be rebuilt', 'Your changes are still saved. Try Publish again after a few minutes; if it keeps failing, contact the 3S Group team.', 'warn'),
      },
      {
        id: 'menu',
        group: 'Getting started',
        title: 'Finding your way around',
        lead: 'The menu on the left lists every part of the website: Company, Figures, Products & Services, Process, ESG, About Page, Gallery and Careers. On a phone, open it with the menu button at the top.',
        body: () =>
          figure(
            'sidebar',
            [
              '<b>Dashboard</b> - the overview and the Publish button.',
              '<b>Feedback &amp; Leads</b> - enquiries from the website. The orange badge counts new ones.',
              '<b>Company</b> - profile, contact details, locations, leadership, history and certifications.',
              '<b>Figures</b> - the numbers on the ESG page and home page.',
              '<b>Products &amp; Services</b> - products, services, industries and quality.',
              '<b>Plant Gallery</b> - the plant photos.',
              '<b>Activity log</b> - every change made in the admin, newest first.',
              '<b>Guide</b> - this guide, inside the admin.',
            ],
            { narrow: true, caption: 'The menu' },
          ) +
          `<div class="table-wrap"><table>
            <thead><tr><th>Menu item</th><th>Where it shows on 3sglobalgreens.com</th></tr></thead>
            <tbody>
              <tr><td>Company Profile</td><td>Slogan in the footer, description, vision and mission (About), "Years of Operation"</td></tr>
              <tr><td>Contact Details</td><td>Footer, mobile menu, WhatsApp button, Contact, Careers and the legal pages</td></tr>
              <tr><td>Locations</td><td>"Where We Operate" (About), Contact page, footer</td></tr>
              <tr><td>Leadership, Company History</td><td>About page</td></tr>
              <tr><td>Certifications</td><td>Certifications page and the Trust Centre on the home page</td></tr>
              <tr><td>Impact Figures, Impact Statements, Recovery Figures</td><td>ESG page and home page</td></tr>
              <tr><td>Products, Services, Industries We Serve, Quality, Batch Record</td><td>Home page and Products &amp; Services</td></tr>
              <tr><td>Manufacturing Process, Material Journey, Our Promises</td><td>Products &amp; Services, home page, About page</td></tr>
              <tr><td>ESG Pillars, ESG Commitments, Responsible Sourcing, Sourcing Principles, Future Initiatives</td><td>ESG page and home page</td></tr>
              <tr><td>Sell To Us, Selling Steps, Our Expertise, Our People</td><td>About page</td></tr>
              <tr><td>Plant Gallery</td><td>Home page slider, and the pollution-control and storage galleries on the About page</td></tr>
              <tr><td>Careers Page, Why Work With Us, Departments</td><td>Careers page and its application form</td></tr>
            </tbody>
          </table></div>`,
      },
      {
        id: 'company',
        group: 'Everyday tasks',
        title: 'Company profile',
        lead: 'The text that describes the company across the site.',
        body: () =>
          figure('profile', [
            '<b>Year operations began</b> - the "Years of Operation" and "Year Commissioned" figures are worked out from this.',
            '<b>Mission points</b> - one point per line.',
          ], { caption: 'Company Profile' }) +
          tip('Lists', 'Boxes that say "One per line" hold a list: each line becomes one point on the website. Press Enter to start the next point.', 'info'),
      },
      {
        id: 'contact',
        group: 'Everyday tasks',
        title: 'Contact details',
        lead: 'Phone numbers and emails used in the footer, menu, WhatsApp button, Contact and Careers pages, and the legal pages.',
        body: () =>
          figure('contact', [
            '<b>Contact person</b> shown next to the direct number, e.g. Sanjit.',
            "<b>Contact person's mobile</b> - used for calls and for the WhatsApp button. Type it with the country code, e.g. +91 98931 62454.",
            'The email visitors are given for business enquiries.',
            'The HR email on the Careers page (with the HR contact name and mobile next to it).',
            '<b>Save</b>, then Publish.',
          ], { caption: 'Contact Details' }) +
          tip('Check before saving', 'A wrong number or email here changes it everywhere on the website, including the WhatsApp button.', 'warn'),
      },
      {
        id: 'leadership',
        group: 'Everyday tasks',
        title: 'Leadership',
        lead: 'The leadership cards on the About page. Add a card for a new director, or edit an existing one.',
        body: () =>
          figure('leader', [
            '<b>Portrait photo</b> - upload a portrait (taller than wide) photo, up to 10 MB.',
            '<b>Photo framing</b> - which part of the photo stays in view when it is cropped.',
            '<b>Badge colour</b> of the small label at the top of the card.',
            '<b>Strengths</b> - the short tags at the bottom of the card, one per line. Three fit best.',
          ], { caption: 'Editing a leader' }),
      },
      {
        id: 'certificates',
        group: 'Everyday tasks',
        title: 'Certifications',
        lead: 'Each ISO certificate on the Certifications page, with its number, dates, issuer and scope. Add a certificate when a new one is issued; update the dates when one is renewed.',
        body: () =>
          figure('certificate', [
            'Audit dates as printed on the certificate, e.g. 6th January 2028. The website shows them as "Jan 2028".',
            '<b>Status</b> - Active or Verified, shown on the card.',
            '<b>Upload a PDF</b> of the certificate. The card then gets a "View certificate (PDF)" link.',
            '<b>Save</b>, then Publish.',
          ], { caption: 'One certificate' }),
      },
      {
        id: 'figures',
        group: 'Everyday tasks',
        title: 'Figures',
        lead: 'Processing capacity, recovery, water recirculated, energy, people, safe days, and the recovery figures on the home page. A figure only appears on the website once it has a number - so nothing unverified is ever shown.',
        body: () =>
          figure('figures', [
            '<b>Number</b> - type the verified figure, e.g. 98.5. Leave it empty to keep the figure hidden.',
            '<b>After the number</b>, e.g. %.',
            '<b>Unit</b>, shown after the label, e.g. TPA.',
          ], { caption: 'Impact Figures' }),
      },
      {
        id: 'products',
        group: 'Everyday tasks',
        title: 'Products, services and industries',
        lead: 'Each product, service and industry has its own photo, text and lists.',
        body: () =>
          figure('product', [
            '<b>Applications</b> - one per line.',
            '<b>Specification details offered</b> - what the specification sheet covers, one per line.',
            '<b>Photo</b> - upload a new photo, and describe what it shows.',
          ], { caption: 'Editing a product' }) +
          steps([
            'Open the section in the menu.',
            'Click an item to change it, or <b>Add</b> for a new one.',
            'Use the arrows on the list to change the order on the website. Numbered items (process stages, selling steps) renumber themselves.',
            'Click <b>Save</b>, then <b>Publish to website</b> on the dashboard.',
          ]),
      },
      {
        id: 'gallery',
        group: 'Everyday tasks',
        title: 'Plant gallery',
        lead: 'The plant photos. Each photo is shown in one place: the home page slider, the pollution control gallery or the storage gallery on the About page.',
        body: () =>
          figure('gallery', [
            '<b>Add</b> a photo: title, photo, description, where it is shown, and its category.',
            '<b>Filter</b> - show one place at a time: the home page slider or one of the two About page galleries.',
            '<b>Hide</b> a photo without deleting it.',
          ], { caption: 'Plant Gallery' }),
      },
      {
        id: 'leads',
        group: 'Enquiries and reports',
        title: 'Feedback & Leads',
        lead: 'Every enquiry sent from the enquiry form on the Contact page - customers buying refined lead and suppliers selling lead-bearing material. Enquiries are also emailed to the team as before.',
        body: () =>
          figure('leads', [
            '<b>Export to Excel</b> downloads the list as a spreadsheet.',
            'Show only buyers or only sellers.',
            'Click an entry to open it.',
          ], { caption: 'Feedback & Leads', sample: true }) +
          figure('lead-detail', [
            '<b>Call</b> the person straight from here.',
            'Message them on <b>WhatsApp</b>.',
            'Mark the follow-up: <b>New</b>, <b>Following up</b> or <b>Done</b>.',
            'Write a note for the team, then <b>Save note</b>.',
          ], { caption: 'One enquiry, opened', sample: true }) +
          tip('Career applications', 'Applications with a resume are emailed to HR as before; they do not appear under Leads.', 'info'),
      },
      {
        id: 'activity',
        group: 'Enquiries and reports',
        title: 'Activity log and Analytics',
        lead: 'The <b>Activity log</b> records every change made in the admin - what was changed, in which section, and when. <b>Analytics</b> shows website visitor numbers once the 3S Group team connects Google Analytics for the site.',
        body: () => '',
      },
    ];

    const faq = [
      ['I published but the website still shows the old version.', 'Publishing rebuilds the website, which takes about 5 minutes. Wait, then refresh the page. If it still shows the old version after 10 minutes, press Publish again.'],
      ['I forgot the password.', 'On the sign-in screen click <b>Forgot password?</b>. A code is emailed to the admin inbox. Enter it and choose a new password.'],
      ['The phone with the authenticator app was lost or changed.', 'Contact the 3S Group web team. They can reset the authenticator so you can scan a new QR code.'],
      ['A photo will not upload.', 'Photos must be JPG, PNG, WEBP or GIF and under 10 MB. Large phone photos can be sent to yourself on WhatsApp first, which makes them smaller.'],
      ['A figure does not show on the website.', 'A figure only shows once it has a number. Open Impact Figures or Recovery Figures, type the number, Save and Publish.'],
      ['I deleted something by mistake.', 'If you chose <b>Just hide it</b>, open the item and tick Published again. A permanent delete cannot be undone - add the item again.'],
    ];

    return { sections, faq };
  },
};
