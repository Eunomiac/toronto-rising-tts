import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const { loadPublicMapDataMock } = vi.hoisted(() => ({
  loadPublicMapDataMock: vi.fn(),
}));

vi.mock('./data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./data')>();
  return { ...actual, loadPublicMapData: loadPublicMapDataMock };
});

vi.mock('./MapView', () => ({
  MapView: ({ onSelect }: { onSelect: (key: string) => void }) => (
    <button type="button" onClick={() => onSelect('Rosedale')}>Select Rosedale on map</button>
  ),
}));

const feature = {
  type: 'Feature' as const,
  geometry: {
    type: 'MultiPolygon' as const,
    coordinates: [[[[-79.4, 43.6], [-79.39, 43.6], [-79.39, 43.61], [-79.4, 43.6]]]],
  },
  properties: {
    key: 'Rosedale',
    name: 'Rosedale',
    kind: 'district' as const,
    sourceElement: 'path' as const,
    fillRule: 'nonzero' as const,
    sourceRingCount: 1,
    huntingDifficulty: 6,
    resonancePlus: 'phlegmatic',
    resonanceMinus: 'melancholic',
  },
};

const mapData = {
  districts: { type: 'FeatureCollection' as const, features: [feature] },
  regions: { type: 'FeatureCollection' as const, features: [] },
  sites: { type: 'FeatureCollection' as const, features: [] },
  labels: {
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-79.395, 43.605] },
      properties: { key: 'Rosedale', name: 'Rosedale', kind: 'district' as const },
    }],
  },
  manifest: {
    schemaVersion: 4,
    counts: { districts: 1, regions: 0, sites: 0, labels: 1, sheetDistricts: 1, sheetSites: 0, sheetOnlyDistricts: 0 },
    bounds: [[-79.4, 43.6], [-79.39, 43.61]] as [[number, number], [number, number]],
    sheet: {
      spreadsheetId: 'test',
      fetchedAt: '2026-11-11T00:00:00.000Z',
      snapshotMode: 'validated-cache' as const,
      exports: ['EXPORT_LOCATIONS_DISTRICTS', 'EXPORT_LOCATIONS_SITES'] as const,
      sourceSha256: 'test',
      publicDistrictFields: [],
      publicSiteFields: [],
      sheetOnlyDistricts: [],
    },
    calibration: {
      revision: 1,
      controlPointCount: 0,
      rootMeanSquareErrorMetres: 0,
      residuals: [],
      validationPointCount: 0,
      validationRootMeanSquareErrorMetres: null,
      validationResiduals: [],
    },
    normalization: {
      schemaVersion: 2,
      prioritySource: 'test',
      expansionMetres: 2.35,
      districtsWithOverlapCuts: 0,
      remainingOverlapSquareMetres: 0,
    },
  },
};

describe('App district selection', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    loadPublicMapDataMock.mockResolvedValue(mapData);
  });

  afterEach(() => cleanup());

  it('deselects a district when the same map feature is clicked again', async () => {
    const user = userEvent.setup();
    render(<App />);
    const mapDistrict = await screen.findByRole('button', { name: 'Select Rosedale on map' });

    await user.click(mapDistrict);
    expect(screen.getByTestId('selected-district')).toHaveTextContent('Rosedale');
    expect(window.location.search).toBe('?district=Rosedale');

    await user.click(mapDistrict);
    await waitFor(() => expect(screen.queryByTestId('selected-district')).not.toBeInTheDocument());
    expect(window.location.search).toBe('');
  });

  it('stores visible overlays in the shareable URL', async () => {
    const user = userEvent.setup();
    render(<App />);
    const regions = await screen.findByRole('checkbox', { name: 'Regions' });

    await user.click(regions);
    expect(window.location.search).toBe('?layers=districts%2Cregions');

    await user.click(screen.getByRole('checkbox', { name: 'Districts' }));
    expect(window.location.search).toBe('?layers=regions');
  });
});
