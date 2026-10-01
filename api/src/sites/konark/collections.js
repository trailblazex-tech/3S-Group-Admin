/**
 * The Konark Academy (thekonarkacademy.com) - everything its admin can edit.
 * Option and field-type reference: api/src/core/schema.js.
 */

/** Fields every editable record carries. */
const recordFields = [
  { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
  { name: 'isActive', type: 'boolean', label: 'Published', default: true },
];

export const collections = {
  staff: {
    label: 'Staff Directory',
    description: 'Teaching, office, and leadership profiles.',
    file: 'staff',
    key: 'members',
    titleField: 'name',
    subtitleField: 'role',
    imageField: 'image',
    /** Sub-tabs in the admin list view. */
    groupField: 'group',
    groups: [
      { value: 'teaching', label: 'Teaching Staff' },
      { value: 'office', label: 'Office & Administrative' },
      { value: 'leadership', label: 'Leadership' },
    ],
    fields: [
      { name: 'name', type: 'text', label: 'Full name', required: true, maxLength: 100 },
      { name: 'role', type: 'text', label: 'Designation', required: true, maxLength: 100 },
      {
        name: 'group',
        type: 'select',
        label: 'Directory',
        required: true,
        options: [
          { value: 'teaching', label: 'Teaching Staff' },
          { value: 'office', label: 'Office & Administrative' },
          { value: 'leadership', label: 'Leadership' },
          { value: 'committee', label: 'Committee member' },
        ],
      },
      {
        name: 'department',
        type: 'select',
        label: 'Wing / Department',
        help: 'Teaching staff are grouped by wing on the website.',
        allowCustom: true,
        options: [
          { value: 'Primary Wing', label: 'Primary Wing' },
          { value: 'Middle Wing', label: 'Middle Wing' },
          { value: 'Senior Wing', label: 'Senior Wing' },
          { value: 'Sports', label: 'Sports' },
          { value: 'Performing Arts', label: 'Performing Arts' },
          { value: 'Languages', label: 'Languages' },
          { value: 'Creative Arts', label: 'Creative Arts' },
          { value: 'Wellness', label: 'Wellness' },
        ],
      },
      { name: 'image', type: 'image', label: 'Photo' },
      {
        name: 'description',
        type: 'textarea',
        label: 'Profile blurb',
        help: 'Shown on leadership profile cards only.',
        maxLength: 500,
      },
      {
        name: 'focus',
        type: 'tags',
        label: 'Highlights',
        help: 'Short points shown on leadership profile cards.',
      },
      {
        name: 'cbseCategory',
        type: 'select',
        label: 'Counted on the CBSE disclosure as',
        help: 'The staff numbers on the CBSE disclosure page are counted from this directory. Leave on "Not set" to go by the designation (PGT/HOD, TGT, PRT) and wing.',
        options: [
          { value: 'pgt', label: 'PGT (Post Graduate Teacher)' },
          { value: 'tgt', label: 'TGT (Trained Graduate Teacher)' },
          { value: 'prt', label: 'PRT (Primary Teacher)' },
          { value: 'other', label: 'Other teaching / activity staff' },
          { value: 'none', label: 'Not counted' },
        ],
        showWhen: { field: 'group', is: ['teaching'] },
      },
      { name: 'featured', type: 'boolean', label: 'Feature this person', default: false },
      ...recordFields,
    ],
  },

  gallery: {
    label: 'Photo Gallery',
    description: 'Photos shown on the gallery page.',
    file: 'gallery',
    key: 'photos',
    titleField: 'title',
    subtitleField: 'category',
    imageField: 'src',
    groupField: 'category',
    /** Filled in from the file so a new category appears without a code change. */
    groupsFrom: 'categories',
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 120 },
      { name: 'src', type: 'image', label: 'Photo', required: true },
      {
        name: 'category',
        type: 'select',
        label: 'Category',
        required: true,
        allowCustom: true,
        optionsFrom: 'categories',
      },
      ...recordFields,
    ],
  },

  news: {
    label: 'News & Events',
    description: 'Newspaper clippings and press coverage.',
    file: 'news',
    key: 'clippings',
    titleField: 'title',
    subtitleField: 'month',
    imageField: 'src',
    groupField: 'month',
    fields: [
      { name: 'title', type: 'text', label: 'Headline', required: true, maxLength: 200 },
      {
        name: 'month',
        type: 'text',
        label: 'Month',
        required: true,
        maxLength: 40,
        help: 'Groups the clipping under a month filter, e.g. "August 2026".',
      },
      { name: 'src', type: 'image', label: 'Clipping image', required: true },
      ...recordFields,
    ],
  },

  achievements: {
    label: 'Achievements',
    description: 'Awards, recognitions and student achievements.',
    file: 'achievements',
    key: 'achievements',
    titleField: 'title',
    subtitleField: 'category',
    imageField: 'src',
    groupField: 'category',
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 150 },
      { name: 'src', type: 'image', label: 'Photo', required: true },
      {
        name: 'alt',
        type: 'text',
        label: 'Photo description',
        required: true,
        maxLength: 250,
        help: 'Read aloud by screen readers and shown if the photo fails to load.',
      },
      {
        name: 'category',
        type: 'select',
        label: 'Category',
        required: true,
        allowCustom: true,
        options: [
          { value: 'Academic Recognition', label: 'Academic Recognition' },
          { value: 'Sports & Leadership', label: 'Sports & Leadership' },
        ],
      },
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // CBSE Mandatory Disclosure
  //
  // CBSE prescribes the shape of this page, so these sections are `fixed`:
  // staff edit the values, they do not add or remove rows. An unfilled
  // document shows as Pending, which is what the board expects to see.
  //
  // The staff numbers table is not edited here at all: the website counts it
  // from the Staff Directory (see the cbseCategory field there).
  // -------------------------------------------------------------------------

  'cbse-school-info': {
    label: 'School Information',
    group: 'CBSE Disclosure',
    description: 'The school details table at the top of the disclosure page.',
    file: 'cbse-disclosure',
    key: 'schoolInfo',
    titleField: 'label',
    subtitleField: 'value',
    imageField: '',
    fixed: true,
    derivedRows: { 'contact-numbers': 'Comes from Contact & Office Hours' },
    fields: [
      { name: 'label', type: 'text', label: 'Row', required: true, maxLength: 120 },
      { name: 'value', type: 'text', label: 'Value', required: true, maxLength: 300 },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
    ],
  },

  'cbse-documents': {
    label: 'Disclosure Documents',
    group: 'CBSE Disclosure',
    description: 'The mandatory certificates and letters. Rows can be added or removed here.',
    file: 'cbse-disclosure',
    key: 'documents',
    titleField: 'name',
    subtitleField: 'status',
    imageField: '',
    fields: [
      { name: 'name', type: 'text', label: 'Document', required: true, maxLength: 300 },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        required: true,
        options: [
          { value: 'available', label: 'Available' },
          { value: 'pending', label: 'Pending' },
        ],
      },
      {
        name: 'href',
        type: 'file',
        label: 'PDF',
        help: 'Leave empty while the document is still pending.',
      },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
      { name: 'isActive', type: 'boolean', label: 'Published', default: true },
    ],
  },

  'cbse-academic': {
    label: 'Academic Information',
    group: 'CBSE Disclosure',
    description: 'Fee structure, calendar, SMC and PTA entries. Rows can be added or removed here.',
    file: 'cbse-disclosure',
    key: 'academicInfo',
    titleField: 'label',
    subtitleField: 'detail',
    imageField: '',
    fields: [
      { name: 'label', type: 'text', label: 'Entry', required: true, maxLength: 200 },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        required: true,
        options: [
          { value: 'available', label: 'Available' },
          { value: 'pending', label: 'Pending' },
        ],
      },
      {
        name: 'detail',
        type: 'text',
        label: 'Note',
        maxLength: 120,
        help: 'Shown beside the entry, for example the session year.',
      },
      { name: 'href', type: 'file', label: 'PDF' },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
      { name: 'isActive', type: 'boolean', label: 'Published', default: true },
    ],
  },

  'cbse-staff-extras': {
    label: 'Staff Details',
    group: 'CBSE Disclosure',
    description: 'Teacher-section ratio, counsellor and special educator.',
    file: 'cbse-disclosure',
    key: 'staffExtras',
    titleField: 'label',
    subtitleField: 'value',
    imageField: '',
    fixed: true,
    fields: [
      { name: 'label', type: 'text', label: 'Row', required: true, maxLength: 120 },
      { name: 'value', type: 'text', label: 'Value', required: true, maxLength: 200 },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
    ],
  },

  'cbse-infrastructure': {
    label: 'Infrastructure',
    group: 'CBSE Disclosure',
    description: 'Campus area, classrooms, labs and facilities.',
    file: 'cbse-disclosure',
    key: 'infrastructure',
    titleField: 'label',
    subtitleField: 'value',
    imageField: 'image',
    fixed: true,
    fields: [
      { name: 'label', type: 'text', label: 'Facility', required: true, maxLength: 120 },
      { name: 'value', type: 'text', label: 'Value', required: true, maxLength: 120 },
      {
        name: 'icon',
        type: 'select',
        label: 'Icon',
        required: true,
        options: [
          { value: 'LandPlot', label: 'Land / campus' },
          { value: 'Building2', label: 'Building / classrooms' },
          { value: 'FlaskConical', label: 'Laboratory' },
          { value: 'Monitor', label: 'Computers / internet' },
          { value: 'Bath', label: 'Toilets / washrooms' },
        ],
      },
      { name: 'image', type: 'image', label: 'Photo' },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
    ],
  },

  // -------------------------------------------------------------------------
  // Home page hero: the announcement line above the headline, and the number
  // tiles under the buttons. Both short, so every row is edited on one page.
  // -------------------------------------------------------------------------

  'home-announcement': {
    label: 'Homepage Announcement',
    description: 'The short line above the headline on the home page. Add more than one and they take turns, sliding every few seconds.',
    file: 'home',
    key: 'announcement',
    titleField: 'text',
    subtitleField: 'textHindi',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'text', type: 'text', label: 'Announcement', required: true, maxLength: 120, help: 'Keep it to one short line - it sits above the main headline.' },
      {
        name: 'textHindi',
        type: 'text',
        label: 'Announcement in Hindi (optional)',
        maxLength: 120,
        help: 'Shown when a visitor switches the website to Hindi. Leave empty to show the English line.',
      },
      { name: 'href', type: 'text', label: 'Link (optional)', maxLength: 300, help: 'Makes the line clickable, e.g. /admissions/guidelines or a full https:// link.' },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
      { name: 'isActive', type: 'boolean', label: 'Show on the home page', default: true },
    ],
  },

  'home-stats': {
    label: 'Homepage Highlights',
    description: 'The number tiles on the home page picture (years, students, awards). Up to four show, and a number can keep itself up to date.',
    file: 'home',
    key: 'stats',
    titleField: 'label',
    subtitleField: 'value',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'label', type: 'text', label: 'Caption', required: true, maxLength: 40, help: 'e.g. "Students" or "Awards Won".' },
      {
        name: 'source',
        type: 'select',
        label: 'The number',
        required: true,
        appearance: 'choices',
        options: [
          { value: 'manual', label: 'I type it' },
          { value: 'years', label: 'Years since the school opened' },
          { value: 'achievements', label: 'Achievements on the website' },
          { value: 'staff', label: 'Teachers in the staff directory' },
        ],
      },
      { name: 'value', type: 'text', label: 'Number to show', required: true, maxLength: 12, help: 'e.g. 800+', showWhen: { field: 'source', is: ['manual'] } },
      {
        name: 'foundedYear',
        type: 'number',
        label: 'Year the school opened',
        required: true,
        min: 1900,
        max: 2100,
        help: 'The tile counts up by itself every year.',
        showWhen: { field: 'source', is: ['years'] },
      },
      {
        name: 'icon',
        type: 'select',
        label: 'Icon',
        required: true,
        options: [
          { value: 'GraduationCap', label: 'Graduation cap' },
          { value: 'Users', label: 'People' },
          { value: 'Trophy', label: 'Trophy' },
          { value: 'Award', label: 'Medal' },
          { value: 'BookOpen', label: 'Book' },
          { value: 'School', label: 'School building' },
          { value: 'Star', label: 'Star' },
        ],
      },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
      { name: 'isActive', type: 'boolean', label: 'Show on the home page', default: true },
    ],
  },

  // -------------------------------------------------------------------------
  // Site settings - one row, edited in place like the CBSE sections above.
  // -------------------------------------------------------------------------

  'site-settings': {
    label: 'Contact & Office Hours',
    description: 'Phone numbers, email and office hours used across the whole site.',
    file: 'site-settings',
    key: 'settings',
    titleField: 'phone',
    subtitleField: 'email',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'phone', type: 'text', label: 'Landline', required: true, maxLength: 30 },
      { name: 'secondaryPhone', type: 'text', label: 'Mobile 1', required: true, maxLength: 30 },
      { name: 'tertiaryPhone', type: 'text', label: 'Mobile 2', required: true, maxLength: 30 },
      {
        name: 'whatsappNumber',
        type: 'text',
        label: 'WhatsApp number',
        required: true,
        maxLength: 20,
        help: 'Digits only, with the country code first, e.g. 919254032603.',
      },
      { name: 'email', type: 'text', label: 'General enquiry email', required: true, maxLength: 254 },
      { name: 'hrEmail', type: 'text', label: 'HR / career email', required: true, maxLength: 254 },
      { name: 'officeHoursWeekday', type: 'text', label: 'Office hours (Monday - Saturday)', required: true, maxLength: 60 },
      { name: 'officeHoursSunday', type: 'text', label: 'Office hours (Sunday)', required: true, maxLength: 60 },
      { name: 'addressLines', type: 'tags', label: 'Address lines' },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
    ],
  },

  // Google Analytics 4 - which properties the website's tag reports to.
  // One row, edited in place. Lives next to the contact settings in
  // site-settings.json; the site reads it at page load (no rebuild needed).
  'site-analytics': {
    label: 'Website Analytics',
    description: 'The Google Analytics 4 measurement IDs the website sends visits to.',
    file: 'site-settings',
    key: 'analytics',
    titleField: 'measurementIds',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      {
        name: 'measurementIds',
        type: 'tags',
        label: 'GA4 measurement IDs',
        parseAs: 'ga4MeasurementId',
        help:
          'From Google Analytics: Admin > Data streams > the website stream > Measurement ID (G-XXXXXXXXXX). ' +
          'Separate several with commas - every visit is sent to each. Leave empty to use the ID built into the website.',
      },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
    ],
  },

  videos: {
    label: 'Video Gallery',
    description: 'YouTube videos shown on the video gallery page.',
    file: 'videos',
    key: 'videos',
    titleField: 'title',
    subtitleField: 'category',
    imageField: '',
    groupField: 'category',
    groupsFrom: 'categories',
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 120 },
      {
        name: 'youtubeId',
        type: 'text',
        label: 'YouTube link or video ID',
        required: true,
        maxLength: 200,
        parseAs: 'youtubeId',
        help: 'Paste the full YouTube URL (youtu.be/... or watch?v=...) or just the video ID.',
      },
      {
        name: 'category',
        type: 'select',
        label: 'Category',
        required: true,
        allowCustom: true,
        optionsFrom: 'categories',
      },
      ...recordFields,
    ],
  },

  'fees-one-time': {
    label: 'Fees - One-Time Charges',
    group: 'Fee Structure',
    description: 'Registration and admission charges.',
    file: 'fees',
    key: 'oneTime',
    titleField: 'label',
    subtitleField: 'amount',
    imageField: '',
    fields: [
      { name: 'label', type: 'text', label: 'Charge name', required: true, maxLength: 120 },
      { name: 'amount', type: 'number', label: 'Amount (Rs.)', required: true, min: 0 },
      ...recordFields,
    ],
  },

  'fees-tuition': {
    label: 'Fees - Tuition',
    group: 'Fee Structure',
    description: 'Class-wise quarterly, half-yearly and annual tuition fees.',
    file: 'fees',
    key: 'tuition',
    titleField: 'className',
    subtitleField: 'annual',
    imageField: '',
    fields: [
      { name: 'className', type: 'text', label: 'Class', required: true, maxLength: 60 },
      { name: 'quarterly', type: 'number', label: 'Quarterly (Rs.)', required: true, min: 0 },
      { name: 'halfYearly', type: 'number', label: 'Half-yearly (Rs.)', required: true, min: 0 },
      { name: 'annual', type: 'number', label: 'Annual (Rs.)', required: true, min: 0 },
      { name: 'remark', type: 'textarea', label: 'Remark', maxLength: 200 },
      ...recordFields,
    ],
  },

  'career-page-settings': {
    label: 'Career Page',
    group: 'Career',
    description: 'Hero copy on the career page.',
    file: 'career',
    key: 'pageSettings',
    titleField: 'title',
    subtitleField: 'eyebrow',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'eyebrow', type: 'text', label: 'Eyebrow', required: true, maxLength: 60 },
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 60 },
      { name: 'intro', type: 'textarea', label: 'Intro', required: true, maxLength: 400 },
      { name: 'overviewTitle', type: 'text', label: 'Overview heading', maxLength: 160 },
      { name: 'overviewText', type: 'textarea', label: 'Overview text', maxLength: 400 },
      { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
    ],
  },

  'event-greetings': {
    label: 'Event Greetings',
    description: 'Pop-up announcements and festival greetings for website visitors. Each one shows only between the start and end you choose; when several are on at once, visitors swipe through them in one pop-up, newest first.',
    file: 'event-greetings',
    key: 'greetings',
    titleField: 'eventName',
    subtitleField: 'title',
    imageField: 'bannerImage',
    schedule: { start: 'startDate', startTime: 'startTime', end: 'endDate', endTime: 'endTime' },
    templates: 'greetings',
    check: (record) => {
      if (record.layout === 'banner' && !record.bannerImage) return 'A banner-only greeting needs a banner - choose one or upload a picture.';
      if (record.layout !== 'banner' && !record.title && !record.message) return 'Add a headline or a message, or switch to "Banner only".';
      return null;
    },
    fields: [
      { name: 'eventName', type: 'text', label: 'Internal name', required: true, maxLength: 160, help: 'For your own reference - not shown to visitors.' },
      {
        name: 'layout',
        type: 'select',
        label: 'What visitors see',
        appearance: 'choices',
        options: [
          { value: 'full', label: 'Banner with headline and message' },
          { value: 'banner', label: 'Banner only' },
        ],
        help: 'Banner only shows your picture large with no text - right for a designed poster or greeting card.',
      },
      { name: 'title', type: 'text', label: 'Headline', maxLength: 120, showWhen: { field: 'layout', is: [null, '', 'full'] } },
      { name: 'message', type: 'textarea', label: 'Message', maxLength: 500, showWhen: { field: 'layout', is: [null, '', 'full'] } },
      {
        name: 'bannerImage',
        type: 'image',
        label: 'Banner',
        library: 'greetings',
        help: 'Pick a ready-made animated banner, or upload your own photo, poster or GIF. Wide pictures (16:9) fit best with text; any shape works for banner only.',
      },
      { name: 'bannerAlt', type: 'text', label: 'Banner description', maxLength: 200, help: 'Read aloud by screen readers and shown if the image fails to load.' },
      { name: 'startDate', type: 'date', label: 'Show from', required: true },
      { name: 'startTime', type: 'time', label: 'Start time (optional)', help: 'India time. Leave empty to start at midnight.' },
      { name: 'endDate', type: 'date', label: 'Show until', required: true },
      { name: 'endTime', type: 'time', label: 'End time (optional)', help: 'India time. Leave empty to show until the end of that day.' },
      {
        name: 'frequency',
        type: 'select',
        label: 'How often a visitor sees it',
        options: [
          { value: 'visit', label: 'Once per visit (recommended)' },
          { value: 'day', label: 'Once a day' },
          { value: 'once', label: 'Only once, ever' },
        ],
        help: 'A visitor who has already seen it will not be shown it again until then.',
      },
      { name: 'ctaLabel', type: 'text', label: 'Button text (optional)', maxLength: 60 },
      { name: 'ctaHref', type: 'text', label: 'Button link (optional)', maxLength: 300, help: 'A page on this site like /admissions/guidelines, or a full https:// link.' },
      ...recordFields,
    ],
  },

  'career-openings': {
    label: 'Career Openings',
    group: 'Career',
    description: 'Current job openings, grouped by category.',
    file: 'career',
    key: 'openings',
    titleField: 'title',
    subtitleField: 'category',
    imageField: '',
    groupField: 'category',
    groupsFrom: 'categories',
    fields: [
      { name: 'title', type: 'text', label: 'Role name', required: true, maxLength: 100 },
      {
        name: 'category',
        type: 'select',
        label: 'Category',
        required: true,
        allowCustom: true,
        optionsFrom: 'categories',
      },
      ...recordFields,
    ],
  },
};
