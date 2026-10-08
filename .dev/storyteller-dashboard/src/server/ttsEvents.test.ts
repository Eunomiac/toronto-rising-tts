import { describe, expect, it } from "vitest";
import { parseDashboardPush, TtsEventHub } from "./ttsEvents.js";

describe("parseDashboardPush", () => {
  it("accepts dashboard v1 pushes", () => {
    expect(parseDashboardPush({ customMessage: { type: "dashboard", v: 1, topic: "pcSeat", color: "Red", data: { hunger: 2 } } }))
      .toEqual({ topic: "pcSeat", color: "Red", data: { hunger: 2 } });
    expect(parseDashboardPush({ customMessage: { type: "dashboard", v: 1, topic: "projects" } }))
      .toEqual({ topic: "projects" });
  });

  it("ignores other custom messages", () => {
    expect(parseDashboardPush({ customMessage: { type: "write", content: "x" } })).toBeUndefined();
    expect(parseDashboardPush({ customMessage: { type: "dashboard", v: 2, topic: "pcSeat" } })).toBeUndefined();
    expect(parseDashboardPush({ customMessage: "<@DASHBOARD@>text" })).toBeUndefined();
  });
});

describe("TtsEventHub", () => {
  it("keeps the latest event per topic and color, and clears on game load", () => {
    const hub = new TtsEventHub();
    hub.publish({ topic: "pcSeat", color: "Red", data: 1 });
    hub.publish({ topic: "pcSeat", color: "Pink", data: 2 });
    hub.publish({ topic: "pcSeat", color: "Red", data: 3 });
    expect(hub.cached()).toEqual([
      { topic: "pcSeat", color: "Red", data: 3 },
      { topic: "pcSeat", color: "Pink", data: 2 }
    ]);
    hub.gameLoading();
    expect(hub.cached()).toEqual([]);
  });
});
