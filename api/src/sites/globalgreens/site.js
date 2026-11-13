import { collections } from './collections.js';
import { forms } from './forms.js';

export default {
  id: 'globalgreens',
  name: '3S Global Greens',
  shortName: 'GG',
  tagline: 'Lead recycling & refining',
  /**
   * The site Publish deploys to: relative media paths like /images/... are
   * previewed from here, and "View live website" opens it.
   */
  publicUrl: 'https://3sglobalgreens.com',
  /** Brand colour for the admin (HSL components, no hsl() wrapper). */
  accent: '152 45% 36%',
  /**
   * The site is pre-rendered, so Publish rebuilds it: changes appear once
   * the build finishes, a few minutes later.
   */
  publishDelay: 'rebuild',
  collections,
  forms,
  /** Pages allowed to post the public forms (the website, and local dev). */
  formOrigins: ['https://3sglobalgreens.com', 'https://www.3sglobalgreens.com', 'http://localhost:3000'],
};
