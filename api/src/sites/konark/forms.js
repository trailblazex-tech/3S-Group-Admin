/**
 * What visitors send from thekonarkacademy.com. The website posts these to
 * /api/forms/konark/<form>; the office reads them under "Feedback & Leads".
 * Field and option reference: api/src/core/forms.js.
 */

export const forms = {
  feedback: {
    label: 'Parent Feedback',
    description: 'From the feedback form parents fill in at reception (the QR code poster) or on the website.',
    idPrefix: 'KA-FB',
    titleField: 'parentName',
    phoneField: 'mobile',
    emailField: 'email',
    ratingsField: 'ratings',
    interestField: 'admissionInterest',
    fields: [
      { name: 'parentName', type: 'text', label: 'Parent name', required: true, minLength: 2, maxLength: 100 },
      { name: 'mobile', type: 'phone', label: 'Mobile', required: true },
      { name: 'email', type: 'email', label: 'Email' },
      { name: 'city', type: 'text', label: 'City', maxLength: 100 },
      { name: 'studentName', type: 'text', label: 'Student name', required: true, minLength: 2, maxLength: 100 },
      { name: 'interestedClass', type: 'text', label: 'Interested class', required: true, maxLength: 60 },
      { name: 'academicSession', type: 'text', label: 'Academic session', required: true, maxLength: 20 },
      { name: 'visitDate', type: 'datetime', label: 'Visit date' },
      { name: 'counselorName', type: 'text', label: 'Counselor', maxLength: 100 },
      { name: 'purposeOfVisit', type: 'text', label: 'Purpose of visit', maxLength: 150 },
      {
        name: 'ratings',
        type: 'ratings',
        label: 'Ratings',
        requiredItems: ['overallExperience'],
        items: [
          { name: 'overallExperience', label: 'Overall experience' },
          { name: 'infrastructure', label: 'Infrastructure' },
          { name: 'staffBehaviour', label: 'Staff behaviour' },
          { name: 'counselorInteraction', label: 'Counselor interaction' },
          { name: 'cleanliness', label: 'Cleanliness' },
        ],
      },
      { name: 'likedMost', type: 'textarea', label: 'Liked most', maxLength: 1000 },
      { name: 'suggestions', type: 'textarea', label: 'Suggestions', maxLength: 1000 },
      {
        name: 'admissionInterest',
        type: 'select',
        label: 'Admission interest',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'need_more_information', label: 'Needs more information' },
          { value: 'no', label: 'No' },
        ],
      },
    ],
  },

  enquiry: {
    label: 'Admission Enquiries',
    description: 'From the "Enquiry" buttons and the contact form on the website.',
    idPrefix: 'KA-EN',
    titleField: 'parentName',
    phoneField: 'phone',
    emailField: 'email',
    fields: [
      {
        name: 'source',
        type: 'select',
        label: 'Sent from',
        options: [
          { value: 'enquiry_dialog', label: 'Enquiry button' },
          { value: 'homepage_contact_form', label: 'Contact form' },
        ],
      },
      { name: 'parentName', type: 'text', label: 'Parent name', required: true, minLength: 2, maxLength: 100 },
      { name: 'phone', type: 'phone', label: 'Phone', required: true },
      { name: 'email', type: 'email', label: 'Email' },
      { name: 'studentName', type: 'text', label: 'Student name', maxLength: 100 },
      { name: 'classInterestedIn', type: 'text', label: 'Class interested in', maxLength: 60 },
      { name: 'grade', type: 'text', label: 'Current class', maxLength: 60 },
      { name: 'message', type: 'textarea', label: 'Message', maxLength: 1500 },
    ],
  },
};
