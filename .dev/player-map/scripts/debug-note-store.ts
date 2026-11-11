import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  MAX_DEBUG_NOTE_LENGTH,
  type DebugNote,
  type DebugNoteAnchor,
  type DebugNoteContext,
  type DebugNoteCreate,
  type DebugNoteFile,
  type DebugNotePatch,
} from '../src/debug/types.ts';

export class DebugNoteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const emptyFile = (): DebugNoteFile => ({ nextId: 1, notes: [] });
const SURFACE_PATTERN = /^[a-z0-9-]{1,64}$/;

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function parseAnchor(value: unknown): DebugNoteAnchor {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  if (raw.kind === 'map' && finite(raw.longitude) && finite(raw.latitude)) {
    if (raw.longitude < -180 || raw.longitude > 180 || raw.latitude < -90 || raw.latitude > 90) {
      throw new DebugNoteError('Map coordinates are outside the valid longitude/latitude range.', 400);
    }
    return { kind: 'map', longitude: raw.longitude, latitude: raw.latitude };
  }
  if (raw.kind === 'interface' && typeof raw.surface === 'string' && SURFACE_PATTERN.test(raw.surface)
    && finite(raw.x) && finite(raw.y) && raw.x >= 0 && raw.x <= 1 && raw.y >= 0 && raw.y <= 1) {
    return { kind: 'interface', surface: raw.surface, x: raw.x, y: raw.y };
  }
  throw new DebugNoteError('A note needs a valid map or interface anchor.', 400);
}

function parseContext(value: unknown): DebugNoteContext {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const viewport = (typeof raw.viewport === 'object' && raw.viewport !== null ? raw.viewport : {}) as Record<string, unknown>;
  if (typeof raw.url !== 'string' || !finite(viewport.width) || !finite(viewport.height)
    || (raw.selectedDistrict !== null && typeof raw.selectedDistrict !== 'string')) {
    throw new DebugNoteError('A note needs valid reproduction context.', 400);
  }
  let map: DebugNoteContext['map'];
  if (raw.map !== undefined) {
    const rawMap = (typeof raw.map === 'object' && raw.map !== null ? raw.map : {}) as Record<string, unknown>;
    if (!Array.isArray(rawMap.center) || rawMap.center.length !== 2
      || !finite(rawMap.center[0]) || !finite(rawMap.center[1]) || !finite(rawMap.zoom)) {
      throw new DebugNoteError('The map reproduction context is invalid.', 400);
    }
    map = { center: [rawMap.center[0], rawMap.center[1]], zoom: rawMap.zoom };
  }
  return {
    url: raw.url,
    viewport: { width: viewport.width, height: viewport.height },
    selectedDistrict: raw.selectedDistrict,
    ...(map ? { map } : {}),
  };
}

function requireText(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new DebugNoteError('A note needs some text.', 400);
  if (value.length > MAX_DEBUG_NOTE_LENGTH) {
    throw new DebugNoteError(`Notes are limited to ${MAX_DEBUG_NOTE_LENGTH} characters.`, 413);
  }
  return value.trim();
}

function isNote(value: unknown): value is DebugNote {
  if (typeof value !== 'object' || value === null) return false;
  const note = value as Record<string, unknown>;
  try {
    parseAnchor(note.anchor);
    parseContext(note.context);
  } catch {
    return false;
  }
  return Number.isInteger(note.id) && (note.id as number) > 0
    && typeof note.text === 'string'
    && (note.status === 'open' || note.status === 'done')
    && (note.reply === undefined || typeof note.reply === 'string')
    && typeof note.createdAt === 'string'
    && typeof note.updatedAt === 'string';
}

export function parseDebugNoteCreate(value: unknown): DebugNoteCreate {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return { anchor: parseAnchor(raw.anchor), text: requireText(raw.text), context: parseContext(raw.context) };
}

export function parseDebugNotePatch(value: unknown): DebugNotePatch {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const patch: { text?: string; status?: DebugNote['status']; reply?: string } = {};
  if (raw.text !== undefined) patch.text = requireText(raw.text);
  if (raw.status !== undefined) {
    if (raw.status !== 'open' && raw.status !== 'done') throw new DebugNoteError('Status must be open or done.', 400);
    patch.status = raw.status;
  }
  if (raw.reply !== undefined) {
    if (typeof raw.reply !== 'string') throw new DebugNoteError('An agent reply must be text.', 400);
    patch.reply = raw.reply.trim();
  }
  if (Object.keys(patch).length === 0) throw new DebugNoteError('No supported note changes were supplied.', 400);
  return patch;
}

export function createDebugNoteStore(filePath: string) {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  const read = async (): Promise<DebugNoteFile> => {
    let text: string;
    try {
      text = await readFile(filePath, 'utf8');
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyFile();
      throw error;
    }
    const parsed: unknown = JSON.parse(text);
    const raw = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>;
    if (!Array.isArray(raw.notes) || raw.notes.some((note) => !isNote(note))) {
      throw new DebugNoteError('The tracked debug-note file contains an invalid note.', 500);
    }
    const notes = raw.notes as DebugNote[];
    const derivedNextId = notes.reduce((highest, note) => Math.max(highest, note.id), 0) + 1;
    if (!Number.isInteger(raw.nextId) || (raw.nextId as number) < derivedNextId) {
      throw new DebugNoteError('The tracked debug-note file has an invalid nextId.', 500);
    }
    return { nextId: raw.nextId as number, notes };
  };

  const write = async (file: DebugNoteFile): Promise<DebugNoteFile> => {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    return file;
  };

  const requireNote = (file: DebugNoteFile, id: number) => {
    if (!file.notes.some((note) => note.id === id)) throw new DebugNoteError(`Note ${id} was not found.`, 404);
  };

  return {
    list: (): Promise<DebugNoteFile> => serial(read),
    add: (input: DebugNoteCreate): Promise<DebugNoteFile> => serial(async () => {
      const file = await read();
      const now = new Date().toISOString();
      const note: DebugNote = { id: file.nextId, ...input, status: 'open', createdAt: now, updatedAt: now };
      return write({ nextId: file.nextId + 1, notes: [...file.notes, note] });
    }),
    update: (id: number, patch: DebugNotePatch): Promise<DebugNoteFile> => serial(async () => {
      const file = await read();
      requireNote(file, id);
      const now = new Date().toISOString();
      return write({ ...file, notes: file.notes.map((note) => note.id === id ? { ...note, ...patch, updatedAt: now } : note) });
    }),
    remove: (id: number): Promise<DebugNoteFile> => serial(async () => {
      const file = await read();
      requireNote(file, id);
      return write({ ...file, notes: file.notes.filter((note) => note.id !== id) });
    }),
  };
}

export type DebugNoteStore = ReturnType<typeof createDebugNoteStore>;
