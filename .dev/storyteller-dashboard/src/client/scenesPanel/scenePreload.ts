import { useEffect, useState } from "react";
import { subscribeTtsEvents } from "../ttsEvents";
import { noticeText } from "./notices";

const STORAGE_KEY = "tr.dashboard.preloadedSceneKeys";

const readKeys = (): ReadonlySet<string> => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : []);
  } catch {
    return new Set();
  }
};

const writeKeys = (keys: ReadonlySet<string>): void => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
};

let keys = readKeys();
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/** Mark a library scene key as having finished NPC preload this browser session. */
export const markScenePreloaded = (sceneKey: string): void => {
  if (keys.has(sceneKey)) {
    return;
  }
  const next = new Set(keys);
  next.add(sceneKey);
  keys = next;
  writeKeys(keys);
  emit();
};

export const isScenePreloaded = (sceneKey: string): boolean => keys.has(sceneKey);

/** Subscribe to preload-key changes (DeckChip red text, idle reminders). */
export const usePreloadedScenes = (): ReadonlySet<string> => {
  const [snapshot, setSnapshot] = useState(keys);
  useEffect(() => {
    const refresh = (): void => setSnapshot(keys);
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, []);
  return snapshot;
};

/**
 * When TTS finishes a preload, mark that scene and invoke `onPreloadFinished` so sticky UI notices can clear.
 * Matches the completion text from `NPCS.preloadSceneNpcs`.
 */
export const usePreloadCompletion = (onPreloadFinished: (text: string) => void): void => {
  useEffect(() => subscribeTtsEvents((event) => {
    const text = noticeText(event, Date.now());
    if (!text) {
      return;
    }
    const done = /^Preloaded \d+ NPC package/.test(text);
    const failed = /preload/i.test(text) && /fail|error|abort/i.test(text);
    if (!done && !failed) {
      return;
    }
    const data = event.data as { sceneKey?: unknown } | undefined;
    if (typeof data?.sceneKey === "string" && data.sceneKey !== "") {
      markScenePreloaded(data.sceneKey);
    }
    onPreloadFinished(text);
  }), [onPreloadFinished]);
};
