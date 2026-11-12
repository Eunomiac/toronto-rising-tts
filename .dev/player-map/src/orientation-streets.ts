import orientationData from '../data/orientation-streets.json';

export type OrientationStreetCategory = 'primary' | 'orientation';

export interface OrientationStreet {
  category: OrientationStreetCategory;
  displayName: string;
  matchNames: string[];
}

export const ORIENTATION_STREETS = orientationData.streets as OrientationStreet[];

export const PRIMARY_STREET_NAMES = ORIENTATION_STREETS
  .filter((street) => street.category === 'primary')
  .flatMap((street) => street.matchNames);

export const SECONDARY_STREET_NAMES = ORIENTATION_STREETS
  .filter((street) => street.category === 'orientation')
  .flatMap((street) => street.matchNames);

export function orientationDisplayNameExpression(category: OrientationStreetCategory) {
  const streets = ORIENTATION_STREETS.filter((street) => street.category === category);
  const expression: unknown[] = ['match', ['get', 'name']];
  for (const street of streets) {
    for (const matchName of street.matchNames) {
      expression.push(matchName, street.displayName);
    }
  }
  expression.push('');
  return expression;
}
