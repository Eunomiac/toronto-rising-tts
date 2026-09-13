import { describe, expect, it } from "vitest";
import { comparePickerGroups, groupThemeClass } from "./groupThemes";

describe("groupThemes", () => {
  it("maps known picker groups onto theme classes", () => {
    expect(groupThemeClass("princesCourt")).toBe("group-theme-camarilla");
    expect(groupThemeClass("touchstone")).toBe("group-theme-civilian");
    expect(groupThemeClass("crisisMissing")).toBe("group-theme-independent");
  });

  it("sorts Camarilla before civilian, then by label", () => {
    const keys = ["touchstone", "princesCourt", "harpies"];
    const labels: Record<string, string> = {
      touchstone: "Touchstone",
      princesCourt: "the Prince's Court",
      harpies: "the Harpies"
    };
    keys.sort((a, b) => comparePickerGroups(a, b, (key) => labels[key] ?? key));
    expect(keys).toEqual(["harpies", "princesCourt", "touchstone"]);
  });
});
