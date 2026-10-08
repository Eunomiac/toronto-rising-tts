import { describe, expect, it } from "vitest";
import { parseDashboardPush, TtsEventHub } from "./ttsEvents.js";

describe("parseDashboardPush", () => {
  it("accepts dashboard v1 pushes", () => {
    expect(parseDashboardPush({ customMessage: { type: "dashboard", v: 1, topic: "pcSeat", color: "Red", json: "{\"hunger\":2}" } }))
      .toEqual({ topic: "pcSeat", color: "Red", data: { hunger: 2 } });
    expect(parseDashboardPush({ customMessage: { type: "dashboard", v: 1, topic: "projects" } }))
      .toEqual({ topic: "projects" });
  });

  it("drops a push whose json field does not parse", () => {
    expect(parseDashboardPush({ customMessage: { type: "dashboard", v: 1, topic: "pcSeat", color: "Red", json: "{oops" } }))
      .toBeUndefined();
  });

  it("ignores other custom messages", () => {
    expect(parseDashboardPush({ customMessage: { type: "write", content: "x" } })).toBeUndefined();
    expect(parseDashboardPush({ customMessage: { type: "dashboard", v: 2, topic: "pcSeat" } })).toBeUndefined();
    expect(parseDashboardPush({ customMessage: "<@DASHBOARD@>text" })).toBeUndefined();
  });
});

describe("TtsEventHub", () => {
  it("keeps the latest event per topic and color, stamped with its receive time, and clears on game load", () => {
    const hub = new TtsEventHub();
    hub.publish({ topic: "pcSeat", color: "Red", data: 1 }, 100);
    hub.publish({ topic: "pcSeat", color: "Pink", data: 2 }, 200);
    hub.publish({ topic: "pcSeat", color: "Red", data: 3 }, 300);
    hub.publish({ topic: "clock", data: { hour: 21 } }, 400);
    expect(hub.cached()).toEqual([
      { topic: "pcSeat", color: "Red", data: 3, at: 300 },
      { topic: "pcSeat", color: "Pink", data: 2, at: 200 },
      { topic: "clock", data: { hour: 21 }, at: 400 }
    ]);
    hub.gameLoading();
    expect(hub.cached()).toEqual([]);
  });
});
