import type { DistrictFeatureProperties } from './types';

export type HuntingFlavor =
  | 'ALL'
  | 'Choleric'
  | 'Melancholic'
  | 'Phlegmatic'
  | 'Sanguine'
  | 'Primal'
  | 'Ischemic'
  | 'Mercurial';

export type HomesteadTrait = 'affair' | 'association' | 'clout' | 'utility';

export type MapOverlaySelection =
  | { kind: 'none' }
  | { kind: 'hunting'; flavor: HuntingFlavor }
  | { kind: 'homestead'; trait: HomesteadTrait };

export const HUNTING_FLAVORS: HuntingFlavor[] = [
  'ALL', 'Choleric', 'Melancholic', 'Phlegmatic', 'Sanguine', 'Primal', 'Ischemic', 'Mercurial',
];

export const HOMESTEAD_TRAITS: Array<{ id: HomesteadTrait; label: string; icon: string }> = [
  { id: 'affair', label: 'Affair', icon: '/assets/icons/left_panel/homestead/affair.svg' },
  { id: 'association', label: 'Association', icon: '/assets/icons/left_panel/homestead/association.svg' },
  { id: 'clout', label: 'Clout', icon: '/assets/icons/left_panel/homestead/clout.svg' },
  { id: 'utility', label: 'Utility', icon: '/assets/icons/left_panel/homestead/utility.svg' },
];

export const HOMESTEAD_BLURBS: Record<HomesteadTrait, { title: string; body: string }> = {
  affair: {
    title: 'Affair — Economic Value and Activity',
    body: 'Affair represents the economic character of a location, encompassing its property values, commercial activity, employment opportunities, and overall financial prosperity. It considers the wealth generated or concentrated within an area, including businesses, residential properties, rents, taxes, and other financial transactions. A prosperous financial district with valuable real estate and thriving businesses would have a high Affair rating, while an economically depressed neighborhood with abandoned properties, limited employment, and little commercial activity would generally have a low rating.',
  },
  association: {
    title: 'Association — Connectivity and Integration',
    body: 'Association measures how closely a location is connected to the larger city, both physically and socially. It considers access to transportation networks, major roads, commercial centers, cultural landmarks, and other important destinations, as well as the area\'s population and relationship to the surrounding urban environment. A bustling neighborhood with excellent public transit, significant cultural attractions, and strong connections to other districts would have a high Association rating, while an isolated residential enclave with limited accessibility and few connections to the broader city would have a low rating.',
  },
  clout: {
    title: 'Clout — Physical Presence and Security',
    body: 'Clout represents the physical characteristics of a location, particularly its size, construction, structural integrity, prominence, and security. It reflects the tangible qualities that determine how imposing, accessible, defensible, or physically significant an area or property might be. A massive skyscraper with sophisticated security systems would possess high Clout, while a modest, poorly maintained building with minimal protection would have low Clout. At the neighborhood level, Clout can reflect building density, architectural character, physical barriers, and the general security of properties.',
  },
  utility: {
    title: 'Utility — Infrastructure and Public Services',
    body: 'Utility measures the quality, availability, and reliability of the infrastructure and services supporting a location. It encompasses essential provisions such as electricity, clean water, sanitation, road maintenance, emergency services, healthcare access, and environmental conditions. An affluent neighborhood with dependable utilities, well-maintained streets, effective municipal services, and convenient access to hospitals would generally possess high Utility. Conversely, an underserved district suffering from deteriorating infrastructure, pollution, inadequate public services, or unreliable utilities would have a low rating.',
  },
};

/** Higher hunting difficulty → lower opacity. Difficulty 2→0.55, 6→0.18. */
export function huntingFillOpacity(difficulty: number | null): number {
  if (difficulty === null) return 0;
  const clamped = Math.max(2, Math.min(6, difficulty));
  return Number((0.55 - ((clamped - 2) / 4) * 0.37).toFixed(3));
}

export function homesteadFillOpacity(value: number): number {
  if (value <= 0) return 0;
  const clamped = Math.max(1, Math.min(6, value));
  return Number((0.12 + ((clamped - 1) / 5) * 0.48).toFixed(3));
}

export function huntingMatchesFlavor(district: DistrictFeatureProperties, flavor: HuntingFlavor): boolean {
  if (flavor === 'ALL') return true;
  return district.resonancePlus === flavor.toLowerCase();
}

export function overlayPaintForDistrict(
  district: DistrictFeatureProperties,
  overlay: MapOverlaySelection,
): { color: string; opacity: number; pulse: boolean; aspect: DistrictFeatureProperties['aspectAdvantage'] } {
  if (overlay.kind === 'hunting') {
    const matches = huntingMatchesFlavor(district, overlay.flavor);
    return {
      color: '#c22933',
      opacity: matches ? huntingFillOpacity(district.huntingDifficulty) : 0,
      pulse: false,
      aspect: matches ? district.aspectAdvantage : null,
    };
  }
  if (overlay.kind === 'homestead') {
    const value = district[overlay.trait];
    return {
      color: '#FFDD00',
      opacity: homesteadFillOpacity(value),
      pulse: value === 6,
      aspect: null,
    };
  }
  return { color: '#000000', opacity: 0, pulse: false, aspect: null };
}
