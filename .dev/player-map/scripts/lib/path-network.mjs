import { createHash } from 'node:crypto';
import bboxClip from '@turf/bbox-clip';
import buffer from '@turf/buffer';

const pointInside = ([longitude, latitude], [west, south, east, north]) => (
  longitude >= west && longitude <= east && latitude >= south && latitude <= north
);

const isPosition = (value) => Array.isArray(value) && value.length >= 2
  && Number.isFinite(value[0]) && Number.isFinite(value[1]);

function lineCoordinatesAreValid(coordinates, type, bbox) {
  const lines = type === 'LineString' ? [coordinates] : coordinates;
  return Array.isArray(lines) && lines.length > 0 && lines.every((line) => (
    Array.isArray(line) && line.length >= 2
    && line.every((position) => isPosition(position) && pointInside(position, bbox))
  ));
}

function polygonCoordinatesAreValid(coordinates, type) {
  const polygons = type === 'Polygon' ? [coordinates] : coordinates;
  return Array.isArray(polygons) && polygons.length > 0 && polygons.every((polygon) => (
    Array.isArray(polygon) && polygon.length > 0 && polygon.every((ring) => (
      Array.isArray(ring) && ring.length >= 4 && ring.every(isPosition)
      && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1]
    ))
  ));
}

function publicTag(tags, key) {
  const value = tags?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function entranceKind(tags) {
  if (tags?.railway === 'subway_entrance') return 'subway-entrance';
  if (tags?.highway === 'elevator') return 'elevator';
  return 'underground-entrance';
}

export function validatePathConfig(config) {
  const bounds = config?.bounds;
  if (config?.schemaVersion !== 1 || !bounds
    || ![bounds.west, bounds.south, bounds.east, bounds.north].every(Number.isFinite)
    || bounds.west >= bounds.east || bounds.south >= bounds.north
    || !Array.isArray(config.routeHighways) || config.routeHighways.length === 0
    || !config.routeHighways.every((value) => typeof value === 'string' && value)
    || !Number.isFinite(config.interactionWidthMetres) || config.interactionWidthMetres <= 0
    || !isPosition(config.labelPoint) || config.labelPoint.length !== 2
    || !Array.isArray(config.excludedWayIds) || !config.excludedWayIds.every(Number.isInteger)
    || typeof config.attribution !== 'string' || !config.attribution
    || typeof config.licenseUrl !== 'string' || !config.licenseUrl) {
    throw new Error('Invalid PATH network configuration');
  }
  return config;
}

export function validatePathSnapshot(snapshot) {
  if (snapshot?.schemaVersion !== 1 || typeof snapshot.fetchedAt !== 'string'
    || typeof snapshot.osmTimestamp !== 'string' || typeof snapshot.endpoint !== 'string'
    || typeof snapshot.query !== 'string' || !snapshot.query
    || !Array.isArray(snapshot.elements) || snapshot.elements.length === 0
    || !snapshot.elements.every((element) => (
      element && Number.isInteger(element.id)
      && ((element.type === 'node' && Number.isFinite(element.lon) && Number.isFinite(element.lat))
        || (element.type === 'way' && Array.isArray(element.geometry) && element.geometry.length >= 2
          && element.geometry.every((point) => Number.isFinite(point?.lon) && Number.isFinite(point?.lat))))
    ))) {
    throw new Error('Invalid OpenStreetMap PATH snapshot');
  }
  return snapshot;
}

export function buildPathNetwork(snapshotValue, configValue, districtFacts) {
  const snapshot = validatePathSnapshot(snapshotValue);
  const config = validatePathConfig(configValue);
  if (districtFacts?.key !== 'PATH') throw new Error('PATH district facts are missing');
  const bbox = [config.bounds.west, config.bounds.south, config.bounds.east, config.bounds.north];
  const excluded = new Set(config.excludedWayIds.map(Number));
  const routeHighways = new Set(config.routeHighways);
  const routeFeatures = [];
  const interactionFeatures = [];
  const entranceFeatures = [];

  for (const element of snapshot.elements) {
    if (element.type === 'way') {
      if (excluded.has(Number(element.id)) || !Array.isArray(element.geometry) || element.geometry.length < 2) continue;
      const highway = publicTag(element.tags, 'highway');
      if (highway && !routeHighways.has(highway)) continue;
      if (!highway && element.tags?.indoor !== 'corridor') continue;
      const raw = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: element.geometry.map((point) => [point.lon, point.lat]),
        },
      };
      const clipped = bboxClip(raw, bbox);
      if (!['LineString', 'MultiLineString'].includes(clipped.geometry.type)) continue;
      const coordinates = clipped.geometry.coordinates;
      if (!lineCoordinatesAreValid(coordinates, clipped.geometry.type, bbox)) {
        throw new Error(`PATH way ${element.id} produced invalid or out-of-bounds route geometry`);
      }
      const properties = {
        key: 'PATH',
        osmId: Number(element.id),
        name: publicTag(element.tags, 'name'),
        highway: highway ?? 'corridor',
        level: publicTag(element.tags, 'level'),
        indoor: publicTag(element.tags, 'indoor'),
        tunnel: publicTag(element.tags, 'tunnel'),
        covered: publicTag(element.tags, 'covered'),
      };
      const route = { ...clipped, id: `way-${element.id}`, properties };
      routeFeatures.push(route);
      const corridor = buffer(route, config.interactionWidthMetres / 2, { units: 'meters', steps: 4 });
      if (!corridor) throw new Error(`PATH way ${element.id} could not produce an interaction corridor`);
      if (!['Polygon', 'MultiPolygon'].includes(corridor.geometry.type)
        || !polygonCoordinatesAreValid(corridor.geometry.coordinates, corridor.geometry.type)) {
        throw new Error(`PATH way ${element.id} produced invalid interaction geometry`);
      }
      interactionFeatures.push({
        ...corridor,
        id: `way-${element.id}`,
        properties: { key: 'PATH', osmId: Number(element.id) },
      });
    } else if (element.type === 'node' && Number.isFinite(element.lon) && Number.isFinite(element.lat)) {
      const coordinates = [element.lon, element.lat];
      if (!pointInside(coordinates, bbox)) continue;
      entranceFeatures.push({
        type: 'Feature',
        id: `node-${element.id}`,
        properties: {
          key: 'PATH',
          osmId: Number(element.id),
          kind: entranceKind(element.tags),
          name: publicTag(element.tags, 'name'),
        },
        geometry: { type: 'Point', coordinates },
      });
    }
  }

  if (routeFeatures.length === 0 || entranceFeatures.length === 0 || interactionFeatures.length !== routeFeatures.length) {
    throw new Error('PATH snapshot did not produce the required routes, entrances, and corridors');
  }
  if (!pointInside(config.labelPoint, bbox)) throw new Error('PATH label point lies outside its reviewed bounds');

  const district = {
    key: districtFacts.key,
    name: districtFacts.name,
    huntingDifficulty: districtFacts.huntingDifficulty,
    resonancePlus: districtFacts.resonancePlus,
    resonanceMinus: districtFacts.resonanceMinus,
  };
  const label = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: 'PATH',
      properties: { key: 'PATH', name: district.name, kind: 'network-district' },
      geometry: { type: 'Point', coordinates: config.labelPoint },
    }],
  };
  return {
    district,
    routes: { type: 'FeatureCollection', features: routeFeatures },
    entrances: { type: 'FeatureCollection', features: entranceFeatures },
    interaction: { type: 'FeatureCollection', features: interactionFeatures },
    label,
    provenance: {
      fetchedAt: snapshot.fetchedAt,
      osmTimestamp: snapshot.osmTimestamp,
      endpoint: snapshot.endpoint,
      bounds: config.bounds,
      querySha256: createHash('sha256').update(snapshot.query).digest('hex'),
      routeElementIds: routeFeatures.map((feature) => feature.properties.osmId),
      entranceElementIds: entranceFeatures.map((feature) => feature.properties.osmId),
      excludedWayIds: [...config.excludedWayIds],
      attribution: config.attribution,
      licenseUrl: config.licenseUrl,
    },
  };
}
