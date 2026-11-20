import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { describe, expect, it } from 'vitest';
import { interiorDistrictBorders } from './district-borders';

function square(key: string, originX: number): Feature<Polygon> {
  const ring = [
    [originX, 0],
    [originX + 1, 0],
    [originX + 1, 1],
    [originX, 1],
    [originX, 0],
  ];
  return {
    type: 'Feature',
    properties: { key },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

describe('interior district borders', () => {
  const districts: FeatureCollection<Polygon | MultiPolygon> = {
    type: 'FeatureCollection',
    features: [square('West', 0), square('East', 1)],
  };

  it('draws the shared edge and leaves out the outer rim', () => {
    const borders = interiorDistrictBorders(districts, 'West');
    expect(borders.features).toHaveLength(1);
    expect(borders.features[0]?.geometry.coordinates).toEqual([[1, 0], [1, 1]]);
  });

  it('draws the full outline of a district inside the city', () => {
    const outer = square('Outer', 0);
    outer.geometry.coordinates = [[
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [0, 0],
    ]];
    const inner: Feature<Polygon> = {
      type: 'Feature',
      properties: { key: 'Inner' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 2],
          [1, 1],
        ]],
      },
    };
    const borders = interiorDistrictBorders({ type: 'FeatureCollection', features: [outer, inner] }, 'Inner');
    expect(borders.features).toHaveLength(1);
    expect(borders.features[0]?.geometry.coordinates).toEqual([
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 2],
      [1, 1],
    ]);
  });

  it('draws nothing when no district is selected', () => {
    expect(interiorDistrictBorders(districts, null).features).toEqual([]);
  });
});
