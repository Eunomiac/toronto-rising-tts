import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createApplyQueue } from "../applyQueue.js";
import { subscribeTtsEvents } from "../ttsEvents.js";
import { applyLocal } from "./applyLocal.js";
import { applySheetCommands, fetchSheetSnapshot } from "./bridge.js";
import { mergeSeatPush } from "./livePush.js";
import type { ApplyCommand, SheetSnapshot } from "./types.js";

/** The live PC sheets for controls outside the PCs tab (the Scenes tab's seat trackers). */
export type LiveSheetAccess = {
  /** Null until `load` has fetched once (and again after TTS reloads the game). */
  readonly sheet: SheetSnapshot | null;
  readonly error: string | null;
  /** Fetch the sheets if they are not loaded yet; a no-op otherwise. */
  readonly load: () => void;
  /** Paint locally, then send through the serial apply queue. */
  readonly apply: (command: ApplyCommand) => void;
};

/**
 * Reads the sheets only when first needed (no execute-lua on tab open), then follows TTS's `pcSeat` pushes.
 * While our own apply is in flight its returned snapshot is authoritative, so pushes are dropped until it settles.
 */
export const useLiveSheet = (): LiveSheetAccess => {
  const [sheet, setSheet] = useState<SheetSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = useRef(false);
  const applying = useRef(false);
  const loaded = useRef(false);
  loaded.current = sheet !== null;

  const load = useCallback((): void => {
    if (loaded.current || loading.current) {
      return;
    }
    loading.current = true;
    fetchSheetSnapshot().then(
      (next) => {
        setSheet(next.ok ? next : null);
        setError(next.ok ? null : next.error ?? "TTS returned no sheets.");
      },
      (reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason))
    ).finally(() => {
      loading.current = false;
    });
  }, []);

  const queue = useMemo(() => createApplyQueue<ApplyCommand, SheetSnapshot>({
    send: applySheetCommands,
    onSettled: (next) => {
      setSheet(next);
      setError(null);
    },
    onFailure: (failure) => {
      setError(failure.message);
      setSheet(null);
    },
    onPendingChange: (pending) => {
      applying.current = pending > 0;
    }
  }), []);

  useEffect(() => subscribeTtsEvents((event) => {
    if (event.topic === "reload") {
      setSheet(null);
      return;
    }
    if (event.topic === "pcSeat" && !applying.current) {
      setSheet((current) => (current ? mergeSeatPush(current, event.color, event.data) : current));
    }
  }), []);

  const apply = useCallback((command: ApplyCommand): void => {
    setSheet((current) => (current ? applyLocal(current, command) : current));
    queue.enqueue(command);
  }, [queue]);

  return useMemo(() => ({ sheet, error, load, apply }), [sheet, error, load, apply]);
};
