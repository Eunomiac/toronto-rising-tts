import { describe, expect, it } from "vitest";
import {
  applyThunder,
  axesFromLegacyWeatherKey,
  cycleRain,
  cycleWind,
  isWinterWind,
  resolveWindCatalogKey
} from "./weatherAxes";

describe("weatherAxes", () => {
  it("cycles rain and wind through catalog strengths", () => {
    expect(cycleRain("none")).toBe("rainLight");
    expect(cycleRain("rainLight")).toBe("rainHeavy");
    expect(cycleRain("rainHeavy")).toBe("none");
    expect(cycleWind("none")).toBe("low");
    expect(cycleWind("max")).toBe("none");
  });

  it("uses winter wind keys in Nov–Feb or when snow is falling", () => {
    expect(isWinterWind(9, "none")).toBe(false);
    expect(isWinterWind(12, "none")).toBe(true);
    expect(isWinterWind(6, "light")).toBe(true);
    expect(resolveWindCatalogKey("low", false)).toBe("windLow");
    expect(resolveWindCatalogKey("max", true)).toBe("windWinterMax");
  });

  it("forces heaviest rain and wind when thunder is on", () => {
    expect(applyThunder({ rain: "none", wind: "low", thunder: true, snow: "none" })).toEqual({
      rain: "rainHeavy",
      wind: "max",
      thunder: true,
      snow: "none"
    });
  });

  it("restores independent axes from an old single weatherKey", () => {
    expect(axesFromLegacyWeatherKey("thunderstorm")).toMatchObject({
      rain: "rainHeavy",
      wind: "max",
      thunder: true
    });
    expect(axesFromLegacyWeatherKey("rainLight").rain).toBe("rainLight");
  });
});
