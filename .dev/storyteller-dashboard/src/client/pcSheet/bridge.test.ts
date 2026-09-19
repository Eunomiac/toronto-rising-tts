import { describe, expect, it } from "vitest";
import { extractSnapshotJson } from "./bridge.js";

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
