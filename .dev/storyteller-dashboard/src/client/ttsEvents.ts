/**
 * One TTS push relayed by the dashboard server (`GET /api/tts/events`). `at` is the server receive
 * time (epoch ms). Topics and payloads: `.dev/Storyteller Dashboard Docs/Listening to TTS.md`.
 */
export type TtsPushEvent = {
  readonly topic: string;
  readonly color?: string;
  readonly data?: unknown;
  readonly at?: number;
};

type Listener = (event: TtsPushEvent) => void;

const listeners = new Set<Listener>();
let source: EventSource | undefined;

const parse = (raw: string): TtsPushEvent | undefined => {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== "object" || value === null || typeof (value as { topic?: unknown }).topic !== "string") {
    return undefined;
  }
  return value as TtsPushEvent;
};

const open = (): void => {
  if (source || typeof EventSource === "undefined") {
    return;
  }
  source = new EventSource("/api/tts/events");
  source.onmessage = (message: MessageEvent<string>) => {
    const event = parse(message.data);
    if (!event) {
      return;
    }
    for (const listener of listeners) {
      listener(event);
    }
  };
};

/**
 * Subscribe to live TTS pushes over one shared EventSource (the browser reconnects it on its own,
 * and the server replays the latest event per seat on reconnect). Returns an unsubscribe.
 */
export const subscribeTtsEvents = (listener: Listener): (() => void) => {
  listeners.add(listener);
  open();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && source) {
      source.close();
      source = undefined;
    }
  };
};
