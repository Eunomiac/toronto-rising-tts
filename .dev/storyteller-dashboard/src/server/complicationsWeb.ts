export type ComplicationsTarget = {
  readonly color: string;
  readonly rollId: string;
  readonly rollType: string;
  readonly playerLabel: string;
  readonly margin: number;
};

export type CreateRoomResult = {
  readonly roomId: string;
  readonly stUrl: string;
  readonly playerUrl: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .dev/storyteller-dashboard/.env to start web Complications games.`,
    );
  }
  return value;
}

export async function createComplicationsRoom(
  target: ComplicationsTarget,
): Promise<CreateRoomResult> {
  const apiBase = requireEnv("COMPLICATIONS_API_URL").replace(/\/$/, "");
  const hostSecret = requireEnv("COMPLICATIONS_HOST_SECRET");
  const response = await fetch(`${apiBase}/api/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-host-secret": hostSecret,
    },
    body: JSON.stringify({ target }),
  });
  const body = (await response.json()) as CreateRoomResult & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Create room failed (${response.status})`);
  }
  if (!body.roomId || !body.stUrl || !body.playerUrl) {
    throw new Error("Create room response was incomplete.");
  }
  return {
    roomId: body.roomId,
    stUrl: body.stUrl,
    playerUrl: body.playerUrl,
  };
}

export async function fetchComplicationsRoomState(roomId: string): Promise<{
  ended: boolean;
  finalTotal: number | null;
  adjustedMargin: number | null;
  playerLabel: string;
  color: string;
  rollId: string;
  rollType: string;
  originalMargin: number;
}> {
  const apiBase = requireEnv("COMPLICATIONS_API_URL").replace(/\/$/, "");
  const response = await fetch(
    `${apiBase}/parties/game-room/${encodeURIComponent(roomId)}/state`,
  );
  if (!response.ok) {
    throw new Error(`Could not read room ${roomId} (${response.status})`);
  }
  const body = (await response.json()) as {
    ended?: boolean;
    finalTotal?: number | null;
    target?: {
      color?: string;
      rollId?: string;
      rollType?: string;
      playerLabel?: string;
      margin?: number;
    };
    totals?: { adjustedMargin?: number; originalMargin?: number };
  };
  return {
    ended: body.ended === true,
    finalTotal: typeof body.finalTotal === "number" ? body.finalTotal : null,
    adjustedMargin:
      typeof body.totals?.adjustedMargin === "number"
        ? body.totals.adjustedMargin
        : null,
    playerLabel: body.target?.playerLabel || "Player",
    color: body.target?.color || "",
    rollId: body.target?.rollId || "",
    rollType: body.target?.rollType || "",
    originalMargin:
      typeof body.target?.margin === "number"
        ? body.target.margin
        : typeof body.totals?.originalMargin === "number"
          ? body.totals.originalMargin
          : 0,
  };
}
