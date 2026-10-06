import { describe, expect, it, vi } from "vitest";
import { extractSnapshotJson, fetchLiveSnapshot } from "./bridge.js";

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
