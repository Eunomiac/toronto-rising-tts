import { normalizeTermKey, termKey } from "../../shared/termKey.js";

/**
 * Clipboard-image tooltips: any element with `data-term` (see `termProps`) can carry a pasted image.
 * Index lives on the dashboard server (`/api/term-images`); images are served from `/term-images/`.
 */

type Entry = { readonly file: string; readonly updatedAt: string };

let index: Readonly<Record<string, Entry>> = {};
const listeners = new Set<() => void>();

const setIndex = (value: unknown): void => {
  const terms = typeof value === "object" && value !== null ? (value as { terms?: unknown }).terms : undefined;
  const next: Record<string, Entry> = {};
  if (typeof terms === "object" && terms !== null) {
    for (const [key, entry] of Object.entries(terms)) {
      if (typeof entry === "object" && entry !== null && typeof (entry as Entry).file === "string") {
        next[key] = entry as Entry;
      }
    }
  }
  index = next;
  listeners.forEach((listener) => listener());
};

const readJson = async (response: Response): Promise<unknown> => {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : `Server returned ${response.status}`;
    throw new Error(message);
  }
  return body;
};

export const loadTermImages = async (): Promise<void> => {
  setIndex(await readJson(await fetch("/api/term-images")));
};

export const termImageUrl = (key: string): string | undefined => {
  const entry = index[normalizeTermKey(key)];
  return entry ? `/term-images/${encodeURIComponent(entry.file)}` : undefined;
};

export const subscribeTermImages = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const saveTermImage = async (key: string, image: Blob): Promise<void> => {
  const response = await fetch(`/api/term-images?key=${encodeURIComponent(normalizeTermKey(key))}`, {
    method: "PUT",
    headers: { "Content-Type": image.type },
    body: image
  });
  setIndex(await readJson(response));
};

export const removeTermImage = async (key: string): Promise<void> => {
  const response = await fetch(`/api/term-images?key=${encodeURIComponent(normalizeTermKey(key))}`, { method: "DELETE" });
  setIndex(await readJson(response));
};

/** Spread onto any element to make it right-click-able for a pasted tooltip image. */
export const termProps = (kind: string, name: string, label: string = name): Record<string, string> =>
  name.trim() === "" ? {} : { "data-term": termKey(kind, name), "data-term-label": label };
