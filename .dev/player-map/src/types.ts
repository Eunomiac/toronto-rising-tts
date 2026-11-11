import type { FeatureCollection, MultiPolygon, Point } from 'geojson';

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

export interface DistrictFeatureProperties extends MapFeatureProperties {
  kind: 'district';
  huntingDifficulty: number | null;
  resonancePlus: string;
  resonanceMinus: string;
}

export interface RegionFeatureProperties extends MapFeatureProperties {
  kind: 'region';
}

export interface PublicSiteProperties {
  key: string;
  name: string;
  districtKey: string;
}

export type DistrictFeatureCollection = FeatureCollection<MultiPolygon, DistrictFeatureProperties>;
export type RegionFeatureCollection = FeatureCollection<MultiPolygon, RegionFeatureProperties>;
export type PublicSiteCollection = FeatureCollection<Point, PublicSiteProperties>;

export type MapLayerId = 'districts' | 'regions' | 'sites';

export interface MapLayerVisibility {
  districts: boolean;
  regions: boolean;
  sites: boolean;
}

export interface MapDataManifest {
  schemaVersion: number;
  counts: {
    districts: number;
    regions: number;
    sites: number;
    sheetDistricts: number;
    sheetSites: number;
    sheetOnlyDistricts: number;
  };
  bounds: [[number, number], [number, number]];
  sheet: {
    spreadsheetId: string;
    fetchedAt: string;
    snapshotMode: 'shared-snapshot' | 'validated-cache' | 'live-fetch';
    exports: ['EXPORT_LOCATIONS_DISTRICTS', 'EXPORT_LOCATIONS_SITES'];
    sourceSha256: string;
    publicDistrictFields: string[];
    publicSiteFields: string[];
    sheetOnlyDistricts: Array<{
      key: string;
      geometryKind: 'network' | 'none';
      reason: string;
    }>;
  };
  calibration: {
    revision: number;
    adjustments?: {
      horizontalScale?: number;
      anchorSourceX?: number;
    } | null;
    visualCalibration?: {
      horizontalScale: number;
      verticalScale: number;
      offsetEastMetres: number;
      offsetNorthMetres: number;
      horizontalAnchor: 'west' | 'centre' | 'east';
      verticalAnchor: 'north' | 'centre' | 'south';
    } | null;
    controlPointCount: number;
    rootMeanSquareErrorMetres: number;
    residuals: Array<{ name: string; metres: number }>;
    validationPointCount: number;
    validationRootMeanSquareErrorMetres: number | null;
    validationResiduals: Array<{ name: string; metres: number }>;
  };
  normalization: {
    schemaVersion: number;
    prioritySource: string;
    expansionMetres: number;
    districtsWithOverlapCuts: number;
    remainingOverlapSquareMetres: number;
  };
}

export interface PublicMapData {
  districts: DistrictFeatureCollection;
  regions: RegionFeatureCollection;
  sites: PublicSiteCollection;
  manifest: MapDataManifest;
}
