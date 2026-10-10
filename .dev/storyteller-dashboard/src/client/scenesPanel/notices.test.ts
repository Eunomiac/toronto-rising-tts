import { describe, expect, it } from "vitest";
import { noticeText } from "./notices";

describe("noticeText", () => {
  it("reads a fresh notice and ignores other topics and stale replays", () => {
    const text = "Cannot apply a library scene while dice are on the table.";
    expect(noticeText({ topic: "notice", data: { text }, at: 1000 }, 2000)).toBe(text);
    expect(noticeText({ topic: "scene", data: { text }, at: 1000 }, 2000)).toBeUndefined();
    expect(noticeText({ topic: "notice", data: { text }, at: 1000 }, 1000 + 120_000)).toBeUndefined();
    expect(noticeText({ topic: "notice", data: {} }, 2000)).toBeUndefined();
  });
});
