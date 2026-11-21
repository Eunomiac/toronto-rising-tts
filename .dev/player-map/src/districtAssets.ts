/** Public image paths for district / site card art. */

export function districtHeaderUrl(key: string) {
  return `/assets/images/districtHeaders/districtHeader_${key}.webp`;
}

export function districtFooterUrl(key: string) {
  return `/assets/images/districtFooters/districtFooter_${key}.webp`;
}

export function districtCardUrl(key: string) {
  return `/assets/images/districtCards/districtCard_${key}.webp`;
}

export function siteCardUrl(key: string) {
  return `/assets/images/siteCards/siteCard_${key}.webp`;
}

/** Hub card files use short hub names (CasaLoma, ROM, …), not always the site key. */
const SITE_HUB_CARD_KEYS: Record<string, string> = {
  CasaLoma: 'CasaLoma',
  RoyalOntarioMuseum: 'ROM',
  TheGiovanniEstate: 'GiovanniEstate',
  TheStRegisToronto: 'StRegis',
  TheUniversityChantry: 'UniversityChantry',
  UnionStation: 'UnionStation',
  Warrens: 'Warrens',
};

export function siteHubCardUrl(siteKey: string) {
  const hub = SITE_HUB_CARD_KEYS[siteKey] ?? siteKey;
  return `/assets/images/siteHubCards/siteHubCard_${hub}.webp`;
}

export function isKnownSiteHub(siteKey: string) {
  return Object.hasOwn(SITE_HUB_CARD_KEYS, siteKey);
}
