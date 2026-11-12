import area from '@turf/area';
import bboxClip from '@turf/bbox-clip';
import pointOnFeature from '@turf/point-on-feature';
import type { BBox, Feature, Polygon } from 'geojson';
import type { DistrictFeatureCollection, MapLabelCollection } from './types';

function polygonFeature(coordinates: Polygon['coordinates']): Feature<Polygon> {
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates } };
}

export function labelsForViewport(
  districts: DistrictFeatureCollection,
  labels: MapLabelCollection,
  viewport: BBox,
): MapLabelCollection {
  const districtByKey = new Map(districts.features.map((feature) => [feature.properties.key, feature]));
  return {
    ...labels,
    features: labels.features.map((label) => {
      if (label.properties.kind !== 'district') return label;
      const district = districtByKey.get(label.properties.key);
      if (!district) return label;
      const clipped = bboxClip(district, viewport);
      let polygons: Polygon['coordinates'][];
      if (clipped.geometry.type === 'Polygon') polygons = [clipped.geometry.coordinates];
      else if (clipped.geometry.type === 'MultiPolygon') polygons = clipped.geometry.coordinates;
      else return label;
      const usable = polygons.filter((polygon) => polygon.length > 0 && polygon[0]!.length >= 4);
      if (usable.length === 0) return label;
      const largest = usable
        .map(polygonFeature)
        .sort((left, right) => area(right) - area(left))[0]!;
      const point = pointOnFeature(largest);
      return {
        ...label,
        geometry: { ...label.geometry, coordinates: point.geometry.coordinates },
      };
    }),
  };
}
