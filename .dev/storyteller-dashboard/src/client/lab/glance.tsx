import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactElement } from "react";
import { Headshot } from "../headshots/Headshot";
import type { CatalogCharacter, SceneCatalogs } from "../scenes/types";
import { Btn, Chip, Overlay } from "./sketch";

/** Panels for the Glance strip sketch (scenes-r1-b), pin pass 2: real art and working Lab interactions. */

const seeded = (seed: number): (() => number) => {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ---------- Where: layered crops of the District and Site cards ---------- */

type CardRect = readonly [x: number, y: number, w: number, h: number];
type CardArt = { readonly src: string; readonly width: number };

const cardUrl = (path: string): string =>
  `https://raw.githubusercontent.com/Eunomiac/toronto-rising-tts/refs/heads/master/assets/images/${path}`;

/** Source rectangles in card pixels. District cards share one template; Site cards come in more than one. */
const DISTRICT = {
  art: { src: cardUrl("Districts/DupontByTheCastle.webp"), width: 1920 },
  name: [480, 116, 960, 94],
  resonanceUp: [50, 700, 350, 50],
  resonanceDown: [1600, 700, 270, 50],
  aspects: [44, 654, 1264].map((x) => ({ title: [x, 762, 612, 50] as CardRect, full: [x, 762, 612, 248] as CardRect }))
} as const;

/**
 * Site cards (1952×882) come in two fixed layouts. Unique sites (with a district) carry a street map on the
 * right: name right-aligned along the top, an optional sub-location line under it, resonance under the map.
 * Generic sites have a centred name and the resonance bottom-left. The rule box never moves; only the text
 * inside it sits higher or lower.
 */
type SiteLayout = { readonly name: CardRect; readonly sub?: CardRect; readonly aspect: CardRect; readonly resonance: CardRect };

type SiteLayoutKey = "unique" | "generic";

const SITE_LAYOUTS: Record<SiteLayoutKey, SiteLayout> = {
  unique: { name: [200, 26, 1240, 100], sub: [900, 126, 540, 114], aspect: [690, 545, 660, 300], resonance: [1330, 785, 460, 70] },
  generic: { name: [400, 20, 1152, 110], sub: [730, 132, 492, 64], aspect: [1050, 572, 875, 285], resonance: [200, 790, 470, 70] }
};

/** Sites whose card art does not follow the district rule (district but no map). */
const SITE_LAYOUT_EXCEPTIONS: Readonly<Record<string, SiteLayoutKey>> = {
  HockeyHallOfFame: "generic",
  WarrensAntechamber: "generic",
  WarrensDrakes: "generic",
  WarrensFomorach: "generic",
  WarrensIQs: "generic",
  WarrensLabyrinth: "generic",
  WarrensPalis: "generic",
  WarrensSpawningPool: "generic",
  WarrensTunnelJunction: "generic"
};

type SiteCard = { readonly key: string; readonly name: string; readonly districtKey?: string };

const siteLayoutFor = (site: SiteCard): SiteLayoutKey =>
  SITE_LAYOUT_EXCEPTIONS[site.key] ?? (site.districtKey ? "unique" : "generic");

/** The card prints a sub-location line only when the name has one ("Casa Loma: Great Hall"). */
const siteHasSub = (site: SiteCard): boolean => site.name.includes(": ");

const SAMPLE_SITES: readonly SiteCard[] = [
  { key: "CLGreatHall", name: "Casa Loma: Great Hall", districtKey: "DupontByTheCastle" },
  { key: "Drake", name: "The Drake Hotel", districtKey: "WestQueenWest" },
  { key: "AnarchBar", name: "Anarch Dive Bar" },
  { key: "WarrensLabyrinth", name: "The Nosferatu Warrens: Labyrinth", districtKey: "Sewers" },
  { key: "WealthyEstate3", name: "Wealthy Estate" }
];

const CardCrop = ({ art, rect, width }: { art: CardArt; rect: CardRect; width: number }): ReactElement => {
  const [x, y, w, h] = rect;
  const scale = width / w;
  return (
    <span className="lab-card-crop" style={{ width, height: Math.round(h * scale) }}>
      <img src={art.src} alt="" draggable={false} style={{ width: art.width * scale, left: -x * scale, top: -y * scale }} />
    </span>
  );
};

const SiteCrops = ({ site, width }: { site: SiteCard; width: number }): ReactElement => {
  const art: CardArt = { src: cardUrl(`Sites/${site.key}.webp`), width: 1952 };
  const layout = SITE_LAYOUTS[siteLayoutFor(site)];
  const scale = width / layout.name[2];
  const resonanceW = Math.round(layout.resonance[2] * scale * 1.15);
  return (
    <>
      <CardCrop art={art} rect={layout.name} width={width} />
      <div className="lab-where-row spread">
        {siteHasSub(site) && layout.sub && (
          <CardCrop art={art} rect={layout.sub} width={Math.min(Math.round(layout.sub[2] * scale * 1.15), width - resonanceW - 6)} />
        )}
        <span className="lab-where-site-side">
          <CardCrop art={art} rect={layout.resonance} width={resonanceW} />
        </span>
      </div>
      <CardCrop art={art} rect={layout.aspect} width={width} />
    </>
  );
};

/**
 * District name, resonances, and aspect titles (hover for the full rule), then the Site's name, resonance, and
 * rule. In the Lab, clicking the Site part cycles through sample sites of both card layouts.
 */
export const LocationCards = ({ width }: { width: number }): ReactElement => {
  const [siteIndex, setSiteIndex] = useState(0);
  const site = SAMPLE_SITES[siteIndex % SAMPLE_SITES.length] ?? SAMPLE_SITES[0];
  const resonanceScale = (width * 0.44) / DISTRICT.resonanceUp[2];
  return (
    <div className="lab-where">
      <CardCrop art={DISTRICT.art} rect={DISTRICT.name} width={width} />
      <div className="lab-where-row spread">
        <CardCrop art={DISTRICT.art} rect={DISTRICT.resonanceUp} width={Math.round(DISTRICT.resonanceUp[2] * resonanceScale)} />
        <CardCrop art={DISTRICT.art} rect={DISTRICT.resonanceDown} width={Math.round(DISTRICT.resonanceDown[2] * resonanceScale)} />
      </div>
      <div className="lab-where-aspects">
        {DISTRICT.aspects.map((aspect) => (
          <span key={aspect.title[0]} className="lab-where-aspect" tabIndex={0}>
            <CardCrop art={DISTRICT.art} rect={aspect.title} width={width} />
            <span className="lab-where-zoom">
              <CardCrop art={DISTRICT.art} rect={aspect.full} width={460} />
            </span>
          </span>
        ))}
      </div>
      {site && (
        <div className="lab-where-site" title="Lab: click to cycle sample sites" onClick={() => setSiteIndex(siteIndex + 1)}>
          <SiteCrops site={site} width={width} />
        </div>
      )}
    </div>
  );
};

/* ---------- NPC roster: masonry of closed groups ---------- */

type NpcGroup = { readonly key: string; readonly label: string; readonly members: readonly CatalogCharacter[] };

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

const CLUSTER_SIZE = 4;

/** Every NPC group as a closed cluster of overlapping tokens; click one to open it in place and pick a token. */
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
              {group.members.slice(0, CLUSTER_SIZE).map((npc) => (
                <Headshot key={npc.characterKey} className="lab-group-head" characterKey={npc.characterKey} />
              ))}
              {group.members.length > CLUSTER_SIZE && <span className="lab-group-more">+{group.members.length - CLUSTER_SIZE}</span>}
            </span>
            <span className="lab-group-label">{group.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------- Weather: stackable procedural layers ---------- */

type Level = 0 | 1 | 2 | 3;
type WeatherSample = { readonly label: string; readonly rain: Level; readonly wind: Level; readonly snow: Level; readonly thunder: boolean };

const WEATHER_SAMPLES: readonly WeatherSample[] = [
  { label: "Light rain · low wind", rain: 1, wind: 1, snow: 0, thunder: false },
  { label: "Clear · calm", rain: 0, wind: 0, snow: 0, thunder: false },
  { label: "Windy", rain: 0, wind: 3, snow: 0, thunder: false },
  { label: "Medium rain · moderate wind", rain: 2, wind: 2, snow: 0, thunder: false },
  { label: "Heavy rain · high wind", rain: 3, wind: 3, snow: 0, thunder: false },
  { label: "Light snow", rain: 0, wind: 1, snow: 1, thunder: false },
  { label: "Medium snow", rain: 0, wind: 1, snow: 2, thunder: false },
  { label: "Blizzard", rain: 0, wind: 3, snow: 3, thunder: false }
];

const STORM: WeatherSample = { label: "Thunderstorm", rain: 3, wind: 3, snow: 0, thunder: true };

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

/** One falling layer: a tiled pattern of streaks or flakes, slanted by the wind, sliding down one tile per loop. */
const Fall = ({ id, layer, kind, w, h, slant, seed }: { id: string; layer: FallLayer; kind: "rain" | "snow"; w: number; h: number; slant: number; seed: number }): ReactElement => {
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
          style={{ animationDuration: `${layer.seconds}s` }}
        />
      </g>
    </svg>
  );
};

/** Laundry on a line plus a flag: they lean and flap harder as the wind rises. */
const Wind = ({ level, w, h }: { level: Level; w: number; h: number }): ReactElement => {
  const lean = [0, 14, 30, 55][level];
  const seconds = [0, 2.4, 1.2, 0.55][level];
  const cloths = [0.14, 0.27, 0.4, 0.55].map((u, index) => ({ x: u * w, y: 22 + Math.sin(u * Math.PI) * 14, wide: index % 2 === 0 ? 16 : 11, tall: index % 2 === 0 ? 20 : 26 }));
  return (
    <svg className="lab-wx-layer lab-wx-wind" width={w} height={h} aria-hidden="true" style={{ "--lean": `${lean}deg`, "--flap": `${seconds}s` } as CSSProperties}>
      <path d={`M -10 20 Q ${w * 0.35} 44 ${w * 0.7} 18`} className="lab-wx-line" />
      {cloths.map((cloth, index) => (
        <rect key={index} className="lab-wx-cloth" x={cloth.x} y={cloth.y} width={cloth.wide} height={cloth.tall} rx={1.5} style={{ animationDelay: `${index * -0.27}s` }} />
      ))}
      <line x1={w - 34} y1={14} x2={w - 34} y2={h} className="lab-wx-pole" />
      <path className="lab-wx-flag" d={`M ${w - 33} 15 h 30 l -5 9 l 5 9 h -30 Z`} />
    </svg>
  );
};

export const WeatherBackdrop = ({ sample, w, h }: { sample: WeatherSample; w: number; h: number }): ReactElement => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const slant = WIND_SLANT[sample.wind];
  return (
    <div className="lab-wx" aria-hidden="true">
      {sample.wind > 0 && <Wind level={sample.wind} w={w} h={h} />}
      {RAIN_LAYERS[sample.rain].map((layer, index) => (
        <Fall key={`r${index}`} id={`${id}r${index}`} layer={layer} kind="rain" w={w} h={h} slant={slant} seed={11 + index} />
      ))}
      {SNOW_LAYERS[sample.snow].map((layer, index) => (
        <Fall key={`s${index}`} id={`${id}s${index}`} layer={layer} kind="snow" w={w} h={h} slant={slant * 0.6} seed={31 + index} />
      ))}
      {sample.thunder && <span className="lab-wx-flash" />}
    </div>
  );
};

/** Weather cell: the backdrop shows the conditions; the Lab cycles sample weather on click. */
export const WeatherPanel = ({ override, w, h }: { override: boolean; w: number; h: number }): ReactElement => {
  const [index, setIndex] = useState(0);
  const sample = override ? STORM : WEATHER_SAMPLES[index] ?? STORM;
  return (
    <div className={`lab-wx-panel${override ? " override" : ""}`} onClick={() => setIndex((index + 1) % WEATHER_SAMPLES.length)}>
      <WeatherBackdrop sample={sample} w={w} h={h} />
      <span className="lab-wx-label">{sample.label}</span>
      <span className="lab-wx-source">
        {override ? "Override until dawn (6:58 AM)" : "Following the schedule"}
        {override && <Btn tone="danger">Back to schedule</Btn>}
      </span>
      <span className="lab-wx-hint">{override ? "Thunder flash is a stand-in for your animated webp" : "Lab: click to cycle sample weather"}</span>
    </div>
  );
};

/* ---------- When: scene time over a night skyline ---------- */

const DUSK = 19 * 60 + 2;
const DAWN = 24 * 60 + 6 * 60 + 58;
const PRESENT_DAY = { date: new Date(2026, 9, 9), minutes: 23 * 60 + 40 };
const FLASHBACK = { date: new Date(2026, 8, 22), minutes: 20 * 60 + 15 };

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

/** Sky from dusk to dawn: the moon crosses, city windows go dark one by one, and the horizon warms before dawn. */
export const NightSky = ({ minutes, w, h }: { minutes: number; w: number; h: number }): ReactElement => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
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
  const moon = t === null ? null : { x: w * (0.06 + 0.88 * t), y: h * (0.78 - 0.5 * Math.sin(Math.PI * t)) };
  return (
    <svg className="lab-sky" width={w} height={h} aria-hidden="true">
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
    </svg>
  );
};

const formatTime = (minutes: number): string => {
  const ofDay = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(ofDay / 60);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(ofDay % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

const formatDate = (base: Date, minutes: number): string => {
  const date = new Date(base);
  date.setDate(date.getDate() + Math.floor(minutes / 1440));
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const formatSpan = (minutes: number): string => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

const JUMPS: readonly (readonly [label: string, minutes: number])[] = [
  ["10m", 10], ["20m", 20], ["30m", 30], ["1h", 60], ["2h", 120], ["4h", 240], ["1d", 1440], ["3d", 4320], ["1w", 10080]
];

/** When cell plus its clock pop-up; the jump buttons really move scene time so the sky can be previewed. */
export const WhenPanel = ({ differs, forceOpen, w, h }: { differs: boolean; forceOpen: boolean; w: number; h: number }): ReactElement => {
  const scene = differs ? FLASHBACK : PRESENT_DAY;
  const [minutes, setMinutes] = useState(scene.minutes);
  const [open, setOpen] = useState(false);
  useEffect(() => setMinutes(scene.minutes), [scene.minutes]);
  const same = !differs && minutes === PRESENT_DAY.minutes;
  const ofDay = ((minutes % 1440) + 1440) % 1440;
  const untilDawn = (ofDay >= 12 * 60 ? DAWN : DAWN - 1440) - ofDay;
  const night = nightFraction(minutes) !== null;
  return (
    <>
      <div className="lab-when" onClick={() => setOpen(true)}>
        <NightSky minutes={minutes} w={w} h={h} />
        <span className="lab-when-present">Present day · {formatDate(PRESENT_DAY.date, PRESENT_DAY.minutes)} · {formatTime(PRESENT_DAY.minutes)}</span>
        <span className="lab-when-time">{formatTime(minutes)}</span>
        <span className="lab-when-date">
          {same ? "Scene time is present day" : `${formatDate(scene.date, minutes)}${differs ? " · flashback" : ""}`}
        </span>
        <span className="lab-when-dawn">
          <Chip tone={night ? "warn" : "accent"}>{night ? `Dawn in ${formatSpan(untilDawn)}` : "Daylight"}</Chip>
        </span>
      </div>
      {(open || forceOpen) && (
        <Overlay onClose={() => setOpen(false)}>
          <div className="lab-modal lab-clock-modal">
            <span className="lab-modal-title">Scene clock · {formatTime(minutes)}</span>
            <span className="lab-note">Click to jump forward, right-click to jump back.</span>
            <div className="lab-row">
              {JUMPS.map(([label, step]) => (
                <button
                  key={label}
                  type="button"
                  className="lab-btn"
                  onClick={() => setMinutes(minutes + step)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setMinutes(minutes - step);
                  }}
                >
                  ±{label}
                </button>
              ))}
              <button type="button" className="lab-btn" onClick={() => setMinutes(minutes + (untilDawn > 0 ? untilDawn - 15 : 0))}>15m before dawn</button>
              <button type="button" className="lab-btn" onClick={() => setMinutes(DUSK + 1440 * Math.floor(minutes / 1440))}>Dusk</button>
            </div>
            <div className="lab-row">
              <Btn>Type scene date / time…</Btn>
              <button type="button" className="lab-btn" onClick={() => setMinutes(PRESENT_DAY.minutes)}>Set scene time to present day</button>
              <Btn>Set present day to scene time</Btn>
              <Btn>Real-time: off</Btn>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
};

/* ---------- Sound: one row per channel ---------- */

const Slider = ({ value, disabled = false }: { value: number; disabled?: boolean }): ReactElement => (
  <input type="range" className="lab-slider" min={0} max={100} defaultValue={value} disabled={disabled} />
);

/** Music and Featured share a row because only one of them plays at a time. */
export const SoundMixer = ({ indoors }: { indoors: boolean }): ReactElement => {
  const [featured, setFeatured] = useState(false);
  const rainPlaying = true;
  const thunderPlaying = false;
  return (
    <div className="lab-mixer">
      <div className="lab-mixer-row">
        <span className="lab-mixer-label">Music</span>
        <span className={`lab-mixer-group${featured ? " idle" : ""}`}>
          <select className="lab-select" defaultValue="default">
            <option value="default">(default)</option>
            <option>Main</option>
            <option>Combat</option>
            <option>Intrigue</option>
          </select>
          <Slider value={70} />
        </span>
        <span className={`lab-mixer-group${featured ? "" : " idle"}`}>
          <button type="button" className={`lab-btn${featured ? " primary" : ""}`} onClick={() => setFeatured(!featured)}>
            {featured ? "★ TR Loop" : "Featured…"}
          </button>
          <Slider value={80} />
        </span>
      </div>
      <div className={`lab-mixer-row${indoors ? " muted" : ""}`} title={indoors ? "Indoors: weather sounds are not playing" : undefined}>
        <span className="lab-mixer-label">Weather</span>
        <span className={`lab-mixer-group${rainPlaying && !indoors ? "" : " idle"}`}>Rain <Slider value={60} disabled={indoors || !rainPlaying} /></span>
        <span className={`lab-mixer-group${indoors ? " idle" : ""}`}>Wind <Slider value={40} disabled={indoors} /></span>
        <span className={`lab-mixer-group${thunderPlaying && !indoors ? "" : " idle"}`}>Thunder <Slider value={75} disabled={indoors || !thunderPlaying} /></span>
      </div>
      <div className="lab-mixer-row">
        <span className="lab-mixer-label">Location</span>
        <span className="lab-mixer-group">
          <span className="lab-mixer-track">Soft indoor</span>
          <Slider value={55} />
        </span>
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
      {live ? <p className="lab-queue-hint">Every change goes straight to TTS.</p> : (
        <ol className="lab-queue-list">
          <li>Light Victor (Mid Center)</li>
          <li>Black Caesar: present → absent</li>
          <li>Weather: rain → heavy</li>
        </ol>
      )}
      <p className="lab-queue-hint">Play Scene, End Scene, table / location changes, clock jumps, Clear Stage and rolls skip the queue.</p>
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
