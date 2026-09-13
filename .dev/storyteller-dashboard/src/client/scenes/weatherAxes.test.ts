import { describe, expect, it } from "vitest";
import { axesFromWeatherKey, cycleRain, weatherKeyFromAxes } from "./weatherAxes";

const catalog = [
  { key: "none", label: "None", rain: "none", wind: "none", thunderEnabled: false },
  { key: "rainLight", label: "Light Rain", rain: "rainLight", wind: "none", thunderEnabled: false },
  { key: "rainHeavy", label: "Heavy Rain", rain: "rainHeavy", wind: "none", thunderEnabled: false },
  { key: "wind", label: "Wind", rain: "none", wind: "windMed", thunderEnabled: false },
  { key: "thunderstorm", label: "Thunderstorm", rain: "rainHeavy", wind: "windWinterMax", thunderEnabled: true }
] as const;

describe("weatherAxes", () => {
  it("reads catalog rows into independent toggles", () => {
    expect(axesFromWeatherKey("thunderstorm", catalog)).toEqual({
      rain: "heavy",
      wind: true,
      thunder: true,
      snow: false
    });
    expect(axesFromWeatherKey("wind", catalog).wind).toBe(true);
  });

  it("maps toggles onto the nearest catalog key", () => {
    expect(weatherKeyFromAxes({ rain: "light", wind: false, thunder: false, snow: false })).toBe("rainLight");
    expect(weatherKeyFromAxes({ rain: "none", wind: true, thunder: false, snow: false })).toBe("wind");
    expect(weatherKeyFromAxes({ rain: "heavy", wind: true, thunder: true, snow: false })).toBe("thunderstorm");
  });

  it("cycles rain none \u2192 light \u2192 heavy \u2192 none", () => {
    expect(cycleRain("none")).toBe("light");
    expect(cycleRain("light")).toBe("heavy");
    expect(cycleRain("heavy")).toBe("none");
  });
});
