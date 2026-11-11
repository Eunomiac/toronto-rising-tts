import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DistrictPanel } from './DistrictPanel';
import type { DistrictFeatureCollection } from './types';

const districts: DistrictFeatureCollection['features'] = [{
  type: 'Feature',
  id: 'Rosedale',
  properties: {
    key: 'Rosedale',
    name: 'Rosedale',
    kind: 'district',
    sourceElement: 'path',
    fillRule: 'evenodd',
    sourceRingCount: 1,
    huntingDifficulty: 6,
    resonancePlus: 'phlegmatic',
    resonanceMinus: 'melancholic',
  },
  geometry: { type: 'MultiPolygon', coordinates: [[[[-79.4, 43.6], [-79.3, 43.6], [-79.4, 43.6]]]] },
}];

describe('DistrictPanel', () => {
  it('allows keyboard-friendly district selection', async () => {
    const onSelect = vi.fn();
    render(<DistrictPanel districts={districts} selectedKey={null} onSelect={onSelect} onClear={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Choose a district'), 'Rosedale');
    expect(onSelect).toHaveBeenCalledWith('Rosedale');
  });

  it('shows the selected district details', () => {
    render(<DistrictPanel districts={districts} selectedKey="Rosedale" onSelect={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByTestId('selected-district')).toHaveTextContent('Rosedale');
    expect(screen.getByTestId('selected-district')).toHaveTextContent('Hunting difficulty6');
    expect(screen.getByTestId('selected-district')).toHaveTextContent('Phlegmatic');
    expect(screen.getByTestId('selected-district')).toHaveTextContent('Melancholic');
  });
});
