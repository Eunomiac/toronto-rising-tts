import artboardCalibration from '../data/calibration.json';
import domainsSource from '../data/domains.jsonc?raw';
import { createArtboardProjector, type VisualCalibration } from './calibration';

export type DistrictOverlayMode = 'full' | 'halfA' | 'halfB';
export type DomainType = 'overlay' | 'label' | 'site';

export interface DomainNamePlacement {
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly displayNameOverride: string | null;
  readonly rotate: number;
}

export interface DomainSitePlacement {
  readonly site: string;
  readonly fontSize: number;
}

export interface DomainIconPlacement {
  readonly url: string;
  readonly color: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

export interface DomainRecord {
  readonly key: string;
  readonly type: DomainType;
  readonly displayName: string;
  readonly displayNameFont: string;
  readonly displayNameWeight: 'bold' | null;
  readonly displayNameColor: string;
  readonly displayNameBGColor: string | null;
  readonly displayNameBorderColor: string | null;
  readonly namePlacements: readonly DomainNamePlacement[];
  readonly sitePlacements: readonly DomainSitePlacement[];
  readonly icon: DomainIconPlacement | null;
  readonly districtOverlays: Readonly<Record<string, DistrictOverlayMode>>;
  readonly districtOverlayColor: string | null;
  readonly affiliations: readonly string[];
  readonly menuItem: string | null;
  readonly order: number;
  /** Districts that glow when a contested label domain is shown. Empty for other types. */
  readonly districts: readonly string[];
  readonly coterie: string | null;
  /** Which side of a site icon the label sits on. Other domain types keep right. */
  readonly orientation: 'left' | 'right';
}

export interface DomainMenuEntry {
  readonly label: string;
  readonly domainKeys: readonly string[];
  readonly menuItem: string | null;
}

export interface DomainMenuGroup {
  readonly affiliation: string;
  readonly entries: readonly DomainMenuEntry[];
}

export interface DomainCatalog {
  readonly domains: readonly DomainRecord[];
  readonly affiliations: readonly string[];
}

export interface DomainSelection {
  readonly domainKeys: readonly string[];
  readonly affiliations: readonly string[];
}

export const EMPTY_DOMAIN_SELECTION: DomainSelection = {
  domainKeys: [],
  affiliations: [],
};

const DOMAIN_TYPES = new Set<DomainType>(['overlay', 'label', 'site']);
const OVERLAY_MODES = new Set<DistrictOverlayMode>(['full', 'halfA', 'halfB']);

const DOMAIN_FONT_FAMILIES: Record<string, string> = {
  PenumbraFlare: "'Penumbra Flare', Georgia, serif",
  WolvesEngraven: "'Wolves Engraven', Georgia, serif",
  CormorantGaramond: "'Cormorant Garamond', Georgia, serif",
};

/** Drop // and block comments without touching comment-like text inside strings. */
export function stripJsonComments(source: string) {
  let result = '';
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"') {
      result += char;
      index += 1;
      while (index < source.length) {
        const quoted = source[index];
        result += quoted;
        if (quoted === '\\') {
          index += 1;
          if (index < source.length) result += source[index];
        } else if (quoted === '"') {
          break;
        }
        index += 1;
      }
      index += 1;
      continue;
    }
    if (char === '/' && next === '/') {
      index += 2;
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 2;
      continue;
    }
    result += char ?? '';
    index += 1;
  }
  return result;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`);
  return value;
}

function optionalColor(value: unknown, label: string) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(value)) throw new Error(`${label} must be a #RRGGBB color`);
  return value;
}

function finiteNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return value;
}

function parseDistrictList(value: unknown, label: string) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw new Error(`${label} must be a list of district keys`);
  }
  return value;
}

function parseDisplayNameWeight(value: unknown, label: string): 'bold' | null {
  if (value === undefined) return null;
  if (value !== 'bold') throw new Error(`${label} must be bold`);
  return 'bold';
}

function parseOrientation(value: unknown, label: string): 'left' | 'right' {
  if (value === undefined) return 'right';
  if (value !== 'left' && value !== 'right') throw new Error(`${label} must be left or right`);
  return value;
}

function parseNamePlacement(value: unknown, label: string): DomainNamePlacement | DomainSitePlacement {
  const entry = record(value, label);
  if ('site' in entry) {
    return {
      site: requiredString(entry.site, `${label} site`),
      fontSize: entry.fontSize === undefined ? 45 : finiteNumber(entry.fontSize, `${label} fontSize`),
    };
  }
  const override = entry.displayNameOverride;
  if (override !== undefined && typeof override !== 'string') {
    throw new Error(`${label} displayNameOverride must be a string`);
  }
  return {
    x: finiteNumber(entry.x, `${label} x`),
    y: finiteNumber(entry.y, `${label} y`),
    fontSize: finiteNumber(entry.fontSize, `${label} fontSize`),
    displayNameOverride: typeof override === 'string' ? override : null,
    rotate: entry.rotate === undefined ? 0 : finiteNumber(entry.rotate, `${label} rotate`),
  };
}

function parseDomain(key: string, value: unknown): DomainRecord {
  const domain = record(value, key);
  const type = requiredString(domain.type, `${key} type`);
  if (!DOMAIN_TYPES.has(type as DomainType)) throw new Error(`${key} has an unknown type`);
  const placements = Array.isArray(domain.displayNamePositionData) ? domain.displayNamePositionData : null;
  if (!placements) throw new Error(`${key} is missing displayNamePositionData`);
  const parsedPlacements = placements.map((entry, index) => parseNamePlacement(entry, `${key} placement ${index + 1}`));
  const namePlacements = parsedPlacements.filter((entry): entry is DomainNamePlacement => 'x' in entry);
  const sitePlacements = parsedPlacements.filter((entry): entry is DomainSitePlacement => 'site' in entry);
  const overlays = domain.districtOverlays === undefined ? {} : record(domain.districtOverlays, `${key} districtOverlays`);
  const districtOverlays: Record<string, DistrictOverlayMode> = {};
  for (const [districtKey, mode] of Object.entries(overlays)) {
    if (typeof mode !== 'string' || !OVERLAY_MODES.has(mode as DistrictOverlayMode)) {
      throw new Error(`${key} overlay ${districtKey} must be full, halfA, or halfB`);
    }
    districtOverlays[districtKey] = mode as DistrictOverlayMode;
  }
  const affiliations = domain.affiliations;
  if (!Array.isArray(affiliations) || affiliations.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw new Error(`${key} affiliations must be a list of names`);
  }
  let icon: DomainIconPlacement | null = null;
  if (domain.displayIcon !== undefined) {
    const position = record(domain.displayIconPositionData, `${key} icon position`);
    const url = requiredString(domain.displayIcon, `${key} icon`);
    icon = {
      url: url.startsWith('/') ? url : `/${url}`,
      color: optionalColor(domain.displayIconColor, `${key} icon color`) ?? '#000000',
      x: finiteNumber(position.x, `${key} icon x`),
      y: finiteNumber(position.y, `${key} icon y`),
      width: finiteNumber(position.width, `${key} icon width`),
    };
  }
  return {
    key,
    type: type as DomainType,
    displayName: requiredString(domain.displayName, `${key} displayName`),
    displayNameFont: requiredString(domain.displayNameFont, `${key} displayNameFont`),
    displayNameWeight: parseDisplayNameWeight(domain.displayNameWeight, `${key} displayNameWeight`),
    displayNameColor: optionalColor(domain.displayNameColor, `${key} displayNameColor`) ?? '#FFFFFF',
    displayNameBGColor: optionalColor(domain.displayNameBGColor, `${key} displayNameBGColor`),
    displayNameBorderColor: optionalColor(domain.displayNameBorderColor, `${key} displayNameBorderColor`),
    namePlacements,
    sitePlacements,
    icon,
    districtOverlays,
    districtOverlayColor: optionalColor(domain.districtOverlayColor, `${key} districtOverlayColor`),
    affiliations,
    menuItem: domain.menuItem === undefined ? null : requiredString(domain.menuItem, `${key} menuItem`),
    order: domain.order === undefined ? 0 : finiteNumber(domain.order, `${key} order`),
    districts: type === 'label' ? parseDistrictList(domain.districts, `${key} districts`) : [],
    coterie: domain.coterie === undefined ? null : requiredString(domain.coterie, `${key} coterie`),
    orientation: parseOrientation(domain.orientation ?? domain.displayNameOrientation, `${key} orientation`),
  };
}

export function parseDomainCatalog(source: string): DomainCatalog {
  const parsed: unknown = JSON.parse(stripJsonComments(source));
  const root = record(parsed, 'Domain catalog');
  const domains = Object.entries(root).map(([key, value]) => parseDomain(key, value));
  const affiliations: string[] = [];
  for (const domain of domains) {
    for (const affiliation of domain.affiliations) {
      if (!affiliations.includes(affiliation)) affiliations.push(affiliation);
    }
  }
  return { domains, affiliations };
}

export const DOMAIN_CATALOG = parseDomainCatalog(domainsSource);

function asTuple4(value: unknown, label: string): [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4 || value.some((entry) => typeof entry !== 'number')) {
    throw new Error(`${label} must be four numbers`);
  }
  return [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0, value[3] ?? 0];
}

function asPoint(value: unknown, label: string): [number, number] {
  if (!Array.isArray(value) || value.length < 2 || typeof value[0] !== 'number' || typeof value[1] !== 'number') {
    throw new Error(`${label} must be a coordinate pair`);
  }
  return [value[0], value[1]];
}

const calibrationRecord = artboardCalibration as {
  sourceViewBox: unknown;
  controlPoints: Array<{ source: unknown; lngLat: unknown }>;
  adjustments?: { horizontalScale?: number; anchorSourceX?: number } | null;
  visualCalibration?: VisualCalibration | null;
};

export const projectArtboardPoint = createArtboardProjector({
  sourceViewBox: asTuple4(calibrationRecord.sourceViewBox, 'Map view box'),
  controlPoints: calibrationRecord.controlPoints.map((control, index) => ({
    source: asPoint(control.source, `Control ${index + 1} source`),
    lngLat: asPoint(control.lngLat, `Control ${index + 1} lngLat`),
  })),
  adjustments: calibrationRecord.adjustments,
  visualCalibration: calibrationRecord.visualCalibration,
});

export function domainFontFamily(font: string) {
  return DOMAIN_FONT_FAMILIES[font] ?? "'Penumbra Flare', Georgia, serif";
}

export function placedName(placement: DomainNamePlacement) {
  return placement.fontSize > 0;
}

/**
 * Districts that glow for the contested domains currently shown.
 * A label names them in its districts list. A site uses the district of that site.
 */
export function contestedDistrictKeys(
  domains: readonly DomainRecord[],
  districtOfSite: (siteKey: string) => string | null,
) {
  const keys: string[] = [];
  const add = (key: string | null) => {
    if (key && !keys.includes(key)) keys.push(key);
  };
  for (const domain of domains) {
    if (!domain.affiliations.includes('Contested')) continue;
    if (domain.type === 'label') {
      for (const districtKey of domain.districts) add(districtKey);
      continue;
    }
    for (const placement of domain.sitePlacements) add(districtOfSite(placement.site));
  }
  return keys;
}

export function placedIcon(icon: DomainIconPlacement | null): icon is DomainIconPlacement {
  return icon !== null && icon.width > 0;
}

/** Menu text keeps the map name, without line breaks or the warning mark. */
export function menuDisplayName(value: string) {
  return value.replace(/\u26A0\uFE0F?/g, '').replace(/\s+/g, ' ').trim();
}

/** "The" is a whole word only, so it never sorts a name and never eats "theater". */
export function menuSortKey(value: string) {
  return menuDisplayName(value).replace(/\bthe\b/gi, ' ').replace(/\s+/g, ' ').trim();
}

function highestOrder(catalog: DomainCatalog, keys: readonly string[]) {
  const orders = keys.flatMap((key) => {
    const domain = catalog.domains.find((item) => item.key === key);
    return domain ? [domain.order] : [];
  });
  return orders.length === 0 ? 0 : Math.max(...orders);
}

export function domainMenu(catalog: DomainCatalog): DomainMenuGroup[] {
  const primary: string[] = [];
  for (const domain of catalog.domains) {
    const first = domain.affiliations[0];
    if (first && !primary.includes(first)) primary.push(first);
  }
  const bundled = new Set<string>();
  const groups: DomainMenuGroup[] = primary.map((affiliation) => {
    const entries: DomainMenuEntry[] = [];
    for (const domain of catalog.domains) {
      if (domain.affiliations[0] !== affiliation) continue;
      if (domain.menuItem) {
        if (bundled.has(domain.menuItem)) continue;
        bundled.add(domain.menuItem);
        entries.push({
          label: menuDisplayName(domain.menuItem),
          menuItem: domain.menuItem,
          domainKeys: catalog.domains.filter((item) => item.menuItem === domain.menuItem).map((item) => item.key),
        });
      } else {
        entries.push({ label: menuDisplayName(domain.displayName), menuItem: null, domainKeys: [domain.key] });
      }
    }
    entries.sort((a, b) => {
      const byOrder = highestOrder(catalog, b.domainKeys) - highestOrder(catalog, a.domainKeys);
      if (byOrder !== 0) return byOrder;
      return menuSortKey(a.label).localeCompare(menuSortKey(b.label), 'en', { sensitivity: 'base' });
    });
    return { affiliation, entries };
  });
  const secondary: string[] = [];
  for (const domain of catalog.domains) {
    for (const affiliation of domain.affiliations.slice(1)) {
      if (!primary.includes(affiliation) && !secondary.includes(affiliation)) secondary.push(affiliation);
    }
  }
  return [
    ...groups,
    ...secondary.map((affiliation) => ({ affiliation, entries: [] })),
  ];
}

/** Whole groups stay in one column. The break falls before the group that crosses the halfway mark. */
export function splitDomainMenu(groups: readonly DomainMenuGroup[]): [DomainMenuGroup[], DomainMenuGroup[]] {
  const weight = (group: DomainMenuGroup) => group.entries.length + 1;
  const total = groups.reduce((sum, group) => sum + weight(group), 0);
  const columns: [DomainMenuGroup[], DomainMenuGroup[]] = [[], []];
  let used = 0;
  for (const group of groups) {
    const column = used >= total / 2 && columns[0].length > 0 ? 1 : 0;
    columns[column].push(group);
    used += weight(group);
  }
  return columns;
}

function membersOf(catalog: DomainCatalog, affiliation: string) {
  const group = domainMenu(catalog).find((entry) => entry.affiliation === affiliation);
  if (!group) return [];
  if (group.entries.length > 0) {
    return [...new Set(group.entries.flatMap((entry) => entry.domainKeys))];
  }
  return catalog.domains
    .filter((domain) => domain.affiliations.includes(affiliation))
    .map((domain) => domain.key);
}

function pruneAffiliations(selection: DomainSelection, catalog: DomainCatalog): DomainSelection {
  return {
    domainKeys: selection.domainKeys,
    affiliations: selection.affiliations.filter((affiliation) => (
      membersOf(catalog, affiliation).some((key) => selection.domainKeys.includes(key))
    )),
  };
}

export function toggleDomainAffiliation(
  selection: DomainSelection,
  catalog: DomainCatalog,
  affiliation: string,
): DomainSelection {
  const members = membersOf(catalog, affiliation);
  if (selection.affiliations.includes(affiliation)) {
    const dropping = new Set(members);
    return pruneAffiliations({
      domainKeys: selection.domainKeys.filter((key) => !dropping.has(key)),
      affiliations: selection.affiliations.filter((entry) => entry !== affiliation),
    }, catalog);
  }
  return {
    domainKeys: [...new Set([...selection.domainKeys, ...members])],
    affiliations: [...selection.affiliations, affiliation],
  };
}

export function toggleDomainMenuItem(
  selection: DomainSelection,
  catalog: DomainCatalog,
  menuItem: string,
): DomainSelection {
  const domainKeysForItem = catalog.domains
    .filter((domain) => domain.menuItem === menuItem)
    .map((domain) => domain.key);
  const allOn = domainKeysForItem.every((key) => selection.domainKeys.includes(key));
  const dropping = new Set(domainKeysForItem);
  const domainKeys = allOn
    ? selection.domainKeys.filter((key) => !dropping.has(key))
    : [...new Set([...selection.domainKeys, ...domainKeysForItem])];
  return pruneAffiliations({ domainKeys, affiliations: selection.affiliations }, catalog);
}

export function domainMenuItemSelected(selection: DomainSelection, domainKeys: readonly string[]) {
  return domainKeys.length > 0 && domainKeys.every((key) => selection.domainKeys.includes(key));
}

export function toggleDomainKey(
  selection: DomainSelection,
  catalog: DomainCatalog,
  domainKey: string,
): DomainSelection {
  const domainKeys = selection.domainKeys.includes(domainKey)
    ? selection.domainKeys.filter((key) => key !== domainKey)
    : [...selection.domainKeys, domainKey];
  return pruneAffiliations({ domainKeys, affiliations: selection.affiliations }, catalog);
}

export function domainSiteKeys(domains: readonly DomainRecord[]) {
  return [...new Set(domains.flatMap((domain) => domain.sitePlacements.map((placement) => placement.site)))];
}
