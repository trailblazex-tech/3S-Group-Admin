import { collections } from './collections.js';
import { forms } from './forms.js';

export default {
  id: 'konark',
  name: 'The Konark Academy',
  shortName: 'KA',
  tagline: 'CBSE school, Ladwa',
  /**
   * The site Publish deploys to: relative media paths like /images/... are
   * previewed from here, and "View live website" opens it.
   */
  publicUrl: 'https://thekonarkacademy.com',
  /** Brand colour for the admin (HSL components, no hsl() wrapper). */
  accent: '38 92% 50%',
  collections,
  forms,
  /** Pages allowed to post the public forms (the website, and local dev). */
  formOrigins: ['https://thekonarkacademy.com', 'https://www.thekonarkacademy.com', 'http://localhost:8081'],
};
