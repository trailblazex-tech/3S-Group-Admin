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
  /**
   * Admin pages this site does not show. The forms still work: the website
   * posts them and they are stored, there is just no Leads page for them.
   */
  hiddenPages: ['leads', 'analytics'],
  /**
   * The admin menu: one entry per page of the website, in the website's own
   * order, and each page's sections in the order they appear on it. A
   * section shown on more than one page sits under the page it is mostly
   * about (its description names the others). Every section is listed once
   * (api/src/sites/index.js checks).
   */
  menu: [
    {
      name: 'Whole Website',
      icon: 'globe',
      description: 'Company details used on every page: the header, footer, contact buttons and legal pages.',
      sections: ['company-profile', 'contact-details', 'locations'],
    },
    {
      name: 'Home Page',
      icon: 'home',
      path: '/',
      description: 'Sections only on the home page. Products, the plant photos, ESG and certificates on the home page are edited under their own pages.',
      sections: ['impact-statements', 'material-journey', 'industries', 'industry-figures'],
    },
    {
      name: 'About Us',
      icon: 'info',
      path: '/about',
      description: 'The About Us page, top to bottom.',
      sections: ['promises', 'history', 'expertise', 'plant-gallery', 'sell-pathway', 'sell-steps', 'leadership', 'people-roles'],
    },
    {
      name: 'Products & Services',
      icon: 'package',
      path: '/products-services',
      description: 'The Products & Services page, top to bottom.',
      sections: ['products', 'services', 'process-stages', 'quality-text', 'batch-journey'],
    },
    {
      name: 'ESG',
      icon: 'leaf',
      path: '/esg',
      description: 'The ESG page, top to bottom.',
      sections: ['esg-pillars', 'esg-points', 'esg-sourcing', 'sourcing-principles', 'future-initiatives', 'impact-figures'],
    },
    {
      name: 'Certifications',
      icon: 'award',
      path: '/certifications',
      description: 'The Certifications page and the certificates on the home page.',
      sections: ['certifications'],
    },
    {
      name: 'Careers',
      icon: 'briefcase',
      path: '/careers',
      description: 'The Careers page and its application form.',
      sections: ['careers-page', 'career-pillars', 'departments'],
    },
  ],
  collections,
  forms,
  /** Pages allowed to post the public forms (the website, and local dev). */
  formOrigins: ['https://3sglobalgreens.com', 'https://www.3sglobalgreens.com', 'http://localhost:3000'],
};
