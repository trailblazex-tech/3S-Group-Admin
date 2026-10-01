import { collections } from './collections.js';
import { forms } from './forms.js';

export default {
  id: 'konark',
  name: 'The Konark Academy',
  shortName: 'KA',
  tagline: 'CBSE school, Ladwa',
  /**
   * The site Publish deploys to: relative media paths like /images/... are
   * previewed from here, and "View live website" opens it. Currently the
   * Hostinger demo - thekonarkacademy.com hasn't been redeployed since newer
   * images (e.g. ss-sharma.jpg) were added, so they 404 there. Switch back to
   * https://thekonarkacademy.com when that site is connected to Publish.
   */
  publicUrl: 'https://konark-academy.kriyanto.com',
  /** Brand colour for the admin (HSL components, no hsl() wrapper). */
  accent: '38 92% 50%',
  collections,
  forms,
  /** Pages allowed to post the public forms (production, the demo, local dev). */
  formOrigins: [
    'https://thekonarkacademy.com',
    'https://www.thekonarkacademy.com',
    'https://konark-academy.kriyanto.com',
    'http://localhost:8081',
  ],
};
