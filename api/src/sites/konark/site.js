import { collections } from './collections.js';

export default {
  id: 'konark',
  name: 'The Konark Academy',
  shortName: 'KA',
  /** Where relative media paths like /images/... are served from. */
  publicUrl: 'https://thekonarkacademy.com',
  /** Brand colour for the admin (HSL components, no hsl() wrapper). */
  accent: '38 92% 50%',
  collections,
};
