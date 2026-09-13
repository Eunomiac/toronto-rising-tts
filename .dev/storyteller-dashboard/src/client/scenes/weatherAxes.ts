import type { SceneCatalogs } from "./types.js";

export type RainLevel = "none" | "light" | "heavy";

export type WeatherAxes = {
  rain: RainLevel;
  wind: boolean;
  thunder: boolean;
  snow: boolean;
};

const rainFromCatalog = (rain: string | null): RainLevel => {
  if (rain === "rainHeavy") {
    return "heavy";
  }
  if (rain === "rainLight") {
    return "light";
  }
  return "none";
};

export const axesFromWeatherKey = (
  weatherKey: string,
  catalog: SceneCatalogs["weatherConditions"]
): WeatherAxes => {
  const row = catalog.find((item) => item.key === weatherKey);
  return {
    rain: rainFromCatalog(row?.rain ?? null),
    wind: Boolean(row?.wind && row.wind !== "none"),
    thunder: row?.thunderEnabled === true,
    snow: false
  };
};

export const weatherKeyFromAxes = (axes: WeatherAxes): string => {
  if (axes.thunder) {
    return "thunderstorm";
  }
  if (axes.rain === "heavy") {
    return "rainHeavy";
  }
  if (axes.rain === "light") {
    return "rainLight";
  }
  if (axes.wind) {
    return "wind";
  }
  return "none";
};

export const cycleRain = (rain: RainLevel): RainLevel => {
  if (rain === "none") {
    return "light";
  }
  if (rain === "light") {
    return "heavy";
  }
  return "none";
};
