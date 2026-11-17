import type { PcRoll } from "../../worldState";

const STORAGE_KEY = "complications-web-pending";

export type PendingComplicationsGame = {
  roomId: string;
  stUrl: string;
  playerUrl: string;
  color: string;
  rollId: string;
  playerLabel: string;
};

export function readPendingComplications(): PendingComplicationsGame | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingComplicationsGame;
  } catch {
    return null;
  }
}

export function clearPendingComplications() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function startComplicationsWebGame(
  roll: PcRoll,
): Promise<PendingComplicationsGame> {
  if (!roll.rollId || !roll.rollType || typeof roll.result?.margin !== "number") {
    throw new Error("That roll is not ready for the Deck of Complications.");
  }
  const response = await fetch("/api/complications/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target: {
        color: roll.color,
        rollId: roll.rollId,
        rollType: roll.rollType,
        playerLabel: roll.name || roll.color,
        margin: roll.result.margin,
      },
    }),
  });
  const body = (await response.json()) as PendingComplicationsGame & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || "Could not create the Complications game.");
  }
  const pending: PendingComplicationsGame = {
    roomId: body.roomId,
    stUrl: body.stUrl,
    playerUrl: body.playerUrl,
    color: roll.color,
    rollId: roll.rollId,
    playerLabel: roll.name || roll.color,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  return pending;
}

export async function applyComplicationsWebResult(
  pending: PendingComplicationsGame,
): Promise<void> {
  const stateRes = await fetch(
    `/api/complications/room/${encodeURIComponent(pending.roomId)}`,
  );
  const state = (await stateRes.json()) as {
    ended?: boolean;
    finalTotal?: number | null;
    error?: string;
  };
  if (!stateRes.ok) {
    throw new Error(state.error || "Could not read the web game.");
  }
  if (!state.ended || typeof state.finalTotal !== "number") {
    throw new Error(
      "The web game has not finished yet. Confirm End on the Storyteller board first.",
    );
  }
  const applyRes = await fetch("/api/complications/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId: pending.roomId,
      color: pending.color,
      rollId: pending.rollId,
      finalTotal: state.finalTotal,
    }),
  });
  const applyBody = (await applyRes.json()) as {
    error?: string;
    result?: unknown;
  };
  if (!applyRes.ok) {
    throw new Error(applyBody.error || "Could not apply the Complications total.");
  }
  clearPendingComplications();
}
