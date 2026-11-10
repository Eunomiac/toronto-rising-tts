import type { FeatureCollection, MultiPolygon } from 'geojson';

export type MapFeatureKind = 'district' | 'region';

export interface MapFeatureProperties {
  key: string;
  name: string;
  kind: MapFeatureKind;
  sourceElement: 'path' | 'polygon';
  fillRule: 'evenodd' | 'nonzero';
  sourceRingCount: number;
}

export type MapFeatureCollection = FeatureCollection<MultiPolygon, MapFeatureProperties>;

export interface MapDataManifest {
  schemaVersion: number;
  counts: {
    districts: number;
    regions: number;
  };
  bounds: [[number, number], [number, number]];
  calibration: {
    adjustments?: {
      horizontalScale?: number;
      anchorSourceX?: number;
    } | null;
    controlPointCount: number;
    rootMeanSquareErrorMetres: number;
    residuals: Array<{ name: string; metres: number }>;
    validationPointCount: number;
    validationRootMeanSquareErrorMetres: number | null;
    validationResiduals: Array<{ name: string; metres: number }>;
  };
}

export interface PublicMapData {
  districts: MapFeatureCollection;
  regions: MapFeatureCollection;
  manifest: MapDataManifest;
}
