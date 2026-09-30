import groupLogo from '../assets/3s-logo.png';
import konarkLogo from '../assets/sites/konark.webp';

/** Websites with their own mark; every other 3S Group site uses the group's. */
const ownLogos: Record<string, string> = {
  konark: konarkLogo,
};

export function siteLogo(siteId: string) {
  return ownLogos[siteId] ?? groupLogo;
}

export function hasOwnLogo(siteId: string) {
  return siteId in ownLogos;
}
