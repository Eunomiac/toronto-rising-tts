import { describe, expect, it } from "vitest";
import {
  applyThunder,
  axesFromLegacyWeatherKey,
  cycleRain,
  cycleWind,
  isWinterWind,
  rainIconCount,
  resolveWindCatalogKey,
  snowIconCount,
  thunderIconCount,
  weatherIntensityFill,
  windIconCount
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

  it("counts stacked weather icons by intensity", () => {
    expect(rainIconCount("none")).toBe(0);
    expect(rainIconCount("rainLight")).toBe(1);
    expect(rainIconCount("rainHeavy")).toBe(2);
    expect(windIconCount("low")).toBe(1);
    expect(windIconCount("med")).toBe(2);
    expect(windIconCount("max")).toBe(3);
    expect(snowIconCount("heavy")).toBe(3);
    expect(thunderIconCount(true)).toBe(1);
  });

  it("uses distinct reds for weather intensity", () => {
    expect(weatherIntensityFill(0, 3)).toBe("transparent");
    expect(weatherIntensityFill(1, 3)).toBe("#220000");
    expect(weatherIntensityFill(2, 3)).toBe("#660000");
    expect(weatherIntensityFill(3, 3)).toBe("#FF0000");
    expect(weatherIntensityFill(1, 2)).toBe("#220000");
    expect(weatherIntensityFill(2, 2)).toBe("#FF0000");
    expect(weatherIntensityFill(1, 1)).toBe("#FF0000");
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
