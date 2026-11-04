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

  it("retains shares after duplicate files are removed and follows a newly chosen owner", () => {
    const retained = new Map([["bertrice_1900", "bertrice"]]);
    const files = [{ key: "bertrice", sha1: "same" }];
    expect(tokenBackShareMap(files, retained)).toEqual(retained);
    expect(tokenBackShareMap([...files, { key: "aNewNpc", sha1: "same" }], retained)).toEqual(new Map([
      ["bertrice", "aNewNpc"],
      ["bertrice_1900", "aNewNpc"]
    ]));
  });
});
