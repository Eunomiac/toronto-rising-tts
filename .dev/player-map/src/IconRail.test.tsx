import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_DOMAIN_SELECTION, type DomainSelection } from './domains';
import { IconRail } from './IconRail';

describe('IconRail', () => {
  it('places Sites second in the menu stack after Map Layers', () => {
    render(
      <IconRail
        regions={[]}
        districts={[]}
        regionVisibility={{}}
        selectedDistrictKey={null}
        overlay={{ kind: 'none' }}
        onToggleRegion={vi.fn()}
        onSelectDistrict={vi.fn()}
        onOverlayChange={vi.fn()}
      />,
    );
    const menuButtons = screen.getAllByRole('button').filter((button) => button.className.includes('icon-rail__button'));
    expect(menuButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Map Layers',
      'Sites',
      'Domains',
      'Coteries',
      'Hunting',
      'Homestead',
    ]);
  });

  it('opens Map Layers and selects districts or toggles regions', async () => {
    cleanup();
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
    aspectAdvantage: null,
    affair: 3,
    association: 3,
    clout: 3,
    utility: 3,
          },
        ]}
        pathDistrict={{
          key: 'PATH',
          name: 'P.A.T.H.',
          huntingDifficulty: 4,
          resonancePlus: 'phlegmatic',
          resonanceMinus: 'choleric',
    aspectAdvantage: null,
    affair: 3,
    association: 3,
    clout: 3,
    utility: 3,
        }}
        regionVisibility={{ TheRack: false, UniversityOfToronto: false }}
        selectedDistrictKey={null}
        overlay={{ kind: 'none' }}
        onToggleRegion={onToggleRegion}
        onSelectDistrict={onSelectDistrict}
        onOverlayChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Map Layers/i }));
    await user.click(screen.getByRole('button', { name: 'The Rack' }));
    expect(onToggleRegion).toHaveBeenCalledWith('TheRack');
    await user.click(screen.getByRole('button', { name: 'Rosedale' }));
    expect(onSelectDistrict).toHaveBeenCalledWith('Rosedale');
  });

  it('sorts districts by name and ignores a leading The', async () => {
    cleanup();
    const user = userEvent.setup();
    render(
      <IconRail
        regions={[]}
        districts={[
          { key: 'Bay', name: 'The Bay St. Financial District', kind: 'district', sourceElement: 'path', fillRule: 'evenodd', sourceRingCount: 1, huntingDifficulty: 4, resonancePlus: 'choleric', resonanceMinus: 'melancholic',
    aspectAdvantage: null,
    affair: 3,
    association: 3,
    clout: 3,
    utility: 3 },
          { key: 'Annex', name: 'The Annex', kind: 'district', sourceElement: 'path', fillRule: 'evenodd', sourceRingCount: 1, huntingDifficulty: 5, resonancePlus: 'sanguine', resonanceMinus: 'choleric',
    aspectAdvantage: null,
    affair: 3,
    association: 3,
    clout: 3,
    utility: 3 },
          { key: 'Yorkville', name: 'Yorkville', kind: 'district', sourceElement: 'path', fillRule: 'evenodd', sourceRingCount: 1, huntingDifficulty: 6, resonancePlus: 'phlegmatic', resonanceMinus: 'melancholic',
    aspectAdvantage: null,
    affair: 3,
    association: 3,
    clout: 3,
    utility: 3 },
        ]}
        pathDistrict={{ key: 'PATH', name: 'P.A.T.H.', huntingDifficulty: 4, resonancePlus: 'phlegmatic', resonanceMinus: 'choleric',
    aspectAdvantage: null,
    affair: 3,
    association: 3,
    clout: 3,
    utility: 3 }}
        sheetOnlyDistricts={[
          { key: 'Sewers', name: 'The Sewers', huntingDifficulty: null, resonancePlus: 'primal', resonanceMinus: 'sanguine',
    aspectAdvantage: null,
    affair: 3,
    association: 3,
    clout: 3,
    utility: 3 },
          { key: 'Subway', name: 'The Subway', huntingDifficulty: 5, resonancePlus: 'melancholic', resonanceMinus: 'choleric',
    aspectAdvantage: null,
    affair: 3,
    association: 3,
    clout: 3,
    utility: 3 },
        ]}
        regionVisibility={{}}
        selectedDistrictKey={null}
        overlay={{ kind: 'none' }}
        onToggleRegion={vi.fn()}
        onSelectDistrict={vi.fn()}
        onOverlayChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Map Layers/i }));
    const names = screen.getAllByRole('button').filter((button) => button.className.includes('icon-rail__option')).map((button) => button.textContent);
    expect(names).toEqual([
      'The Annex',
      'The Bay St. Financial District',
      'P.A.T.H.',
      'The Sewers',
      'The Subway',
      'Yorkville',
    ]);
    expect(screen.getByRole('button', { name: 'The Sewers' })).toBeEnabled();
  });

  it('groups hub sites above the other sites and toggles only the others', async () => {
    cleanup();
    const onToggleSite = vi.fn();
    const onFocusHub = vi.fn();
    const user = userEvent.setup();
    render(
      <IconRail
        regions={[]}
        districts={[]}
        regionVisibility={{}}
        selectedDistrictKey={null}
        sites={[
          { key: 'Cafe', name: 'The Cafe', districtKey: 'Yorkville', icon: 'cafe', hub: false },
          { key: 'CasaLoma', name: 'Casa Loma', districtKey: 'Wychwood', icon: 'hub_castle', hub: true },
          { key: 'Annex', name: 'The Annex Library', districtKey: 'TheAnnex', icon: 'library', hub: false },
        ]}
        toggledSiteKeys={['Cafe']}
        overlay={{ kind: 'none' }}
        onToggleRegion={vi.fn()}
        onSelectDistrict={vi.fn()}
        onToggleSite={onToggleSite}
        onFocusHub={onFocusHub}
        onOverlayChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Sites/i }));
    const names = screen.getAllByRole('button').filter((button) => button.className.includes('icon-rail__option')).map((button) => button.textContent);
    expect(names).toEqual(['Casa Loma', 'The Annex Library', 'The Cafe']);
    expect(document.querySelector('.icon-rail__list--sites')).not.toBeNull();
    expect(document.querySelector('.icon-rail__panel--sites')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Casa Loma' }));
    expect(onFocusHub).toHaveBeenCalledWith('CasaLoma');
    expect(onToggleSite).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'The Annex Library' }));
    expect(onToggleSite).toHaveBeenCalledWith('Annex');
    expect(onFocusHub).toHaveBeenCalledWith('Annex');
  });

  it('styles hunting and homestead options with the gold district class color', async () => {
    cleanup();
    const user = userEvent.setup();
    render(
      <IconRail
        regions={[]}
        districts={[]}
        regionVisibility={{}}
        selectedDistrictKey={null}
        overlay={{ kind: 'none' }}
        onToggleRegion={vi.fn()}
        onSelectDistrict={vi.fn()}
        onOverlayChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Hunting/i }));
    expect(screen.getByRole('button', { name: 'Choleric' }).className).toContain('icon-rail__option--district');
    await user.click(screen.getByRole('button', { name: /Homestead/i }));
    expect(screen.getByRole('button', { name: /Affair/i }).className).toContain('icon-rail__option--homestead');
  });

  it('shows a sticky overlay chip that clears the overlay when clicked', async () => {
    cleanup();
    const onOverlayChange = vi.fn();
    const user = userEvent.setup();
    render(
      <IconRail
        regions={[]}
        districts={[]}
        regionVisibility={{}}
        selectedDistrictKey={null}
        overlay={{ kind: 'hunting', flavor: 'Choleric' }}
        onToggleRegion={vi.fn()}
        onSelectDistrict={vi.fn()}
        onOverlayChange={onOverlayChange}
      />,
    );
    const chip = screen.getByRole('button', { name: /Clear CHOLERIC overlay/i });
    expect(chip.textContent).toBe('CHOLERIC');
    await user.click(chip);
    expect(onOverlayChange).toHaveBeenCalledWith({ kind: 'none' });
  });

  it('lists coteries under unclickable headers and opens a picture without marking the row selected', async () => {
    cleanup();
    const user = userEvent.setup();
    const onOpenCoterie = vi.fn();
    render(
      <IconRail
        regions={[]}
        districts={[]}
        regionVisibility={{}}
        selectedDistrictKey={null}
        overlay={{ kind: 'none' }}
        onToggleRegion={vi.fn()}
        onSelectDistrict={vi.fn()}
        onOverlayChange={vi.fn()}
        onOpenCoterie={onOpenCoterie}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Coteries' }));
    const panel = document.getElementById('icon-rail-body-coteries');
    if (!(panel instanceof HTMLElement)) throw new Error('Coteries menu did not open');
    const menu = within(panel);
    expect(menu.queryByRole('button', { name: 'Camarilla' })).toBeNull();
    expect(menu.getByText('Camarilla')).toBeVisible();
    const names = menu.getAllByRole('button').map((button) => button.textContent);
    expect(names.slice(0, 3)).toEqual(['Five Keys', 'Moon Club', 'University Chantry']);
    expect(names).toContain('the Harpies');
    expect(names.indexOf('the Good Doctors')).toBeLessThan(names.indexOf('Color Blitz'));
    const fiveKeys = menu.getByRole('button', { name: 'Five Keys' });
    await user.click(fiveKeys);
    expect(onOpenCoterie).toHaveBeenCalledWith('fiveKeys');
    expect(fiveKeys.className).not.toContain('is-selected');
    expect(menu.getByText('Camarilla')).toBeVisible();
  });

  it('toggles an affiliation, keeps the matching domain lit, and clears every domain from the chip', async () => {
    cleanup();
    const user = userEvent.setup();
    const onDomainSelectionChange = vi.fn();
    const { rerender } = render(
      <IconRail
        regions={[]}
        districts={[]}
        regionVisibility={{}}
        selectedDistrictKey={null}
        overlay={{ kind: 'none' }}
        domainSelection={EMPTY_DOMAIN_SELECTION}
        onToggleRegion={vi.fn()}
        onSelectDistrict={vi.fn()}
        onOverlayChange={vi.fn()}
        onDomainSelectionChange={onDomainSelectionChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Domains' }));
    await user.click(screen.getByRole('button', { name: 'Independent' }));
    const next = onDomainSelectionChange.mock.calls[0]?.[0] as DomainSelection;
    expect(next.affiliations).toEqual(['Independent']);
    expect(next.domainKeys).toContain('bertrice');

    rerender(
      <IconRail
        regions={[]}
        districts={[]}
        regionVisibility={{}}
        selectedDistrictKey={null}
        overlay={{ kind: 'none' }}
        domainSelection={next}
        onToggleRegion={vi.fn()}
        onSelectDistrict={vi.fn()}
        onOverlayChange={vi.fn()}
        onDomainSelectionChange={onDomainSelectionChange}
      />,
    );
    expect(screen.getByRole('button', { name: 'Independent' })).toHaveClass('is-selected');
    expect(screen.getByRole('button', { name: 'Bertrice' })).toHaveClass('is-selected');

    await user.click(screen.getByRole('button', { name: 'Domains' }));
    const chip = screen.getByRole('button', { name: 'Clear Domains overlay' });
    expect(chip.textContent).toBe('Domains');
    await user.click(chip);
    expect(onDomainSelectionChange).toHaveBeenLastCalledWith(EMPTY_DOMAIN_SELECTION);
  });
});
