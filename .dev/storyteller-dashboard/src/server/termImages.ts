import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidTermKey } from "../shared/termKey.js";

/**
 * Term tooltips: a pasted image and/or markdown text keyed by term, stored in a git-ignored folder
 * (`data/term-images/`) with an `index.json` map. The GitHub remote is public; never commit these.
 * An entry always has at least one of `file` / `text`; dropping the last one removes the entry.
 */

export type TermImageEntry = { readonly file?: string; readonly text?: string; readonly updatedAt: string };
export type TermImageIndex = { readonly terms: Record<string, TermImageEntry> };

export const MAX_TERM_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_TERM_TEXT_LENGTH = 20_000;

const EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

export const TERM_IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif"
};

const FILE_PATTERN = /^[a-f0-9]{16}-\d+\.(png|jpg|webp|gif)$/;

export class TermImageError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const isEntry = (value: unknown): value is TermImageEntry => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { file, text, updatedAt } = value as Record<string, unknown>;
  const fileOk = file === undefined || (typeof file === "string" && FILE_PATTERN.test(file));
  const textOk = text === undefined || (typeof text === "string" && text !== "");
  return fileOk && textOk && (file !== undefined || text !== undefined) && typeof updatedAt === "string";
};

const entryOf = (file: string | undefined, text: string | undefined): TermImageEntry | null =>
  file === undefined && text === undefined
    ? null
    : { ...(file !== undefined ? { file } : {}), ...(text !== undefined ? { text } : {}), updatedAt: new Date().toISOString() };

export const createTermImageStore = (dir: string) => {
  const indexPath = path.join(dir, "index.json");
  let queue: Promise<unknown> = Promise.resolve();

  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  const readIndex = async (): Promise<TermImageIndex> => {
    let text: string;
    try {
      text = await readFile(indexPath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { terms: {} };
      }
      throw error;
    }
    const parsed: unknown = JSON.parse(text);
    const raw = typeof parsed === "object" && parsed !== null ? (parsed as { terms?: unknown }).terms : undefined;
    const terms: Record<string, TermImageEntry> = {};
    if (typeof raw === "object" && raw !== null) {
      for (const [key, entry] of Object.entries(raw)) {
        if (isValidTermKey(key) && isEntry(entry)) {
          terms[key] = entry;
        }
      }
    }
    return { terms };
  };

  const writeIndex = async (index: TermImageIndex): Promise<void> => {
    await mkdir(dir, { recursive: true });
    const tmp = `${indexPath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(index, null, 2)}\n`, "utf8");
    await rename(tmp, indexPath);
  };

  const removeFile = async (file: string | undefined): Promise<void> => {
    if (file === undefined) {
      return;
    }
    try {
      await unlink(path.join(dir, file));
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  };

  const requireKey = (key: string): void => {
    if (!isValidTermKey(key)) {
      throw new TermImageError(`Invalid term key "${key}".`, 400);
    }
  };

  /** Writes `entry` (or drops the key when null), then deletes the old image file if it changed. */
  const commit = async (index: TermImageIndex, key: string, entry: TermImageEntry | null): Promise<TermImageIndex> => {
    const previous = index.terms[key];
    const terms = { ...index.terms };
    if (entry) {
      terms[key] = entry;
    } else {
      delete terms[key];
    }
    const next: TermImageIndex = { terms };
    await writeIndex(next);
    if (previous?.file !== undefined && previous.file !== entry?.file) {
      await removeFile(previous.file);
    }
    return next;
  };

  return {
    list: (): Promise<TermImageIndex> => serial(readIndex),

    /** Saves or replaces the image; any text on the term is kept. */
    put: (key: string, contentType: string, bytes: Buffer): Promise<TermImageIndex> => serial(async () => {
      requireKey(key);
      const ext = EXTENSIONS[contentType.split(";")[0]?.trim().toLowerCase() ?? ""];
      if (!ext) {
        throw new TermImageError("Only PNG, JPEG, WebP or GIF images can be saved.", 415);
      }
      if (bytes.length === 0) {
        throw new TermImageError("The pasted image was empty.", 400);
      }
      if (bytes.length > MAX_TERM_IMAGE_BYTES) {
        throw new TermImageError("That image is larger than 15 MB.", 413);
      }
      const index = await readIndex();
      const file = `${createHash("sha1").update(key).digest("hex").slice(0, 16)}-${Date.now()}${ext}`;
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, file), bytes);
      return commit(index, key, entryOf(file, index.terms[key]?.text));
    }),

    /** Saves the markdown text; blank text clears it. Any image on the term is kept. */
    putText: (key: string, text: string): Promise<TermImageIndex> => serial(async () => {
      requireKey(key);
      if (text.length > MAX_TERM_TEXT_LENGTH) {
        throw new TermImageError(`Tooltip text is limited to ${MAX_TERM_TEXT_LENGTH} characters.`, 413);
      }
      const index = await readIndex();
      const trimmed = text.replace(/\s+$/, "");
      return commit(index, key, entryOf(index.terms[key]?.file, trimmed === "" ? undefined : trimmed));
    }),

    /** Removes the image only (keeping text), or the whole entry. */
    remove: (key: string, part: "all" | "image" = "all"): Promise<TermImageIndex> => serial(async () => {
      requireKey(key);
      const index = await readIndex();
      const previous = index.terms[key];
      if (!previous) {
        return index;
      }
      return commit(index, key, part === "image" ? entryOf(undefined, previous.text) : null);
    }),

    /** Absolute path for a served image, or null when the name is not one this store writes. */
    resolveFile: (file: string): string | null => (FILE_PATTERN.test(file) ? path.join(dir, file) : null)
  };
};

export type TermImageStore = ReturnType<typeof createTermImageStore>;
