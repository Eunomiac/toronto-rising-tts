import { describe, expect, it } from "vitest";
import { parseDashboardPrint, TtsEventHub } from "./ttsEvents.js";

describe("parseDashboardPrint", () => {
  it("accepts gateway-stripped dashboard v1 prints", () => {
    expect(parseDashboardPrint('{"type":"dashboard","v":1,"topic":"pcSeat","color":"Red","data":{"hunger":2}}'))
      .toEqual({ topic: "pcSeat", color: "Red", data: { hunger: 2 } });
    expect(parseDashboardPrint('{"type":"dashboard","v":1,"topic":"projects"}'))
      .toEqual({ topic: "projects" });
  });

  it("accepts the tagged print used when the dashboard owns the editor port directly", () => {
    expect(parseDashboardPrint('<@DASHBOARD@>{"type":"dashboard","v":1,"topic":"scene","data":{"title":"Elysium"}}'))
      .toEqual({ topic: "scene", data: { title: "Elysium" } });
  });

  it("ignores malformed, unsupported, and ordinary console lines", () => {
    expect(parseDashboardPrint("<@DASHBOARD@>{oops")).toBeUndefined();
    expect(parseDashboardPrint('{"type":"dashboard","v":2,"topic":"pcSeat"}')).toBeUndefined();
    expect(parseDashboardPrint('{"type":"write","content":"x"}')).toBeUndefined();
    expect(parseDashboardPrint("[SceneLoad] ordinary console output")).toBeUndefined();
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
