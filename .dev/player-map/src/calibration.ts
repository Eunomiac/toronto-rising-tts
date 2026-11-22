import type { Position } from 'geojson';
import type { FeatureCollection, MultiPolygon, Point } from 'geojson';
import type { MapFeatureProperties, MapLabelProperties } from './types';

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

export function applyVisualCalibration<T extends MapFeatureProperties>(
  collection: FeatureCollection<MultiPolygon, T>,
  bounds: [[number, number], [number, number]],
  calibration: VisualCalibration,
): FeatureCollection<MultiPolygon, T> {
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

export function applyVisualCalibrationToLabels(
  collection: FeatureCollection<Point, MapLabelProperties>,
  bounds: [[number, number], [number, number]],
  calibration: VisualCalibration,
): FeatureCollection<Point, MapLabelProperties> {
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

  return {
    ...collection,
    features: collection.features.map((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      const sourceX = longitudeToMetres(longitude!);
      const sourceY = latitudeToMetres(latitude!);
      return {
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: [
            metresToLongitude(anchorX + (sourceX - anchorX) * calibration.horizontalScale + calibration.offsetEastMetres),
            metresToLatitude(anchorY + (sourceY - anchorY) * calibration.verticalScale + calibration.offsetNorthMetres),
          ],
        },
      };
    }),
  };
}

export function serializeVisualCalibration(calibration: VisualCalibration) {
  return JSON.stringify(calibration, null, 2);
}

export interface ArtboardControlPoint {
  readonly source: readonly [number, number];
  readonly lngLat: readonly [number, number];
}

export interface ArtboardProjectorInput {
  readonly sourceViewBox: readonly [number, number, number, number];
  readonly controlPoints: readonly ArtboardControlPoint[];
  readonly adjustments?: { readonly horizontalScale?: number; readonly anchorSourceX?: number } | null;
  readonly visualCalibration?: VisualCalibration | null;
}

function fitAxis(sourceValues: number[], targetValues: number[]) {
  const sourceMean = sourceValues.reduce((sum, value) => sum + value, 0) / sourceValues.length;
  const targetMean = targetValues.reduce((sum, value) => sum + value, 0) / targetValues.length;
  const denominator = sourceValues.reduce((sum, value) => sum + (value - sourceMean) ** 2, 0);
  if (denominator < 1e-12) throw new Error('Calibration control points do not span both source axes');
  const scale = sourceValues.reduce(
    (sum, value, index) => sum + (value - sourceMean) * ((targetValues[index] ?? targetMean) - targetMean),
    0,
  ) / denominator;
  return { scale, offset: targetMean - scale * sourceMean };
}

/** Artboard pixels to the same longitude/latitude the district polygons use. */
export function createArtboardProjector(input: ArtboardProjectorInput) {
  if (input.controlPoints.length < 2) throw new Error('At least two calibration control points are required');
  const targets = input.controlPoints.map((control) => [
    longitudeToMetres(control.lngLat[0]),
    latitudeToMetres(control.lngLat[1]),
  ]);
  const fittedX = fitAxis(
    input.controlPoints.map((control) => control.source[0]),
    targets.map((target) => target[0] ?? 0),
  );
  const fittedY = fitAxis(
    input.controlPoints.map((control) => control.source[1]),
    targets.map((target) => target[1] ?? 0),
  );
  const horizontalScale = input.adjustments?.horizontalScale ?? 1;
  const anchorSourceX = input.adjustments?.anchorSourceX ?? 0;
  const xScale = fittedX.scale * horizontalScale;
  const xOffset = fittedX.offset + (fittedX.scale - xScale) * anchorSourceX;
  const projectFitted = (point: readonly [number, number]): [number, number] => [
    metresToLongitude(xScale * point[0] + xOffset),
    metresToLatitude(fittedY.scale * point[1] + fittedY.offset),
  ];

  const [minX, minY, width, height] = input.sourceViewBox;
  const corners = [
    projectFitted([minX, minY]),
    projectFitted([minX + width, minY]),
    projectFitted([minX + width, minY + height]),
    projectFitted([minX, minY + height]),
  ];
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...corners.map((corner) => corner[0])), Math.min(...corners.map((corner) => corner[1]))],
    [Math.max(...corners.map((corner) => corner[0])), Math.max(...corners.map((corner) => corner[1]))],
  ];
  const visual = input.visualCalibration ?? DEFAULT_VISUAL_CALIBRATION;

  return (point: readonly [number, number]): [number, number] => {
    const fitted = projectFitted(point);
    if (
      visual.horizontalScale === 1
      && visual.verticalScale === 1
      && visual.offsetEastMetres === 0
      && visual.offsetNorthMetres === 0
    ) return fitted;
    const west = longitudeToMetres(bounds[0][0]);
    const east = longitudeToMetres(bounds[1][0]);
    const south = latitudeToMetres(bounds[0][1]);
    const north = latitudeToMetres(bounds[1][1]);
    const anchorX = anchorValue(west, east, visual.horizontalAnchor);
    const anchorY = anchorValue(south, north, visual.verticalAnchor);
    const sourceX = longitudeToMetres(fitted[0]);
    const sourceY = latitudeToMetres(fitted[1]);
    return [
      metresToLongitude(anchorX + (sourceX - anchorX) * visual.horizontalScale + visual.offsetEastMetres),
      metresToLatitude(anchorY + (sourceY - anchorY) * visual.verticalScale + visual.offsetNorthMetres),
    ];
  };
}
