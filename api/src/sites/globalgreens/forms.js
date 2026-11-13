/**
 * What visitors send from 3sglobalgreens.com. The website posts enquiries
 * to /api/forms/globalgreens/enquiry (as well as emailing them through its
 * own mail service), so staff can follow them up under "Leads".
 * Field and option reference: api/src/core/forms.js.
 *
 * Career applications are not here: they carry a resume, and the site sends
 * them by email through its mail service.
 */

export const forms = {
  enquiry: {
    label: 'Buy / Sell Enquiries',
    description: 'From the enquiry form on the Contact page - buyers of refined lead and sellers of lead-bearing material.',
    idPrefix: 'GG-EN',
    titleField: 'name',
    phoneField: 'mobile',
    emailField: 'email',
    interestField: 'purpose',
    interestAllLabel: 'Buyers and sellers',
    listFields: ['contactPerson', 'productType', 'location'],
    commentField: 'message',
    fields: [
      {
        name: 'purpose',
        type: 'select',
        label: 'Wants to',
        required: true,
        options: [
          { value: 'buy', label: 'Buy refined lead / alloys' },
          { value: 'sell', label: 'Sell lead-bearing material' },
        ],
      },
      { name: 'name', type: 'text', label: 'Company / name', required: true, minLength: 2, maxLength: 150 },
      { name: 'contactPerson', type: 'text', label: 'Contact person', required: true, minLength: 2, maxLength: 100 },
      { name: 'mobile', type: 'phone', label: 'Mobile', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'productType', type: 'text', label: 'Product / scrap type', required: true, minLength: 2, maxLength: 150 },
      { name: 'quantity', type: 'text', label: 'Quantity', maxLength: 100 },
      { name: 'location', type: 'text', label: 'Location', required: true, minLength: 2, maxLength: 150 },
      { name: 'message', type: 'textarea', label: 'Message', maxLength: 2000 },
    ],
  },
};
