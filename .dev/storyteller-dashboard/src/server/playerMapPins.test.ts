import { describe, expect, it, vi } from "vitest";
import { projectPublicPins, startPlayerMapPinRelay } from "./playerMapPins.js";
import { TtsEventHub } from "./ttsEvents.js";

describe("projectPublicPins", () => {
  it("keeps only allowlisted character and site fields", () => {
    const snapshot = projectPublicPins(
      {
        live: true,
        pins: [
          { charKey: "rashid", siteKey: "CasaLoma", visible: true },
          { charKey: "npc", siteKey: "secret", visible: true },
          { charKey: "aishe", siteKey: "UnionStation", visible: false },
        ],
      },
      "table-night",
      new Date("2026-11-21T12:00:00.000Z"),
    );
    expect(snapshot).toEqual({
      schemaVersion: 1,
      sessionCode: "table-night",
      updatedAt: "2026-11-21T12:00:00.000Z",
      live: true,
      pins: [
        { charKey: "rashid", siteKey: "CasaLoma", visible: true },
        { charKey: "aishe", siteKey: "UnionStation", visible: false },
      ],
    });
  });
});

describe("startPlayerMapPinRelay", () => {
  it("posts when a scene push carries live mapPins", async () => {
    const hub = new TtsEventHub();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const stop = startPlayerMapPinRelay(hub, {
      endpointBase: "https://map.example",
      sessionCode: "alpha1",
      pushSecret: "secret",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    hub.publish({
      topic: "scene",
      data: {
        mapPins: {
          live: true,
          pins: [{ charKey: "fomorach", siteKey: "UnionStation", visible: true }],
        },
      },
    });
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://map.example/api/session/alpha1/pins");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    stop();
  });

  it("does not post when mapPins.live is false so mid-week viewers keep the last session feed", async () => {
    const hub = new TtsEventHub();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const stop = startPlayerMapPinRelay(hub, {
      endpointBase: "https://map.example",
      sessionCode: "alpha1",
      pushSecret: "secret",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    hub.publish({
      topic: "scene",
      data: {
        mapPins: {
          live: false,
          pins: [{ charKey: "fomorach", siteKey: "UnionStation", visible: false }],
        },
      },
    });
    await Promise.resolve();
    expect(fetchImpl).not.toHaveBeenCalled();
    stop();
  });
});
