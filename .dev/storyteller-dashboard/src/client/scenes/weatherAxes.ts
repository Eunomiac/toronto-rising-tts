export type RainKey = "none" | "rainLight" | "rainHeavy";
export type WindStrength = "none" | "low" | "med" | "max";
export type SnowKey = "none" | "light" | "medium" | "heavy";

export type WeatherAxes = {
  rain: RainKey;
  wind: WindStrength;
  thunder: boolean;
  snow: SnowKey;
};

export const RAIN_CYCLE: readonly RainKey[] = ["none", "rainLight", "rainHeavy"];
export const WIND_CYCLE: readonly WindStrength[] = ["none", "low", "med", "max"];
export const SNOW_CYCLE: readonly SnowKey[] = ["none", "light", "medium", "heavy"];

const nextIn = <T>(cycle: readonly T[], current: T): T => {
  const index = cycle.indexOf(current);
  return cycle[(index + 1) % cycle.length] ?? cycle[0]!;
};

export const cycleRain = (rain: RainKey): RainKey => nextIn(RAIN_CYCLE, rain);
export const cycleWind = (wind: WindStrength): WindStrength => nextIn(WIND_CYCLE, wind);
export const cycleSnow = (snow: SnowKey): SnowKey => nextIn(SNOW_CYCLE, snow);

export const isWinterWind = (month: number, snow: SnowKey): boolean =>
  snow !== "none" || month === 11 || month === 12 || month === 1 || month === 2;

export const resolveWindCatalogKey = (strength: WindStrength, winter: boolean): string => {
  if (strength === "none") {
    return "none";
  }
  if (strength === "low") {
    return winter ? "windWinterLow" : "windLow";
  }
  if (strength === "med") {
    return winter ? "windWinterMed" : "windMed";
  }
  return winter ? "windWinterMax" : "windMax";
};

export const applyThunder = (axes: WeatherAxes): WeatherAxes => {
  if (!axes.thunder) {
    return axes;
  }
  return {
    ...axes,
    rain: "rainHeavy",
    wind: "max"
  };
};

export const axesFromLegacyWeatherKey = (key: string): WeatherAxes => {
  if (key === "thunderstorm") {
    return { rain: "rainHeavy", wind: "max", thunder: true, snow: "none" };
  }
  if (key === "rainHeavy") {
    return { rain: "rainHeavy", wind: "none", thunder: false, snow: "none" };
  }
  if (key === "rainLight") {
    return { rain: "rainLight", wind: "none", thunder: false, snow: "none" };
  }
  if (key === "wind") {
    return { rain: "none", wind: "med", thunder: false, snow: "none" };
  }
  return { rain: "none", wind: "none", thunder: false, snow: "none" };
};

export const rainLabel = (rain: RainKey): string => {
  if (rain === "rainHeavy") {
    return "Heavy rain";
  }
  if (rain === "rainLight") {
    return "Light rain";
  }
  return "No rain";
};

export const windLabel = (wind: WindStrength, winter: boolean): string => {
  if (wind === "none") {
    return "No wind";
  }
  const strength = wind === "low" ? "Low" : wind === "med" ? "Medium" : "Max";
  return winter ? `${strength} winter wind` : `${strength} wind`;
};

export const snowLabel = (snow: SnowKey): string => {
  if (snow === "none") {
    return "No snow";
  }
  const level = snow.slice(0, 1).toUpperCase() + snow.slice(1);
  return `${level} snow`;
};
