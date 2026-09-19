import { describe, expect, it } from "vitest";
import { identityFor, subtitleFor } from "./identity.js";

describe("subtitleFor", () => {
  it("uses Clan for most clans", () => {
    expect(subtitleFor(identityFor("aishe"))).toBe(
      "Eighth Generation Ancilla of Clan Malkavian ◆ Descendant of the Pythia"
    );
  });

  it("uses the Banu Haqim without Clan", () => {
    expect(subtitleFor(identityFor("rashid"))).toBe(
      "Eighth Generation Ancilla of the Banu Haqim ◆ Descendant of Ur-Shulgi"
    );
  });

  it("uses the Tremere bloodline wording", () => {
    expect(subtitleFor(identityFor("blackCaesar"))).toBe(
      "Eighth Generation Ancilla of Clan Tremere ◆ bani Gwo Samedi"
    );
  });
});
