import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DebugNotesSlot } from './DebugNotesSlot.dev';

describe('DebugNotesSlot development controls', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the shared note file and exposes add/show controls only after opening the tool', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        nextId: 2,
        notes: [{
          id: 1,
          anchor: { kind: 'interface', surface: 'viewport', x: 0.5, y: 0.5 },
          text: 'Check this position.',
          status: 'open',
          context: { url: '/', viewport: { width: 1000, height: 800 }, selectedDistrict: null },
          createdAt: '2026-11-11T00:00:00.000Z',
          updatedAt: '2026-11-11T00:00:00.000Z',
        }],
      }),
    });
    vi.stubGlobal('fetch', fetch);

    render(<DebugNotesSlot map={null} selectedDistrict={null} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/debug-notes', expect.objectContaining({ method: 'GET' })));
    expect(screen.queryByRole('button', { name: 'Add note' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Debug notes/ }));
    expect(screen.getByRole('button', { name: 'Add note' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hide notes' })).toBeVisible();
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('title', 'Check this position.');
  });
});
