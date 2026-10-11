import { useSyncExternalStore } from "react";
import { parseCompulsions, type Compulsions } from "../shared/compulsionText";

/** `data/compulsions.jsonc` for the seat badges' tooltips, loaded once on first use. */

type State = { readonly compulsions: Compulsions | null; readonly error: string | null };

let state: State = { compulsions: null, error: null };
let load: Promise<void> | null = null;
const listeners = new Set<() => void>();

const publish = (next: State): void => {
  state = next;
  for (const listener of listeners) {
    listener();
  }
};

const ensureLoaded = (): void => {
  load ??= fetch("/api/compulsions")
    .then(async (response) => {
      const body = (await response.json()) as unknown;
      if (!response.ok) {
        const error = typeof body === "object" && body !== null && "error" in body ? String(body.error) : "";
        throw new Error(error || `Compulsion text failed to load (${response.status}).`);
      }
      publish({ compulsions: parseCompulsions(body), error: null });
    })
    .catch((error: unknown) => publish({ compulsions: null, error: error instanceof Error ? error.message : String(error) }));
};

const subscribe = (listener: () => void): (() => void) => {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useCompulsions = (): State => useSyncExternalStore(subscribe, () => state);
