import { describe, expect, it } from "vitest";
import { comparePickerGroups, groupThemeClass, isImportantGroup, trayMergeLabel } from "./groupThemes";

describe("groupThemes", () => {
  it("maps recategorized picker groups", () => {
    expect(groupThemeClass("petitioners")).toBe("group-theme-independent");
    expect(groupThemeClass("fiveKeys")).toBe("group-theme-camarilla");
    expect(groupThemeClass("scarlettAndTheBoys")).toBe("group-theme-camarilla");
    expect(isImportantGroup("fiveKeys")).toBe(true);
  });

  it("strips parenthetical suffixes for merged drawers", () => {
    expect(trayMergeLabel("Friendly Neighborhood Spiders (Garou)")).toBe("Friendly Neighborhood Spiders");
  });

  it("sorts important Camarilla groups above other Camarilla groups", () => {
    const keys = ["harpies", "fiveKeys", "princesCourt"];
    const labels: Record<string, string> = {
      harpies: "the Harpies",
      fiveKeys: "the Five Keys",
      princesCourt: "the Prince's Court"
    };
    keys.sort((a, b) => comparePickerGroups(a, b, (key) => labels[key] ?? key));
    expect(keys[0]).toBe("fiveKeys");
  });
});
