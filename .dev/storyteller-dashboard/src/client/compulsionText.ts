import { useSyncExternalStore } from "react";
import { parseCompulsionText, type CompulsionTextFile } from "../shared/compulsionText";

/** `data/compulsion-text.json` for the seat badges' tooltips, loaded once on first use. */

type State = { readonly file: CompulsionTextFile | null; readonly error: string | null };

let state: State = { file: null, error: null };
let load: Promise<void> | null = null;
const listeners = new Set<() => void>();

const publish = (next: State): void => {
  state = next;
  for (const listener of listeners) {
    listener();
  }
};

const ensureLoaded = (): void => {
  load ??= fetch("/api/compulsion-text")
    .then(async (response) => {
      const body = (await response.json()) as unknown;
      if (!response.ok) {
        const error = typeof body === "object" && body !== null && "error" in body ? String(body.error) : "";
        throw new Error(error || `Compulsion text failed to load (${response.status}).`);
      }
      publish({ file: parseCompulsionText(body), error: null });
    })
    .catch((error: unknown) => publish({ file: null, error: error instanceof Error ? error.message : String(error) }));
};

const subscribe = (listener: () => void): (() => void) => {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useCompulsionText = (): State => useSyncExternalStore(subscribe, () => state);
