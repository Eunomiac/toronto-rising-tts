import coteriesSource from '../data/coteries.jsonc?raw';
import { menuSortKey, stripJsonComments } from './domains';

export interface CoterieRecord {
  readonly key: string;
  readonly displayName: string;
  readonly image: string;
  readonly affiliations: readonly string[];
  readonly order: number;
}

export interface CoterieMenuGroup {
  readonly affiliation: string;
  readonly entries: readonly CoterieRecord[];
}

export interface CoterieCatalog {
  readonly coteries: readonly CoterieRecord[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`);
  return value;
}

function finiteNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return value;
}

function parseCoterie(key: string, value: unknown): CoterieRecord {
  const coterie = record(value, key);
  const affiliations = coterie.affiliations;
  if (!Array.isArray(affiliations) || affiliations.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw new Error(`${key} affiliations must be a list of names`);
  }
  return {
    key,
    displayName: requiredString(coterie.displayName, `${key} displayName`),
    image: requiredString(coterie.image, `${key} image`),
    affiliations,
    order: finiteNumber(coterie.order, `${key} order`),
  };
}

export function parseCoterieCatalog(source: string): CoterieCatalog {
  const parsed: unknown = JSON.parse(stripJsonComments(source));
  const root = record(parsed, 'Coterie catalog');
  return { coteries: Object.entries(root).map(([key, value]) => parseCoterie(key, value)) };
}

export const COTERIE_CATALOG = parseCoterieCatalog(coteriesSource);

export function coterieByKey(key: string | null | undefined) {
  if (!key) return null;
  return COTERIE_CATALOG.coteries.find((coterie) => coterie.key === key) ?? null;
}

/** Catalog paths are written as assets/coteries; the files live under public/assets/images/coteries. */
export function coterieImageUrl(image: string) {
  const path = image.replace(/^\//, '');
  const located = path.startsWith('assets/coteries/')
    ? path.replace('assets/coteries/', 'assets/images/coteries/')
    : path;
  return `/${located}`;
}

/** One section per affiliation, in the order those affiliations first appear. */
export function coterieMenu(catalog: CoterieCatalog = COTERIE_CATALOG): CoterieMenuGroup[] {
  const affiliations: string[] = [];
  for (const coterie of catalog.coteries) {
    const first = coterie.affiliations[0];
    if (first && !affiliations.includes(first)) affiliations.push(first);
  }
  return affiliations.map((affiliation) => ({
    affiliation,
    entries: catalog.coteries
      .filter((coterie) => coterie.affiliations[0] === affiliation)
      .sort((a, b) => {
        const byOrder = b.order - a.order;
        if (byOrder !== 0) return byOrder;
        return menuSortKey(a.displayName).localeCompare(menuSortKey(b.displayName), 'en', { sensitivity: 'base' });
      }),
  }));
}
