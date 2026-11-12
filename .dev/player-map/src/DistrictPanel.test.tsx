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
  it('hides itself when nothing is selected', () => {
    const { container } = render(<DistrictPanel districts={districts} selectedKey={null} onClear={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the selected district details', async () => {
    const onClear = vi.fn();
    render(<DistrictPanel districts={districts} selectedKey="Rosedale" onClear={onClear} />);
    expect(screen.getByTestId('selected-district')).toHaveTextContent('Rosedale');
    expect(screen.getByTestId('selected-district')).toHaveTextContent('Hunting difficulty6');
    expect(screen.getByTestId('selected-district')).toHaveTextContent('Phlegmatic');
    expect(screen.getByTestId('selected-district')).toHaveTextContent('Melancholic');
    await userEvent.click(screen.getByRole('button', { name: 'Close district details' }));
    expect(onClear).toHaveBeenCalled();
  });
});
