/** Build one label point per whitelist street entry for MapLibre / HTML overlays. */

export interface StreetLabelProperties {
  category: string;
  displayName: string;
  entryKey: string;
  /** Degrees clockwise from north for MapLibre Marker.setRotation. */
  bearing: number;
}

export interface StreetBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

const CLIP_INSIDE = 0;
const CLIP_LEFT = 1;
const CLIP_RIGHT = 2;
const CLIP_BOTTOM = 4;
const CLIP_TOP = 8;

function clipCode(x: number, y: number, box: StreetBox) {
  let code = CLIP_INSIDE;
  if (x < box.west) code |= CLIP_LEFT;
  else if (x > box.east) code |= CLIP_RIGHT;
  if (y < box.south) code |= CLIP_BOTTOM;
  else if (y > box.north) code |= CLIP_TOP;
  return code;
}

function clipSegment(start: number[], end: number[], box: StreetBox): [number[], number[]] | null {
  let x0 = start[0] ?? 0;
  let y0 = start[1] ?? 0;
  let x1 = end[0] ?? 0;
  let y1 = end[1] ?? 0;
  let code0 = clipCode(x0, y0, box);
  let code1 = clipCode(x1, y1, box);
  for (let guard = 0; guard < 12; guard += 1) {
    if ((code0 | code1) === 0) return [[x0, y0], [x1, y1]];
    if ((code0 & code1) !== 0) return null;
    const code = code0 !== 0 ? code0 : code1;
    let x = 0;
    let y = 0;
    if ((code & CLIP_TOP) !== 0) {
      x = x0 + (x1 - x0) * (box.north - y0) / (y1 - y0);
      y = box.north;
    } else if ((code & CLIP_BOTTOM) !== 0) {
      x = x0 + (x1 - x0) * (box.south - y0) / (y1 - y0);
      y = box.south;
    } else if ((code & CLIP_RIGHT) !== 0) {
      y = y0 + (y1 - y0) * (box.east - x0) / (x1 - x0);
      x = box.east;
    } else {
      y = y0 + (y1 - y0) * (box.west - x0) / (x1 - x0);
      x = box.west;
    }
    if (code === code0) {
      x0 = x;
      y0 = y;
      code0 = clipCode(x0, y0, box);
    } else {
      x1 = x;
      y1 = y;
      code1 = clipCode(x1, y1, box);
    }
  }
  return null;
}

export function clipPolyline(coordinates: number[][], box: StreetBox) {
  const parts: number[][][] = [];
  let current: number[][] = [];
  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1];
    const end = coordinates[index];
    if (!start || !end) continue;
    const clipped = clipSegment(start, end, box);
    if (!clipped) {
      if (current.length > 1) parts.push(current);
      current = [];
      continue;
    }
    const [from, to] = clipped;
    if (!from || !to) continue;
    const last = current[current.length - 1];
    const lastX = last?.[0];
    const lastY = last?.[1];
    const fromX = from[0];
    const fromY = from[1];
    if (lastX === undefined || lastY === undefined || fromX === undefined || fromY === undefined
      || Math.hypot(lastX - fromX, lastY - fromY) > 1e-7) {
      if (current.length > 1) parts.push(current);
      current = [from, to];
    } else current.push(to);
  }
  if (current.length > 1) parts.push(current);
  return parts;
}

/** Approximate length in kilometres (lon×82, lat×111). */
export function lineLength(coordinates: number[][]) {
  let length = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1];
    const end = coordinates[index];
    if (!start || !end || start[0] === undefined || start[1] === undefined || end[0] === undefined || end[1] === undefined) continue;
    length += Math.hypot((end[0] - start[0]) * 82, (end[1] - start[1]) * 111);
  }
  return length;
}

/**
 * Short OSM stubs that run *across* a corridor paint as bright dash artifacts (round caps).
 * Drop only short pieces that are perpendicular to that street's dominant axis — never length alone.
 */
export const MIN_ORIENTATION_STREET_KM = 0.05;

/** Net axis extents in km (lon×82, lat×111). */
export function streetAxisExtentsKm(coordinates: number[][]) {
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const point of coordinates) {
    const lon = point[0];
    const lat = point[1];
    if (lon === undefined || lat === undefined) continue;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  if (!Number.isFinite(minLon)) return { eastKm: 0, northKm: 0 };
  return {
    eastKm: Math.abs(maxLon - minLon) * 82,
    northKm: Math.abs(maxLat - minLat) * 111,
  };
}

export type StreetDominantAxis = 'east' | 'north';

export function dominantStreetAxis(coordinates: number[][]): StreetDominantAxis {
  const { eastKm, northKm } = streetAxisExtentsKm(coordinates);
  return eastKm >= northKm ? 'east' : 'north';
}

/** True when a short piece runs across the corridor (dash artifact), not along it. */
export function isPerpendicularStub(
  coordinates: number[][],
  corridorAxis: StreetDominantAxis,
  minKm = MIN_ORIENTATION_STREET_KM,
) {
  if (lineLength(coordinates) >= minKm) return false;
  const pieceAxis = dominantStreetAxis(coordinates);
  return pieceAxis !== corridorAxis;
}

function endpointNearAny(
  point: number[],
  others: number[][][],
  maxKm: number,
) {
  const px = point[0] ?? 0;
  const py = point[1] ?? 0;
  for (const coords of others) {
    for (const candidate of coords) {
      const dx = ((candidate[0] ?? 0) - px) * 82;
      const dy = ((candidate[1] ?? 0) - py) * 111;
      if (Math.hypot(dx, dy) <= maxKm) return true;
    }
  }
  return false;
}

/**
 * Drop short ways that are either (a) perpendicular to the corridor, or
 * (b) orphan stubs whose endpoints do not touch any other way of the same street.
 * Short pieces that continue a real corridor stay — length alone must not gap Bloor/Yonge.
 */
export function filterOrientationStubArtifacts<T extends {
  properties?: { entryKey?: unknown; displayName?: unknown } | null;
  geometry: { type: string; coordinates: number[][] };
}>(features: T[], minKm = MIN_ORIENTATION_STREET_KM): T[] {
  const groups = new Map<string, T[]>();
  for (const feature of features) {
    if (feature.geometry.type !== 'LineString') continue;
    const entryKey = feature.properties?.entryKey;
    const displayName = feature.properties?.displayName;
    const key = typeof entryKey === 'string' && entryKey
      ? entryKey
      : (typeof displayName === 'string' ? displayName : '');
    const list = groups.get(key);
    if (list) list.push(feature);
    else groups.set(key, [feature]);
  }
  const kept: T[] = [];
  const touchKm = 0.035;
  for (const group of groups.values()) {
    let east = 0;
    let north = 0;
    for (const feature of group) {
      if (lineLength(feature.geometry.coordinates) < minKm) continue;
      const extents = streetAxisExtentsKm(feature.geometry.coordinates);
      east += extents.eastKm;
      north += extents.northKm;
    }
    const corridorAxis: StreetDominantAxis = east >= north ? 'east' : 'north';
    for (const feature of group) {
      const coords = feature.geometry.coordinates;
      if (isPerpendicularStub(coords, corridorAxis, minKm)) continue;
      if (lineLength(coords) < minKm) {
        const start = coords[0];
        const end = coords[coords.length - 1];
        if (!start || !end) continue;
        const others = group
          .filter((candidate) => candidate !== feature)
          .map((candidate) => candidate.geometry.coordinates);
        const touches = endpointNearAny(start, others, touchKm)
          || endpointNearAny(end, others, touchKm);
        if (!touches) continue;
      }
      kept.push(feature);
    }
  }
  return kept;
}

/** Join near-touching polylines into contiguous chains (all chains, longest first). */
export function stitchAllChains(parts: number[][][], joinKm = 0.04): number[][][] {
  const unused = parts.map((part) => part.map((point) => [...point]));
  const near = (a: number[], b: number[]) => Math.hypot(((a[0] ?? 0) - (b[0] ?? 0)) * 82, ((a[1] ?? 0) - (b[1] ?? 0)) * 111) < joinKm;
  const chains: number[][][] = [];
  while (unused.length > 0) {
    const chain = unused.pop();
    if (!chain) break;
    let grew = true;
    while (grew) {
      grew = false;
      for (let index = 0; index < unused.length; index += 1) {
        const part = unused[index];
        const head = chain[0];
        const tail = chain[chain.length - 1];
        const start = part?.[0];
        const end = part?.[part.length - 1];
        if (!part || !head || !tail || !start || !end) continue;
        if (near(tail, start)) chain.push(...part.slice(1));
        else if (near(tail, end)) chain.push(...part.slice().reverse().slice(1));
        else if (near(head, end)) chain.unshift(...part.slice(0, -1));
        else if (near(head, start)) chain.unshift(...part.slice().reverse().slice(1));
        else continue;
        unused.splice(index, 1);
        grew = true;
        break;
      }
    }
    chains.push(chain);
  }
  chains.sort((left, right) => lineLength(right) - lineLength(left));
  return chains;
}

/**
 * Merge near-touching OSM ways per street so paint is continuous (closes sub-block gaps).
 * Runs after stub filtering. Uses a slightly looser join than label stitching.
 */
export function stitchOrientationStreetFeatures<T extends {
  properties?: Record<string, unknown> | null;
  geometry: { type: string; coordinates: number[][] };
}>(features: T[], joinKm = 0.1): T[] {
  // Group by display name so West/East halves (Dundas, Bloor, …) paint as one corridor.
  // Labels still use entryKey separately and keep a single marker per side.
  const groups = new Map<string, T[]>();
  for (const feature of features) {
    if (feature.geometry.type !== 'LineString') continue;
    const displayName = feature.properties?.displayName;
    const entryKey = feature.properties?.entryKey;
    const key = typeof displayName === 'string' && displayName
      ? displayName
      : (typeof entryKey === 'string' ? entryKey : '');
    const list = groups.get(key);
    if (list) list.push(feature);
    else groups.set(key, [feature]);
  }
  const stitched: T[] = [];
  for (const group of groups.values()) {
    const chains = stitchAllChains(group.map((feature) => feature.geometry.coordinates), joinKm);
    const template = group[0];
    if (!template) continue;
    for (const coordinates of chains) {
      if (coordinates.length < 2) continue;
      stitched.push({
        ...template,
        geometry: { type: 'LineString', coordinates },
      });
    }
  }
  return stitched;
}

/** Longest contiguous chain only — used for placing one HTML label per street entry. */
export function stitchLongest(parts: number[][][], joinKm = 0.04) {
  return stitchAllChains(parts, joinKm)[0] ?? [];
}

/** Bearing (degrees clockwise from north) of the segment that contains the midpoint. */
export function bearingAtMidpoint(coordinates: number[][]): number {
  if (coordinates.length < 2) return 0;
  const total = lineLength(coordinates);
  let remaining = total > 0 ? total / 2 : 0;
  let start = coordinates[0];
  let end = coordinates[1];
  for (let index = 1; index < coordinates.length; index += 1) {
    const from = coordinates[index - 1];
    const to = coordinates[index];
    if (!from || !to || from[0] === undefined || from[1] === undefined || to[0] === undefined || to[1] === undefined) continue;
    const segment = Math.hypot((to[0] - from[0]) * 82, (to[1] - from[1]) * 111);
    start = from;
    end = to;
    if (segment >= remaining) break;
    remaining -= segment;
  }
  if (!start || !end || start[0] === undefined || start[1] === undefined || end[0] === undefined || end[1] === undefined) return 0;
  const midLat = ((start[1] + end[1]) / 2) * (Math.PI / 180);
  const dx = (end[0] - start[0]) * Math.cos(midLat);
  const dy = end[1] - start[1];
  // Map bearing (0 = north). HTML text baselines run east-west at rotation 0, so
  // align the label with the street by rotating bearing − 90°.
  let rotation = (Math.atan2(dx, dy) * 180) / Math.PI - 90;
  // Keep text upright when it would otherwise read upside-down.
  if (rotation > 90 || rotation < -90) rotation += 180;
  return rotation;
}

/** East duplicates share a display name with West; only West labels are shown. */
export function isEastStreetEntryKey(entryKey: string) {
  return /\bEast$/i.test(entryKey.trim());
}

/** Midpoint along the polyline by approximate length. */
export function midpointAlong(coordinates: number[][]): [number, number] | null {
  if (coordinates.length < 2) return null;
  const total = lineLength(coordinates);
  if (total <= 0) {
    const first = coordinates[0];
    if (!first || first[0] === undefined || first[1] === undefined) return null;
    return [first[0], first[1]];
  }
  let remaining = total / 2;
  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1];
    const end = coordinates[index];
    if (!start || !end || start[0] === undefined || start[1] === undefined || end[0] === undefined || end[1] === undefined) continue;
    const segment = Math.hypot((end[0] - start[0]) * 82, (end[1] - start[1]) * 111);
    if (segment >= remaining) {
      const t = segment === 0 ? 0 : remaining / segment;
      return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
    }
    remaining -= segment;
  }
  const last = coordinates[coordinates.length - 1];
  if (!last || last[0] === undefined || last[1] === undefined) return null;
  return [last[0], last[1]];
}

export function streetEntryKey(properties: GeoJSON.GeoJsonProperties | null | undefined): string {
  if (!properties || typeof properties !== 'object') return '';
  if (typeof properties.entryKey === 'string' && properties.entryKey) return properties.entryKey;
  if (typeof properties.matchName === 'string' && properties.matchName) return properties.matchName;
  const category = typeof properties.category === 'string' ? properties.category : '';
  const displayName = typeof properties.displayName === 'string' ? properties.displayName : '';
  return `${category}\0${displayName}`;
}

/**
 * One Point per whitelist entry (West/East stay separate when they have distinct entryKeys).
 * Label placement prefers geometry inside an expanded chronicle box so labels can sit in the blur.
 */
export function streetLabelCollection(
  collection: GeoJSON.FeatureCollection,
  bounds: [[number, number], [number, number]],
  options: { padDegrees?: number } = {},
): GeoJSON.FeatureCollection<GeoJSON.Point, StreetLabelProperties> {
  const pad = options.padDegrees ?? 0.045;
  const box: StreetBox = {
    west: bounds[0][0] - pad,
    south: bounds[0][1] - pad,
    east: bounds[1][0] + pad,
    north: bounds[1][1] + pad,
  };
  const grouped = new globalThis.Map<string, { category: string; displayName: string; entryKey: string; parts: number[][][] }>();
  for (const feature of collection.features) {
    if (feature.geometry.type !== 'LineString') continue;
    const entryKey = streetEntryKey(feature.properties);
    if (!entryKey || isEastStreetEntryKey(entryKey)) continue;
    const clipped = clipPolyline(feature.geometry.coordinates as number[][], box);
    if (clipped.length === 0) continue;
    const category = String(feature.properties?.category ?? '');
    const displayName = String(feature.properties?.displayName ?? '');
    const group = grouped.get(entryKey) ?? { category, displayName, entryKey, parts: [] };
    group.parts.push(...clipped);
    grouped.set(entryKey, group);
  }
  return {
    type: 'FeatureCollection',
    features: [...grouped.values()].flatMap((group) => {
      const coordinates = stitchLongest(group.parts);
      const mid = midpointAlong(coordinates);
      if (!mid) return [];
      return [{
        type: 'Feature' as const,
        properties: {
          category: group.category,
          displayName: group.displayName,
          entryKey: group.entryKey,
          bearing: bearingAtMidpoint(coordinates),
        },
        geometry: { type: 'Point' as const, coordinates: mid },
      }];
    }),
  };
}

export const STREET_LABEL_MIN_ZOOM = 12;
