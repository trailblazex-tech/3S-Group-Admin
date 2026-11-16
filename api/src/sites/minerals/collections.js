/**
 * 3S Minerals (3sminerals.co.in) - everything its admin can edit.
 * Option and field-type reference: api/src/core/schema.js.
 *
 * The website reads these from content/*.json (file / key below). Interface
 * text - menu names, button and form labels, error messages - stays in the
 * site's src/locales/en.json: it rarely changes and editing it can break
 * the layout.
 */

/** Fields every editable record carries. */
const recordFields = [
  { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
  { name: 'isActive', type: 'boolean', label: 'Published', default: true },
];

/** A one-row section edited in place (no hiding, no adding). */
const orderOnly = [{ name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true }];

/** Icons the website can draw on cards. Values are the site's icon names. */
const iconField = {
  name: 'icon',
  type: 'select',
  label: 'Icon',
  required: true,
  options: [
    { value: 'Award', label: 'Award ribbon' },
    { value: 'Landmark', label: 'Government building' },
    { value: 'Users', label: 'People' },
    { value: 'Leaf', label: 'Leaf' },
    { value: 'Recycle', label: 'Recycling' },
    { value: 'Droplets', label: 'Water drops' },
    { value: 'Wind', label: 'Wind / air' },
    { value: 'Zap', label: 'Lightning (energy)' },
    { value: 'Sun', label: 'Sun (drying)' },
    { value: 'Shield', label: 'Shield (safety)' },
    { value: 'GraduationCap', label: 'Graduation cap (training)' },
    { value: 'HeartHandshake', label: 'Handshake with heart' },
    { value: 'Handshake', label: 'Handshake' },
    { value: 'Truck', label: 'Truck (logistics)' },
    { value: 'Cog', label: 'Gear (technology)' },
    { value: 'Pickaxe', label: 'Pickaxe (mining)' },
    { value: 'Layers', label: 'Layers' },
    { value: 'Filter', label: 'Filter' },
    { value: 'Package', label: 'Package' },
    { value: 'Factory', label: 'Factory' },
    { value: 'FlaskConical', label: 'Lab flask' },
    { value: 'Building2', label: 'Office building' },
    { value: 'FileText', label: 'Document' },
    { value: 'CheckCircle2', label: 'Tick' },
  ],
};

const boldHelp = 'Wrap words in **double stars** to show them in bold.';

export const collections = {
  // -------------------------------------------------------------------------
  // Contact details - one row used across the whole site.
  // -------------------------------------------------------------------------
  'contact-details': {
    label: 'Contact Details',
    group: 'Company',
    description: 'Phone, emails, addresses, map pins and visiting hours, used across the whole site.',
    file: 'site-settings',
    key: 'settings',
    titleField: 'email',
    subtitleField: 'phone',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'phone', type: 'text', label: 'Phone number', maxLength: 40, help: 'Shown as a card in the Contact section. Leave empty to show no phone number.' },
      { name: 'email', type: 'text', label: 'Main email', required: true, maxLength: 254 },
      { name: 'salesEmail', type: 'text', label: 'Sales email', maxLength: 254 },
      { name: 'hrEmail', type: 'text', label: 'HR / careers email', required: true, maxLength: 254, help: 'Shown under the career form for people who prefer to email their resume.' },
      { name: 'website', type: 'text', label: 'Group website', maxLength: 120, help: 'e.g. www.3sgroup.co.in' },
      { name: 'hoursWeekdays', type: 'text', label: 'Visiting hours (working days)', required: true, maxLength: 80 },
      { name: 'hoursSunday', type: 'text', label: 'Visiting hours (Sunday)', maxLength: 80 },
      { name: 'officeLine1', type: 'text', label: 'Corporate office - address line 1', required: true, maxLength: 120 },
      { name: 'officeLine2', type: 'text', label: 'Corporate office - address line 2', maxLength: 120 },
      { name: 'officeCity', type: 'text', label: 'Corporate office - city', required: true, maxLength: 60 },
      { name: 'officeState', type: 'text', label: 'Corporate office - state', required: true, maxLength: 60 },
      { name: 'officePin', type: 'text', label: 'Corporate office - PIN code', required: true, maxLength: 10 },
      {
        name: 'officeMap',
        type: 'text',
        label: 'Corporate office - map location',
        parseAs: 'latLng',
        maxLength: 2000,
        help: 'Paste the Google Maps link of the place, or type its latitude and longitude like 26.8499, 75.7864. Leave empty to hide the map.',
      },
      { name: 'plantName', type: 'text', label: 'Plant - name', maxLength: 120, help: 'e.g. Rock Phosphate Beneficiation Plant' },
      { name: 'plantLine1', type: 'text', label: 'Plant - address line 1', required: true, maxLength: 120 },
      { name: 'plantLine2', type: 'text', label: 'Plant - address line 2', maxLength: 120 },
      { name: 'plantCity', type: 'text', label: 'Plant - city', required: true, maxLength: 60 },
      { name: 'plantState', type: 'text', label: 'Plant - state', required: true, maxLength: 60 },
      { name: 'plantPin', type: 'text', label: 'Plant - PIN code', required: true, maxLength: 10 },
      {
        name: 'plantMap',
        type: 'text',
        label: 'Plant - map location',
        parseAs: 'latLng',
        maxLength: 2000,
        help: 'Paste the Google Maps link of the plant, or type its latitude and longitude. Leave empty to hide the map.',
      },
      { name: 'linkedinUrl', type: 'text', label: 'LinkedIn page', maxLength: 300, help: 'The full https:// link. Leave empty to hide the LinkedIn button.' },
      { name: 'footerText', type: 'textarea', label: 'Footer description', maxLength: 400, help: 'The short company description at the bottom of every page.' },
      ...orderOnly,
    ],
  },

  // -------------------------------------------------------------------------
  // Home page banner
  // -------------------------------------------------------------------------
  'home-banner': {
    label: 'Home Banner Text',
    group: 'Home Page',
    description: 'The headline, badge and video on the big picture at the top of the home page.',
    file: 'home',
    key: 'banner',
    titleField: 'headline1',
    subtitleField: 'badge',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'badge', type: 'text', label: 'Badge', required: true, maxLength: 60, help: 'The small line above the headline.' },
      { name: 'headline1', type: 'text', label: 'Headline - line 1', required: true, maxLength: 40 },
      { name: 'headline2', type: 'text', label: 'Headline - line 2 (gold)', required: true, maxLength: 40 },
      { name: 'headline3', type: 'text', label: 'Headline - line 3', maxLength: 40 },
      { name: 'subheadline', type: 'text', label: 'Line under the headline', required: true, maxLength: 140 },
      {
        name: 'video',
        type: 'file',
        label: '"Watch Our Story" video',
        accept: 'video',
        required: true,
        help: 'Plays when a visitor presses Watch Our Story. An MP4 under 25 MB plays quickly on phones.',
      },
      ...orderOnly,
    ],
  },

  'home-slides': {
    label: 'Home Banner Photos',
    group: 'Home Page',
    description: 'The photos that slide behind the home page headline, every 5 seconds.',
    file: 'home',
    key: 'slides',
    titleField: 'alt',
    imageField: 'image',
    fields: [
      { name: 'image', type: 'image', label: 'Photo', required: true, help: 'Wide landscape photos work best - at least 1920 pixels wide.' },
      { name: 'alt', type: 'text', label: 'Photo description', required: true, maxLength: 160, help: 'What the photo shows. Read aloud by screen readers.' },
      ...recordFields,
    ],
  },

  'home-stats': {
    label: 'Home Banner Numbers',
    group: 'Home Page',
    description: 'The counting numbers under the home page headline. Up to four look best.',
    file: 'home',
    key: 'stats',
    titleField: 'value',
    subtitleField: 'label',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'value', type: 'text', label: 'Number to show', required: true, maxLength: 16, help: 'Starts with the number, e.g. 10 Lakh, +30% or 100%. The number counts up when the page opens.' },
      { name: 'label', type: 'text', label: 'Caption', required: true, maxLength: 60 },
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // About
  // -------------------------------------------------------------------------
  about: {
    label: 'About Us',
    group: 'About & Process',
    description: 'The About Our Company section: headline, paragraphs, vision, mission, key points and photos.',
    file: 'about',
    key: 'about',
    titleField: 'headline',
    subtitleField: 'headlineHighlight',
    imageField: 'photo1',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'headline', type: 'text', label: 'Headline', required: true, maxLength: 60 },
      { name: 'headlineHighlight', type: 'text', label: 'Headline - gold part', required: true, maxLength: 60 },
      { name: 'paragraphs', type: 'list', label: 'Paragraphs', required: true, maxItemLength: 1200, help: `One paragraph per line. ${boldHelp}` },
      { name: 'keyPoints', type: 'list', label: 'Key points (with ticks)', maxItemLength: 160 },
      { name: 'closing', type: 'textarea', label: 'Closing paragraph', maxLength: 800, help: boldHelp },
      { name: 'mission', type: 'textarea', label: 'Mission', required: true, maxLength: 500 },
      { name: 'vision', type: 'textarea', label: 'Vision', required: true, maxLength: 500 },
      { name: 'photo1', type: 'image', label: 'Top photo', required: true },
      { name: 'photo1Alt', type: 'text', label: 'Top photo description', maxLength: 160 },
      { name: 'photo2', type: 'image', label: 'Bottom photo', required: true },
      { name: 'photo2Alt', type: 'text', label: 'Bottom photo description', maxLength: 160 },
      ...orderOnly,
    ],
  },

  'about-highlights': {
    label: 'About Us Highlights',
    group: 'About & Process',
    description: 'The small cards under the About Us text, e.g. "Ministry of Fertilizer approved".',
    file: 'about',
    key: 'highlights',
    titleField: 'title',
    subtitleField: 'description',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 60 },
      { name: 'description', type: 'text', label: 'Description', required: true, maxLength: 160 },
      iconField,
      ...recordFields,
    ],
  },

  'plant-intro': {
    label: 'Manufacturing Facility',
    group: 'About & Process',
    description: 'The heading and description above the plant stages, also shown above the process steps.',
    file: 'process',
    key: 'facility',
    titleField: 'title',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'title', type: 'text', label: 'Heading', required: true, maxLength: 80 },
      { name: 'description', type: 'textarea', label: 'Description', required: true, maxLength: 1000 },
      ...orderOnly,
    ],
  },

  'plant-stages': {
    label: 'Plant Stages',
    group: 'About & Process',
    description: 'The photo cards of the plant: crushing, grinding, flotation and so on.',
    file: 'process',
    key: 'stages',
    titleField: 'title',
    imageField: 'image',
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 80 },
      { name: 'image', type: 'image', label: 'Photo', required: true },
      { name: 'points', type: 'list', label: 'Points', maxItemLength: 80, help: 'Short labels shown under the title.' },
      ...recordFields,
    ],
  },

  'process-steps': {
    label: 'Process Steps',
    group: 'About & Process',
    description: 'The numbered "From Ore to Product" steps, in order.',
    file: 'process',
    key: 'steps',
    titleField: 'title',
    subtitleField: 'description',
    imageField: '',
    fields: [
      { name: 'title', type: 'text', label: 'Step', required: true, maxLength: 80 },
      { name: 'description', type: 'textarea', label: 'Description', required: true, maxLength: 300 },
      iconField,
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // Products
  // -------------------------------------------------------------------------
  'products-intro': {
    label: 'Products Introduction',
    group: 'Products',
    description: 'The text above the product cards.',
    file: 'products',
    key: 'intro',
    titleField: 'titleGold',
    subtitleField: 'titleWhite',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'titleWhite', type: 'text', label: 'Heading - white part', maxLength: 60, help: 'e.g. "Rock &"' },
      { name: 'titleGold', type: 'text', label: 'Heading - gold part', required: true, maxLength: 80, help: 'e.g. "Phosphate Beneficiation"' },
      { name: 'description', type: 'textarea', label: 'Description', required: true, maxLength: 600 },
      ...orderOnly,
    ],
  },

  products: {
    label: 'Products',
    group: 'Products',
    description: 'Product grades. Each one gets its own large card.',
    file: 'products',
    key: 'products',
    titleField: 'name',
    subtitleField: 'grade',
    imageField: '',
    fields: [
      { name: 'name', type: 'text', label: 'Product name', required: true, maxLength: 80, help: 'e.g. BRP (P2O5) Grade' },
      { name: 'grade', type: 'text', label: 'Grade (large text)', required: true, maxLength: 16, help: 'e.g. +30%' },
      { name: 'compound', type: 'text', label: 'Compound', maxLength: 16, help: 'Shown next to the grade, e.g. P2O5' },
      { name: 'specification', type: 'text', label: 'Specification', maxLength: 120 },
      { name: 'application', type: 'text', label: 'Used for', maxLength: 160 },
      { name: 'premium', type: 'boolean', label: 'Show the "Premium" badge', default: true },
      ...recordFields,
    ],
  },

  'product-applications': {
    label: 'Product Applications',
    group: 'Products',
    description: 'The industries and uses shown under the products.',
    file: 'products',
    key: 'applications',
    titleField: 'name',
    subtitleField: 'emoji',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'name', type: 'text', label: 'Application', required: true, maxLength: 60 },
      { name: 'emoji', type: 'text', label: 'Symbol', maxLength: 8, help: 'One emoji, e.g. 🧪 🏭 🌾' },
      ...recordFields,
    ],
  },

  'plant-capacity': {
    label: 'Plant Capacity',
    group: 'Products',
    description: 'The capacity figures under Product Applications.',
    file: 'products',
    key: 'capacity',
    titleField: 'label',
    subtitleField: 'value',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'value', type: 'text', label: 'Figure', required: true, maxLength: 40, help: 'e.g. 10.0 Lakh MT' },
      { name: 'label', type: 'text', label: 'Caption', required: true, maxLength: 60 },
      { name: 'note', type: 'text', label: 'Small text under it', maxLength: 60, help: 'e.g. per annum' },
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // Why us
  // -------------------------------------------------------------------------
  'why-us': {
    label: 'Why Choose Us',
    group: 'About & Process',
    description: 'The four reasons in "The 3S Advantage".',
    file: 'why-us',
    key: 'reasons',
    titleField: 'title',
    subtitleField: 'description',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'title', type: 'text', label: 'Reason', required: true, maxLength: 60 },
      { name: 'description', type: 'textarea', label: 'Description', required: true, maxLength: 300 },
      iconField,
      ...recordFields,
    ],
  },

  industries: {
    label: 'Industries We Serve',
    group: 'About & Process',
    description: 'The names under "Trusted By Industry Leaders".',
    file: 'why-us',
    key: 'industries',
    titleField: 'name',
    imageField: '',
    display: 'cards',
    fields: [{ name: 'name', type: 'text', label: 'Industry', required: true, maxLength: 60 }, ...recordFields],
  },

  // -------------------------------------------------------------------------
  // ESG
  // -------------------------------------------------------------------------
  'esg-text': {
    label: 'ESG Commitment',
    group: 'ESG',
    description: 'The ESG introduction and the social responsibility points.',
    file: 'esg',
    key: 'text',
    titleField: 'intro',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'intro', type: 'textarea', label: 'Introduction', required: true, maxLength: 800 },
      { name: 'environmentalIntro', type: 'textarea', label: 'Environmental responsibility - introduction', required: true, maxLength: 400 },
      { name: 'environmentalFooter', type: 'textarea', label: 'Environmental responsibility - closing line', maxLength: 300 },
      { name: 'socialIntro', type: 'textarea', label: 'Social responsibility - introduction', required: true, maxLength: 400 },
      { name: 'employeePoints', type: 'list', label: 'Employee well-being & safety - points', required: true, maxItemLength: 200 },
      { name: 'communityPoints', type: 'list', label: 'Community & societal contribution - points', required: true, maxItemLength: 200 },
      ...orderOnly,
    ],
  },

  'esg-practices': {
    label: 'Environmental Practices',
    group: 'ESG',
    description: 'The environmental practice cards in the ESG section.',
    file: 'esg',
    key: 'practices',
    titleField: 'title',
    subtitleField: 'description',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'title', type: 'text', label: 'Practice', required: true, maxLength: 80 },
      { name: 'description', type: 'text', label: 'Description', required: true, maxLength: 200 },
      iconField,
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // Investor relations
  // -------------------------------------------------------------------------
  'investor-text': {
    label: 'Investor Relations Text',
    group: 'Investor Relations',
    description: 'The introduction, financial information text and statutory compliance in Investor Relations.',
    file: 'investors',
    key: 'text',
    titleField: 'subtitle',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'subtitle', type: 'textarea', label: 'Introduction', required: true, maxLength: 500 },
      { name: 'intro', type: 'textarea', label: 'Second paragraph', maxLength: 600 },
      { name: 'financialDescription', type: 'textarea', label: 'Financial information - text', maxLength: 500 },
      { name: 'statutoryLaws', type: 'list', label: 'Statutory compliance - laws', maxItemLength: 160 },
      { name: 'statutoryFooter', type: 'textarea', label: 'Statutory compliance - closing line', maxLength: 400 },
      ...orderOnly,
    ],
  },

  'annual-reports': {
    label: 'Annual Reports',
    group: 'Investor Relations',
    description: 'One row per financial year with its report. Visitors pick a year and download the PDF. The year picker appears on the website once at least one report is published.',
    /**
     * Not shown in the admin (the client asked for it to be removed). The
     * rows stay in the content, all unpublished, so the website shows no
     * year picker. Remove this line to bring the section back.
     */
    hidden: true,
    file: 'investors',
    key: 'reports',
    titleField: 'year',
    imageField: '',
    fields: [
      { name: 'year', type: 'text', label: 'Financial year', required: true, unique: true, maxLength: 20, help: 'e.g. 2025-2026' },
      { name: 'file', type: 'file', label: 'Report (PDF)', required: true },
      ...recordFields,
    ],
  },

  'corporate-details': {
    label: 'Corporate Details',
    group: 'Investor Relations',
    description: 'Company name, CIN, PAN, GSTIN and registered office, shown in Investor Relations.',
    file: 'investors',
    key: 'corporate',
    titleField: 'label',
    subtitleField: 'value',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'label', type: 'text', label: 'Detail', required: true, maxLength: 60, help: 'e.g. GSTIN' },
      { name: 'value', type: 'text', label: 'Value', required: true, maxLength: 200 },
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // Careers
  // -------------------------------------------------------------------------
  'career-openings': {
    label: 'Career Openings',
    group: 'Careers',
    description: 'Current opportunities. They are listed on the site and offered in the application form.',
    file: 'careers',
    key: 'positions',
    titleField: 'title',
    imageField: '',
    fields: [
      { name: 'title', type: 'text', label: 'Position', required: true, unique: true, maxLength: 80 },
      ...recordFields,
    ],
  },

  'career-benefits': {
    label: 'Why Work With Us',
    group: 'Careers',
    description: 'The benefit cards in the Careers section.',
    file: 'careers',
    key: 'benefits',
    titleField: 'title',
    subtitleField: 'description',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'title', type: 'text', label: 'Benefit', required: true, maxLength: 60 },
      { name: 'description', type: 'text', label: 'Description', required: true, maxLength: 160 },
      iconField,
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // Vendors
  // -------------------------------------------------------------------------
  'vendor-text': {
    label: 'Vendor Empanelment',
    group: 'Vendors',
    description: 'The text, process steps and benefits in the Vendor Empanelment section.',
    file: 'vendors',
    key: 'text',
    titleField: 'paragraph1',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'paragraph1', type: 'textarea', label: 'Introduction', required: true, maxLength: 500 },
      { name: 'paragraph2', type: 'textarea', label: 'Second paragraph', maxLength: 500 },
      { name: 'steps', type: 'list', label: 'Empanelment process - steps in order', required: true, maxItemLength: 160 },
      { name: 'benefits', type: 'list', label: 'Benefits of partnership', required: true, maxItemLength: 200 },
      ...orderOnly,
    ],
  },

  'vendor-requirements': {
    label: 'Vendor Requirements',
    group: 'Vendors',
    description: 'The requirement cards, e.g. Business Registration and Required Documents.',
    file: 'vendors',
    key: 'requirements',
    titleField: 'title',
    subtitleField: 'description',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'title', type: 'text', label: 'Requirement', required: true, maxLength: 60 },
      { name: 'description', type: 'text', label: 'Description', required: true, maxLength: 200 },
      iconField,
      ...recordFields,
    ],
  },

  'supply-types': {
    label: 'Supply Types',
    group: 'Vendors',
    description: 'The "Nature of Supply / Service" choices on the vendor form. "Other (please specify)" is always offered last.',
    file: 'vendors',
    key: 'supplyTypes',
    titleField: 'name',
    imageField: '',
    fields: [
      { name: 'name', type: 'text', label: 'Supply / service type', required: true, unique: true, maxLength: 60 },
      {
        name: 'icon',
        type: 'select',
        label: 'Icon',
        required: true,
        options: [
          { value: 'Package', label: 'Package (materials)' },
          { value: 'FlaskConical', label: 'Lab flask (chemicals)' },
          { value: 'Wrench', label: 'Wrench (machinery)' },
          { value: 'Zap', label: 'Lightning (electrical)' },
          { value: 'Truck', label: 'Truck (transport)' },
          { value: 'HardHat', label: 'Hard hat (construction)' },
        ],
      },
      ...recordFields,
    ],
  },
};
