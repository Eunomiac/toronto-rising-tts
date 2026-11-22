import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoterieModal } from './CoterieModal';
import { coterieByKey, coterieImageUrl, coterieMenu } from './coteries';

describe('coterie menu', () => {
  it('groups coteries under their affiliation, highest order first, ignoring the word the', () => {
    expect(coterieMenu().map((group) => ({
      affiliation: group.affiliation,
      names: group.entries.map((entry) => entry.displayName),
    }))).toEqual([
      {
        affiliation: 'Camarilla',
        names: [
          'Five Keys', 'Moon Club', 'University Chantry',
          "Bee's Hive", 'Free Chantry', 'the Harpies', 'Iron Guard', 'Midnight Mass', 'Scarlett & the Boys',
        ],
      },
      {
        affiliation: 'Anarchs',
        names: ['the Good Doctors', 'the Line', 'Red Flag', 'Redeemers', 'Color Blitz', 'Jarvis Jacks'],
      },
      {
        affiliation: 'Independent',
        names: ['Wychwood Hecata'],
      },
    ]);
  });

  it('finds a coterie by the key a domain stores, and points at the picture file', () => {
    expect(coterieByKey('fiveKeys')?.displayName).toBe('Five Keys');
    expect(coterieByKey('missing')).toBeNull();
    expect(coterieByKey(null)).toBeNull();
    expect(coterieImageUrl('assets/coteries/coterie_fiveKeys.webp'))
      .toBe('/assets/images/coteries/coterie_fiveKeys.webp');
  });
});

describe('coterie picture', () => {
  it('shows the picture and closes when the picture itself is clicked', () => {
    const onClose = vi.fn();
    render(<CoterieModal coterieKey="fiveKeys" onClose={onClose} />);
    const picture = screen.getByRole('img', { name: 'Five Keys' });
    expect(picture).toHaveAttribute('src', '/assets/images/coteries/coterie_fiveKeys.webp');
    fireEvent.mouseDown(picture);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
