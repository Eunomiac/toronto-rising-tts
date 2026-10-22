import { describe, expect, it } from "vitest";
import { tokenBackShareMap } from "./token-back-share.ts";

describe("tokenBackShareMap", () => {
  it("points identical backs at the alphabetically first NPC and leaves unique backs alone", () => {
    const shares = tokenBackShareMap([
      { key: "mem_bertrice1900", sha1: "same" },
      { key: "bertrice", sha1: "same" },
      { key: "civilianChildGirl_03", sha1: "girl" },
      { key: "civilianChildGirl_01", sha1: "girl" },
      { key: "unique", sha1: "only" }
    ]);
    expect([...shares.entries()]).toEqual([
      ["mem_bertrice1900", "bertrice"],
      ["civilianChildGirl_03", "civilianChildGirl_01"]
    ]);
  });
});
