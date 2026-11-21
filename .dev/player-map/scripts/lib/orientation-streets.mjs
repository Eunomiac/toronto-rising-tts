/**
 * Short stubs that run across a corridor paint as dash artifacts (round caps).
 * Drop only short pieces perpendicular to that street's dominant axis.
 */
export const MIN_ORIENTATION_STREET_KM = 0.05;

export function orientationStreetLengthKm(coordinates) {
  let length = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1];
    const end = coordinates[index];
    if (!start || !end) continue;
    length += Math.hypot((end[0] - start[0]) * 82, (end[1] - start[1]) * 111);
  }
  return length;
}

export function orientationStreetAxisExtentsKm(coordinates) {
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const point of coordinates) {
    const lon = point[0];
    const lat = point[1];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
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

function endpointNearAny(point, others, maxKm) {
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

export function filterOrientationStubArtifacts(features, minKm = MIN_ORIENTATION_STREET_KM) {
  const groups = new Map();
  for (const feature of features) {
    if (feature?.geometry?.type !== 'LineString') continue;
    const key = feature.properties?.entryKey || feature.properties?.displayName || '';
    const list = groups.get(key);
    if (list) list.push(feature);
    else groups.set(key, [feature]);
  }
  const kept = [];
  const touchKm = 0.035;
  for (const group of groups.values()) {
    let east = 0;
    let north = 0;
    for (const feature of group) {
      if (orientationStreetLengthKm(feature.geometry.coordinates) < minKm) continue;
      const extents = orientationStreetAxisExtentsKm(feature.geometry.coordinates);
      east += extents.eastKm;
      north += extents.northKm;
    }
    const corridorIsEast = east >= north;
    for (const feature of group) {
      const coords = feature.geometry.coordinates;
      const length = orientationStreetLengthKm(coords);
      if (length >= minKm) {
        kept.push(feature);
        continue;
      }
      const extents = orientationStreetAxisExtentsKm(coords);
      const pieceIsEast = extents.eastKm >= extents.northKm;
      if (pieceIsEast !== corridorIsEast) continue;
      const start = coords[0];
      const end = coords[coords.length - 1];
      if (!start || !end) continue;
      const others = group
        .filter((candidate) => candidate !== feature)
        .map((candidate) => candidate.geometry.coordinates);
      if (endpointNearAny(start, others, touchKm) || endpointNearAny(end, others, touchKm)) {
        kept.push(feature);
      }
    }
  }
  return kept;
}

export function buildOrientationStreets(config, snapshot) {
  const streets = Array.isArray(config?.streets) ? config.streets : [];
  const byName = new Map();
  for (const street of streets) {
    if (!street || typeof street.displayName !== 'string' || typeof street.category !== 'string' || !Array.isArray(street.matchNames)) {
      throw new Error('Invalid orientation street configuration');
    }
    for (const matchName of street.matchNames) {
      if (byName.has(matchName)) throw new Error(`Orientation street name ${matchName} is listed twice`);
      byName.set(matchName, street);
    }
  }
  const elements = Array.isArray(snapshot?.elements) ? snapshot.elements : [];
  const rawFeatures = [];
  for (const element of elements) {
    if (element?.type !== 'way' || !Array.isArray(element.geometry)) continue;
    const street = byName.get(element.tags?.name);
    if (!street) continue;
    const coordinates = element.geometry
      .filter((point) => Number.isFinite(point?.lon) && Number.isFinite(point?.lat))
      .map((point) => [point.lon, point.lat]);
    if (coordinates.length < 2) continue;
    rawFeatures.push({
      type: 'Feature',
      properties: {
        category: street.category,
        displayName: street.displayName,
        matchName: element.tags.name,
        // One whitelist row → one label, even when West/East share a display name.
        entryKey: street.matchNames[0],
        osmId: element.id,
      },
      geometry: { type: 'LineString', coordinates },
    });
  }
  const features = filterOrientationStubArtifacts(rawFeatures);
  const missing = streets
    .filter((street) => !features.some((feature) => feature.properties.entryKey === street.matchNames[0]))
    .map((street) => street.displayName);
  if (missing.length > 0) throw new Error(`Orientation street snapshot is missing ${missing.join(', ')}`);
  return { type: 'FeatureCollection', features };
}
