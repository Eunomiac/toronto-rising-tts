/**
 * Relays player-safe map pin snapshots from TTS scene pushes to the public Player Map Worker.
 * Secrets stay on the Dashboard server — never in the browser bundle.
 */

import type { TtsEventHub, TtsPushEvent } from "./ttsEvents.js";

export type PlayerMapPinRelayConfig = {
  readonly endpointBase: string;
  readonly sessionCode: string;
  readonly pushSecret: string;
  readonly fetchImpl?: typeof fetch;
};

type SceneMapPins = {
  readonly live?: boolean;
  readonly pins?: ReadonlyArray<{
    readonly charKey?: string;
    readonly siteKey?: string;
    readonly visible?: boolean;
  }>;
};

const ALLOWED = new Set(["fomorach", "rashid", "lordLucien", "aishe", "blackCaesar"]);

export function projectPublicPins(
  mapPins: SceneMapPins | undefined,
  sessionCode: string,
  now: Date = new Date(),
): {
  schemaVersion: 1;
  sessionCode: string;
  updatedAt: string;
  live: boolean;
  pins: Array<{ charKey: string; siteKey: string; visible: boolean }>;
} | null {
  if (!mapPins || typeof mapPins.live !== "boolean" || !Array.isArray(mapPins.pins)) return null;
  const pins = [];
  for (const pin of mapPins.pins) {
    if (!pin || typeof pin.charKey !== "string" || !ALLOWED.has(pin.charKey)) continue;
    if (typeof pin.siteKey !== "string" || !pin.siteKey) continue;
    if (typeof pin.visible !== "boolean") continue;
    pins.push({ charKey: pin.charKey, siteKey: pin.siteKey, visible: pin.visible });
  }
  return {
    schemaVersion: 1,
    sessionCode,
    updatedAt: now.toISOString(),
    live: mapPins.live,
    pins,
  };
}

export function startPlayerMapPinRelay(hub: TtsEventHub, config: PlayerMapPinRelayConfig): () => void {
  const fetchImpl = config.fetchImpl ?? fetch;
  let lastPayload = "";
  const onEvent = (event: TtsPushEvent) => {
    if (event.topic !== "scene" || !event.data || typeof event.data !== "object") return;
    const mapPins = (event.data as { mapPins?: SceneMapPins }).mapPins;
    // Freeze the last in-session feed: non-live flushes would hide every pin and wipe mid-week viewers.
    if (!mapPins || mapPins.live !== true) return;
    const snapshot = projectPublicPins(mapPins, config.sessionCode);
    if (!snapshot) return;
    const body = JSON.stringify(snapshot);
    if (body === lastPayload) return;
    lastPayload = body;
    const url = `${config.endpointBase.replace(/\/$/, "")}/api/session/${encodeURIComponent(config.sessionCode)}/pins`;
    void fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.pushSecret}`,
        "Content-Type": "application/json",
      },
      body,
    }).catch((error: unknown) => {
      console.warn(
        "[player-map-pins]",
        error instanceof Error ? error.message : "Could not publish session pins",
      );
    });
  };

  return hub.addListener(onEvent);
}

export function playerMapPinConfigFromEnv(env: NodeJS.ProcessEnv = process.env): PlayerMapPinRelayConfig | null {
  const endpointBase = env.PLAYER_MAP_ENDPOINT?.trim();
  const sessionCode = env.PLAYER_MAP_SESSION_CODE?.trim();
  const pushSecret = env.PLAYER_MAP_PUSH_SECRET?.trim();
  if (!endpointBase || !sessionCode || !pushSecret) return null;
  return { endpointBase, sessionCode, pushSecret };
}
