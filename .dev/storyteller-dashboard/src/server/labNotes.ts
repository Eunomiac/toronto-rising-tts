import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_LAB_NOTE_LENGTH, type LabNote, type LabNoteCreate, type LabNoteFile, type LabNotePatch } from "../shared/labNote.js";

/**
 * Lab design pins live in `agent/lab-notes.json` (tracked) so the author and agents share one feedback log.
 * Agents add `reply` fields by editing the file directly; the Lab tab only creates, edits, resolves, and deletes.
 */

export class LabNoteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const SKETCH_PATTERN = /^[a-z0-9-]{1,64}$/;

const isNote = (value: unknown): value is LabNote => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const note = value as Record<string, unknown>;
  return typeof note.id === "number"
    && typeof note.sketch === "string"
    && typeof note.x === "number"
    && typeof note.y === "number"
    && typeof note.text === "string"
    && (note.status === "open" || note.status === "done")
    && (note.reply === undefined || typeof note.reply === "string")
    && typeof note.createdAt === "string"
    && typeof note.updatedAt === "string";
};

const requireText = (text: unknown): string => {
  if (typeof text !== "string" || text.trim() === "") {
    throw new LabNoteError("A note needs some text.", 400);
  }
  if (text.length > MAX_LAB_NOTE_LENGTH) {
    throw new LabNoteError(`Notes are limited to ${MAX_LAB_NOTE_LENGTH} characters.`, 413);
  }
  return text.trim();
};

export const parseLabNoteCreate = (body: unknown): LabNoteCreate => {
  const raw = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (typeof raw.sketch !== "string" || !SKETCH_PATTERN.test(raw.sketch)) {
    throw new LabNoteError("Unknown sketch id.", 400);
  }
  if (typeof raw.x !== "number" || typeof raw.y !== "number" || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) {
    throw new LabNoteError("A note needs x and y coordinates.", 400);
  }
  return { sketch: raw.sketch, x: Math.round(raw.x), y: Math.round(raw.y), text: requireText(raw.text) };
};

export const parseLabNotePatch = (body: unknown): LabNotePatch => {
  const raw = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const patch: { text?: string; status?: LabNote["status"] } = {};
  if (raw.text !== undefined) {
    patch.text = requireText(raw.text);
  }
  if (raw.status !== undefined) {
    if (raw.status !== "open" && raw.status !== "done") {
      throw new LabNoteError("Status must be open or done.", 400);
    }
    patch.status = raw.status;
  }
  return patch;
};

export const createLabNoteStore = (filePath: string) => {
  let queue: Promise<unknown> = Promise.resolve();

  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  const read = async (): Promise<LabNoteFile> => {
    let text: string;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { notes: [] };
      }
      throw error;
    }
    const parsed: unknown = JSON.parse(text);
    const raw = typeof parsed === "object" && parsed !== null ? (parsed as { notes?: unknown }).notes : undefined;
    return { notes: Array.isArray(raw) ? raw.filter(isNote) : [] };
  };

  const write = async (file: LabNoteFile): Promise<LabNoteFile> => {
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmp, filePath);
    return file;
  };

  const requireNote = (file: LabNoteFile, id: number): LabNote => {
    const note = file.notes.find((entry) => entry.id === id);
    if (!note) {
      throw new LabNoteError(`Note ${id} not found.`, 404);
    }
    return note;
  };

  return {
    list: (): Promise<LabNoteFile> => serial(read),

    add: (input: LabNoteCreate): Promise<LabNoteFile> => serial(async () => {
      const file = await read();
      const now = new Date().toISOString();
      const id = file.notes.reduce((max, note) => Math.max(max, note.id), 0) + 1;
      const note: LabNote = { id, ...input, status: "open", createdAt: now, updatedAt: now };
      return write({ notes: [...file.notes, note] });
    }),

    update: (id: number, patch: LabNotePatch): Promise<LabNoteFile> => serial(async () => {
      const file = await read();
      requireNote(file, id);
      const now = new Date().toISOString();
      return write({ notes: file.notes.map((note) => (note.id === id ? { ...note, ...patch, updatedAt: now } : note)) });
    }),

    remove: (id: number): Promise<LabNoteFile> => serial(async () => {
      const file = await read();
      requireNote(file, id);
      return write({ notes: file.notes.filter((note) => note.id !== id) });
    })
  };
};

export type LabNoteStore = ReturnType<typeof createLabNoteStore>;
