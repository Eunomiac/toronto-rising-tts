import { normalizeTermKey, termKey } from "../../shared/termKey.js";

/**
 * Term tooltips: any element with `data-term` (see `termProps`) can carry a pasted image and/or markdown text.
 * Index lives on the dashboard server (`/api/term-images`); images are served from `/term-images/`.
 */

type Entry = { readonly file?: string; readonly text?: string; readonly updatedAt: string };

export type TermTooltip = { readonly imageUrl?: string; readonly text?: string };

let index: Readonly<Record<string, Entry>> = {};
const listeners = new Set<() => void>();

const setIndex = (value: unknown): void => {
  const terms = typeof value === "object" && value !== null ? (value as { terms?: unknown }).terms : undefined;
  const next: Record<string, Entry> = {};
  if (typeof terms === "object" && terms !== null) {
    for (const [key, entry] of Object.entries(terms)) {
      if (typeof entry !== "object" || entry === null) {
        continue;
      }
      const { file, text } = entry as Entry;
      if (typeof file === "string" || typeof text === "string") {
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

const keyParam = (key: string): string => `key=${encodeURIComponent(normalizeTermKey(key))}`;

export const loadTermImages = async (): Promise<void> => {
  setIndex(await readJson(await fetch("/api/term-images")));
};

/** Saved tooltip content for a term, or undefined when nothing is saved. */
export const termTooltip = (key: string): TermTooltip | undefined => {
  const entry = index[normalizeTermKey(key)];
  if (!entry) {
    return undefined;
  }
  return {
    ...(entry.file ? { imageUrl: `/term-images/${encodeURIComponent(entry.file)}` } : {}),
    ...(entry.text ? { text: entry.text } : {})
  };
};

export const subscribeTermImages = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const saveTermImage = async (key: string, image: Blob): Promise<void> => {
  const response = await fetch(`/api/term-images?${keyParam(key)}`, {
    method: "PUT",
    headers: { "Content-Type": image.type },
    body: image
  });
  setIndex(await readJson(response));
};

/** Blank text clears the term's text (the image, if any, stays). */
export const saveTermText = async (key: string, text: string): Promise<void> => {
  const response = await fetch(`/api/term-images/text?${keyParam(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  setIndex(await readJson(response));
};

export const removeTermImage = async (key: string, part: "all" | "image" = "all"): Promise<void> => {
  const response = await fetch(`/api/term-images?${keyParam(key)}${part === "image" ? "&part=image" : ""}`, { method: "DELETE" });
  setIndex(await readJson(response));
};

/** Spread onto any element to make it right-click-able for a tooltip image / text. */
export const termProps = (kind: string, name: string, label: string = name): Record<string, string> =>
  name.trim() === "" ? {} : { "data-term": termKey(kind, name), "data-term-label": label };
