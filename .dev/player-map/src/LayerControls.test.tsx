import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LayerControls } from './LayerControls';

describe('LayerControls', () => {
  it('changes available layers and explains when no sites are revealed', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <LayerControls
        visibility={{ districts: true, regions: false, sites: false, path: false, orientation: true }}
        siteCount={0}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Regions' }));
    expect(onChange).toHaveBeenCalledWith('regions', true);
    await user.click(screen.getByRole('checkbox', { name: 'PATH' }));
    expect(onChange).toHaveBeenCalledWith('path', true);
    await user.click(screen.getByRole('checkbox', { name: 'Orientation streets' }));
    expect(onChange).toHaveBeenCalledWith('orientation', false);
    expect(screen.getByRole('checkbox', { name: 'Sites (none revealed)' })).toBeDisabled();
  });
});
