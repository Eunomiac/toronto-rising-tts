import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  HEADSHOT_KEY_PATTERN,
  isHeadshotCrop,
  roundHeadshotCrop,
  type HeadshotCrop,
  type HeadshotCropFile
} from "../shared/headshotCrop.js";

/**
 * Hand-corrected figurine head crops live in `data/headshot-crops.json` (tracked). The Scenes tab token
 * right-click editor writes it; everything without an entry falls back to the automatic crop in the browser.
 */

export class HeadshotCropError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const requireHeadshotKey = (key: string | null): string => {
  if (key === null || !HEADSHOT_KEY_PATTERN.test(key)) {
    throw new HeadshotCropError("Expected ?key=<characterKey>.", 400);
  }
  return key;
};

export const parseHeadshotCrop = (body: unknown): HeadshotCrop => {
  if (!isHeadshotCrop(body)) {
    throw new HeadshotCropError("Expected { cx, cy, size } as finite numbers.", 400);
  }
  return roundHeadshotCrop(body);
};

export const createHeadshotCropStore = (filePath: string) => {
  let queue: Promise<unknown> = Promise.resolve();

  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  const read = async (): Promise<HeadshotCropFile> => {
    let text: string;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { crops: {} };
      }
      throw error;
    }
    const parsed: unknown = JSON.parse(text);
    const raw = typeof parsed === "object" && parsed !== null ? (parsed as { crops?: unknown }).crops : undefined;
    const crops: Record<string, HeadshotCrop> = {};
    if (typeof raw === "object" && raw !== null) {
      for (const [key, value] of Object.entries(raw)) {
        if (HEADSHOT_KEY_PATTERN.test(key) && isHeadshotCrop(value)) {
          crops[key] = value;
        }
      }
    }
    return { crops };
  };

  const write = async (crops: Record<string, HeadshotCrop>): Promise<HeadshotCropFile> => {
    const sorted: Record<string, HeadshotCrop> = {};
    for (const key of Object.keys(crops).sort()) {
      const crop = crops[key];
      if (crop) {
        sorted[key] = crop;
      }
    }
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify({ crops: sorted }, null, 2)}\n`, "utf8");
    await rename(tmp, filePath);
    return { crops: sorted };
  };

  return {
    list: (): Promise<HeadshotCropFile> => serial(read),

    put: (key: string, crop: HeadshotCrop): Promise<HeadshotCropFile> => serial(async () => {
      const file = await read();
      return write({ ...file.crops, [key]: crop });
    }),

    remove: (key: string): Promise<HeadshotCropFile> => serial(async () => {
      const file = await read();
      const crops = { ...file.crops };
      delete crops[key];
      return write(crops);
    })
  };
};

export type HeadshotCropStore = ReturnType<typeof createHeadshotCropStore>;
