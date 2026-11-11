// @vitest-environment node
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDebugNoteStore, parseDebugNoteCreate, parseDebugNotePatch } from './debug-note-store';

const context = {
  url: '/?district=Rosedale',
  viewport: { width: 1440, height: 900 },
  selectedDistrict: 'Rosedale',
  map: { center: [-79.38, 43.67] as const, zoom: 12.5 },
};

describe('debug note store', () => {
  let filePath: string;

  beforeEach(async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'player-map-debug-notes-'));
    filePath = path.join(directory, 'agent', 'debug-notes.json');
  });

  it('persists map and interface notes with stable increasing numbers', async () => {
    const store = createDebugNoteStore(filePath);
    await store.add(parseDebugNoteCreate({
      anchor: { kind: 'map', longitude: -79.38, latitude: 43.67 },
      text: 'Keep this label visible.',
      context,
    }));
    await store.add(parseDebugNoteCreate({
      anchor: { kind: 'interface', surface: 'district-panel', x: 0.5, y: 0.25 },
      text: 'This panel needs a shorter heading.',
      context,
    }));
    await store.remove(2);
    const result = await store.add(parseDebugNoteCreate({
      anchor: { kind: 'interface', surface: 'app-header', x: 0.2, y: 0.8 },
      text: 'Try a different subtitle.',
      context,
    }));

    expect(result.notes.map((note) => note.id)).toEqual([1, 3]);
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual(result);
  });

  it('updates status and agent replies without losing reproduction context', async () => {
    const store = createDebugNoteStore(filePath);
    await store.add(parseDebugNoteCreate({
      anchor: { kind: 'map', longitude: -79.38, latitude: 43.67 },
      text: 'Original note',
      context,
    }));
    const result = await store.update(1, parseDebugNotePatch({ status: 'done', reply: 'Implemented in the map label layer.' }));

    expect(result.notes[0]).toMatchObject({
      status: 'done',
      reply: 'Implemented in the map label layer.',
      context,
    });
  });

  it('rejects malformed or out-of-range anchors', () => {
    expect(() => parseDebugNoteCreate({ anchor: { kind: 'map', longitude: 400, latitude: 43 }, text: 'No', context })).toThrow(/outside/);
    expect(() => parseDebugNoteCreate({ anchor: { kind: 'interface', surface: 'panel', x: 2, y: 0 }, text: 'No', context })).toThrow(/valid map or interface anchor/);
  });
});
