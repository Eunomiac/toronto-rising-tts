import { describe, expect, it, vi } from "vitest";
import { extractSnapshotJson, fetchLiveSnapshot, fetchSheetSnapshot } from "./bridge.js";

const executeLua = vi.hoisted(() => vi.fn());
vi.mock("../ttsBridge.js", () => ({ executeLua, luaLongString: (value: string) => `[[${value}]]` }));

describe("fetchLiveSnapshot", () => {
  it("flags a refusal while TTS is still loading the save", async () => {
    executeLua.mockResolvedValueOnce({
      prints: [],
      returnValue: "{\"ok\":false,\"loading\":true,\"error\":\"TTS is still loading the save. Try again in a moment.\"}"
    });
    const result = await fetchLiveSnapshot();
    expect(result).toMatchObject({ live: false, loading: true, message: "TTS is still loading the save. Try again in a moment." });
  });

  it("does not flag other refusals as loading", async () => {
    executeLua.mockResolvedValueOnce({ prints: [], returnValue: "{\"ok\":false,\"error\":\"Unknown seat color\"}" });
    const result = await fetchLiveSnapshot();
    expect(result.loading).toBeUndefined();
  });
});

describe("fetchSheetSnapshot", () => {
  it("keeps the seat's Compulsion and hunt result", async () => {
    executeLua.mockResolvedValueOnce({
      prints: [],
      returnValue: JSON.stringify({
        ok: true,
        seats: [{ color: "Pink", compulsion: { type: "Harm", n: 3 }, huntResonance: { flavor: "sanguine", intensity: "intense", margin: 2 } }]
      })
    });
    const snapshot = await fetchSheetSnapshot();
    expect(snapshot.seats[0]).toMatchObject({
      compulsion: { type: "Harm", n: 3 },
      huntResonance: { flavor: "sanguine", intensity: "intense", margin: 2 }
    });
  });

  it("reads conditions when Lua sends the list as a numbered object", async () => {
    executeLua.mockResolvedValueOnce({
      prints: [],
      returnValue: JSON.stringify({
        ok: true,
        manualConditions: { "1": { id: "stronger", displayName: "Stronger" } },
        seats: [{
          color: "Pink",
          personalResonance: { temperament: "acutely", resonanceType: "Sanguine", dyscrasiaTitle: "Thin blood" },
          personalCards: { "1": { id: "pc-1", title: "Late", displayType: "general", displayOnSheet: true, removalTrigger: "EndOfScene", triggerLabel: "End of the scene" } }
        }]
      })
    });
    const snapshot = await fetchSheetSnapshot();
    expect(snapshot.manualConditions).toEqual([{ id: "stronger", displayName: "Stronger" }]);
    expect(snapshot.seats[0]?.personalResonance).toMatchObject({ temperament: "acutely", resonanceType: "Sanguine", dyscrasiaTitle: "Thin blood" });
    expect(snapshot.seats[0]?.personalCards).toEqual([
      expect.objectContaining({ id: "pc-1", title: "Late", triggerLabel: "End of the scene" })
    ]);
  });
});

describe("extractSnapshotJson", () => {
  it("prefers a returned JSON string", () => {
    expect(extractSnapshotJson({
      returnValue: "{\"ok\":true,\"seats\":[]}",
      prints: []
    })).toBe("{\"ok\":true,\"seats\":[]}");
  });

  it("reads snapshot JSON from prints when returnValue is missing", () => {
    expect(extractSnapshotJson({
      prints: [
        "fn=function",
        "{\"ok\":true,\"seats\":[{\"color\":\"Pink\"}]}"
      ]
    })).toBe("{\"ok\":true,\"seats\":[{\"color\":\"Pink\"}]}");
  });
});
