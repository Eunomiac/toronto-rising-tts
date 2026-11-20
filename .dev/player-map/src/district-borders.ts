import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon, Position } from 'geojson';
import polygonClipping from 'polygon-clipping';

type DistrictGeometry = Polygon | MultiPolygon;
type Ring = [number, number][];
type ClippingPolygon = Ring[];
type ClippingMultiPolygon = ClippingPolygon[];

const MAP_EDGE_METERS = 60;

const emptyBorders = (): FeatureCollection<LineString> => ({ type: 'FeatureCollection', features: [] });

function ringsOf(geometry: DistrictGeometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  return geometry.coordinates.flat();
}

function pair(position: Position): [number, number] {
  const longitude = position[0];
  const latitude = position[1];
  if (longitude === undefined || latitude === undefined) throw new Error('District border is missing a coordinate');
  return [longitude, latitude];
}

function asClippingGeometry(geometry: DistrictGeometry): ClippingMultiPolygon {
  if (geometry.type === 'Polygon') return [geometry.coordinates.map((ring) => ring.map(pair))];
  return geometry.coordinates.map((polygon) => polygon.map((ring) => ring.map(pair)));
}

let cachedDistricts: FeatureCollection<DistrictGeometry> | null = null;
let cachedMapEdge: Ring[] = [];

function mapEdgeRings(districts: FeatureCollection<DistrictGeometry>): Ring[] {
  if (cachedDistricts === districts) return cachedMapEdge;
  const geoms = districts.features.map((feature) => asClippingGeometry(feature.geometry));
  const union = geoms.length === 0 ? [] : polygonClipping.union(geoms[0] ?? [], ...geoms.slice(1));
  cachedMapEdge = union.map((polygon) => polygon[0]).filter((ring): ring is Ring => Boolean(ring && ring.length >= 2));
  cachedDistricts = districts;
  return cachedMapEdge;
}

function pointMeters(position: [number, number]): [number, number] {
  const [longitude, latitude] = position;
  return [longitude * 111_320 * Math.cos((latitude * Math.PI) / 180), latitude * 110_540];
}

function segmentDistance(point: [number, number], start: [number, number], end: [number, number]): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function distanceToRing(position: [number, number], ring: Ring): number {
  const point = pointMeters(position);
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = ring[index];
    const end = ring[index + 1];
    if (!start || !end) continue;
    nearest = Math.min(nearest, segmentDistance(point, pointMeters(start), pointMeters(end)));
  }
  return nearest;
}

function isMapEdge(start: Position, end: Position, edges: Ring[]): boolean {
  const startPair = pair(start);
  const endPair = pair(end);
  const midpoint: [number, number] = [(startPair[0] + endPair[0]) / 2, (startPair[1] + endPair[1]) / 2];
  return edges.some((ring) => [startPair, midpoint, endPair].every((sample) => distanceToRing(sample, ring) <= MAP_EDGE_METERS));
}

/**
 * The selected district's full outline, minus any piece that lies on the
 * outer rim of the city. Edge districts stay open toward the blurred area
 * off the map; interior districts keep a complete border.
 */
export function interiorDistrictBorders(
  districts: FeatureCollection<DistrictGeometry>,
  selectedKey: string | null,
): FeatureCollection<LineString> {
  if (!selectedKey) return emptyBorders();
  const selected = districts.features.find((feature) => feature.properties?.key === selectedKey);
  if (!selected) return emptyBorders();
  const edges = mapEdgeRings(districts);
  const features: Feature<LineString>[] = [];
  for (const ring of ringsOf(selected.geometry)) {
    let current: Position[] = [];
    const flush = () => {
      if (current.length >= 2) {
        features.push({
          type: 'Feature',
          properties: { key: selectedKey },
          geometry: { type: 'LineString', coordinates: current },
        });
      }
      current = [];
    };
    for (let index = 0; index < ring.length - 1; index += 1) {
      const start = ring[index];
      const end = ring[index + 1];
      if (!start || !end) continue;
      if (pair(start)[0] === pair(end)[0] && pair(start)[1] === pair(end)[1]) continue;
      if (isMapEdge(start, end, edges)) {
        flush();
        continue;
      }
      if (current.length === 0) current.push(start);
      current.push(end);
    }
    flush();
  }
  return { type: 'FeatureCollection', features };
}
