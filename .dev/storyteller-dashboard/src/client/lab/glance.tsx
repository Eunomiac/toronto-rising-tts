import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactElement, type ReactNode } from "react";
import { Headshot } from "../headshots/Headshot";
import type { CatalogCharacter, SceneCatalogs } from "../scenes/types";
import {
  useChronicleLocations,
  useWeatherCalendar,
  type ChronicleLocations,
  type Resonance,
  type SheetDistrict,
  type SheetSite,
  type WeatherCalendar
} from "./chronicleSheets";
import { Btn, Overlay, canvasPoint } from "./sketch";

/**
 * Panels for the Glance strip sketch (scenes-r1-b), pin pass 3: location and weather read live from the
 * chronicle sheets; overrides shown the same way everywhere (red glow + "Release override" in the corner).
 */

const seeded = (seed: number): (() => number) => {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const useSceneCatalogs = (): { catalogs: SceneCatalogs | null; error: string | null } => {
  const [catalogs, setCatalogs] = useState<SceneCatalogs | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/scene-catalogs")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Scene catalogs failed to load (${response.status}).`);
        }
        setCatalogs((await response.json()) as SceneCatalogs);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);
  return { catalogs, error };
};

/* ---------- shared: override corner button and ring menu ---------- */

export const ReleaseOverride = ({ onRelease }: { onRelease: () => void }): ReactElement => (
  <button
    type="button"
    className="lab-override-release"
    onClick={(event) => {
      event.stopPropagation();
      onRelease();
    }}
  >
    Release override
  </button>
);

type RingOption<T> = { readonly value: T; readonly label: string };
type Point = { readonly x: number; readonly y: number };

/** Choices spread evenly around the click point; the current choice is highlighted. */
const RingMenu = <T,>({ at, options, current, onPick, onClose }: {
  at: Point;
  options: readonly RingOption<T>[];
  current: T;
  onPick: (value: T) => void;
  onClose: () => void;
}): ReactElement => (
  <Overlay onClose={onClose}>
    <div className="lab-ring" style={{ left: Math.min(Math.max(at.x, 170), 1920 - 170), top: Math.max(at.y, 86) }}>
      <button type="button" className="lab-ring-hub" title="Close" onClick={onClose}>×</button>
      {options.map((option, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / options.length;
        return (
          <button
            key={String(option.value)}
            type="button"
            className={`lab-ring-item spoke${option.value === current ? " current" : ""}`}
            style={{ left: Math.cos(angle) * 112, top: Math.sin(angle) * 64 }}
            onClick={() => {
              onPick(option.value);
              onClose();
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </Overlay>
);

/* ---------- Where: District and Site names over their card art; aspects in their own row ---------- */

export type LabLocation = { readonly districtKey: string; readonly siteKey: string };

export const SCENE_LOCATION: LabLocation = { districtKey: "DupontByTheCastle", siteKey: "CLGreatHall" };

const cardUrl = (path: string): string =>
  `https://raw.githubusercontent.com/Eunomiac/toronto-rising-tts/refs/heads/master/assets/images/${path}`;

const resolveLocation = (data: ChronicleLocations, location: LabLocation): { district: SheetDistrict; site: SheetSite } | string => {
  const district = data.districts.find((entry) => entry.key === location.districtKey);
  const site = data.sites.find((entry) => entry.key === location.siteKey);
  if (!district || !site) {
    return `Location ${location.districtKey} / ${location.siteKey} is not in the chronicle sheet.`;
  }
  return { district, site };
};

const siteLabel = (site: SheetSite): string => (site.subtitle ? `${site.title}: ${site.subtitle}` : site.title);

const ResonanceTags = ({ list }: { list: readonly Resonance[] }): ReactElement => (
  <span className="lab-res">
    {list.map((resonance) => (
      <span key={`${resonance.type}${resonance.up ? "+" : "-"}`} className={`lab-res-tag ${resonance.up ? "up" : "down"}`}>
        {resonance.up ? "▲" : "▼"} {resonance.type}
      </span>
    ))}
  </span>
);

const LocationPicker = ({ data, location, onPick, onClose }: {
  data: ChronicleLocations;
  location: LabLocation;
  onPick: (next: LabLocation) => void;
  onClose: () => void;
}): ReactElement => {
  const { catalogs } = useSceneCatalogs();
  const [districtKey, setDistrictKey] = useState(location.districtKey);
  const [siteKey, setSiteKey] = useState(location.siteKey);
  const pickSite = (key: string): void => {
    setSiteKey(key);
    const home = catalogs?.sites.find((entry) => entry.key === key)?.districtKey;
    if (home) {
      setDistrictKey(home);
    }
  };
  return (
    <Overlay onClose={onClose}>
      <div className="lab-modal lab-location-modal">
        <span className="lab-modal-title">Change location</span>
        <div className="lab-location-cols">
          <label>
            District
            <select size={16} className="lab-select tall" value={districtKey} onChange={(event) => setDistrictKey(event.target.value)}>
              {data.districts.map((district) => <option key={district.key} value={district.key}>{district.name}</option>)}
            </select>
          </label>
          <label>
            Site <span className="lab-note">(a unique site also selects its District)</span>
            <select size={16} className="lab-select tall" value={siteKey} onChange={(event) => pickSite(event.target.value)}>
              <optgroup label="Unique sites">
                {data.sites.filter((site) => site.unique).map((site) => <option key={site.key} value={site.key}>{siteLabel(site)}</option>)}
              </optgroup>
              <optgroup label="Generic sites">
                {data.sites.filter((site) => !site.unique).map((site) => <option key={site.key} value={site.key}>{siteLabel(site)}</option>)}
              </optgroup>
            </select>
          </label>
        </div>
        <div className="lab-row">
          <button type="button" className="lab-btn primary" onClick={() => onPick({ districtKey, siteKey })}>Use this location</button>
          <button type="button" className="lab-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Overlay>
  );
};

/** District and Site names with their resonances; click to change either (an override of the scene's location). */
export const LocationPanel = ({ location, overridden, onChange, onRelease }: {
  location: LabLocation;
  overridden: boolean;
  onChange: (next: LabLocation) => void;
  onRelease: () => void;
}): ReactElement => {
  const { data, error } = useChronicleLocations();
  const [picking, setPicking] = useState(false);
  if (error || !data) {
    return <p className="lab-note lab-where-wait">{error ?? "Reading locations from the chronicle sheet…"}</p>;
  }
  const found = resolveLocation(data, location);
  if (typeof found === "string") {
    return <p className="lab-note lab-where-wait">{found}</p>;
  }
  const { district, site } = found;
  return (
    <div className={`lab-where${overridden ? " lab-overridden" : ""}`} title="Click to change the District or Site" onClick={() => setPicking(true)}>
      <div className="lab-where-band" style={{ backgroundImage: `url("${cardUrl(`Districts/${district.key}.webp`)}")` }}>
        <span className="lab-where-name">{district.name}</span>
        <ResonanceTags list={district.resonances} />
      </div>
      <div className="lab-where-band" style={{ backgroundImage: `url("${cardUrl(`Sites/${site.key}.webp`)}")` }}>
        <span className="lab-where-name">
          {site.title}
          {site.subtitle && <span className="lab-where-sub">{site.subtitle}</span>}
        </span>
        <ResonanceTags list={site.resonances} />
      </div>
      {overridden && <ReleaseOverride onRelease={onRelease} />}
      {picking && (
        <LocationPicker
          data={data}
          location={location}
          onPick={(next) => {
            onChange(next);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
};

/** The three District aspects and the Site aspect, always readable. */
export const AspectRow = ({ location }: { location: LabLocation }): ReactElement => {
  const { data, error } = useChronicleLocations();
  if (error || !data) {
    return <p className="lab-note">{error ?? "Reading aspects from the chronicle sheet…"}</p>;
  }
  const found = resolveLocation(data, location);
  if (typeof found === "string") {
    return <p className="lab-note">{found}</p>;
  }
  const blocks = [
    ...found.district.aspects.map((aspect) => ({ aspect, source: "district" })),
    { aspect: found.site.aspect, source: "site" }
  ];
  return (
    <div className="lab-aspects">
      {blocks.map(({ aspect, source }) => (
        <div key={`${source}:${aspect.title}`} className={`lab-aspect ${source}`}>
          <span className="lab-aspect-title">{aspect.title}</span>
          <span className="lab-aspect-text">{aspect.text}</span>
        </div>
      ))}
    </div>
  );
};

/* ---------- NPC roster: masonry of closed groups ---------- */

type NpcGroup = { readonly key: string; readonly label: string; readonly members: readonly CatalogCharacter[] };

/** Every NPC group as a closed stack of all its tokens; click one to open it in place and pick a token. */
export const MasonryRoster = (): ReactElement => {
  const { catalogs, error } = useSceneCatalogs();
  const [open, setOpen] = useState<string | null>("beesHive");
  const groups = useMemo((): readonly NpcGroup[] => {
    if (!catalogs) {
      return [];
    }
    const byKey = new Map<string, CatalogCharacter[]>();
    for (const npc of catalogs.namedNpcs) {
      for (const key of npc.pickerGroups) {
        byKey.set(key, [...(byKey.get(key) ?? []), npc]);
      }
    }
    return [...byKey].map(([key, members]) => ({ key, label: catalogs.pickerGroupLabels[key] ?? key, members }));
  }, [catalogs]);

  return (
    <div className="lab-mroster">
      <div className="lab-mroster-head">
        <Btn tone="primary">Main</Btn>
        <Btn>Generic</Btn>
        <Btn>Memoriam</Btn>
        <span className="lab-search">Search every NPC…</span>
      </div>
      {error && <p className="lab-note">{error}</p>}
      <div className="lab-masonry">
        {groups.map((group) => group.key === open ? (
          <div key={group.key} className="lab-group open">
            <button type="button" className="lab-group-label" onClick={() => setOpen(null)}>{group.label} ▴</button>
            <span className="lab-group-tokens">
              {group.members.map((npc) => (
                <span key={npc.characterKey} className="lab-group-token" title={npc.fullName}>
                  <Headshot className="lab-group-head" characterKey={npc.characterKey} />
                  <span className="lab-group-name">{npc.fullName}</span>
                </span>
              ))}
            </span>
          </div>
        ) : (
          <button key={group.key} type="button" className="lab-group" onClick={() => setOpen(group.key)} title={group.members.map((npc) => npc.fullName).join(", ")}>
            <span className="lab-group-cluster">
              {group.members.map((npc) => (
                <Headshot key={npc.characterKey} className="lab-group-head" characterKey={npc.characterKey} />
              ))}
            </span>
            <span className="lab-group-label">{group.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------- Weather: two axes over one always-drawn scene ---------- */

type Level = 0 | 1 | 2 | 3;
type Precip = "none" | "lightRain" | "heavyRain" | "lightSnow" | "heavySnow";
/** A thunderstorm always blows at max wind, so it is chosen on the wind axis. */
type WeatherAxes = { readonly precip: Precip; readonly wind: Level; readonly thunder: boolean };
type WindChoice = Level | "storm";

const PRECIP: Record<Precip, { readonly label: string; readonly rain: Level; readonly snow: Level }> = {
  none: { label: "Clear", rain: 0, snow: 0 },
  lightRain: { label: "Light Rain", rain: 1, snow: 0 },
  heavyRain: { label: "Heavy Rain", rain: 3, snow: 0 },
  lightSnow: { label: "Light Snow", rain: 0, snow: 1 },
  heavySnow: { label: "Heavy Snow", rain: 0, snow: 3 }
};

const WIND_LABEL: Record<WindChoice, string> = { 0: "No Wind", 1: "Low Wind", 2: "Medium Wind", 3: "Max Wind", storm: "Thunderstorm" };

const PRECIP_OPTIONS: readonly RingOption<Precip>[] = (Object.keys(PRECIP) as Precip[]).map((value) => ({ value, label: PRECIP[value].label }));
const WIND_OPTIONS: readonly RingOption<WindChoice>[] = ([0, 1, 2, 3, "storm"] as const).map((value) => ({ value, label: WIND_LABEL[value] }));

const windChoice = (axes: WeatherAxes): WindChoice => (axes.thunder ? "storm" : axes.wind);

/** A thunderstorm brings heavy rain when the sky was clear (TTS thunder always plays with heavy rain). */
const withWind = (axes: WeatherAxes, choice: WindChoice): WeatherAxes =>
  choice === "storm"
    ? { precip: axes.precip === "none" ? "heavyRain" : axes.precip, wind: 3, thunder: true }
    : { ...axes, wind: choice, thunder: false };

const sameAxes = (a: WeatherAxes, b: WeatherAxes): boolean => a.precip === b.precip && a.wind === b.wind && a.thunder === b.thunder;

/** Hourly calendar code → the two axes (decoding as `C.WEATHER`: base weather, temperature delta, wind). */
const PRECIP_BY_BASE: Readonly<Record<string, Precip>> = { x: "none", c: "none", w: "lightRain", p: "heavyRain", t: "heavyRain", s: "lightSnow", b: "heavySnow" };
const WIND_BY_CODE: Readonly<Record<string, Level>> = { x: 0, s: 1, b: 1, w: 2, g: 2, h: 3, v: 3 };

const temperatureDelta = (ch: string): number => {
  if (ch === "0") {
    return 0;
  }
  if (ch >= "A" && ch <= "Z") {
    return ch.charCodeAt(0) - 64;
  }
  if (ch >= "a" && ch <= "z") {
    return -(ch.charCodeAt(0) - 96);
  }
  return Number.NaN;
};

type Scheduled = WeatherAxes & { readonly celsius: number; readonly fog: boolean };

const scheduledWeather = (calendar: WeatherCalendar, at: Date): Scheduled | string => {
  const month = at.getMonth() + 1;
  const code = calendar.codes.get(`${month}-${at.getDate()}`)?.[at.getHours()];
  const average = calendar.avgTemp.get(month);
  if (!code || average === undefined) {
    return `The WEATHER tab has no entry for ${month}/${at.getDate()} at ${at.getHours()}:00.`;
  }
  const precip = PRECIP_BY_BASE[code.charAt(0)];
  const wind = WIND_BY_CODE[code.charAt(4)];
  const delta = temperatureDelta(code.charAt(2));
  if (precip === undefined || wind === undefined || Number.isNaN(delta)) {
    return `Unknown weather code "${code}".`;
  }
  return { precip, wind, celsius: average + delta, thunder: code.charAt(0) === "t", fog: code.charAt(1) === "f" };
};

type FallLayer = { readonly count: number; readonly size: number; readonly opacity: number; readonly seconds: number };

const RAIN_LAYERS: Record<Level, readonly FallLayer[]> = {
  0: [],
  1: [{ count: 6, size: 11, opacity: 0.7, seconds: 0.9 }],
  2: [{ count: 10, size: 13, opacity: 0.75, seconds: 0.7 }, { count: 6, size: 9, opacity: 0.5, seconds: 1 }],
  3: [{ count: 16, size: 17, opacity: 0.85, seconds: 0.45 }, { count: 12, size: 12, opacity: 0.6, seconds: 0.62 }]
};

const SNOW_LAYERS: Record<Level, readonly FallLayer[]> = {
  0: [],
  1: [{ count: 4, size: 1.6, opacity: 0.75, seconds: 7 }],
  2: [{ count: 7, size: 2, opacity: 0.8, seconds: 5 }, { count: 5, size: 1.3, opacity: 0.55, seconds: 8 }],
  3: [{ count: 12, size: 2.4, opacity: 0.9, seconds: 2.2 }, { count: 10, size: 1.5, opacity: 0.7, seconds: 3.4 }]
};

const TILE = 72;
const WIND_SLANT: Record<Level, number> = { 0: 0, 1: 8, 2: 18, 3: 30 };
const WIND_SPEEDUP: Record<Level, number> = { 0: 1, 1: 1.3, 2: 1.75, 3: 2.4 };

/** One falling layer: a tiled pattern of streaks or flakes, slanted by the wind, sliding down one tile per loop. */
const Fall = ({ id, layer, kind, w, h, slant, speedup, seed }: {
  id: string;
  layer: FallLayer;
  kind: "rain" | "snow";
  w: number;
  h: number;
  slant: number;
  speedup: number;
  seed: number;
}): ReactElement => {
  const random = seeded(seed);
  const marks = Array.from({ length: layer.count }, () => ({ x: random() * TILE, y: random() * (TILE - layer.size) }));
  return (
    <svg className="lab-wx-layer" width={w} height={h} aria-hidden="true">
      <defs>
        <pattern id={id} width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {marks.map((mark, index) => kind === "rain"
            ? <line key={index} x1={mark.x} y1={mark.y} x2={mark.x} y2={mark.y + layer.size} stroke="#d2e0ff" strokeWidth={1.5} strokeOpacity={layer.opacity} />
            : <circle key={index} cx={mark.x} cy={mark.y} r={layer.size} fill="#ffffff" fillOpacity={layer.opacity} />)}
        </pattern>
      </defs>
      <g transform={`skewX(${-slant})`}>
        <rect
          className="lab-wx-fall"
          x={-w}
          y={-TILE * 2}
          width={w * 3}
          height={h + TILE * 4}
          fill={`url(#${id})`}
          style={{ animationDuration: `${layer.seconds / speedup}s` }}
        />
      </g>
    </svg>
  );
};

/**
 * The same scene in every weather: laundry on a line tied to a flagpole. Still air leaves the cloths hanging
 * and the flag slumped around the pole; wind (blowing right to left) lifts and flaps them.
 */
const WindScene = ({ level, w, h }: { level: Level; w: number; h: number }): ReactElement => {
  const poleX = w - 22;
  const poleTop = 40;
  const p0 = { x: -10, y: 68 };
  const p1 = { x: w * 0.42, y: 104 };
  const p2 = { x: poleX, y: poleTop + 20 };
  const along = (t: number): Point => ({
    x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x,
    y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y
  });
  const cloths = [0.16, 0.3, 0.44, 0.6].map((t, index) => ({ ...along(t), wide: index % 2 === 0 ? 16 : 11, tall: index % 2 === 0 ? 20 : 26 }));
  const lean = [0, 14, 30, 55][level] ?? 0;
  const seconds = [0, 2.4, 1.2, 0.55][level] ?? 0;
  const droop = [0, 60, 28, 6][level] ?? 0;
  return (
    <svg
      className={`lab-wx-layer lab-wx-wind${level === 0 ? " still" : ""}`}
      width={w}
      height={h}
      aria-hidden="true"
      style={{ "--lean": `${lean}deg`, "--flap": `${seconds}s` } as CSSProperties}
    >
      <path d={`M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`} className="lab-wx-line" />
      {cloths.map((cloth, index) => (
        <rect key={index} className="lab-wx-cloth" x={cloth.x - cloth.wide / 2} y={cloth.y - 1} width={cloth.wide} height={cloth.tall} rx={1.5} style={{ animationDelay: `${index * -0.27}s` }} />
      ))}
      <line x1={poleX} y1={poleTop - 3} x2={poleX} y2={h} className="lab-wx-pole" />
      <circle cx={poleX} cy={poleTop - 4} r={2} className="lab-wx-finial" />
      <circle cx={p2.x} cy={p2.y} r={1.8} className="lab-wx-finial" />
      {level === 0 ? (
        <path className="lab-wx-flag slumped" d={`M ${poleX - 1} ${poleTop} q -6 4 -5 14 q 1 9 -2 15 l 6 1 q 2 -15 2 -30 Z`} />
      ) : (
        <g transform={`rotate(${-droop} ${poleX} ${poleTop})`}>
          <path className="lab-wx-flag" d={`M ${poleX - 1} ${poleTop} h -30 l 5 9 l -5 9 h 30 Z`} />
        </g>
      )}
    </svg>
  );
};

/** Drifting mist banks, thicker toward the ground. */
const Fog = (): ReactElement => (
  <span className="lab-wx-fog">
    <span className="lab-wx-fog-bank far" />
    <span className="lab-wx-fog-bank near" />
  </span>
);

const WeatherBackdrop = ({ axes, fog, w, h }: { axes: WeatherAxes; fog: boolean; w: number; h: number }): ReactElement => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const slant = WIND_SLANT[axes.wind];
  const speedup = WIND_SPEEDUP[axes.wind];
  const { rain, snow } = PRECIP[axes.precip];
  return (
    <div className="lab-wx" aria-hidden="true">
      <WindScene level={axes.wind} w={w} h={h} />
      {fog && <Fog />}
      {RAIN_LAYERS[rain].map((layer, index) => (
        <Fall key={`r${index}`} id={`${id}r${index}`} layer={layer} kind="rain" w={w} h={h} slant={slant} speedup={speedup} seed={11 + index} />
      ))}
      {SNOW_LAYERS[snow].map((layer, index) => (
        <Fall key={`s${index}`} id={`${id}s${index}`} layer={layer} kind="snow" w={w} h={h} slant={slant * 0.6} speedup={speedup} seed={31 + index} />
      ))}
      {axes.thunder && <span className="lab-wx-flash" />}
    </div>
  );
};

/**
 * Weather for the scene's date and hour from the WEATHER calendar. Click rain/snow or wind for a ring of
 * choices; choosing something other than the calendar's value overrides it until released. Fog always
 * follows the calendar (TTS draws no fog for weather).
 */
export const WeatherPanel = ({ at, forceOverride, w, h }: { at: Date; forceOverride: boolean; w: number; h: number }): ReactElement => {
  const { data, error } = useWeatherCalendar();
  const [override, setOverride] = useState<WeatherAxes | null>(null);
  const [ring, setRing] = useState<{ axis: "precip" | "wind"; at: Point } | null>(null);
  useEffect(() => setOverride(forceOverride ? { precip: "heavyRain", wind: 3, thunder: true } : null), [forceOverride]);
  if (error || !data) {
    return <div className="lab-wx-panel"><p className="lab-note">{error ?? "Reading the weather calendar…"}</p></div>;
  }
  const scheduled = scheduledWeather(data, at);
  if (typeof scheduled === "string") {
    return <div className="lab-wx-panel"><p className="lab-note">{scheduled}</p></div>;
  }
  const axes: WeatherAxes = override ?? { precip: scheduled.precip, wind: scheduled.wind, thunder: scheduled.thunder };
  const overridden = override !== null && !sameAxes(override, scheduled);
  const openRing = (axis: "precip" | "wind") => (event: MouseEvent<HTMLButtonElement>): void => setRing({ axis, at: canvasPoint(event) });
  return (
    <div className={`lab-wx-panel${overridden ? " lab-overridden" : ""}`}>
      <WeatherBackdrop axes={axes} fog={scheduled.fog} w={w} h={h} />
      <span className="lab-wx-axes">
        <button type="button" className="lab-wx-axis" onClick={openRing("precip")}>{PRECIP[axes.precip].label}</button>
        <span className="lab-wx-sep">◆</span>
        <button type="button" className="lab-wx-axis" onClick={openRing("wind")}>{WIND_LABEL[windChoice(axes)]}</button>
        {scheduled.fog && (
          <>
            <span className="lab-wx-sep">◆</span>
            <span className="lab-wx-fixed">Fog</span>
          </>
        )}
      </span>
      <span className="lab-wx-temp">
        {scheduled.celsius}°C<sup>{Math.round(scheduled.celsius * 1.8 + 32)}°F</sup>
      </span>
      {overridden && <ReleaseOverride onRelease={() => setOverride(null)} />}
      {ring?.axis === "precip" && (
        <RingMenu at={ring.at} options={PRECIP_OPTIONS} current={axes.precip} onPick={(precip) => setOverride({ ...axes, precip })} onClose={() => setRing(null)} />
      )}
      {ring?.axis === "wind" && (
        <RingMenu at={ring.at} options={WIND_OPTIONS} current={windChoice(axes)} onPick={(choice) => setOverride(withWind(axes, choice))} onClose={() => setRing(null)} />
      )}
    </div>
  );
};

/* ---------- When: scene time over a night skyline ---------- */

export const PRESENT_DAY = new Date(2026, 9, 9, 23, 40);
export const FLASHBACK_TIME = new Date(2026, 8, 22, 20, 15);

const DUSK = 19 * 60 + 2;
const DAWN = 24 * 60 + 6 * 60 + 58;

const SKY_STOPS: readonly (readonly [t: number, top: string, bottom: string])[] = [
  [0, "#2a3466", "#a0566e"],
  [0.12, "#121a40", "#3b2f58"],
  [0.5, "#04050c", "#0d1226"],
  [0.82, "#0a1230", "#24305a"],
  [1, "#4a6fa5", "#f0a868"]
];

const mix = (a: string, b: string, f: number): string => {
  const channel = (hex: string, offset: number): number => parseInt(hex.slice(offset, offset + 2), 16);
  const out = [1, 3, 5].map((offset) => Math.round(channel(a, offset) + (channel(b, offset) - channel(a, offset)) * f));
  return `rgb(${out.join(" ")})`;
};

const skyAt = (t: number): { top: string; bottom: string } => {
  let previous = SKY_STOPS[0];
  for (const stop of SKY_STOPS) {
    if (previous && t <= stop[0]) {
      const f = stop[0] === previous[0] ? 0 : (t - previous[0]) / (stop[0] - previous[0]);
      return { top: mix(previous[1], stop[1], f), bottom: mix(previous[2], stop[2], f) };
    }
    previous = stop;
  }
  return { top: "#4a6fa5", bottom: "#f0a868" };
};

/** Fraction of the night elapsed (0 at dusk, 1 at dawn); null in daylight. */
const nightFraction = (minutes: number): number | null => {
  const ofDay = ((minutes % 1440) + 1440) % 1440;
  const sinceDusk = ofDay >= 12 * 60 ? ofDay - DUSK : ofDay + 1440 - DUSK;
  const t = sinceDusk / (DAWN - DUSK);
  return t >= 0 && t <= 1 ? t : null;
};

type Building = { readonly x: number; readonly w: number; readonly h: number; readonly windows: readonly { x: number; y: number; r: number }[] };

const skyline = (w: number, h: number): readonly Building[] => {
  const random = seeded(7);
  const buildings: Building[] = [];
  for (let x = -4; x < w; ) {
    const bw = 16 + Math.round(random() * 26);
    const bh = Math.round(h * (0.2 + random() * 0.32));
    const windows: { x: number; y: number; r: number }[] = [];
    for (let wy = h - bh + 5; wy < h - 4; wy += 7) {
      for (let wx = x + 4; wx < x + bw - 4; wx += 6) {
        windows.push({ x: wx, y: wy, r: random() });
      }
    }
    buildings.push({ x, w: bw, h: bh, windows });
    x += bw + Math.round(random() * 3);
  }
  return buildings;
};

const moonPosition = (t: number, w: number, h: number): Point => ({ x: w * (0.06 + 0.88 * t), y: h * (0.78 - 0.5 * Math.sin(Math.PI * t)) });

type MoonDrag = { readonly target: number | null; readonly onDrag: (t: number) => void };

/**
 * Sky from dusk to dawn: the moon crosses, city windows go dark one by one, and the horizon warms before dawn.
 * The moon can be dragged along its arc (shown while a target is set) to pick a later or earlier time tonight.
 */
const NightSky = ({ minutes, w, h, drag }: { minutes: number; w: number; h: number; drag: MoonDrag }): ReactElement => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const city = useMemo(() => skyline(w, h), [w, h]);
  const stars = useMemo(() => {
    const random = seeded(3);
    return Array.from({ length: 46 }, () => ({ x: random() * w, y: random() * h * 0.55, r: 0.4 + random() * 0.8 }));
  }, [w, h]);
  const t = nightFraction(minutes);
  const sky = t === null ? { top: "#6fa8dc", bottom: "#d6e6f2" } : skyAt(t);
  const lit = t === null ? 0.04 : Math.max(0.04, 0.82 - 0.85 * t);
  const starAlpha = t === null ? 0 : Math.sin(Math.PI * t) * 0.9;
  const dawnGlow = t === null ? 0 : Math.max(0, (t - 0.72) / 0.28);
  const moon = t === null ? null : moonPosition(drag.target ?? t, w, h);
  const arc = Array.from({ length: 25 }, (_, index) => moonPosition(index / 24, w, h)).map((p) => `${p.x},${p.y}`).join(" ");
  const fractionAt = (event: PointerEvent<Element>): number => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      throw new Error("NightSky: svg not mounted during a moon drag");
    }
    const x = ((event.clientX - rect.left) / rect.width) * w;
    return Math.min(1, Math.max(0, (x / w - 0.06) / 0.88));
  };
  return (
    <svg ref={svgRef} className="lab-sky" width={w} height={h} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.bottom} />
        </linearGradient>
        <linearGradient id={`${id}dawn`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffb070" stopOpacity={0.55 * dawnGlow} />
          <stop offset="0.6" stopColor="#ffb070" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}sky)`} />
      {stars.map((star, index) => <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#fff" fillOpacity={starAlpha * (0.4 + (index % 3) * 0.25)} />)}
      {moon && drag.target !== null && <polyline points={arc} className="lab-sky-arc" />}
      {moon && (
        <g>
          <circle cx={moon.x} cy={moon.y} r={20} fill="#fff6d8" fillOpacity={0.12} />
          <circle cx={moon.x} cy={moon.y} r={9} fill="#f4ecd0" />
          <circle cx={moon.x + 3} cy={moon.y - 2} r={2} fill="#d8cfae" />
        </g>
      )}
      <rect width={w} height={h} fill={`url(#${id}dawn)`} />
      {city.map((building) => (
        <g key={building.x}>
          <rect x={building.x} y={h - building.h} width={building.w} height={building.h} fill="#07080d" />
          {building.windows.map((win, index) => (
            <rect key={index} x={win.x} y={win.y} width={3} height={4} fill={win.r < lit ? (win.r < lit * 0.12 ? "#9ec4ff" : "#f2c46e") : "#151824"} fillOpacity={win.r < lit ? 0.9 : 1} />
          ))}
        </g>
      ))}
      {moon && (
        <circle
          className="lab-sky-moon"
          cx={moon.x}
          cy={moon.y}
          r={14}
          fill="transparent"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.onDrag(fractionAt(event));
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              drag.onDrag(fractionAt(event));
            }
          }}
        />
      )}
    </svg>
  );
};

const formatTime = (at: Date): string => at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const formatDate = (at: Date): string => at.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

const formatClock = (minutes: number): string => formatTime(new Date(2000, 0, 1, Math.floor(minutes / 60) % 24, minutes % 60));

const sameDay = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString();

const shift = (at: Date, minutes: number): Date => new Date(at.getTime() + minutes * 60_000);

const JUMPS: readonly (readonly [label: string, minutes: number])[] = [
  ["10m", 10], ["20m", 20], ["30m", 30], ["1h", 60], ["2h", 120], ["4h", 240], ["1d", 1440], ["3d", 4320], ["1w", 10080]
];

const NIGHT_MINUTES = DAWN - DUSK;
const PLAY_MS = 1800;
const FIVE_MINUTES = 300_000;

const easeInOut = (f: number): number => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);

const toMinute = (ms: number): Date => new Date(Math.round(ms / 60_000) * 60_000);

/**
 * Scene date and time over the sky, with tonight's dusk (left) and dawn (right) in the bottom corners.
 * Present-day time appears (green) only when it differs from scene time; scene time can never pass it (the
 * caller moves present day forward). A scene before the present day is a flashback (yellow glow).
 * Drag the moon to pick a time tonight, then press play over the clock to run the time animation.
 * Click anywhere else for the clock pop-up.
 */
export const WhenPanel = ({ at, present, onChange, onSetPresent, forceOpen, w, h }: {
  at: Date;
  present: Date;
  onChange: (next: Date) => void;
  onSetPresent: (next: Date) => void;
  forceOpen: boolean;
  w: number;
  h: number;
}): ReactElement => {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<number | null>(null);
  const [playing, setPlaying] = useState<{ from: number; to: number } | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    const started = performance.now();
    let frame = 0;
    const step = (now: number): void => {
      const f = Math.min(1, (now - started) / PLAY_MS);
      changeRef.current(toMinute(playing.from + (playing.to - playing.from) * easeInOut(f)));
      if (f < 1) {
        frame = requestAnimationFrame(step);
      } else {
        setPlaying(null);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  const minutes = at.getHours() * 60 + at.getMinutes();
  const differs = at.getTime() !== present.getTime();
  const flashback = at.getTime() < present.getTime();
  const untilDawn = (minutes >= 12 * 60 ? DAWN : DAWN - 1440) - minutes;
  const tonight = nightFraction(minutes);
  const targetTime = target === null || tonight === null
    ? null
    : new Date(Math.round(shift(at, (target - tonight) * NIGHT_MINUTES).getTime() / FIVE_MINUTES) * FIVE_MINUTES);
  const play = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    if (targetTime) {
      setPlaying({ from: at.getTime(), to: targetTime.getTime() });
    }
    setTarget(null);
  };
  return (
    <>
      <div className={`lab-when${flashback ? " lab-flashback" : ""}`} onClick={() => setOpen(true)}>
        <NightSky minutes={minutes} w={w} h={h} drag={{ target: playing ? null : target, onDrag: setTarget }} />
        <span className={`lab-when-present${differs ? "" : " hidden"}`}>
          {sameDay(at, present) ? formatTime(present) : `${formatDate(present)} · ${formatTime(present)}`}
        </span>
        <span className="lab-when-date">{formatDate(at)}</span>
        <span className="lab-when-time">{formatTime(at)}</span>
        {targetTime && (
          <span className="lab-when-play">
            <button type="button" className="lab-when-play-go" onClick={play} title="Run the time animation in TTS">
              ▶ {formatTime(targetTime)}
            </button>
            <button
              type="button"
              className="lab-when-play-cancel"
              title="Cancel"
              onClick={(event) => {
                event.stopPropagation();
                setTarget(null);
              }}
            >
              ×
            </button>
          </span>
        )}
        <span className="lab-when-edge dusk">
          <small>Dusk</small>
          {formatClock(DUSK)}
        </span>
        <span className="lab-when-edge dawn">
          <small>Dawn</small>
          {formatClock(DAWN)}
        </span>
      </div>
      {(open || forceOpen) && (
        <Overlay onClose={() => setOpen(false)}>
          <div className="lab-modal lab-clock-modal">
            <span className="lab-modal-title">Scene clock · {formatTime(at)}</span>
            <span className="lab-note">Click to jump forward, right-click to jump back.</span>
            <div className="lab-row">
              {JUMPS.map(([label, step]) => (
                <button
                  key={label}
                  type="button"
                  className="lab-btn"
                  onClick={() => onChange(shift(at, step))}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onChange(shift(at, -step));
                  }}
                >
                  ±{label}
                </button>
              ))}
              <button type="button" className="lab-btn" onClick={() => onChange(shift(at, untilDawn > 15 ? untilDawn - 15 : 0))}>15m before dawn</button>
              <button type="button" className="lab-btn" onClick={() => onChange(shift(at, DUSK - minutes))}>Dusk</button>
            </div>
            <div className="lab-row">
              <Btn>Type scene date / time…</Btn>
              <button type="button" className="lab-btn" onClick={() => onChange(present)}>Set scene time to present day</button>
              <button type="button" className="lab-btn" onClick={() => onSetPresent(at)}>Set present day to scene time</button>
              <Btn>Real-time: off</Btn>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
};

/* ---------- Sound: one row per channel ---------- */

type Overridable<T> = { readonly value: T; readonly set: (next: T) => void; readonly overridden: boolean; readonly release: () => void };

/** A sound value that starts at the scene's value; any other value is an override until released. */
const useOverridable = <T,>(base: T): Overridable<T> => {
  const [value, set] = useState(base);
  return { value, set, overridden: value !== base, release: () => set(base) };
};

const Slider = ({ level, disabled = false }: { level: Overridable<number>; disabled?: boolean }): ReactElement => (
  <input
    type="range"
    className="lab-slider"
    min={0}
    max={100}
    value={level.value}
    disabled={disabled}
    onChange={(event) => level.set(Number(event.target.value))}
  />
);

/** One mixer control group; an override glows red and gets a release button in its corner. */
const MixerGroup = ({ idle = false, values, children }: { idle?: boolean; values: readonly Pick<Overridable<unknown>, "overridden" | "release">[]; children: ReactNode }): ReactElement => {
  const overridden = values.some((value) => value.overridden);
  return (
    <span className={`lab-mixer-group${idle ? " idle" : ""}${overridden ? " overridden" : ""}`}>
      {children}
      {overridden && (
        <button type="button" className="lab-mixer-release" title="Release override" onClick={() => values.forEach((value) => value.release())}>
          ↺
        </button>
      )}
    </span>
  );
};

const MUSIC_PLAYLISTS = ["Main", "Combat", "Intrigue", "Silent"] as const;

/**
 * Music and Featured share a row because only one of them plays at a time. The playlist shows what is playing:
 * the scene library's choice (usually Main) unless changed here.
 */
export const SoundMixer = ({ indoors, scenePlaylist = "Main" }: { indoors: boolean; scenePlaylist?: string }): ReactElement => {
  const [featured, setFeatured] = useState(false);
  const playlist = useOverridable(scenePlaylist);
  const music = useOverridable(70);
  const featuredLevel = useOverridable(80);
  const rain = useOverridable(60);
  const wind = useOverridable(40);
  const thunder = useOverridable(75);
  const ambience = useOverridable(55);
  const rainPlaying = true;
  const thunderPlaying = false;
  return (
    <div className="lab-mixer">
      <div className="lab-mixer-row">
        <span className="lab-mixer-label">Music</span>
        <MixerGroup idle={featured} values={[playlist, music]}>
          <select className="lab-select" value={playlist.value} onChange={(event) => playlist.set(event.target.value)}>
            {MUSIC_PLAYLISTS.map((name) => <option key={name}>{name}</option>)}
          </select>
          <Slider level={music} />
        </MixerGroup>
        <MixerGroup idle={!featured} values={[featuredLevel]}>
          <button type="button" className={`lab-btn${featured ? " primary" : ""}`} onClick={() => setFeatured(!featured)}>
            {featured ? "★ TR Loop" : "Featured…"}
          </button>
          <Slider level={featuredLevel} />
        </MixerGroup>
      </div>
      <div className={`lab-mixer-row${indoors ? " muted" : ""}`} title={indoors ? "Indoors: weather sounds are not playing" : undefined}>
        <span className="lab-mixer-label">Weather</span>
        <MixerGroup idle={!rainPlaying || indoors} values={[rain]}>Rain <Slider level={rain} disabled={indoors || !rainPlaying} /></MixerGroup>
        <MixerGroup idle={indoors} values={[wind]}>Wind <Slider level={wind} disabled={indoors} /></MixerGroup>
        <MixerGroup idle={!thunderPlaying || indoors} values={[thunder]}>Thunder <Slider level={thunder} disabled={indoors || !thunderPlaying} /></MixerGroup>
      </div>
      <div className="lab-mixer-row">
        <span className="lab-mixer-label">Location</span>
        <MixerGroup values={[ambience]}>
          <span className="lab-mixer-track">Soft indoor</span>
          <Slider level={ambience} />
        </MixerGroup>
        <Btn tone="danger">Stop all</Btn>
      </div>
    </div>
  );
};

/* ---------- Queue: connection light doubles as the live / queued switch ---------- */

export const QueuePanel = ({ connected }: { connected: boolean }): ReactElement => {
  const [live, setLive] = useState(false);
  return (
    <div className="lab-queue">
      <button
        type="button"
        className={`lab-conn-light${connected ? " on" : " off"}${live ? " live" : ""}`}
        title={`${connected ? "TTS connected" : "TTS not connected"} · click for ${live ? "queued" : "live"} mode`}
        onClick={() => setLive(!live)}
      />
      <div className="lab-queue-actions">
        {live ? <Btn tone="live">Live</Btn> : (
          <>
            <Btn tone="primary">Send 3 changes</Btn>
            <Btn>Clear queue</Btn>
          </>
        )}
      </div>
      {!live && (
        <ol className="lab-queue-list">
          <li>Light Victor (Mid Center)</li>
          <li>Black Caesar: present → absent</li>
          <li>Weather: rain → heavy</li>
        </ol>
      )}
    </div>
  );
};

/* ---------- Phases: strip between the stage and the PC panel ---------- */

export const PhaseStrip = ({ onAdvance }: { onAdvance: () => void }): ReactElement => (
  <div className="lab-phase">
    <span title="Main / Memoriam → Downtime"><Btn tone="danger">End Scene</Btn></span>
    <span className="lab-phase-now">
      <span className="lab-phase-tag">Play</span>
      <span className="lab-phase-sub">Main</span>
      <span className="lab-phase-scene">Elysium — Casa Loma: Great Hall</span>
      <span className="lab-note">2 scenes prepared</span>
    </span>
    <button type="button" className="lab-btn primary" onClick={onAdvance}>Advance ▸</button>
  </div>
);

export const AdvanceModal = ({ library, onClose, onPrepare }: { library: readonly string[]; onClose: () => void; onPrepare: () => void }): ReactElement => (
  <Overlay onClose={onClose}>
    <div className="lab-modal lab-advance">
      <span className="lab-modal-title">Advance from Play · Main</span>
      <div className="lab-advance-cols">
        <section>
          <h4>Play a scene</h4>
          <span className="lab-search">Search the scene library…</span>
          <ul className="lab-advance-list">
            {library.map((title, index) => (
              <li key={title} className={index === 0 ? "live" : index < 3 ? "prep" : undefined}>
                <span>{title}{index === 0 ? " (on the table)" : index < 3 ? " (prepared)" : ""}</span>
                <span className="lab-row">
                  <Btn tone="live">Play</Btn>
                  <button type="button" className="lab-btn" onClick={onPrepare}>Edit</button>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="lab-btn" onClick={onPrepare}>+ Prepare a new scene…</button>
        </section>
        <section>
          <h4>Switch subphase</h4>
          <button type="button" className="lab-btn primary">Main (current)</button>
          <button type="button" className="lab-btn" onClick={onClose}>Downtime</button>
          <button type="button" className="lab-btn" onClick={onClose}>Memoriam</button>
        </section>
        <section>
          <h4>Next phase</h4>
          <button type="button" className="lab-btn" onClick={onClose}>Spotlight ▸</button>
          <p className="lab-note">Intermission → Play → Spotlight → End → Intermission</p>
        </section>
      </div>
      <p className="lab-note">From Intermission, Spotlight, or End, Advance moves straight to the next phase with no pop-up.</p>
    </div>
  </Overlay>
);
