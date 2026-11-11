import area from '@turf/area';
import buffer from '@turf/buffer';
import polygonClipping from 'polygon-clipping';

function asMultiPolygonCoordinates(geometry) {
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  throw new Error(`Unsupported normalization geometry: ${geometry.type}`);
}

function bounds(coordinates) {
  return coordinates.flat(2).reduce((result, [longitude, latitude]) => [
    Math.min(result[0], longitude),
    Math.min(result[1], latitude),
    Math.max(result[2], longitude),
    Math.max(result[3], latitude),
  ], [Infinity, Infinity, -Infinity, -Infinity]);
}

function intersects(a, b) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function featureArea(coordinates) {
  return area({ type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates } });
}

function canonicalize(coordinates, key) {
  const result = polygonClipping.union(coordinates);
  if (!result || result.length === 0) throw new Error(`Could not canonicalize ${key}`);
  return result;
}

function diagnosticFeature(type, coordinates, properties = {}) {
  if (!coordinates?.length) return null;
  const squareMetres = featureArea(coordinates);
  if (squareMetres <= 0.01) return null;
  return {
    type: 'Feature',
    properties: { diagnosticType: type, squareMetres: Number(squareMetres.toFixed(2)), ...properties },
    geometry: { type: 'MultiPolygon', coordinates },
  };
}

export function normalizeDistrictCollection(collection, config) {
  if (config.schemaVersion !== 1 || !Number.isFinite(config.expansionMetres) || config.expansionMetres < 0) {
    throw new Error('Invalid district-priority manifest');
  }
  const byKey = new Map(collection.features.map((feature) => [feature.properties.key, feature]));
  const actualKeys = [...byKey.keys()].sort();
  const priorityKeys = [...config.priority].sort();
  if (new Set(config.priority).size !== config.priority.length
    || JSON.stringify(actualKeys) !== JSON.stringify(priorityKeys)) {
    throw new Error('District-priority manifest must contain every district exactly once');
  }

  const winners = [];
  const normalizedByKey = new Map();
  const features = [];
  const visualFeatures = [];
  for (const key of config.priority) {
    const sourceFeature = byKey.get(key);
    const source = canonicalize(asMultiPolygonCoordinates(sourceFeature.geometry), key);
    const canonicalFeature = {
      ...sourceFeature,
      geometry: { type: 'MultiPolygon', coordinates: source },
    };
    const expandedFeature = buffer(canonicalFeature, config.expansionMetres, { units: 'meters', steps: 3 });
    if (!expandedFeature) throw new Error(`Could not expand ${key}`);
    const expanded = canonicalize(asMultiPolygonCoordinates(expandedFeature.geometry), key);
    let normalized = expanded;
    let normalizedBounds = bounds(normalized);
    const clippedBy = [];

    for (const winner of winners) {
      if (!intersects(normalizedBounds, winner.bounds)) continue;
      const before = featureArea(normalized);
      const overlapFragment = polygonClipping.intersection(normalized, winner.coordinates);
      const difference = polygonClipping.difference(normalized, winner.coordinates);
      if (!difference || difference.length === 0) throw new Error(`${key} was completely removed by winner ${winner.key}`);
      normalized = canonicalize(difference, key);
      const removed = before - featureArea(normalized);
      if (removed > 0.01) {
        clippedBy.push({ key: winner.key, squareMetres: Number(removed.toFixed(2)) });
        visualFeatures.push(diagnosticFeature('removed-overlap', overlapFragment, {
          districtKey: key,
          winnerDistrictKey: winner.key,
        }));
      }
      normalizedBounds = bounds(normalized);
    }

    const sourceSquareMetres = featureArea(source);
    const expandedSquareMetres = featureArea(expanded);
    const normalizedSquareMetres = featureArea(normalized);
    features.push({
      key,
      sourceSquareMetres: Number(sourceSquareMetres.toFixed(2)),
      expansionAddedSquareMetres: Number((expandedSquareMetres - sourceSquareMetres).toFixed(2)),
      overlapRemovedSquareMetres: Number((expandedSquareMetres - normalizedSquareMetres).toFixed(2)),
      clippedBy,
    });
    normalizedByKey.set(key, {
      ...sourceFeature,
      geometry: { type: 'MultiPolygon', coordinates: normalized },
    });
    visualFeatures.push(diagnosticFeature('source-boundary', source, { districtKey: key }));
    visualFeatures.push(diagnosticFeature('normalized-boundary', normalized, { districtKey: key }));
    visualFeatures.push(diagnosticFeature('boundary-added', polygonClipping.difference(normalized, source), { districtKey: key }));
    visualFeatures.push(diagnosticFeature('boundary-removed', polygonClipping.difference(source, normalized), { districtKey: key }));
    winners.push({ key, coordinates: normalized, bounds: normalizedBounds });
  }

  let remainingOverlapSquareMetres = 0;
  for (let first = 0; first < winners.length; first += 1) {
    for (let second = first + 1; second < winners.length; second += 1) {
      if (!intersects(winners[first].bounds, winners[second].bounds)) continue;
      const overlap = polygonClipping.intersection(winners[first].coordinates, winners[second].coordinates);
      if (overlap?.length) {
        remainingOverlapSquareMetres += featureArea(overlap);
        visualFeatures.push(diagnosticFeature('remaining-overlap', overlap, {
          districtKey: winners[first].key,
          otherDistrictKey: winners[second].key,
        }));
      }
    }
  }

  const coverage = polygonClipping.union(...winners.map((winner) => winner.coordinates));
  for (const polygon of coverage) {
    for (const ring of polygon.slice(1)) {
      visualFeatures.push(diagnosticFeature('remaining-gap', [[ring]], {}));
    }
  }

  const diagnostics = {
    schemaVersion: 2,
    status: 'runtime-geometry',
    operation: 'canonicalize-expand-and-cut-by-reviewed-priority',
    expansionMetres: config.expansionMetres,
    approximateSourcePixels: 1,
    priorityBasis: config.basis,
    winnerOrder: [...config.priority],
    summary: {
      districtCount: features.length,
      districtsWithOverlapCuts: features.filter(({ overlapRemovedSquareMetres }) => overlapRemovedSquareMetres > 0.01).length,
      totalExpansionAddedSquareMetres: Number(features.reduce((sum, item) => sum + item.expansionAddedSquareMetres, 0).toFixed(2)),
      totalOverlapRemovedSquareMetres: Number(features.reduce((sum, item) => sum + item.overlapRemovedSquareMetres, 0).toFixed(2)),
      remainingOverlapSquareMetres: Number(remainingOverlapSquareMetres.toFixed(6)),
    },
    features,
  };

  if (diagnostics.summary.remainingOverlapSquareMetres > 0.01) {
    throw new Error(`Normalized districts still overlap by ${diagnostics.summary.remainingOverlapSquareMetres} square metres`);
  }

  return {
    collection: {
      ...collection,
      features: collection.features.map((feature) => normalizedByKey.get(feature.properties.key)),
    },
    diagnostics,
    visualDiagnostics: {
      type: 'FeatureCollection',
      features: visualFeatures.filter(Boolean),
    },
  };
}
