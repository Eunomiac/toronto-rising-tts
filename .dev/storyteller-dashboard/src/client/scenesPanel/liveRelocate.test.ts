import { describe, expect, it } from "vitest";
import type { LibraryScene } from "../../shared/sceneLibrary";
import { buildRelocatedScene, nextForkKey, relocateTitle, withLocation } from "./liveRelocate";

const live: LibraryScene = {
  key: "dockside",
  title: "Dockside Meet",
  placementMode: "standard",
  linked: true,
  status: "ongoing",
  sessionScene: {
    districtKey: "harbourfront",
    siteKey: "docks",
    skyboxOverride: "NightCity",
    seatSlots: { Red: { characterKey: "lordLucien", isPresent: true, tableSlot: 1 } },
    seatPresent: { Red: true }
  }
};

describe("withLocation", () => {
  it("writes the new district and site and clears a skybox override", () => {
    const next = withLocation(live, { districtKey: "downtown", siteKey: "cn_tower" });
    expect(next.sessionScene.districtKey).toBe("downtown");
    expect(next.sessionScene.siteKey).toBe("cn_tower");
    expect(next.sessionScene.skyboxOverride).toBeUndefined();
    expect(next.key).toBe("dockside");
  });
});

describe("relocateTitle", () => {
  it("appends the site name and numbers collisions", () => {
    expect(relocateTitle("Dockside Meet", "CN Tower", [])).toBe("Dockside Meet — CN Tower");
    expect(relocateTitle("Dockside Meet", "CN Tower", ["Dockside Meet — CN Tower"])).toBe("Dockside Meet — CN Tower (2)");
  });
});

describe("nextForkKey", () => {
  it("skips keys already in the library", () => {
    expect(nextForkKey("dockside", new Set(["dockside"]))).toBe("dockside_2");
    expect(nextForkKey("dockside", new Set(["dockside", "dockside_2"]))).toBe("dockside_3");
  });
});

describe("buildRelocatedScene", () => {
  it("forks an ongoing linked row at the new location and applies seating edits", () => {
    const built = buildRelocatedScene(
      live,
      { districtKey: "downtown", siteKey: "cn_tower" },
      "dockside_2",
      "Dockside Meet — CN Tower",
      (row) => ({
        ...row,
        sessionScene: {
          ...row.sessionScene,
          seatPresent: { Red: false },
          seatSlots: { Red: { characterKey: "lordLucien", isPresent: false, tableSlot: 1 } }
        }
      })
    );
    expect(built.key).toBe("dockside_2");
    expect(built.title).toBe("Dockside Meet — CN Tower");
    expect(built.status).toBe("ongoing");
    expect(built.linked).toBe(true);
    expect(built.sessionScene.districtKey).toBe("downtown");
    expect(built.sessionScene.siteKey).toBe("cn_tower");
    expect(built.sessionScene.seatPresent).toEqual({ Red: false });
  });
});
