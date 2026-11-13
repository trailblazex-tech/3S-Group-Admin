/**
 * What visitors send from 3sminerals.co.in. The website posts these to
 * /api/forms/minerals/<form>; staff read them under "Leads".
 * Field and option reference: api/src/core/forms.js.
 *
 * Career applications are not here: they carry a resume, and the site sends
 * them by email through its own career-application Lambda.
 */

export const forms = {
  contact: {
    label: 'Contact Enquiries',
    description: 'From the "Send us a Message" form in the Contact section.',
    idPrefix: '3M-EN',
    titleField: 'name',
    phoneField: 'phone',
    emailField: 'email',
    listFields: ['company'],
    commentField: 'message',
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true, minLength: 2, maxLength: 100 },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'company', type: 'text', label: 'Company', maxLength: 150 },
      { name: 'phone', type: 'phone', label: 'Phone', format: 'any' },
      { name: 'message', type: 'textarea', label: 'Message', required: true, minLength: 2, maxLength: 3000 },
    ],
  },

  vendor: {
    label: 'Vendor Enquiries',
    description: 'From the Vendor / Supplier Enquiry page.',
    idPrefix: '3M-VN',
    titleField: 'companyName',
    phoneField: 'mobile',
    emailField: 'email',
    listFields: ['contactPerson', 'supplyType', 'otherSupplyType'],
    commentField: 'description',
    fields: [
      { name: 'companyName', type: 'text', label: 'Company', required: true, minLength: 2, maxLength: 150 },
      { name: 'contactPerson', type: 'text', label: 'Contact person', required: true, minLength: 2, maxLength: 100 },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'mobile', type: 'phone', label: 'Mobile', required: true, format: 'any' },
      { name: 'supplyType', type: 'text', label: 'Nature of supply / service', required: true, maxLength: 100 },
      { name: 'otherSupplyType', type: 'text', label: 'Other supply type', maxLength: 150 },
      { name: 'description', type: 'textarea', label: 'Products / services', required: true, minLength: 2, maxLength: 3000 },
      { name: 'profileLink', type: 'text', label: 'Company website or profile link', maxLength: 500 },
    ],
  },
};
