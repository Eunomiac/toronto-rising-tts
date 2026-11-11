import type { FeatureCollection, LineString, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson';

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

export interface MapLabelProperties {
  key: string;
  name: string;
  kind: MapFeatureKind;
}

export interface NetworkDistrictFacts {
  key: 'PATH';
  name: string;
  huntingDifficulty: number | null;
  resonancePlus: string;
  resonanceMinus: string;
}

export interface PathRouteProperties {
  key: 'PATH';
  osmId: number;
  name: string | null;
  highway: string;
  level: string | null;
  indoor: string | null;
  tunnel: string | null;
  covered: string | null;
}

export interface PathEntranceProperties {
  key: 'PATH';
  osmId: number;
  kind: 'subway-entrance' | 'elevator' | 'underground-entrance';
  name: string | null;
}

export interface PathInteractionProperties {
  key: 'PATH';
  osmId: number;
}

export interface PathLabelProperties {
  key: 'PATH';
  name: string;
  kind: 'network-district';
}

export type DistrictFeatureCollection = FeatureCollection<MultiPolygon, DistrictFeatureProperties>;
export type RegionFeatureCollection = FeatureCollection<MultiPolygon, RegionFeatureProperties>;
export type PublicSiteCollection = FeatureCollection<Point, PublicSiteProperties>;
export type MapLabelCollection = FeatureCollection<Point, MapLabelProperties>;
export type PathRouteCollection = FeatureCollection<LineString | MultiLineString, PathRouteProperties>;
export type PathEntranceCollection = FeatureCollection<Point, PathEntranceProperties>;
export type PathInteractionCollection = FeatureCollection<Polygon | MultiPolygon, PathInteractionProperties>;
export type PathLabelCollection = FeatureCollection<Point, PathLabelProperties>;

export type MapLayerId = 'districts' | 'regions' | 'sites' | 'path';

export interface MapLayerVisibility {
  districts: boolean;
  regions: boolean;
  sites: boolean;
  path: boolean;
}

export interface MapDataManifest {
  schemaVersion: number;
  counts: {
    districts: number;
    regions: number;
    sites: number;
    labels: number;
    pathRoutes: number;
    pathEntrances: number;
    pathInteractionCorridors: number;
    pathLabels: number;
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
  pathNetwork: {
    fetchedAt: string;
    osmTimestamp: string;
    endpoint: string;
    bounds: { south: number; west: number; north: number; east: number };
    querySha256: string;
    routeElementIds: number[];
    entranceElementIds: number[];
    excludedWayIds: number[];
    attribution: string;
    licenseUrl: string;
  };
}

export interface PublicMapData {
  districts: DistrictFeatureCollection;
  regions: RegionFeatureCollection;
  sites: PublicSiteCollection;
  labels: MapLabelCollection;
  pathDistrict: NetworkDistrictFacts;
  pathRoutes: PathRouteCollection;
  pathEntrances: PathEntranceCollection;
  pathInteraction: PathInteractionCollection;
  pathLabel: PathLabelCollection;
  manifest: MapDataManifest;
}
