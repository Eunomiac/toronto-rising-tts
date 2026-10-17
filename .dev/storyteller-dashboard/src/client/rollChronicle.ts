import { useEffect, useRef, useSyncExternalStore } from "react";
import { appendRolls, normalizeRollChronicle, type RollChronicle, type SavedRoll } from "../shared/rollChronicle";
import { executeLua, luaJsonArg } from "./ttsBridge";
import type { RollsSlice } from "./worldState";

/**
 * The dashboard's copy of finished rolls and the automation flags. TTS keeps the flags it needs when a
 * player confirms, and only the roll that just finished.
 */

let chronicle: RollChronicle = normalizeRollChronicle(null);
let loaded = false;
const listeners = new Set<() => void>();

const notify = (): void => listeners.forEach((listener) => listener());

const put = async (patch: Partial<RollChronicle>): Promise<void> => {
  const response = await fetch("/api/roll-chronicle", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!response.ok) {
    return;
  }
  chronicle = normalizeRollChronicle(await response.json());
  notify();
};

export const loadRollChronicle = async (): Promise<void> => {
  const response = await fetch("/api/roll-chronicle");
  if (!response.ok) {
    return;
  }
  chronicle = normalizeRollChronicle(await response.json());
  loaded = true;
  notify();
  await executeLua(`return GlobalDashboardRollsApply(${luaJsonArg({ op: "setPermanent", permanent: chronicle.permanent })})`);
};

export const saveRollPermanent = (permanent: Readonly<Record<string, boolean>>): void => {
  chronicle = { ...chronicle, permanent };
  notify();
  void put({ permanent });
};

const savedFrom = (rollId: string, color: string, label: string, rollType: string, text: string, entry: SavedRoll["entry"]): SavedRoll => ({
  rollId,
  color,
  label,
  rollType,
  text,
  at: new Date().toISOString(),
  entry
});

/** Appends finished rolls the chronicle does not already have. */
export const noteFinishedRolls = (rolls: RollsSlice | undefined): void => {
  if (!loaded || !rolls) {
    return;
  }
  const incoming: SavedRoll[] = [];
  for (const pc of rolls.pcs) {
    if (pc.done && pc.rollId) {
      incoming.push(savedFrom(pc.rollId, pc.color, pc.label || pc.name, pc.rollType ?? "", pc.result?.text ?? "", {
        rollId: pc.rollId,
        label: pc.label || pc.name,
        rollType: pc.rollType ?? "",
        result: pc.result,
        diceFaces: pc.dice
      }));
    }
  }
  for (const slot of rolls.storyteller.slots) {
    if (slot.rollId && slot.result) {
      incoming.push(savedFrom(slot.rollId, "Black", slot.label || "Storyteller", slot.rollType ?? "", slot.result.text, {
        rollId: slot.rollId,
        label: slot.label || "Storyteller",
        rollType: slot.rollType ?? "",
        result: slot.result,
        diceFaces: slot.dice
      }));
    }
  }
  const next = appendRolls(chronicle, incoming);
  if (next === chronicle) {
    return;
  }
  chronicle = next;
  notify();
  void put({ entries: next.entries });
};

export const rollChronicleSnapshot = (): RollChronicle => chronicle;

export const useRollChronicle = (): RollChronicle => useSyncExternalStore(
  (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  () => chronicle
);

/** Loads the chronicle once, then keeps appending finished rolls from the live push. */
export const useRollChronicleSync = (rolls: RollsSlice | undefined): void => {
  const rollsRef = useRef(rolls);
  rollsRef.current = rolls;
  useEffect(() => {
    let cancelled = false;
    void loadRollChronicle().then(() => {
      if (!cancelled) {
        noteFinishedRolls(rollsRef.current);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    noteFinishedRolls(rolls);
  }, [rolls]);
};
