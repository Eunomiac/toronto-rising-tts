import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconRail } from './IconRail';

describe('IconRail', () => {
  it('opens Map Layers and selects districts or toggles regions', async () => {
    const onToggleRegion = vi.fn();
    const onSelectDistrict = vi.fn();
    const user = userEvent.setup();
    render(
      <IconRail
        regions={[
          { key: 'TheRack', name: 'The Rack', kind: 'region', sourceElement: 'path', fillRule: 'evenodd', sourceRingCount: 1 },
          { key: 'UniversityOfToronto', name: 'University of Toronto', kind: 'region', sourceElement: 'path', fillRule: 'evenodd', sourceRingCount: 1 },
        ]}
        districts={[
          {
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
        ]}
        pathDistrict={{
          key: 'PATH',
          name: 'P.A.T.H.',
          huntingDifficulty: 4,
          resonancePlus: 'phlegmatic',
          resonanceMinus: 'choleric',
        }}
        regionVisibility={{ TheRack: false, UniversityOfToronto: false }}
        selectedDistrictKey={null}
        onToggleRegion={onToggleRegion}
        onSelectDistrict={onSelectDistrict}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Map Layers/i }));
    await user.click(screen.getByRole('button', { name: 'The Rack' }));
    expect(onToggleRegion).toHaveBeenCalledWith('TheRack');
    await user.click(screen.getByRole('button', { name: 'Rosedale' }));
    expect(onSelectDistrict).toHaveBeenCalledWith('Rosedale');
    expect(screen.getByRole('button', { name: 'The Sewers' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'The Subway' })).toBeDisabled();
  });
});
