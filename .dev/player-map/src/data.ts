import type { Position } from 'geojson';
import type { MapFeatureCollection, MapDataManifest, PublicMapData } from './types';

const GENERATED_ROOT = '/generated';

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return response.json() as Promise<T>;
}

export async function loadPublicMapData(): Promise<PublicMapData> {
  const [districts, regions, manifest] = await Promise.all([
    loadJson<MapFeatureCollection>(`${GENERATED_ROOT}/districts.geojson`),
    loadJson<MapFeatureCollection>(`${GENERATED_ROOT}/regions.geojson`),
    loadJson<MapDataManifest>(`${GENERATED_ROOT}/map-data-manifest.json`),
  ]);
  if (districts.features.length !== manifest.counts.districts) throw new Error('District manifest count does not match the map data');
  if (regions.features.length !== manifest.counts.regions) throw new Error('Region manifest count does not match the map data');
  return { districts, regions, manifest };
}

export function featureBounds(coordinates: Position[][][]): [[number, number], [number, number]] {
  const bounds: [[number, number], [number, number]] = [[Infinity, Infinity], [-Infinity, -Infinity]];
  for (const position of coordinates.flat(2)) {
    const longitude = position[0];
    const latitude = position[1];
    if (typeof longitude !== 'number' || typeof latitude !== 'number') continue;
    bounds[0][0] = Math.min(bounds[0][0], longitude);
    bounds[0][1] = Math.min(bounds[0][1], latitude);
    bounds[1][0] = Math.max(bounds[1][0], longitude);
    bounds[1][1] = Math.max(bounds[1][1], latitude);
  }
  return bounds;
}

export function selectedDistrictFromUrl(search: string): string | null {
  return new URLSearchParams(search).get('district');
}

export function updateDistrictInUrl(key: string | null): string {
  const url = new URL(window.location.href);
  if (key) url.searchParams.set('district', key);
  else url.searchParams.delete('district');
  return `${url.pathname}${url.search}${url.hash}`;
}
