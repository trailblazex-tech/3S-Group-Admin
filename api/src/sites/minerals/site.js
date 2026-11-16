import { collections } from './collections.js';
import { forms } from './forms.js';

export default {
  id: 'minerals',
  name: '3S Minerals',
  shortName: '3M',
  tagline: 'Rock phosphate beneficiation',
  /**
   * The site Publish deploys to: relative media paths like /assets/... are
   * previewed from here, and "View live website" opens it.
   */
  publicUrl: 'https://3sminerals.co.in',
  /** Brand colour for the admin (HSL components, no hsl() wrapper). */
  accent: '222 38% 45%',
  /**
   * Admin pages this site does not show. The forms still work: the website
   * posts them and they are stored, there is just no Leads page for them.
   */
  hiddenPages: ['leads', 'analytics'],
  collections,
  forms,
  /** Pages allowed to post the public forms (the website, and local dev). */
  formOrigins: ['https://3sminerals.co.in', 'https://www.3sminerals.co.in', 'http://localhost:8080'],
};
