import type { ServerResponse } from "node:http";

/**
 * One relayed TTS push event (Lua `dashboard/push.ttslua` → gateway `customMessage` → here → SSE).
 * `reload` is synthesized by the server when TTS loads a game. `at` is the server receive time
 * (epoch ms), stamped on publish; the clock topic extrapolates from it.
 */
export type TtsPushEvent = {
  readonly topic: string;
  readonly color?: string;
  readonly data?: unknown;
  readonly at?: number;
};

const HEARTBEAT_MS = 25_000;

const cacheKey = (event: TtsPushEvent): string => `${event.topic}:${event.color ?? ""}`;

/**
 * Pull a dashboard push out of a gateway `customMessage` payload
 * (`{ customMessage: { type: "dashboard", v: 1, topic, color?, json? } }`). `json` is the payload as a
 * JSON string: TTS drops `sendExternalMessage` tables that contain nested tables. Other custom
 * messages (debug file writes, editor requests) return undefined.
 */
export const parseDashboardPush = (payload: Record<string, unknown>): TtsPushEvent | undefined => {
  const message = payload.customMessage;
  if (typeof message !== "object" || message === null) {
    return undefined;
  }
  const row = message as Record<string, unknown>;
  if (row.type !== "dashboard" || row.v !== 1 || typeof row.topic !== "string" || row.topic === "") {
    return undefined;
  }
  let data: unknown;
  if (typeof row.json === "string") {
    try {
      data = JSON.parse(row.json) as unknown;
    } catch (error: unknown) {
      console.error(`[tts-events] dropped ${row.topic} push: bad json field`, error);
      return undefined;
    }
  }
  return {
    topic: row.topic,
    ...(typeof row.color === "string" ? { color: row.color } : {}),
    ...(data !== undefined ? { data } : {})
  };
};

/**
 * Fans TTS push events out to browser tabs over Server-Sent Events. Keeps the latest event per
 * topic/color so a tab that (re)connects is replayed the current state. A game load clears the
 * cache and tells every tab to refetch.
 */
export class TtsEventHub {
  private readonly clients = new Set<ServerResponse>();
  private readonly latest = new Map<string, TtsPushEvent>();

  publish(event: TtsPushEvent, now: number = Date.now()): void {
    const stamped: TtsPushEvent = { ...event, at: now };
    this.latest.set(cacheKey(stamped), stamped);
    this.broadcast(stamped);
  }

  gameLoading(): void {
    this.latest.clear();
    this.broadcast({ topic: "reload" });
  }

  /** Cached events in arrival order (for replay and tests). */
  cached(): readonly TtsPushEvent[] {
    return [...this.latest.values()];
  }

  subscribe(response: ServerResponse): void {
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    response.write(": connected\n\n");
    for (const event of this.latest.values()) {
      response.write(frame(event));
    }
    this.clients.add(response);
    const heartbeat = setInterval(() => {
      response.write(": ping\n\n");
    }, HEARTBEAT_MS);
    response.on("close", () => {
      clearInterval(heartbeat);
      this.clients.delete(response);
    });
  }

  private broadcast(event: TtsPushEvent): void {
    const text = frame(event);
    for (const client of this.clients) {
      client.write(text);
    }
  }
}

const frame = (event: TtsPushEvent): string => `data: ${JSON.stringify(event)}\n\n`;

export const ttsEventHub = new TtsEventHub();
