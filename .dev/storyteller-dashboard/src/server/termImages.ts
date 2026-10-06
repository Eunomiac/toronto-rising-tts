import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidTermKey } from "../shared/termKey.js";

/**
 * Clipboard-image tooltips: pasted images keyed by term, stored in a git-ignored folder
 * (`data/term-images/`) with an `index.json` map. The GitHub remote is public; never commit these.
 */

export type TermImageEntry = { readonly file: string; readonly updatedAt: string };
export type TermImageIndex = { readonly terms: Record<string, TermImageEntry> };

export const MAX_TERM_IMAGE_BYTES = 15 * 1024 * 1024;

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

const isEntry = (value: unknown): value is TermImageEntry =>
  typeof value === "object" && value !== null
  && typeof (value as TermImageEntry).file === "string" && FILE_PATTERN.test((value as TermImageEntry).file)
  && typeof (value as TermImageEntry).updatedAt === "string";

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

  const removeFile = async (file: string): Promise<void> => {
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

  return {
    list: (): Promise<TermImageIndex> => serial(readIndex),

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
      const previous = index.terms[key];
      const next: TermImageIndex = { terms: { ...index.terms, [key]: { file, updatedAt: new Date().toISOString() } } };
      await writeIndex(next);
      if (previous && previous.file !== file) {
        await removeFile(previous.file);
      }
      return next;
    }),

    remove: (key: string): Promise<TermImageIndex> => serial(async () => {
      requireKey(key);
      const index = await readIndex();
      const previous = index.terms[key];
      if (!previous) {
        return index;
      }
      const terms = { ...index.terms };
      delete terms[key];
      const next: TermImageIndex = { terms };
      await writeIndex(next);
      await removeFile(previous.file);
      return next;
    }),

    /** Absolute path for a served image, or null when the name is not one this store writes. */
    resolveFile: (file: string): string | null => (FILE_PATTERN.test(file) ? path.join(dir, file) : null)
  };
};

export type TermImageStore = ReturnType<typeof createTermImageStore>;
