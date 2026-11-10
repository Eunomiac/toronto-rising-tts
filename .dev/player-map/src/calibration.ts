import type { Position } from 'geojson';
import type { MapFeatureCollection } from './types';

const EARTH_RADIUS_METRES = 6_378_137;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export type HorizontalAnchor = 'west' | 'centre' | 'east';
export type VerticalAnchor = 'north' | 'centre' | 'south';

export interface VisualCalibration {
  horizontalScale: number;
  verticalScale: number;
  offsetEastMetres: number;
  offsetNorthMetres: number;
  horizontalAnchor: HorizontalAnchor;
  verticalAnchor: VerticalAnchor;
}

export const DEFAULT_VISUAL_CALIBRATION: VisualCalibration = {
  horizontalScale: 1,
  verticalScale: 1,
  offsetEastMetres: 0,
  offsetNorthMetres: 0,
  horizontalAnchor: 'west',
  verticalAnchor: 'north',
};

function longitudeToMetres(longitude: number) {
  return EARTH_RADIUS_METRES * longitude * DEG_TO_RAD;
}

function latitudeToMetres(latitude: number) {
  return EARTH_RADIUS_METRES * Math.log(Math.tan(Math.PI / 4 + latitude * DEG_TO_RAD / 2));
}

function metresToLongitude(x: number) {
  return x / EARTH_RADIUS_METRES * RAD_TO_DEG;
}

function metresToLatitude(y: number) {
  return (2 * Math.atan(Math.exp(y / EARTH_RADIUS_METRES)) - Math.PI / 2) * RAD_TO_DEG;
}

function anchorValue(minimum: number, maximum: number, anchor: HorizontalAnchor | VerticalAnchor) {
  if (anchor === 'west' || anchor === 'south') return minimum;
  if (anchor === 'east' || anchor === 'north') return maximum;
  return (minimum + maximum) / 2;
}

export function applyVisualCalibration(
  collection: MapFeatureCollection,
  bounds: [[number, number], [number, number]],
  calibration: VisualCalibration,
): MapFeatureCollection {
  if (
    calibration.horizontalScale === 1
    && calibration.verticalScale === 1
    && calibration.offsetEastMetres === 0
    && calibration.offsetNorthMetres === 0
  ) return collection;

  const west = longitudeToMetres(bounds[0][0]);
  const east = longitudeToMetres(bounds[1][0]);
  const south = latitudeToMetres(bounds[0][1]);
  const north = latitudeToMetres(bounds[1][1]);
  const anchorX = anchorValue(west, east, calibration.horizontalAnchor);
  const anchorY = anchorValue(south, north, calibration.verticalAnchor);

  const transformPosition = (position: Position): Position => {
    const sourceX = longitudeToMetres(position[0]!);
    const sourceY = latitudeToMetres(position[1]!);
    const output: Position = [
      metresToLongitude(anchorX + (sourceX - anchorX) * calibration.horizontalScale + calibration.offsetEastMetres),
      metresToLatitude(anchorY + (sourceY - anchorY) * calibration.verticalScale + calibration.offsetNorthMetres),
    ];
    if (position.length > 2) output.push(...position.slice(2));
    return output;
  };

  return {
    ...collection,
    features: collection.features.map((feature) => ({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: feature.geometry.coordinates.map((polygon) => (
          polygon.map((ring) => ring.map(transformPosition))
        )),
      },
    })),
  };
}

export function serializeVisualCalibration(calibration: VisualCalibration) {
  return JSON.stringify(calibration, null, 2);
}
