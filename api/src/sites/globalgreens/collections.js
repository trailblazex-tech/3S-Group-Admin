/**
 * 3S Global Greens (3sglobalgreens.com) - everything its admin can edit.
 * Option and field-type reference: api/src/core/schema.js.
 *
 * The website reads these from content/*.json (file / key below) through its
 * data/*.ts modules. Page headings, legal pages, navigation and the metal
 * price panel stay in the site's code.
 */

/** Fields every editable record carries. */
const recordFields = [
  { name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true },
  { name: 'isActive', type: 'boolean', label: 'Published', default: true },
];

/** A row edited in place (no hiding, no adding). */
const orderOnly = [{ name: 'sortOrder', type: 'number', label: 'Order', min: 1, adminOnly: true }];

const photo = (label = 'Photo', required = true) => [
  { name: 'image', type: 'image', label, required, help: 'Landscape photos work best.' },
  { name: 'imageAlt', type: 'text', label: `${label} description`, required, maxLength: 200, help: 'What the photo shows. Read aloud by screen readers.' },
];

const titleCopy = (titleLabel = 'Title', copyLabel = 'Text', copyMax = 400) => [
  { name: 'title', type: 'text', label: titleLabel, required: true, maxLength: 100 },
  { name: 'copy', type: 'textarea', label: copyLabel, required: true, maxLength: copyMax },
];

export const collections = {
  // -------------------------------------------------------------------------
  // Company
  // -------------------------------------------------------------------------
  'company-profile': {
    label: 'Company Profile',
    group: 'Company',
    description: 'Tagline, description, vision, mission and the year operations began - used across the site.',
    file: 'company',
    key: 'profile',
    titleField: 'headline',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'positioning', type: 'text', label: 'Slogan', required: true, maxLength: 60, help: 'The large line across the footer, e.g. "Recover. Refine. Reimagine."' },
      { name: 'brandLine', type: 'text', label: 'Brand line', required: true, maxLength: 80 },
      { name: 'headline', type: 'text', label: 'Headline', required: true, maxLength: 120, help: 'Used in search results and when the site is shared.' },
      { name: 'description', type: 'textarea', label: 'Company description', required: true, maxLength: 600 },
      {
        name: 'operatingSince',
        type: 'number',
        label: 'Year operations began',
        required: true,
        min: 1950,
        max: 2100,
        help: 'The "Years of Operation" counter is worked out from this year.',
      },
      { name: 'vision', type: 'textarea', label: 'Vision', required: true, maxLength: 400 },
      { name: 'mission', type: 'list', label: 'Mission points', required: true, maxItemLength: 200 },
      { name: 'differentiators', type: 'list', label: 'Why choose us', required: true, maxItemLength: 160 },
      { name: 'linkedinUrl', type: 'text', label: 'LinkedIn page', maxLength: 300, help: 'The full https:// link. Leave empty to hide the LinkedIn link in the footer.' },
      ...orderOnly,
    ],
  },

  'contact-details': {
    label: 'Contact Details',
    group: 'Company',
    description: 'Phone numbers and emails shown in the footer, menu, WhatsApp button, Contact and Careers pages, and the legal pages.',
    file: 'company',
    key: 'contact',
    titleField: 'businessEmail',
    subtitleField: 'phone',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'phone', type: 'text', label: 'Main phone number', required: true, maxLength: 30, help: 'Given to search engines as the company number.' },
      { name: 'directName', type: 'text', label: 'Contact person', required: true, maxLength: 60, help: 'Shown in the footer next to the direct number, e.g. "Sanjit".' },
      {
        name: 'directPhone',
        type: 'text',
        label: "Contact person's mobile",
        required: true,
        maxLength: 30,
        help: 'An Indian mobile, e.g. +91 98931 62454. Used for calls on the Contact page, menu and footer, and for the WhatsApp button.',
      },
      { name: 'businessEmail', type: 'text', label: 'Business enquiries email', required: true, maxLength: 254 },
      { name: 'careersContactName', type: 'text', label: 'HR contact person', maxLength: 60, help: 'Shown on the Careers page. Leave empty to show only the email.' },
      { name: 'careersEmail', type: 'text', label: 'HR / careers email', required: true, maxLength: 254, help: 'Shown on the Careers page.' },
      { name: 'careersPhone', type: 'text', label: 'HR mobile', maxLength: 30, help: 'Shown on the Careers page. Leave empty to hide.' },
      ...orderOnly,
    ],
  },

  locations: {
    label: 'Locations',
    group: 'Company',
    description: 'The corporate office and the manufacturing unit: addresses, photos and directions.',
    file: 'company',
    key: 'locations',
    titleField: 'label',
    subtitleField: 'locality',
    imageField: 'image',
    fixed: true,
    fields: [
      { name: 'label', type: 'text', label: 'Name', required: true, maxLength: 60 },
      {
        name: 'kind',
        type: 'select',
        label: 'Type',
        required: true,
        options: [
          { value: 'corporate', label: 'Corporate office' },
          { value: 'plant', label: 'Manufacturing unit' },
        ],
      },
      { name: 'addressLines', type: 'list', label: 'Address lines', required: true, maxItemLength: 120, help: 'One line per row, before the city.' },
      { name: 'locality', type: 'text', label: 'City', required: true, maxLength: 60 },
      { name: 'region', type: 'text', label: 'State', required: true, maxLength: 60 },
      { name: 'postalCode', type: 'text', label: 'PIN code', maxLength: 12 },
      { name: 'country', type: 'text', label: 'Country', required: true, maxLength: 60 },
      { name: 'mapQuery', type: 'text', label: 'Address for directions', required: true, maxLength: 300, help: 'What "Get directions" searches for on Google Maps - usually the full address.' },
      ...photo(),
      ...orderOnly,
    ],
  },

  leadership: {
    label: 'Leadership',
    group: 'Company',
    description: 'The leadership cards on the About page.',
    file: 'leadership',
    key: 'leaders',
    titleField: 'name',
    subtitleField: 'designation',
    imageField: 'photo',
    fields: [
      { name: 'name', type: 'text', label: 'Full name', required: true, maxLength: 80, help: 'As it should appear, e.g. "Mr. Ashu Tripathi".' },
      { name: 'designation', type: 'text', label: 'Designation', required: true, maxLength: 60 },
      { name: 'focus', type: 'text', label: 'Area of responsibility', maxLength: 80, help: 'The small line under the designation.' },
      { name: 'bio', type: 'textarea', label: 'Profile', required: true, maxLength: 500 },
      { name: 'photo', type: 'image', label: 'Portrait photo', required: true, help: 'A portrait (taller than wide) photo.' },
      { name: 'photoAlt', type: 'text', label: 'Photo description', maxLength: 160 },
      {
        name: 'photoFocus',
        type: 'select',
        label: 'Photo framing',
        options: [
          { value: 'top', label: 'Keep the top of the photo (default)' },
          { value: 'upper', label: 'A little below the top' },
          { value: 'center', label: 'Centre of the photo' },
        ],
        help: 'Which part of the photo stays in view when it is cropped.',
      },
      { name: 'badge', type: 'text', label: 'Badge', maxLength: 30, help: 'The small label at the top of the card, e.g. "Executive Leadership".' },
      {
        name: 'badgeColour',
        type: 'select',
        label: 'Badge colour',
        options: [
          { value: 'gold', label: 'Gold' },
          { value: 'green', label: 'Green' },
        ],
      },
      { name: 'highlights', type: 'list', label: 'Strengths', maxItemLength: 40, help: 'Short tags at the bottom of the card. Three fit best.' },
      ...recordFields,
    ],
  },

  history: {
    label: 'Company History',
    group: 'Company',
    description: 'The numbered milestones in "Company history & milestones" on the About page.',
    file: 'history',
    key: 'milestones',
    titleField: 'title',
    subtitleField: 'year',
    imageField: 'image',
    fields: [
      { name: 'year', type: 'text', label: 'Year or period', required: true, maxLength: 20, help: 'e.g. 2015, Continuous, Today' },
      { name: 'period', type: 'text', label: 'Small heading', required: true, maxLength: 60 },
      { name: 'phase', type: 'text', label: 'Phase label', required: true, maxLength: 60, help: 'e.g. Phase 01 · Commissioning' },
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 100 },
      { name: 'lead', type: 'text', label: 'One-line summary', required: true, maxLength: 200 },
      { name: 'description', type: 'textarea', label: 'Description', required: true, maxLength: 1200 },
      ...photo(),
      { name: 'badge', type: 'text', label: 'Badge on the photo', maxLength: 60 },
      { name: 'highlights', type: 'list', label: 'Highlights', maxItemLength: 80 },
      ...recordFields,
    ],
  },

  certifications: {
    label: 'Certifications',
    group: 'Company',
    description: 'ISO and other certificates, shown on the Certifications page and the home page. Add the certificate PDF so visitors can open it.',
    file: 'certifications',
    key: 'certificates',
    titleField: 'isoStandard',
    subtitleField: 'title',
    imageField: '',
    fields: [
      { name: 'isoStandard', type: 'text', label: 'Standard', required: true, maxLength: 40, help: 'e.g. ISO 9001:2015' },
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 120, help: 'e.g. Quality Management System' },
      {
        name: 'category',
        type: 'select',
        label: 'Category',
        required: true,
        options: [
          { value: 'quality', label: 'Quality' },
          { value: 'sustainability', label: 'Sustainability' },
          { value: 'regulatory', label: 'Regulatory' },
          { value: 'corporate', label: 'Corporate' },
        ],
      },
      { name: 'certificateNumber', type: 'text', label: 'Certificate number', required: true, maxLength: 60 },
      { name: 'issuedOn', type: 'text', label: 'Issued on', required: true, maxLength: 40, help: 'As printed, e.g. 7th January 2026' },
      { name: 'validUntil', type: 'text', label: 'Valid until', required: true, maxLength: 40 },
      { name: 'issuer', type: 'text', label: 'Issued by', required: true, maxLength: 120 },
      { name: 'accreditation', type: 'text', label: 'Accreditation', maxLength: 160 },
      { name: 'scope', type: 'textarea', label: 'Scope', maxLength: 500 },
      { name: 'surveillance1', type: 'text', label: 'First surveillance audit', maxLength: 40 },
      { name: 'surveillance2', type: 'text', label: 'Second surveillance audit', maxLength: 40 },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { value: 'Active', label: 'Active' },
          { value: 'Verified', label: 'Verified' },
        ],
      },
      { name: 'file', type: 'file', label: 'Certificate (PDF)', help: 'When added, the certificate gets a "View certificate" link.' },
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // Numbers
  // -------------------------------------------------------------------------
  'impact-figures': {
    label: 'Impact Figures',
    group: 'Figures',
    description: 'Figures on the ESG page (capacity, recovery, water, energy, people, safety). A figure only shows on the website once it has a number.',
    file: 'metrics',
    key: 'impact',
    titleField: 'label',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'label', type: 'text', label: 'Figure', required: true, maxLength: 60 },
      { name: 'value', type: 'number', label: 'Number', min: 0, decimals: 2, help: 'Leave empty until there is a verified number - the figure stays hidden until then.' },
      { name: 'suffix', type: 'text', label: 'After the number', maxLength: 6, help: 'e.g. %' },
      { name: 'unit', type: 'text', label: 'Unit', maxLength: 20, help: 'Shown after the label, e.g. TPA' },
      { name: 'caption', type: 'text', label: 'Small print', maxLength: 120 },
      ...recordFields,
    ],
  },

  'impact-statements': {
    label: 'Impact Statements',
    group: 'Figures',
    description: 'The photo statements on the home page and the ESG page, e.g. "Reduced dependence on primary mining".',
    file: 'metrics',
    key: 'statements',
    titleField: 'text',
    subtitleField: 'label',
    imageField: 'image',
    fields: [
      { name: 'text', type: 'text', label: 'Statement', required: true, maxLength: 100 },
      { name: 'label', type: 'text', label: 'Label', required: true, maxLength: 40, help: 'e.g. Water, Air, Waste' },
      ...photo(),
      ...recordFields,
    ],
  },

  'industry-figures': {
    label: 'Recovery Figures',
    group: 'Figures',
    description: 'The figures in the circular-economy panel on the home page (material processed, recovery rate...). A figure only shows once it has a number.',
    file: 'metrics',
    key: 'waste',
    titleField: 'label',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'label', type: 'text', label: 'Figure', required: true, maxLength: 80 },
      { name: 'value', type: 'number', label: 'Number', min: 0, decimals: 2, help: 'Leave empty until there is a verified number.' },
      { name: 'suffix', type: 'text', label: 'After the number', maxLength: 6 },
      { name: 'unit', type: 'text', label: 'Unit', maxLength: 30 },
      { name: 'note', type: 'text', label: 'Small print', maxLength: 160 },
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // Products
  // -------------------------------------------------------------------------
  products: {
    label: 'Products',
    group: 'Products & Services',
    description: 'Refined lead and alloy products, on the home page and Products & Services.',
    file: 'products',
    key: 'products',
    titleField: 'name',
    subtitleField: 'tagline',
    imageField: 'image',
    fields: [
      { name: 'name', type: 'text', label: 'Product name', required: true, maxLength: 80 },
      { name: 'tagline', type: 'text', label: 'Tagline', required: true, maxLength: 120 },
      { name: 'copy', type: 'textarea', label: 'Description', required: true, maxLength: 600 },
      { name: 'applications', type: 'list', label: 'Applications', required: true, maxItemLength: 80 },
      { name: 'specificationFields', type: 'list', label: 'Specification details offered', maxItemLength: 80, help: 'What the specification sheet covers, e.g. Lead purity.' },
      ...photo(),
      ...recordFields,
    ],
  },

  services: {
    label: 'Services',
    group: 'Products & Services',
    description: 'Recycling and processing services.',
    file: 'products',
    key: 'services',
    titleField: 'title',
    imageField: 'image',
    fields: [...titleCopy('Service', 'Description'), ...photo(), ...recordFields],
  },

  industries: {
    label: 'Industries We Serve',
    group: 'Products & Services',
    description: 'The industries on the home page, each with its uses.',
    file: 'products',
    key: 'industries',
    titleField: 'name',
    subtitleField: 'headline',
    imageField: 'image',
    fields: [
      { name: 'name', type: 'text', label: 'Industry', required: true, maxLength: 80 },
      { name: 'headline', type: 'text', label: 'Headline', required: true, maxLength: 100 },
      { name: 'copy', type: 'textarea', label: 'Description', required: true, maxLength: 600 },
      { name: 'applications', type: 'list', label: 'Applications', required: true, maxItemLength: 80 },
      { name: 'loop', type: 'list', label: 'Moving ticker items', maxItemLength: 80, help: 'The names that scroll along the card. Usually the same as the applications.' },
      ...photo(),
      ...recordFields,
    ],
  },

  'quality-text': {
    label: 'Quality',
    group: 'Products & Services',
    description: 'The "Quality You Can Verify" section and the technical details list on Products & Services.',
    file: 'quality',
    key: 'text',
    titleField: 'title',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'title', type: 'text', label: 'Heading', required: true, maxLength: 80 },
      { name: 'lede', type: 'textarea', label: 'Introduction', required: true, maxLength: 300 },
      { name: 'passport', type: 'textarea', label: 'Batch record note', maxLength: 400 },
      { name: 'disclaimer', type: 'text', label: 'Illustration note', maxLength: 160 },
      { name: 'technicalFields', type: 'list', label: 'Technical details available', maxItemLength: 80 },
      ...orderOnly,
    ],
  },

  'batch-journey': {
    label: 'Batch Record',
    group: 'Products & Services',
    description: 'The steps of the batch record in the Quality section, in order.',
    file: 'quality',
    key: 'batch',
    titleField: 'label',
    subtitleField: 'detail',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'label', type: 'text', label: 'Step', required: true, maxLength: 60 },
      { name: 'detail', type: 'text', label: 'Detail', required: true, maxLength: 160 },
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // Process
  // -------------------------------------------------------------------------
  'process-stages': {
    label: 'Manufacturing Process',
    group: 'Process',
    description: 'The numbered manufacturing stages on Products & Services, in order.',
    file: 'process',
    key: 'stages',
    titleField: 'title',
    subtitleField: 'objective',
    imageField: 'image',
    fields: [
      { name: 'title', type: 'text', label: 'Stage', required: true, maxLength: 100 },
      { name: 'lede', type: 'text', label: 'One-line summary', required: true, maxLength: 160 },
      { name: 'detail', type: 'list', label: 'What happens', required: true, maxItemLength: 200 },
      { name: 'objective', type: 'text', label: 'Objective', required: true, maxLength: 200 },
      ...photo(),
      ...recordFields,
    ],
  },

  'material-journey': {
    label: 'Material Journey',
    group: 'Process',
    description: 'Recover - Refine - Verify - Deliver - Repeat, on the home page.',
    file: 'process',
    key: 'journey',
    titleField: 'label',
    subtitleField: 'title',
    imageField: 'image',
    fixed: true,
    fields: [
      { name: 'label', type: 'text', label: 'Step', required: true, maxLength: 30 },
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 100 },
      { name: 'copy', type: 'textarea', label: 'Text', required: true, maxLength: 400 },
      ...photo(),
      { name: 'caption', type: 'text', label: 'Caption on the photo', required: true, maxLength: 40 },
      ...orderOnly,
    ],
  },

  promises: {
    label: 'Our Promises',
    group: 'Process',
    description: 'The promises on the About page.',
    file: 'process',
    key: 'promises',
    titleField: 'title',
    imageField: 'image',
    fields: [...titleCopy('Promise'), ...photo(), ...recordFields],
  },

  // -------------------------------------------------------------------------
  // ESG
  // -------------------------------------------------------------------------
  'esg-pillars': {
    label: 'ESG Pillars',
    group: 'ESG',
    description: 'Environmental, Social and Governance: the heading, introduction and photo of each.',
    file: 'esg',
    key: 'pillars',
    titleField: 'title',
    imageField: 'image',
    fixed: true,
    fields: [
      { name: 'title', type: 'text', label: 'Heading', required: true, maxLength: 80 },
      { name: 'lede', type: 'textarea', label: 'Introduction', required: true, maxLength: 300 },
      ...photo(),
      {
        name: 'imagePosition',
        type: 'select',
        label: 'Photo framing',
        options: [
          { value: 'object-center', label: 'Centre of the photo' },
          { value: 'object-top', label: 'Top of the photo' },
          { value: 'object-[center_85%]', label: 'Near the bottom of the photo' },
        ],
      },
      ...orderOnly,
    ],
  },

  'esg-points': {
    label: 'ESG Commitments',
    group: 'ESG',
    description: 'The points under each ESG pillar.',
    file: 'esg',
    key: 'points',
    titleField: 'title',
    subtitleField: 'pillar',
    imageField: '',
    groupField: 'pillar',
    groups: [
      { value: 'environment', label: 'Environmental' },
      { value: 'social', label: 'Social' },
      { value: 'governance', label: 'Governance' },
    ],
    fields: [
      {
        name: 'pillar',
        type: 'select',
        label: 'Pillar',
        required: true,
        options: [
          { value: 'environment', label: 'Environmental' },
          { value: 'social', label: 'Social' },
          { value: 'governance', label: 'Governance' },
        ],
      },
      ...titleCopy('Commitment'),
      ...recordFields,
    ],
  },

  'esg-sourcing': {
    label: 'Responsible Sourcing',
    group: 'ESG',
    description: 'The responsible sourcing heading and the safety systems list on the ESG page.',
    file: 'esg',
    key: 'sourcing',
    titleField: 'title',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'title', type: 'text', label: 'Heading', required: true, maxLength: 100 },
      { name: 'lede', type: 'text', label: 'Introduction', required: true, maxLength: 200 },
      { name: 'safetySystems', type: 'list', label: 'Safety systems', required: true, maxItemLength: 80 },
      ...orderOnly,
    ],
  },

  'sourcing-principles': {
    label: 'Sourcing Principles',
    group: 'ESG',
    description: 'Compliance, traceability, safety... under Responsible Sourcing.',
    file: 'esg',
    key: 'principles',
    titleField: 'title',
    subtitleField: 'copy',
    imageField: '',
    display: 'cards',
    fields: [...titleCopy('Principle', 'Text', 300), ...recordFields],
  },

  'future-initiatives': {
    label: 'Future Initiatives',
    group: 'ESG',
    description: 'The "Beyond recycling" initiatives on the ESG page.',
    file: 'esg',
    key: 'initiatives',
    titleField: 'title',
    subtitleField: 'copy',
    imageField: '',
    display: 'cards',
    fields: [...titleCopy('Initiative', 'Text', 300), ...recordFields],
  },

  // -------------------------------------------------------------------------
  // About page
  // -------------------------------------------------------------------------
  'sell-pathway': {
    label: 'Sell To Us',
    group: 'About Page',
    description: 'The section for suppliers of lead-bearing material: text, photo, who can sell, and principles.',
    file: 'about',
    key: 'sell',
    titleField: 'title',
    imageField: 'image',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'eyebrow', type: 'text', label: 'Small heading', required: true, maxLength: 80 },
      { name: 'title', type: 'text', label: 'Heading', required: true, maxLength: 100 },
      { name: 'lede', type: 'textarea', label: 'Introduction', required: true, maxLength: 500 },
      ...photo(),
      { name: 'audiences', type: 'list', label: 'Who can sell to us', maxItemLength: 60 },
      { name: 'principles', type: 'list', label: 'Principles', maxItemLength: 60 },
      ...orderOnly,
    ],
  },

  'sell-steps': {
    label: 'Selling Steps',
    group: 'About Page',
    description: 'The numbered steps for selling material to 3S Global Greens, in order.',
    file: 'about',
    key: 'steps',
    titleField: 'label',
    subtitleField: 'copy',
    imageField: '',
    display: 'cards',
    fields: [
      { name: 'label', type: 'text', label: 'Step', required: true, maxLength: 60 },
      { name: 'copy', type: 'text', label: 'Text', required: true, maxLength: 200 },
      ...recordFields,
    ],
  },

  expertise: {
    label: 'Our Expertise',
    group: 'About Page',
    description: 'The expertise cards on the About page.',
    file: 'about',
    key: 'expertise',
    titleField: 'title',
    subtitleField: 'copy',
    imageField: '',
    display: 'cards',
    fields: [...titleCopy('Area', 'Text', 300), ...recordFields],
  },

  'people-roles': {
    label: 'Our People',
    group: 'About Page',
    description: 'The team roles on the About page.',
    file: 'about',
    key: 'roles',
    titleField: 'title',
    subtitleField: 'copy',
    imageField: '',
    display: 'cards',
    fields: [...titleCopy('Role', 'Text', 200), ...recordFields],
  },

  // -------------------------------------------------------------------------
  // Plant gallery
  // -------------------------------------------------------------------------
  'plant-gallery': {
    label: 'Plant Gallery',
    group: 'Gallery',
    description: 'Plant photos: the home page slider, and the pollution-control and storage galleries on the About page.',
    file: 'gallery',
    key: 'plates',
    titleField: 'title',
    subtitleField: 'category',
    imageField: 'src',
    groupField: 'set',
    groups: [
      { value: 'plant', label: 'Home page slider' },
      { value: 'pollution', label: 'Pollution control (About)' },
      { value: 'storage', label: 'Storage (About)' },
    ],
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true, maxLength: 80 },
      { name: 'src', type: 'image', label: 'Photo', required: true },
      { name: 'alt', type: 'text', label: 'Photo description', required: true, maxLength: 200 },
      {
        name: 'set',
        type: 'select',
        label: 'Shown in',
        required: true,
        options: [
          { value: 'plant', label: 'Home page slider' },
          { value: 'pollution', label: 'Pollution control gallery (About)' },
          { value: 'storage', label: 'Storage gallery (About)' },
        ],
      },
      {
        name: 'category',
        type: 'select',
        label: 'Category',
        required: true,
        options: [
          { value: 'Furnace', label: 'Furnace' },
          { value: 'Process', label: 'Process' },
          { value: 'Refining', label: 'Refining' },
          { value: 'Pollution control', label: 'Pollution control' },
          { value: 'Storage', label: 'Storage' },
        ],
      },
      {
        name: 'shape',
        type: 'select',
        label: 'Shape in the About galleries',
        options: [
          { value: 'portrait', label: 'Portrait (default)' },
          { value: 'landscape', label: 'Landscape' },
        ],
      },
      ...recordFields,
    ],
  },

  // -------------------------------------------------------------------------
  // Careers
  // -------------------------------------------------------------------------
  'careers-page': {
    label: 'Careers Page',
    group: 'Careers',
    description: 'The careers heading and introduction.',
    file: 'careers',
    key: 'page',
    titleField: 'title',
    imageField: '',
    fixed: true,
    display: 'form',
    fields: [
      { name: 'title', type: 'text', label: 'Heading', required: true, maxLength: 100 },
      { name: 'lede', type: 'textarea', label: 'Introduction', required: true, maxLength: 300 },
      ...orderOnly,
    ],
  },

  'career-pillars': {
    label: 'Why Work With Us',
    group: 'Careers',
    description: 'The photo cards on the Careers page.',
    file: 'careers',
    key: 'pillars',
    titleField: 'title',
    imageField: 'image',
    fields: [...titleCopy('Title', 'Text', 300), ...photo(), ...recordFields],
  },

  departments: {
    label: 'Departments',
    group: 'Careers',
    description: 'The departments people can apply to on the career form.',
    file: 'careers',
    key: 'departments',
    titleField: 'name',
    imageField: '',
    fields: [{ name: 'name', type: 'text', label: 'Department', required: true, unique: true, maxLength: 60 }, ...recordFields],
  },
};
