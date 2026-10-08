import type { ServerResponse } from "node:http";

/**
 * One relayed TTS push event (Lua `dashboard/push.ttslua` → gateway `customMessage` → here → SSE).
 * `reload` is synthesized by the server when TTS loads a game.
 */
export type TtsPushEvent = {
  readonly topic: string;
  readonly color?: string;
  readonly data?: unknown;
};

const HEARTBEAT_MS = 25_000;

const cacheKey = (event: TtsPushEvent): string => `${event.topic}:${event.color ?? ""}`;

/**
 * Pull a dashboard push out of a gateway `customMessage` payload
 * (`{ customMessage: { type: "dashboard", v: 1, topic, color?, data? } }`). Other custom messages
 * (debug file writes, editor requests) return undefined.
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
  return {
    topic: row.topic,
    ...(typeof row.color === "string" ? { color: row.color } : {}),
    ...(row.data !== undefined ? { data: row.data } : {})
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

  publish(event: TtsPushEvent): void {
    this.latest.set(cacheKey(event), event);
    this.broadcast(event);
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
