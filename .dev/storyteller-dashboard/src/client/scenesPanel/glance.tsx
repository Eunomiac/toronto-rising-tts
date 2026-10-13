import { useContext, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type InputHTMLAttributes, type MouseEvent, type PointerEvent, type ReactElement, type ReactNode } from "react";
import { Headshot } from "../headshots/Headshot";
import {
  useChronicleLocations,
  useWeatherCalendar,
  type ChronicleLocations,
  type Resonance,
  type SheetDistrict,
  type SheetSite,
  type WeatherCalendar
} from "./chronicleSheets";
import { SEAT_ACCENT } from "../pcSheet/layout";
import { DISTRICT_MAP_HEIGHT, DISTRICT_MAP_SRC, DISTRICT_MAP_WIDTH, districtPin } from "./districtMap";
import { Icon, type IconName } from "./icons";
import { groupColor, groupLeader, setRosterLayout, useRosterLayout, useSceneCatalogs, type RosterCategory } from "./roster";
import { SceneNotes } from "./sceneNotes";
import {
  INTENSITIES,
  eligibleFlavors,
  flavorOdds,
  intensityOdds,
  netModifiers,
  sample,
  type Flavor,
  type HuntOutcome,
  type Intensity
} from "./huntOdds";
import { MemoriamModal } from "./memoriamModal";
import { Btn, Overlay, activeCanvas, canvasPoint } from "./sketch";
import { createPortal } from "react-dom";
import { figurineUrl } from "../headshots/headshots";
import { GenericTiersContext, PendingGenericsContext, SceneGenericsContext, useScenesCommand, type SceneClock, type SoundLane } from "./commands";
import { fromDate, precipOf, rainKey, toDate, windLevel, type SoundView, type SpotlightView } from "./liveScene";
import {
  AMBIENT_TRACKS,
  FEATURED_TRACKS,
  LOCATION_MUSIC,
  MUSIC_MOODS,
  playlistLabel,
  WEATHER_CODES,
  type MusicMood
} from "../catalogVocab";
import { START_OFFSETS, defaultPace, offsetLabel, sceneTimeOf } from "./sceneClock";
import type { LibraryScene, SceneStatus } from "../../shared/sceneLibrary";
import { displayTitle, entryPlan, libraryRank, type DeckScene } from "./sceneStatus";
import { sceneDeckSnapshot } from "../sceneDeck";
import { sceneLibrarySnapshot } from "../sceneLibrary";
import { GROUP_DRAG_TYPE, NPC_DRAG_TYPE } from "./stage";
import { useWorldState } from "../worldState";
import { useNpcOverrides } from "../npcOverrides";
import { configuredTiers, genericStatsKey, type NpcTier } from "../../shared/npcStats";
import { useNpcStats } from "../npcStats";
import { NpcConfigModal, type NpcConfigTarget } from "./npcConfig";
import { TierBadge } from "./tierBadge";
import { TierPicker } from "./tierPicker";

type NpcOverrides = ReturnType<typeof useNpcOverrides>;

/** Token ring colour for an NPC with no coloured group (DEFAULT_RING_COLOR in scripts/npc-art/model.ts). */
const DEFAULT_TOKEN_RING = "#77706a";
import { usePersistentState } from "../persistentState";
import { startRosterDrag } from "./rosterDrag";
import { carryOverSeating, type SeatingEdit } from "./transitionSeating";
import { TransitionSeatingModal, type SeatingAsk } from "./transitionStrip";

/**
 * The Scenes tab's panels (the table, and a scene draft's preview): location and weather read live from the
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

/** Keeps the widest spoke (radius 112 plus half its width) inside the canvas. */
const RING_EDGE = 180;

/** `accent` rings the spoke in that colour (a PC's seat colour). */
type RingOption<T> = { readonly value: T; readonly label: string; readonly accent?: string };
type Point = { readonly x: number; readonly y: number };

/** Choices spread evenly around the click point; the current choice is highlighted. Clicking off closes it. */
const RingMenu = <T,>({ at, options, current, onPick, onClose }: {
  at: Point;
  options: readonly RingOption<T>[];
  current: T;
  onPick: (value: T) => void;
  onClose: () => void;
}): ReactElement => {
  const [rx, ry] = [112, 64];
  return (
    <Overlay onClose={onClose}>
      <div className="lab-ring" style={{ left: Math.min(Math.max(at.x, RING_EDGE), 1920 - RING_EDGE), top: Math.max(at.y, ry + 22) }}>
        {options.map((option, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / options.length;
          return (
            <button
              key={String(option.value)}
              type="button"
              className={`lab-ring-item spoke${option.value === current ? " current" : ""}${option.accent ? " accented" : ""}`}
              style={{ left: Math.cos(angle) * rx, top: Math.sin(angle) * ry, "--i": index, "--accent": option.accent } as CSSProperties}
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
};

/**
 * A scene switch waiting for its clock choice: where the menu opens, which scene, what to run once picked, and
 * whether to offer the scene's own time (only when it was given one: `entryPlan`).
 */
export type SceneTiming = { readonly at: Point; readonly key: string; readonly showScene: boolean; readonly go: (clock: SceneClock) => void };

const TIMING_W = 420;
const TIMING_H = 318;

type TimingTarget = { readonly from: SceneClock["from"]; readonly plus: number };

/** A preview being edited first, then the library row. */
const sceneRowFor = (key: string): LibraryScene | undefined =>
  sceneDeckSnapshot().previews.find((row) => row.key === key) ?? sceneLibrarySnapshot().scenes.find((row) => row.key === key);

const TimingStrip = ({ from, disabled, target, onHover, onPick }: {
  from: SceneClock["from"];
  disabled: boolean;
  target: TimingTarget;
  onHover: (next: TimingTarget | null) => void;
  onPick: (next: TimingTarget) => void;
}): ReactElement => (
  <div className="lab-timing-strip" onPointerLeave={() => onHover(null)}>
    {START_OFFSETS.map((plus, index) => (
      <button
        key={plus}
        type="button"
        className={`lab-timing-cell${target.from === from && target.plus === plus ? " on" : ""}`}
        style={{ "--heat": index / (START_OFFSETS.length - 1) } as CSSProperties}
        disabled={disabled}
        aria-label={`${from === "scene" ? "Scene time" : "Now"}${plus > 0 ? ` ${offsetLabel(plus)}` : ""}`}
        onPointerEnter={() => onHover({ from, plus })}
        onClick={() => onPick({ from, plus })}
      />
    ))}
  </div>
);

/** Plays the scene once its seating and clock are chosen; `edit` is the seating strip's, when it changed anything. */
export type SceneGo = (clock: SceneClock, edit?: SeatingEdit) => void;

export type PlayScene = (key: string, clock: SceneClock, edit?: SeatingEdit) => void;

/**
 * Switching to a scene. Unless it is already on the table, the seating strip comes first (`TransitionSeatingModal`).
 * Then an ongoing scene goes straight back to its own time; a new scene (or a template's copy) opens the timing
 * menu. `modal` is whichever of the two is open, to render.
 */
export const useSceneEntry = (): { enter: (key: string, at: Point, go: SceneGo) => void; modal: ReactElement | null } => {
  const { clock, scene, seats } = useWorldState();
  const [seating, setSeating] = useState<SeatingAsk | null>(null);
  const [timing, setTiming] = useState<SceneTiming | null>(null);
  const time = (key: string, at: Point, go: SceneGo, edit: SeatingEdit | undefined): void => {
    // A draft's status is stale once TTS has moved the saved scene on (ongoing, ended).
    const row = sceneRowFor(key);
    const saved = sceneLibrarySnapshot().scenes.find((entry) => entry.key === key);
    const plan = entryPlan(row && saved ? { ...row, status: saved.status } : row, clock?.presentDay ? toDate(clock.presentDay) : undefined);
    if (plan.kind === "switch") {
      go(plan.clock, edit);
    } else {
      setTiming({ at, key, showScene: plan.showScene, go: (picked) => go(picked, edit) });
    }
  };
  return {
    enter: (key, at, go) => {
      const destination = sceneRowFor(key);
      if (destination && seats && scene?.liveKey !== key) {
        const carried = scene?.liveKey !== undefined;
        const start = carried ? carryOverSeating(destination, seats.seats) : { row: destination, orphans: [] };
        setSeating({ destination, start, carried, then: (edit) => time(key, at, go, edit) });
      } else {
        time(key, at, go, undefined);
      }
    },
    modal: seating
      ? <TransitionSeatingModal ask={seating} onClose={() => setSeating(null)} />
      : timing
        ? <SceneTimingRing timing={timing} onClose={() => setTiming(null)} />
        : null
  };
};

/**
 * A new scene asks when it starts. The bottom row is present day ("Now"); the top row, the scene's own time, only
 * shows when the scene was given one. The coloured strip under each starts that many minutes later (hovering
 * previews the time), and "Now" plus minutes moves present day on (travel time). Real time then runs at ×2, or at
 * ×5 until it reaches present day: ×5 is chosen for a start earlier on present day's night, ×2 otherwise, and
 * either can be clicked.
 */
const SceneTimingRing = ({ timing, onClose }: { timing: SceneTiming; onClose: () => void }): ReactElement => {
  const { clock } = useWorldState();
  const present = clock?.presentDay ? toDate(clock.presentDay) : undefined;
  const [sceneAt] = useState(() => {
    const own = timing.showScene ? sceneTimeOf(sceneRowFor(timing.key)) : undefined;
    return own ? toDate(own) : undefined;
  });
  const [hover, setHover] = useState<TimingTarget | null>(null);
  const [chosenPace, setChosenPace] = useState<SceneClock["pace"] | null>(null);
  const target: TimingTarget = hover ?? { from: sceneAt ? "scene" : "present", plus: 0 };
  const base = target.from === "scene" ? sceneAt : present;
  const start = base ? shift(base, target.plus) : undefined;
  const canCatchUp = target.from === "scene" && start !== undefined && present !== undefined && start < present;
  const pace = canCatchUp ? chosenPace ?? defaultPace(start, present) : "x2";
  const pick = (next: TimingTarget): void => {
    const nextBase = next.from === "scene" ? sceneAt : present;
    const nextStart = nextBase ? shift(nextBase, next.plus) : undefined;
    const catchUp = next.from === "scene" && nextStart !== undefined && present !== undefined && nextStart < present;
    timing.go({ from: next.from, plusMinutes: next.plus, pace: catchUp ? chosenPace ?? defaultPace(nextStart, present) : "x2" });
    onClose();
  };
  const sceneShown = target.from === "scene" ? start : sceneAt;
  const nowShown = target.from === "present" ? start : present;
  const nowMovesTo = target.from === "scene" && start && present && start > present ? start : undefined;
  return (
    <Overlay onClose={onClose}>
      <div
        className="lab-timing"
        style={{ left: Math.min(Math.max(timing.at.x - TIMING_W / 2, 8), 1920 - TIMING_W - 8), top: Math.min(Math.max(timing.at.y - TIMING_H / 2, 8), 1042 - TIMING_H - 8), width: TIMING_W }}
      >
        {sceneAt && (
          <div className={`lab-timing-block${target.from === "scene" ? " active" : ""}`}>
            <span className="lab-timing-label">
              Scene time
              {target.from === "scene" && target.plus > 0 && <span className="lab-timing-plus">{offsetLabel(target.plus)}</span>}
            </span>
            {sceneShown && (
              <>
                <span className="lab-timing-time">{formatTime(sceneShown)}</span>
                <span className="lab-timing-date">{formatDate(sceneShown)}</span>
              </>
            )}
            <TimingStrip from="scene" disabled={false} target={target} onHover={setHover} onPick={pick} />
          </div>
        )}
        <div className={`lab-timing-block${target.from === "present" ? " active" : ""}`}>
          <span className="lab-timing-label">
            Now
            {target.from === "present" && target.plus > 0 && <span className="lab-timing-plus">{offsetLabel(target.plus)}</span>}
            {nowMovesTo && <span className="lab-timing-moves">moves to {formatTime(nowMovesTo)}</span>}
          </span>
          {nowShown ? (
            <>
              <span className="lab-timing-time">{formatTime(nowShown)}</span>
              <span className="lab-timing-date">{formatDate(nowShown)}</span>
            </>
          ) : (
            <span className="lab-timing-none">TTS has no present day yet.</span>
          )}
          <TimingStrip from="present" disabled={!present} target={target} onHover={setHover} onPick={pick} />
        </div>
        <div className="lab-timing-pace">
          <span className="lab-timing-label">Real time</span>
          <button type="button" className={`lab-timing-pace-btn${pace === "x2" ? " on" : ""}`} onClick={() => setChosenPace("x2")}>×2</button>
          <button
            type="button"
            className={`lab-timing-pace-btn${pace === "x5" ? " on" : ""}`}
            disabled={!canCatchUp}
            title={canCatchUp ? "Run at ×5 until the scene reaches Now, then ×2" : "Only for a start earlier than Now"}
            onClick={() => setChosenPace("x5")}
          >
            ×5 to Now
          </button>
        </div>
      </div>
    </Overlay>
  );
};

/* ---------- Where: District and Site names over their card art; aspects in their own row ---------- */

export type LabLocation = { readonly districtKey: string; readonly siteKey: string };

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

/**
 * Two steps: click a District on the Toronto map, then pick a Site from a grid — that District's unique sites
 * first, then the generic sites. Unique sites belonging to other Districts are left out. Picking a Site is the
 * confirmation.
 */
const LocationPicker = ({ data, location, onPick, onClose, heading = "Change location" }: {
  data: ChronicleLocations;
  /** The current location, marked on the map and in the grid; none for a scene with no place yet. */
  location: LabLocation | undefined;
  onPick: (next: LabLocation) => void;
  onClose: () => void;
  heading?: string;
}): ReactElement => {
  const { catalogs, error } = useSceneCatalogs();
  const [districtKey, setDistrictKey] = useState<string | null>(null);
  const unpinned = data.districts.filter((district) => !districtPin(district.key));
  if (districtKey === null) {
    return (
      <Overlay onClose={onClose}>
        <div className="lab-district-map" style={{ width: DISTRICT_MAP_WIDTH, height: DISTRICT_MAP_HEIGHT }}>
          <img src={DISTRICT_MAP_SRC} alt="Map of Toronto" width={DISTRICT_MAP_WIDTH} height={DISTRICT_MAP_HEIGHT} draggable={false} />
          {data.districts.map((district) => {
            const pin = districtPin(district.key);
            return (
              pin && (
                <button
                  key={district.key}
                  type="button"
                  className={`lab-district-pin${district.key === location?.districtKey ? " active" : ""}`}
                  style={{ left: pin.left, top: pin.top }}
                  onClick={() => setDistrictKey(district.key)}
                >
                  {district.name}
                </button>
              )
            );
          })}
          <div className="lab-district-map-caption">
            <span className="lab-modal-title">{heading}</span>
            <span className="lab-note">Click a District</span>
            {unpinned.length > 0 && <span className="lab-note">Not on the map: {unpinned.map((district) => district.name).join(", ")}</span>}
            <button type="button" className="lab-btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </Overlay>
    );
  }
  const district = data.districts.find((entry) => entry.key === districtKey);
  const homeOf = new Map((catalogs?.sites ?? []).map((site) => [site.key, site.districtKey]));
  const unique = data.sites.filter((site) => site.unique && homeOf.get(site.key) === districtKey);
  const generic = data.sites.filter((site) => !site.unique);
  const labelOf = (site: SheetSite): string => (site.subtitle ? `${site.title}|${site.subtitle}` : site.title);
  const variants = new Map<string, readonly SheetSite[]>();
  for (const site of generic) {
    variants.set(labelOf(site), [...(variants.get(labelOf(site)) ?? []), site]);
  }
  const siteButton = (site: SheetSite): ReactElement => {
    const twins = variants.get(labelOf(site)) ?? [];
    return (
      <button
        key={site.key}
        type="button"
        className={`lab-site-pick${site.unique ? " unique" : ""}${districtKey === location?.districtKey && site.key === location.siteKey ? " selected" : ""}`}
        title={site.key}
        onClick={() => onPick({ districtKey, siteKey: site.key })}
      >
        {site.title}
        {(site.subtitle || twins.length > 1) && (
          <span className="lab-site-pick-sub">
            {[site.subtitle, twins.length > 1 ? `variant ${twins.indexOf(site) + 1}` : ""].filter(Boolean).join(" · ")}
          </span>
        )}
      </button>
    );
  };
  return (
    <Overlay onClose={onClose}>
      <div className="lab-modal lab-site-modal">
        <div className="lab-row">
          <button type="button" className="lab-btn" onClick={() => setDistrictKey(null)}>◂ Map</button>
          <span className="lab-modal-title">{district?.name ?? districtKey} — choose a Site</span>
        </div>
        {error && <p className="lab-note">{error}</p>}
        {!catalogs && !error && <p className="lab-note">Loading which unique sites belong to this District…</p>}
        {unique.length > 0 && (
          <>
            <span className="lab-site-heading">Unique to {district?.name ?? districtKey}</span>
            <div className="lab-site-grid">{unique.map(siteButton)}</div>
          </>
        )}
        <span className="lab-site-heading">Generic sites</span>
        <div className="lab-site-grid">{generic.map(siteButton)}</div>
        <div className="lab-row">
          <button type="button" className="lab-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Overlay>
  );
};

/**
 * District and Site names with their resonances over the Site card's illustration; click to change either
 * (an override of the scene's location).
 */
export const LocationPanel = ({ location, overridden, onChange, onRelease, readOnly = false, fog }: {
  location: LabLocation;
  overridden: boolean;
  onChange: (next: LabLocation) => void;
  onRelease: () => void;
  readOnly?: boolean;
  /** The top-fog switch in the panel's corner. */
  fog?: { readonly on: boolean; readonly onToggle: () => void };
}): ReactElement => {
  const { data, error } = useChronicleLocations();
  const { catalogs } = useSceneCatalogs();
  const [picking, setPicking] = useState(false);
  if (error || !data) {
    return <p className="lab-note lab-where-wait">{error ?? "Reading locations from the chronicle sheet…"}</p>;
  }
  const found = resolveLocation(data, location);
  if (typeof found === "string") {
    return <p className="lab-note lab-where-wait">{found}</p>;
  }
  const { district, site } = found;
  const card = catalogs?.sites.find((entry) => entry.key === site.key)?.cardUrl;
  return (
    <div
      className={`lab-where${overridden ? " lab-overridden" : ""}`}
      title={readOnly ? undefined : "Click to change the District or Site"}
      style={card ? { backgroundImage: `url("${card}")` } : undefined}
      onClick={() => setPicking(!readOnly)}
    >
      <div className="lab-where-band">
        <span className="lab-where-name district">{district.name}</span>
        <ResonanceTags list={district.resonances} />
      </div>
      <div className="lab-where-band">
        <span className="lab-where-name">
          {site.title}
          {site.subtitle && <span className="lab-where-sub">{site.subtitle}</span>}
        </span>
        <ResonanceTags list={site.resonances} />
      </div>
      {fog && (
        <button
          type="button"
          className={`lab-where-fog${fog.on ? " on" : ""}`}
          title={fog.on ? "Top fog is on — click to clear it" : "Top fog is off — click to roll it in"}
          onClick={(event) => {
            event.stopPropagation();
            fog.onToggle();
          }}
        >
          ≋ Fog
        </button>
      )}
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

/**
 * The scene's conditions: those the District and Site carry are fixed; the Storyteller picks the rest in a grid
 * opened from the header (Apply sends the whole set, Cancel drops the edit).
 */
export const ConditionsPanel = ({ location, conditions: ids, onChange }: {
  location: LabLocation;
  conditions: readonly string[];
  onChange: (ids: readonly string[]) => void;
}): ReactElement => {
  const { catalogs } = useSceneCatalogs();
  const [draft, setDraft] = useState<readonly string[] | null>(null);
  const nameOf = (id: string): string => catalogs?.conditions.find((condition) => condition.id === id)?.displayName ?? id;
  const hosted = [
    ...(catalogs?.districts.find((district) => district.key === location.districtKey)?.conditions ?? []),
    ...(catalogs?.sites.find((site) => site.key === location.siteKey)?.conditions ?? [])
  ];
  return (
    <div className="lab-conditions">
      <button type="button" className="lab-conditions-head" title="Pick the scene's conditions" onClick={() => setDraft(ids)}>Conditions</button>
      {hosted.map((id) => (
        <span key={`hosted:${id}`} className="lab-condition hosted" title="Carried by the District or Site">{nameOf(id)}</span>
      ))}
      {ids.map((id) => <span key={id} className="lab-condition">{nameOf(id)}</span>)}
      {draft && (
        <Overlay onClose={() => setDraft(null)}>
          <div className="lab-modal lab-conditions-modal">
            <span className="lab-modal-title">Scene conditions</span>
            <div className="lab-conditions-grid">
              {(catalogs?.conditions ?? []).map((condition) => {
                const fixed = hosted.includes(condition.id);
                const on = fixed || draft.includes(condition.id);
                return (
                  <button
                    key={condition.id}
                    type="button"
                    className={`lab-condition-pick${on ? " on" : ""}${fixed ? " hosted" : ""}`}
                    disabled={fixed}
                    title={fixed ? "Carried by the District or Site" : undefined}
                    onClick={() => setDraft(on ? draft.filter((id) => id !== condition.id) : [...draft, condition.id])}
                  >
                    {condition.displayName}
                  </button>
                );
              })}
            </div>
            <div className="lab-modal-actions">
              <button type="button" className="lab-btn" onClick={() => setDraft(null)}>Cancel</button>
              <button
                type="button"
                className="lab-btn primary"
                onClick={() => {
                  onChange(draft);
                  setDraft(null);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </Overlay>
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

type RosterMember = { readonly characterKey: string; readonly name: string };

type NpcGroup = {
  readonly key: string;
  readonly label: string;
  readonly labelWidth: number;
  readonly members: readonly RosterMember[];
};

const GROUP_LABEL_FONT = "700 11px";
const GROUP_LABEL_LINES = 3;
let labelMeasure: CanvasRenderingContext2D | null = null;

/** Narrowest width that word-wraps a group name onto at most three lines (greedy wrapping, as the browser does). */
const groupLabelWidth = (text: string): number => {
  if (!labelMeasure) {
    labelMeasure = document.createElement("canvas").getContext("2d");
    if (!labelMeasure) {
      throw new Error("MasonryRoster: no 2D canvas context to measure group names");
    }
    labelMeasure.font = `${GROUP_LABEL_FONT} ${getComputedStyle(document.body).fontFamily}`;
  }
  const measure = labelMeasure;
  const space = measure.measureText(" ").width;
  const words = text.split(/\s+/).map((word) => measure.measureText(word).width);
  const linesAt = (limit: number): number => {
    let lines = 1;
    let line = 0;
    for (const word of words) {
      if (line > 0 && line + space + word > limit) {
        lines += 1;
        line = word;
      } else {
        line = line > 0 ? line + space + word : word;
      }
    }
    return lines;
  };
  let low = Math.max(...words);
  let high = words.reduce((sum, word) => sum + word, 0) + space * (words.length - 1);
  while (high - low > 0.5) {
    const mid = (low + high) / 2;
    if (linesAt(mid) <= GROUP_LABEL_LINES) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return Math.ceil(high) + 2;
};

/** Token right-click: opens the NPC's configuration window. */
type ConfigureToken = (characterKey: string, event: MouseEvent<HTMLElement>) => void;

const tokenColorStyle = (color: string | undefined): CSSProperties | undefined =>
  color ? ({ "--group": color } as CSSProperties) : undefined;

/** One roster NPC, draggable onto the stage; right-click configures it. */
const RosterToken = ({ characterKey, name, className, color, tier, onConfigure }: {
  characterKey: string;
  name: string;
  className: string;
  color?: string | undefined;
  tier?: NpcTier | undefined;
  onConfigure: ConfigureToken;
}): ReactElement => (
  <span
    className="lab-group-token"
    title={`${name}: drag onto the stage; right-click for its settings`}
    style={tokenColorStyle(color)}
    draggable
    onContextMenu={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onConfigure(characterKey, event);
    }}
    onDragStart={(event) => {
      event.stopPropagation();
      event.dataTransfer.setData(NPC_DRAG_TYPE, characterKey);
      event.dataTransfer.effectAllowed = "move";
      startRosterDrag(event, [{ characterKey, name }]);
    }}
  >
    <Headshot className={className} characterKey={characterKey} />
    {tier && <TierBadge tier={tier} where="bin" />}
    <span className="lab-group-name">{name}</span>
  </span>
);

type GenericEntry = { readonly key: string; readonly label: string; readonly tags: string };

let genericCatalog: Promise<readonly GenericEntry[]> | null = null;

const loadGenericCatalog = (): Promise<readonly GenericEntry[]> => {
  genericCatalog ??= fetch("/api/generic-npcs").then(async (response) => {
    const body = await response.json() as { npcs?: readonly GenericEntry[]; error?: string };
    if (!response.ok || !body.npcs) {
      throw new Error(body.error ?? `The generic NPC catalog failed to load (${response.status}).`);
    }
    return body.npcs;
  });
  genericCatalog.catch(() => {
    genericCatalog = null;
  });
  return genericCatalog;
};

const GENERIC_MATCH_LIMIT = 60;

/**
 * Generic catalog figurines grouped by their catalog name, like coteries; spawned ones are left out. A renamed
 * figurine stays in its catalog group and is added under its new name.
 */
const genericGroups = (catalog: readonly GenericEntry[], spawned: ReadonlySet<string>, overrides: NpcOverrides): readonly NpcGroup[] => {
  const byLabel = new Map<string, RosterMember[]>();
  for (const npc of catalog) {
    if (!spawned.has(npc.key)) {
      const member = { characterKey: npc.key, name: overrides[npc.key]?.name ?? npc.label };
      byLabel.set(npc.label, [...(byLabel.get(npc.label) ?? []), member]);
    }
  }
  return [...byLabel]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, members]) => ({ key: `generic:${label}`, label, labelWidth: groupLabelWidth(label), members }));
};

const PREVIEW_HEIGHT = 520;

/** A generic's whole figurine, floating just right of the roster level with the hovered token. */
const FigurinePreview = ({ characterKey, token, panel }: { characterKey: string; token: HTMLElement; panel: HTMLElement }): ReactElement | null => {
  const canvas = activeCanvas();
  if (!canvas) {
    return null;
  }
  const origin = canvas.getBoundingClientRect();
  const tokenRect = token.getBoundingClientRect();
  const left = panel.getBoundingClientRect().right - origin.left + 14;
  const top = Math.min(Math.max(tokenRect.top - origin.top - PREVIEW_HEIGHT / 3, 8), canvas.offsetHeight - PREVIEW_HEIGHT - 8);
  return createPortal(
    <img className="lab-figurine-preview" src={figurineUrl(characterKey)} alt="" style={{ left, top, height: PREVIEW_HEIGHT }} />,
    canvas
  );
};

/**
 * One catalog generic: a click queues it onto the stage (spawned on Send, named after its catalog entry until
 * renamed from its stage token's right-click ring), asking for a stat tier first when its type has several;
 * hovering previews the whole figurine.
 */
const GenericToken = ({ member, className, color, onPick, onPreview, onConfigure }: {
  member: RosterMember;
  className: string;
  color?: string | undefined;
  onPick?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
  onPreview: (characterKey: string | null, element?: HTMLElement) => void;
  onConfigure: ConfigureToken;
}): ReactElement => (
  <button
    type="button"
    className={`lab-group-token${onPick ? "" : " inert"}`}
    title={onPick ? `Put a ${member.name} on the stage (spawned when you Send); right-click for its settings` : "Adding spawns figurines in TTS, so it only works in the Scenes tab."}
    aria-disabled={!onPick}
    style={tokenColorStyle(color)}
    onClick={onPick}
    onContextMenu={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onPreview(null);
      onConfigure(member.characterKey, event);
    }}
    onMouseEnter={(event) => onPreview(member.characterKey, event.currentTarget)}
    onMouseLeave={() => onPreview(null)}
  >
    <Headshot className={className} characterKey={member.characterKey} />
  </button>
);

const NEW_CATEGORY_COLOR = "#9c7bd6";
const UNSORTED_GROUP_COLOR = "#7a7a86";

const GROUP_EDITOR_WIDTH = 270;

/**
 * A group's colour and leader. The colour starts from the category's until the group is given its own (↺ goes
 * back); the leader defaults to the chronicle sheet's boss and can be anyone in the group, or nobody. Generic
 * groups have no leader (no `onLeader`).
 */
const GroupEditor = ({ group, at, color, own, leader, onColor, onLeader, onClose }: {
  group: NpcGroup;
  at: Point;
  color: string;
  own: boolean;
  leader: string | undefined;
  onColor: (next: string | null) => void;
  onLeader?: (characterKey: string) => void;
  onClose: () => void;
}): ReactElement => (
  <Overlay onClose={onClose}>
    <div className="lab-modal lab-group-edit" style={{ left: Math.min(at.x, 1920 - GROUP_EDITOR_WIDTH - 8), top: at.y }}>
      <span className="lab-modal-title">{group.label}</span>
      <label className="lab-group-edit-row">
        <span>Colour</span>
        <input type="color" className="lab-cat-color" value={color} onChange={(event) => onColor(event.target.value)} />
        {own && (
          <button type="button" className="lab-btn" title="Back to the category colour" onClick={() => onColor(null)}>
            ↺ Category colour
          </button>
        )}
      </label>
      {onLeader && (
        <label className="lab-group-edit-row">
          <span>Leader</span>
          <select className="lab-select" value={leader ?? ""} onChange={(event) => onLeader(event.target.value)}>
            <option value="">No leader</option>
            {group.members.map((npc) => <option key={npc.characterKey} value={npc.characterKey}>{npc.name}</option>)}
          </select>
        </label>
      )}
    </div>
  </Overlay>
);

/**
 * Category header: twirl to show or hide its groups; drop a group on it to file the group there; right-click the
 * name to rename it (Enter or leaving the field keeps the new name, Escape cancels).
 */
const CategoryHeader = ({ category, count, onToggle, onDrop, onRemove, onRename }: {
  category: RosterCategory | null;
  count: number;
  onToggle?: () => void;
  onDrop: (groupKey: string) => void;
  onRemove?: () => void;
  onRename?: (name: string) => void;
}): ReactElement => {
  const [over, setOver] = useState(false);
  const [renaming, setRenaming] = useState(false);
  return (
    <div
      className={`lab-cat-head${over ? " drop" : ""}${category ? "" : " unsorted"}`}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(GROUP_DRAG_TYPE)) {
          event.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        const key = event.dataTransfer.getData(GROUP_DRAG_TYPE);
        if (key) {
          onDrop(key);
        }
      }}
    >
      {onToggle && (
        <button type="button" className="lab-cat-twirl" title={category?.open ? "Hide groups" : "Show groups"} onClick={onToggle}>
          {category?.open ? "▾" : "▸"}
        </button>
      )}
      {renaming && category && onRename ? (
        <input
          autoFocus
          className="lab-cat-name lab-cat-rename"
          defaultValue={category.name}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={(event) => {
            const name = event.currentTarget.value.trim();
            if (name !== "" && name !== category.name) {
              onRename(name);
            }
            setRenaming(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              event.currentTarget.value = category.name;
              event.currentTarget.blur();
            }
          }}
        />
      ) : (
        <span
          className="lab-cat-name"
          title={onRename ? "Right-click to rename" : undefined}
          onContextMenu={onRename ? (event) => {
            event.preventDefault();
            setRenaming(true);
          } : undefined}
        >
          {category ? category.name : "Unsorted"}
        </span>
      )}
      <span className="lab-cat-count">{count}</span>
      {onRemove && <button type="button" className="lab-cat-remove" title="Remove category (its groups go back to Unsorted)" onClick={onRemove}>×</button>}
    </div>
  );
};

/**
 * Every NPC group as a closed stack of all its tokens, stretched to fill its row; names wrap to three lines at
 * most (the group widens instead). Click one to open it in place and pick a token. Groups start Unsorted; "+"
 * creates a coloured category, dragging a group onto a category header files it there, and each category's
 * twirl shows or hides its groups; Unsorted only shows while it has groups (or a group is being dragged). "+" on
 * a group cell edits its colour and leader. A group takes its category's colour unless given its own; its
 * tokens are ringed in that colour, and the leader comes first with a thicker, brighter ring.
 *
 * Main holds the catalogued NPCs (drag a token onto the stage). Generic holds the generics already spawned into
 * the scene (dragged like anyone else), then the generic catalog grouped by name with its own categories;
 * clicking a catalog token queues it onto a free slot near the stage's top-left corner (several in a row gather
 * there), to be spawned on Send; generics already in the scene or the queue drop out of the catalog.
 */
export const MasonryRoster = (): ReactElement => {
  const { catalogs, raw: rawCatalogs, error } = useSceneCatalogs();
  const overrides = useNpcOverrides();
  const [configuring, setConfiguring] = useState<NpcConfigTarget | null>(null);
  const tableGenerics = useWorldState().seats?.generics;
  const inScene = useContext(SceneGenericsContext) ?? tableGenerics ?? [];
  const send = useScenesCommand();
  const queuedGenerics = useContext(PendingGenericsContext);
  const sceneTiers = useContext(GenericTiersContext);
  const npcStats = useNpcStats();
  const [tierPick, setTierPick] = useState<{ member: RosterMember; label: string; at: Point; tiers: readonly NpcTier[] } | null>(null);
  const [genericCatalog, setGenericCatalog] = useState<readonly GenericEntry[] | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>("beesHive");
  const layout = useRosterLayout();
  const [draft, setDraft] = useState<{ name: string; color: string } | null>(null);
  const [editing, setEditing] = useState<{ key: string; at: Point } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = usePersistentState<"main" | "generic">("tr-dashboard:roster-tab", "main", ["main", "generic"]);
  const [preview, setPreview] = useState<{ characterKey: string; token: HTMLElement } | null>(null);
  const rosterRef = useRef<HTMLDivElement>(null);
  const previewFigurine = (characterKey: string | null, token?: HTMLElement): void =>
    setPreview(characterKey && token ? { characterKey, token } : null);
  useEffect(() => {
    if (view === "generic" && !genericCatalog) {
      loadGenericCatalog().then(setGenericCatalog, (reason: unknown) => setGenericError(reason instanceof Error ? reason.message : String(reason)));
    }
  }, [view, genericCatalog]);
  const fileGroup = (categoryId: string | null) => (groupKey: string): void => {
    const assigned = { ...layout.assigned };
    if (categoryId) {
      assigned[groupKey] = categoryId;
    } else {
      delete assigned[groupKey];
    }
    setRosterLayout({ ...layout, assigned });
  };
  const setGroupColor = (groupKey: string, color: string | null): void => {
    const groupColors = { ...layout.groupColors };
    if (color) {
      groupColors[groupKey] = color;
    } else {
      delete groupColors[groupKey];
    }
    setRosterLayout({ ...layout, groupColors });
  };
  const setGroupLeader = (groupKey: string, characterKey: string): void =>
    setRosterLayout({ ...layout, leaders: { ...layout.leaders, [groupKey]: characterKey } });
  const updateCategory = (id: string, change: Partial<RosterCategory>): void =>
    setRosterLayout({ ...layout, categories: layout.categories.map((category) => (category.id === id ? { ...category, ...change } : category)) });
  const removeCategory = (id: string): void =>
    setRosterLayout({
      ...layout,
      categories: layout.categories.filter((category) => category.id !== id),
      assigned: Object.fromEntries(Object.entries(layout.assigned).filter(([, categoryId]) => categoryId !== id))
    });
  const createCategory = (): void => {
    if (!draft || draft.name.trim() === "") {
      return;
    }
    const category: RosterCategory = {
      id: `cat-${Date.now()}`,
      name: draft.name.trim(),
      color: draft.color,
      open: true,
      ...(view === "generic" ? { view: "generic" as const } : {})
    };
    setRosterLayout({ ...layout, categories: [...layout.categories, category] });
    setDraft(null);
  };
  const mainGroups = useMemo((): readonly NpcGroup[] => {
    if (!catalogs) {
      return [];
    }
    const byKey = new Map<string, RosterMember[]>();
    for (const npc of catalogs.namedNpcs) {
      for (const key of npc.pickerGroups) {
        byKey.set(key, [...(byKey.get(key) ?? []), { characterKey: npc.characterKey, name: npc.fullName }]);
      }
    }
    return [...byKey].map(([key, members]) => {
      const label = catalogs.pickerGroupLabels[key] ?? key;
      return { key, label, labelWidth: groupLabelWidth(label), members };
    });
  }, [catalogs]);
  const spawnedKey = [...inScene.map((npc) => npc.characterKey), ...Object.keys(queuedGenerics)].join(",");
  const spawned = useMemo(() => new Set(spawnedKey.split(",")), [spawnedKey]);
  const genGroups = useMemo(
    () => (genericCatalog ? genericGroups(genericCatalog, spawned, overrides) : []),
    [genericCatalog, spawned, overrides]
  );
  const groups = view === "main" ? mainGroups : genGroups;
  const addGeneric = (member: RosterMember, tier: NpcTier | undefined): void => send({
    op: "genericAdd",
    keys: [member.characterKey],
    labels: { [member.characterKey]: member.name },
    ...(tier ? { tiers: { [member.characterKey]: tier } } : {})
  });
  /** No tier blocks on the type: no tier; one: that one; several: the tier picker. */
  const pickGeneric = (member: RosterMember) => (event: MouseEvent<HTMLElement>): void => {
    const label = genericCatalog?.find((npc) => npc.key === member.characterKey)?.label;
    const options = label ? configuredTiers(npcStats?.[genericStatsKey(label)]) : [];
    if (label && options.length > 1) {
      setTierPick({ member, label, at: canvasPoint(event), tiers: options });
      return;
    }
    addGeneric(member, options[0]);
  };
  /** Same defaults as the token art generator: first picker group's colour for named NPCs, `generic:<label>` for generics. */
  const configure: ConfigureToken = (characterKey, event) => {
    const at = canvasPoint(event);
    const named = rawCatalogs ? [...rawCatalogs.namedNpcs, ...rawCatalogs.pcs].find((npc) => npc.characterKey === characterKey) : undefined;
    const generic = genericCatalog?.find((npc) => npc.key === characterKey);
    const groupKey = named ? named.pickerGroups[0] : generic ? `generic:${generic.label}` : undefined;
    const spawnedNpc = generic ? inScene.find((npc) => npc.characterKey === characterKey) : undefined;
    setConfiguring({
      characterKey,
      at,
      defaultName: named?.fullName ?? generic?.label ?? characterKey,
      defaultColor: (groupKey && groupColor(layout, groupKey)) || DEFAULT_TOKEN_RING,
      stats: generic
        ? { key: genericStatsKey(generic.label), label: generic.label, tiered: true }
        : { key: characterKey, label: named?.fullName ?? characterKey, tiered: false },
      ...(spawnedNpc && generic && send
        ? {
          inScene: {
            name: spawnedNpc.name,
            rename: (name: string) => send({ op: "genericRename", key: characterKey, name }),
            tier: sceneTiers[characterKey],
            tiers: configuredTiers(npcStats?.[genericStatsKey(generic.label)]),
            setTier: (tier: NpcTier | undefined) => send({ op: "genericTier", key: characterKey, ...(tier ? { tier } : {}) })
          }
        }
        : {})
    });
  };
  const ownColor = (characterKey: string): string | undefined => overrides[characterKey]?.color;

  const leaderFirst = (group: NpcGroup): readonly RosterMember[] => {
    const leader = groupLeader(layout, catalogs?.groupBosses, group.key);
    return [...group.members].sort((a, b) => Number(b.characterKey === leader) - Number(a.characterKey === leader));
  };
  const tokenClass = (group: NpcGroup, npc: RosterMember): string =>
    `lab-group-head${groupLeader(layout, catalogs?.groupBosses, group.key) === npc.characterKey ? " boss" : ""}`;
  const openToken = (group: NpcGroup, npc: RosterMember): ReactElement => view === "main"
    ? (
      <RosterToken
        key={npc.characterKey}
        characterKey={npc.characterKey}
        name={npc.name}
        className={tokenClass(group, npc)}
        color={ownColor(npc.characterKey)}
        onConfigure={configure}
      />
    )
    : (
      <GenericToken
        key={npc.characterKey}
        member={npc}
        className={tokenClass(group, npc)}
        color={ownColor(npc.characterKey)}
        onPick={pickGeneric(npc)}
        onPreview={previewFigurine}
        onConfigure={configure}
      />
    );
  const masonry = (list: readonly NpcGroup[]): ReactElement => (
    <div className="lab-masonry">
      {list.map((group) => {
        const color = groupColor(layout, group.key);
        const style = { "--group": color ?? UNSORTED_GROUP_COLOR } as CSSProperties;
        const tinted = color ? " tinted" : "";
        return group.key === open ? (
          <div key={group.key} className={`lab-group open${tinted}`} style={style}>
            <button type="button" className="lab-group-label" onClick={() => setOpen(null)}>{group.label} ▴</button>
            <span className="lab-group-tokens">{leaderFirst(group).map((npc) => openToken(group, npc))}</span>
          </div>
        ) : (
          <div
            key={group.key}
            role="button"
            tabIndex={0}
            className={`lab-group${tinted}`}
            style={style}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(GROUP_DRAG_TYPE, group.key);
              startRosterDrag(event, leaderFirst(group));
              setDragging(true);
            }}
            onDragEnd={() => setDragging(false)}
            onClick={() => setOpen(group.key)}
            title={view === "main" ? group.members.map((npc) => npc.name).join(", ") : `${group.label} (${group.members.length})`}
          >
            <span className="lab-group-colors">
              <button
                type="button"
                className={`lab-group-color${group.key in layout.groupColors ? " own" : ""}`}
                title={view === "main" ? "Group colour and leader" : "Group colour"}
                onClick={(event) => {
                  event.stopPropagation();
                  setEditing({ key: group.key, at: canvasPoint(event) });
                }}
              >
                {group.key in layout.groupColors ? "" : "+"}
              </button>
            </span>
            <span className="lab-group-cluster">
              {leaderFirst(group).map((npc) => (
                <Headshot key={npc.characterKey} className={tokenClass(group, npc)} characterKey={npc.characterKey} />
              ))}
            </span>
            <span className="lab-group-label" style={{ minWidth: group.labelWidth }}>{group.label}</span>
          </div>
        );
      })}
    </div>
  );
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const mainFound = (): readonly ReactElement[] | null => terms.length === 0 || !catalogs
    ? null
    : catalogs.namedNpcs
      .filter((npc) => terms.every((term) => npc.fullName.toLowerCase().includes(term)))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((npc) => (
        <RosterToken
          key={npc.characterKey}
          characterKey={npc.characterKey}
          name={npc.fullName}
          className="lab-group-head"
          color={ownColor(npc.characterKey)}
          onConfigure={configure}
        />
      ));
  const genericFound = (): readonly ReactElement[] | null => terms.length === 0 || !genericCatalog
    ? null
    : genericCatalog
      .filter((npc) => !spawned.has(npc.key))
      .filter((npc) => terms.every((term) => `${npc.label} ${npc.tags} ${npc.key}`.toLowerCase().includes(term)))
      .slice(0, GENERIC_MATCH_LIMIT)
      .map((npc) => {
        const member = { characterKey: npc.key, name: overrides[npc.key]?.name ?? npc.label };
        return (
          <GenericToken
            key={npc.key}
            member={member}
            className="lab-group-head"
            color={ownColor(npc.key)}
            onPick={pickGeneric(member)}
            onPreview={previewFigurine}
            onConfigure={configure}
          />
        );
      });
  const found = view === "main" ? mainFound() : genericFound();
  const categories = layout.categories.filter((category) => (category.view === "generic") === (view === "generic"));
  const knownCategories = new Set(categories.map((category) => category.id));
  const unsorted = groups.filter((group) => !knownCategories.has(layout.assigned[group.key] ?? ""));
  const editingGroup = editing ? groups.find((group) => group.key === editing.key) : undefined;

  return (
    <div className="lab-mroster" ref={rosterRef}>
      {preview && rosterRef.current && <FigurinePreview characterKey={preview.characterKey} token={preview.token} panel={rosterRef.current} />}
      <div className="lab-mroster-head">
        <button type="button" className={`lab-btn${view === "main" ? " primary" : ""}`} onClick={() => setView("main")}>Main</button>
        <button type="button" className={`lab-btn${view === "generic" ? " primary" : ""}`} onClick={() => setView("generic")}>Generic</button>
        <Btn>Memoriam</Btn>
        <input
          type="search"
          className="lab-search"
          placeholder={view === "generic" ? "Search generic NPCs…" : "Search every NPC…"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && setQuery("")}
        />
        <button type="button" className="lab-btn lab-cat-add" title="New category" onClick={() => setDraft({ name: "", color: NEW_CATEGORY_COLOR })}>+</button>
      </div>
      {draft && (
        <form
          className="lab-cat-draft"
          onSubmit={(event) => {
            event.preventDefault();
            createCategory();
          }}
        >
          <input
            className="lab-select"
            autoFocus
            placeholder="Category name"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <input type="color" className="lab-cat-color" value={draft.color} title="Category colour" onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
          <button type="submit" className="lab-btn primary">Create</button>
          <button type="button" className="lab-btn" onClick={() => setDraft(null)}>Cancel</button>
        </form>
      )}
      {error && <p className="lab-note">{error}</p>}
      {view === "generic" && genericError && <p className="lab-note">{genericError}</p>}
      <div className="lab-mroster-body">
        {view === "generic" && inScene.length > 0 && (
          <section className="lab-cat">
            <div className="lab-cat-head unsorted">
              <span className="lab-cat-name">In this scene</span>
              <span className="lab-cat-count">{inScene.length}</span>
            </div>
            <div className="lab-search-results">
              {inScene.map((npc) => (
                <RosterToken
                  key={npc.characterKey}
                  characterKey={npc.characterKey}
                  name={npc.name}
                  className="lab-group-head"
                  color={ownColor(npc.characterKey)}
                  tier={sceneTiers[npc.characterKey]}
                  onConfigure={configure}
                />
              ))}
            </div>
          </section>
        )}
        {found && (
          <div className="lab-search-results">
            {found.length === 0 && <span className="lab-note">No NPC matches "{query.trim()}".</span>}
            {found}
          </div>
        )}
        {!found && categories.map((category) => {
          const members = groups.filter((group) => layout.assigned[group.key] === category.id);
          return (
            <section key={category.id} className="lab-cat" style={{ "--cat": category.color } as CSSProperties}>
              <CategoryHeader
                category={category}
                count={members.length}
                onToggle={() => updateCategory(category.id, { open: !category.open })}
                onDrop={fileGroup(category.id)}
                onRemove={() => removeCategory(category.id)}
                onRename={(name) => updateCategory(category.id, { name })}
              />
              {category.open && members.length > 0 && masonry(members)}
            </section>
          );
        })}
        {!found && (unsorted.length > 0 || dragging) && (
          <section className="lab-cat unsorted">
            {categories.length > 0 && <CategoryHeader category={null} count={unsorted.length} onDrop={fileGroup(null)} />}
            {masonry(unsorted)}
          </section>
        )}
      </div>
      {editing && editingGroup && (
        <GroupEditor
          group={editingGroup}
          at={editing.at}
          color={groupColor(layout, editingGroup.key) ?? NEW_CATEGORY_COLOR}
          own={editingGroup.key in layout.groupColors}
          leader={groupLeader(layout, catalogs?.groupBosses, editingGroup.key)}
          onColor={(next) => setGroupColor(editingGroup.key, next)}
          {...(view === "main" ? { onLeader: (characterKey: string) => setGroupLeader(editingGroup.key, characterKey) } : {})}
          onClose={() => setEditing(null)}
        />
      )}
      {configuring && <NpcConfigModal target={configuring} onClose={() => setConfiguring(null)} />}
      {tierPick && (
        <TierPicker
          at={tierPick.at}
          title={tierPick.member.name}
          tiers={tierPick.tiers}
          onPick={(tier) => {
            addGeneric(tierPick.member, tier);
            setTierPick(null);
          }}
          onClose={() => setTierPick(null)}
        />
      )}
    </div>
  );
};

/**
 * The left column below the hunt roll: scene notes, with the NPC roster folded to a rail along their left
 * edge. Clicking the rail opens the roster over the notes, and clicking it again folds it away; it stays as it
 * was across reloads.
 */
export const RosterDock = ({ scene }: { scene: string }): ReactElement => {
  const layout = useRosterLayout();
  const [open, setOpen] = usePersistentState<boolean>("tr-dashboard:roster-open", false);
  return (
    <div className="lab-dock">
      <div className="lab-dock-notes">
        <SceneNotes scene={scene} />
      </div>
      <div className={`lab-dock-roster${open ? " open" : ""}`}>
        <button type="button" className="lab-dock-rail" title={open ? "Fold the NPC roster away" : "Open the NPC roster"} onClick={() => setOpen(!open)}>
          <span className="lab-dock-rail-label">NPC Roster</span>
          {layout.categories.map((category) => (
            <span key={category.id} className="lab-dock-rail-cat" style={{ "--cat": category.color } as CSSProperties} title={category.name} />
          ))}
        </button>
        {open && (
          <div className="lab-dock-roster-body">
            <MasonryRoster />
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Hunt roll: resonance odds from the location, the margin, and the outcome ---------- */

const FLAVOR_LABEL: Record<Flavor, string> = {
  choleric: "Choleric",
  melancholic: "Melancholic",
  phlegmatic: "Phlegmatic",
  sanguine: "Sanguine",
  ischemic: "Ischemic",
  mercurial: "Mercurial",
  primal: "Primal"
};
const INTENSITY_LABEL: Record<Intensity, string> = { none: "No resonance", fleeting: "Fleeting", intense: "Intense", acute: "Acute" };
const OUTCOMES: readonly HuntOutcome[] = ["basic", "critical", "messy"];
const OUTCOME_LABEL: Record<HuntOutcome, string> = { basic: "Normal win", critical: "Critical win", messy: "Messy critical" };
const SPIN_MS = 2400;
const FLAVOR_FONT = '15px "Bebas Neue"';
const INTENSITY_FONT = '13px "Bebas Neue"';
const MAX_MARGIN = 15;
const SEGMENT_PAD = 6;
const WINNER_PAD = 16;

/** Folds a travelled distance back and forth across 0..1, so the marker bounces off the bar's ends. */
const pingPong = (distance: number): number => {
  const folded = ((distance % 2) + 2) % 2;
  return folded > 1 ? 2 - folded : folded;
};

/** The shortest travel of at least `least` from `from` that leaves the bouncing marker exactly at `to`. */
const travelTo = (from: number, to: number, least: number): number => {
  const base = from + least;
  const forward = 2 * Math.ceil((base - to) / 2) + to;
  const back = 2 * Math.ceil((base - (2 - to)) / 2) + 2 - to;
  return Math.min(forward, back) - from;
};

/** Starting from `from`, eases along `travel` and bounces across the bar; returns the position at `t` (0..1). */
const spinAt = (from: number, travel: number, t: number): number => pingPong(from + travel * (1 - (1 - t) ** 3));

let textMeasure: CanvasRenderingContext2D | null = null;
const textWidth = (text: string, font: string): number => {
  if (!textMeasure) {
    textMeasure = document.createElement("canvas").getContext("2d");
    if (!textMeasure) {
      throw new Error("HuntRoller: no 2D canvas context to measure labels");
    }
  }
  textMeasure.font = font;
  return Math.ceil(textMeasure.measureText(text).width) + 2;
};

/** The flavor's name if it fits inside its segment, else its first letter, else nothing. */
const segmentText = (name: string, room: number): string =>
  [name, name.slice(0, 1)].find((text) => textWidth(text, FLAVOR_FONT) + SEGMENT_PAD <= room) ?? "";

const percent = (value: number): string => `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;

type HuntResult = { readonly flavor: Flavor | null; readonly intensity: Intensity };

/** Segment sizing: losers share what the winner leaves; the winner is at least wide enough for its full name. */
const segmentFlex = (chance: number, winner: boolean, settled: boolean, minWidth: number, barW: number): CSSProperties =>
  settled && winner ? { flexGrow: 0, flexBasis: Math.max(chance * barW, minWidth) } : { flexGrow: chance, flexBasis: 0 };

/**
 * Hunt roll: the margin (hover and spin the mouse wheel) and outcome (star: normal, critical, messy critical) set
 * the odds with the scene location's resonances. The top bar is the flavor, each possible flavor's segment as
 * long as its chance; click a flavor (either button) to pick, from a ring, the PC who is hunting for it (the
 * flavor is then outlined in their seat colour; click it again to clear). The lower bar is the intensity, darker
 * to brighter. The circling-arrows button rolls: both markers slide and settle, the winners widen and glow and the
 * rest fade, and the button splits into Broadcast (sends the result for the hunting PC, asking with the same ring
 * when no flavor was sought) and Cancel (ignores it). Both put the bar back to its default: margin 0, normal
 * outcome, no sought flavor or PC.
 */
export type HuntPc = { readonly color: string; readonly name: string };
export type HuntConfirm = { readonly color: string; readonly flavor: string | null; readonly intensity: Intensity; readonly margin: number };

export const HuntRoller = ({ location, pcs, onConfirm }: {
  location: LabLocation;
  pcs: readonly HuntPc[];
  onConfirm: (hunt: HuntConfirm) => void;
}): ReactElement => {
  const { data } = useChronicleLocations();
  const [hunter, setHunter] = useState("");
  const [pcRing, setPcRing] = useState<{ at: Point; seek: Flavor | null } | null>(null);
  const [margin, setMargin] = useState(0);
  const [outcome, setOutcome] = useState<HuntOutcome>("basic");
  const [target, setTarget] = useState<Flavor | null>(null);
  const [markers, setMarkers] = useState<{ flavor: number; intensity: number } | null>(null);
  const [result, setResult] = useState<HuntResult | null>(null);
  const [barW, setBarW] = useState(0);
  const [fontReady, setFontReady] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const marginRef = useRef<HTMLSpanElement>(null);
  const frame = useRef<number | null>(null);
  const reset = (): void => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    setMarkers(null);
    setResult(null);
  };
  useEffect(() => () => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
    }
  }, []);
  useEffect(() => {
    void Promise.all([document.fonts.load(FLAVOR_FONT), document.fonts.load(INTENSITY_FONT)]).then(() => setFontReady(true));
  }, []);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) {
      return undefined;
    }
    const observer = new ResizeObserver(() => setBarW(bar.clientWidth));
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);
  // React's wheel listener is passive, so it cannot stop the page from scrolling.
  useEffect(() => {
    const box = marginRef.current;
    if (!box) {
      return undefined;
    }
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      if (event.deltaY !== 0) {
        setMargin((value) => Math.min(MAX_MARGIN, Math.max(0, value + (event.deltaY < 0 ? 1 : -1))));
        reset();
      }
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, []);

  const found = data ? resolveLocation(data, location) : null;
  const { modifiers, unknown } = netModifiers(found && typeof found !== "string" ? [...found.district.resonances, ...found.site.resonances] : []);
  const flavors = eligibleFlavors(modifiers);
  const seeking = target !== null && flavors.includes(target) ? target : null;
  const odds = flavorOdds({ modifiers, target: seeking, margin, outcome });
  const intensity = intensityOdds(margin, outcome);
  const settled = result !== null;
  const measured = fontReady && barW > 0;

  const spin = (): void => {
    if (settled) {
      return;
    }
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
    }
    const flavorTo = Math.random();
    const intensityTo = Math.random();
    const landed = sample(odds, flavors, flavorTo);
    const strength = sample(intensity, INTENSITIES, intensityTo);
    const from = markers ?? { flavor: 0, intensity: 0 };
    const flavorTravel = travelTo(from.flavor, flavorTo, 1.5 + Math.random() * 2);
    const intensityTravel = travelTo(from.intensity, intensityTo, 1.5 + Math.random() * 2);
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / SPIN_MS);
      setMarkers({ flavor: spinAt(from.flavor, flavorTravel, t), intensity: spinAt(from.intensity, intensityTravel, t) });
      if (t < 1) {
        frame.current = requestAnimationFrame(step);
        return;
      }
      frame.current = null;
      setResult({ flavor: strength === "none" ? null : landed, intensity: strength });
    };
    frame.current = requestAnimationFrame(step);
  };
  const spinning = markers !== null && !settled;
  const hunterPc = pcs.find((pc) => pc.color === hunter);
  const clearAll = (): void => {
    reset();
    setMargin(0);
    setOutcome("basic");
    setTarget(null);
    setHunter("");
  };
  const confirm = (color: string): void => {
    if (!result) {
      return;
    }
    onConfirm({ color, flavor: result.flavor ? FLAVOR_LABEL[result.flavor] : null, intensity: result.intensity, margin });
    clearAll();
  };
  // Left and right click do the same thing on a flavor.
  const pickFlavor = (event: MouseEvent<HTMLElement>, flavor: Flavor): void => {
    event.preventDefault();
    if (settled || spinning) {
      return;
    }
    if (flavor === seeking) {
      setTarget(null);
      setHunter("");
      return;
    }
    setPcRing({ at: canvasPoint(event), seek: flavor });
  };
  const pcOptions = pcs.map((pc) => ({ value: pc.color, label: pc.name, accent: SEAT_ACCENT[pc.color] }));
  return (
    <div className="lab-hunt">
      <span
        ref={marginRef}
        className="lab-hunt-successes"
        tabIndex={0}
        title="Margin on the hunt roll (successes over the difficulty). Hover and spin the mouse wheel to change it."
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            setMargin((value) => Math.min(MAX_MARGIN, Math.max(0, value + (event.key === "ArrowUp" ? 1 : -1))));
            reset();
          }
        }}
      >
        +{margin}
      </span>
      <button
        type="button"
        className={`lab-hunt-crit ${outcome}`}
        title={`${OUTCOME_LABEL[outcome]} (click for ${OUTCOME_LABEL[OUTCOMES[(OUTCOMES.indexOf(outcome) + 1) % OUTCOMES.length] ?? "basic"].toLowerCase()})`}
        onClick={() => {
          setOutcome(OUTCOMES[(OUTCOMES.indexOf(outcome) + 1) % OUTCOMES.length] ?? "basic");
          reset();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12,2.6 14.8,8.7 21.4,9.4 16.5,13.9 17.8,20.5 12,17.2 6.2,20.5 7.5,13.9 2.6,9.4 9.2,8.7" />
        </svg>
      </button>
      <div className={`lab-hunt-bars${settled ? " settled" : ""}`}>
        <div ref={barRef} className="lab-hunt-bar">
          {flavors.map((flavor, index) => {
            const won = result?.flavor === flavor;
            const name = FLAVOR_LABEL[flavor];
            const sought = flavor === seeking;
            return (
              <span
                key={flavor}
                className={`lab-hunt-seg ${index % 2 === 0 ? "light" : "dark"}${sought ? " sought" : ""}${won ? " won" : ""}`}
                style={{
                  ...segmentFlex(odds[flavor], won, settled, measured ? textWidth(name, FLAVOR_FONT) + WINNER_PAD : 0, barW),
                  "--hunter": sought && hunterPc ? SEAT_ACCENT[hunterPc.color] : undefined
                } as CSSProperties}
                title={settled ? undefined : `${name} ${percent(odds[flavor])}: ${sought && hunterPc ? `sought by ${hunterPc.name}; click to clear` : "click to pick the PC hunting for it"}`}
                onClick={(event) => pickFlavor(event, flavor)}
                onContextMenu={(event) => pickFlavor(event, flavor)}
              >
                {measured && (won ? name : settled ? "" : segmentText(name, odds[flavor] * barW))}
              </span>
            );
          })}
          {markers && !settled && <span className="lab-hunt-marker" style={{ left: `${markers.flavor * 100}%` }} />}
        </div>
        <div className="lab-hunt-bar intensity">
          {INTENSITIES.map((key) => {
            const won = result?.intensity === key;
            return (
              <span
                key={key}
                className={`lab-hunt-seg ${key}${won ? " won" : ""}`}
                style={segmentFlex(intensity[key], won, settled, measured ? textWidth(INTENSITY_LABEL[key], INTENSITY_FONT) + WINNER_PAD : 0, barW)}
                title={`${INTENSITY_LABEL[key]} ${percent(intensity[key])}`}
              >
                {won ? INTENSITY_LABEL[key] : ""}
              </span>
            );
          })}
          {markers && !settled && <span className="lab-hunt-marker" style={{ left: `${markers.intensity * 100}%` }} />}
        </div>
      </div>
      {settled ? (
        <span className="lab-hunt-acts">
          <button
            type="button"
            className="lab-hunt-act broadcast"
            title={hunterPc
              ? `Broadcast ${hunterPc.name}'s resonance in TTS and reset the hunt bar`
              : "Pick the hunting PC, broadcast their resonance in TTS and reset the hunt bar"}
            onClick={(event) => {
              if (hunterPc) {
                confirm(hunterPc.color);
              } else {
                setPcRing({ at: canvasPoint(event), seek: null });
              }
            }}
          >
            <Icon name="broadcast" />
          </button>
          <button type="button" className="lab-hunt-act cancel" title="Ignore this result and reset the hunt bar" onClick={clearAll}>
            <Icon name="cancel" />
          </button>
        </span>
      ) : (
        <button type="button" className="lab-hunt-act roll" title="Roll for resonance" disabled={spinning} onClick={spin}>
          <Icon name="reroll" />
        </button>
      )}
      {pcRing && (
        <RingMenu
          at={pcRing.at}
          options={pcOptions}
          current={hunter}
          onPick={(color) => {
            if (pcRing.seek === null) {
              confirm(color);
              return;
            }
            setTarget(pcRing.seek);
            setHunter(color);
          }}
          onClose={() => setPcRing(null)}
        />
      )}
      {unknown.length > 0 && <span className="lab-note">Unknown resonance in the sheet: {unknown.join(", ")}</span>}
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

/** Snow and blizzard bases have no TTS layer yet (their rain layer is silent); only the dashboard paints the snow. */
const SNOW_BY_BASE: Readonly<Record<string, Precip>> = { s: "lightSnow", b: "heavySnow" };

/** `cold`: at or below `C.WEATHER.WARM_TEMPERATURE_THRESHOLD`, where wind takes the winter layer. */
type Scheduled = WeatherAxes & { readonly celsius: number; readonly fog: boolean; readonly cold: boolean };

/** Hourly calendar code → the two axes, decoded from `C.WEATHER` the way `ChronicleWeather.parseCode` does. */

const scheduledWeather = (calendar: WeatherCalendar, at: Date): Scheduled | string => {
  const month = at.getMonth() + 1;
  const code = calendar.codes.get(`${month}-${at.getDate()}`)?.[at.getHours()];
  const average = calendar.avgTemp.get(month);
  if (!code || average === undefined) {
    return `The WEATHER tab has no entry for ${month}/${at.getDate()} at ${at.getHours()}:00.`;
  }
  const base = WEATHER_CODES.base[code.slice(0, 2)];
  const delta = WEATHER_CODES.temperatureDelta[code.charAt(2)];
  const wind = WEATHER_CODES.wind[code.charAt(4)];
  if (!base || delta === undefined || !wind) {
    return `Unknown weather code "${code}".`;
  }
  const celsius = Math.floor(average + delta);
  const cold = celsius <= WEATHER_CODES.warmThreshold;
  return {
    precip: SNOW_BY_BASE[code.charAt(0)] ?? precipOf(base.rain),
    wind: windLevel(cold ? wind.cold : wind.warm),
    celsius,
    thunder: base.thunder,
    fog: code.charAt(1) === "f",
    cold
  };
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

type Extreme = "heat" | "cold";
const HEAT_WAVE_C = 30;
const COLD_SNAP_C = -15;
const extremeFor = (celsius: number): Extreme | null => (celsius >= HEAT_WAVE_C ? "heat" : celsius <= COLD_SNAP_C ? "cold" : null);

/** Heat: the scene wavers in a rising haze over an amber glow. Cold: frost creeps in from the edges. */
const ExtremeTemperature = ({ extreme, filterId }: { extreme: Extreme; filterId: string }): ReactElement => (
  <div className={`lab-wx-extreme ${extreme}`} aria-hidden="true">
    <svg className="lab-wx-layer" width="100%" height="100%">
      <defs>
        {extreme === "heat" ? (
          <filter id={filterId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.07" numOctaves="2" seed="4">
              <animate attributeName="baseFrequency" values="0.012 0.07;0.016 0.1;0.012 0.07" dur="3.5s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="7" />
          </filter>
        ) : (
          <>
            <filter id={filterId} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="9" />
              <feColorMatrix values="0 0 0 0 0.86  0 0 0 0 0.94  0 0 0 0 1  0 0 0 2.6 -1.3" />
            </filter>
            <radialGradient id={`${filterId}m`} cx="50%" cy="50%" r="72%">
              <stop offset="45%" stopColor="#000" />
              <stop offset="100%" stopColor="#fff" />
            </radialGradient>
            <mask id={`${filterId}k`}>
              <rect width="100%" height="100%" fill={`url(#${filterId}m)`} />
            </mask>
          </>
        )}
      </defs>
      {extreme === "cold" && <rect className="lab-wx-frost" width="100%" height="100%" filter={`url(#${filterId})`} mask={`url(#${filterId}k)`} />}
    </svg>
  </div>
);

/**
 * Weather for the scene's date and hour from the WEATHER calendar. Click rain/snow or wind for a ring of
 * choices; choosing something other than the calendar's value overrides it until released. Fog always
 * follows the calendar (TTS draws no fog for weather).
 */
export const WeatherPanel = ({ at, celsius: liveCelsius, live, held = false, w, h }: {
  at: Date;
  /** TTS's temperature for the scene, when it has one; otherwise the calendar's. */
  celsius: number | null;
  /**
   * The weather TTS is playing (or a preview's held weather); the calendar then only supplies temperature and fog.
   * Picks go to the command sender (the table, or a preview's draft) and hold the weather.
   */
  live?: WeatherAxes;
  /** The Storyteller's weather is held over the schedule. */
  held?: boolean;
  w: number;
  h: number;
}): ReactElement => {
  const { data, error } = useWeatherCalendar();
  const command = useScenesCommand();
  const hazeId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [ring, setRing] = useState<{ axis: "precip" | "wind"; at: Point } | null>(null);
  if (error || !data) {
    return <div className="lab-wx-panel"><p className="lab-note">{error ?? "Reading the weather calendar…"}</p></div>;
  }
  const scheduled = scheduledWeather(data, at);
  if (typeof scheduled === "string") {
    return <div className="lab-wx-panel"><p className="lab-note">{scheduled}</p></div>;
  }
  const axes: WeatherAxes = live ?? { precip: scheduled.precip, wind: scheduled.wind, thunder: scheduled.thunder };
  const overridden = live !== undefined && held;
  const pick = (next: WeatherAxes): void =>
    command({ op: "weatherOverride", rain: rainKey(next.precip), wind: next.wind, thunder: next.thunder, cold: scheduled.cold });
  const release = (): void => command({ op: "weatherOverride", release: true });
  const openRing = (axis: "precip" | "wind") => (event: MouseEvent<HTMLButtonElement>): void =>
    setRing({ axis, at: canvasPoint(event) });
  // TTS has rain layers only; snow waits for its own layer.
  const precipOptions = PRECIP_OPTIONS.filter((option) => option.value !== "lightSnow" && option.value !== "heavySnow");
  const celsius = liveCelsius ?? scheduled.celsius;
  const extreme = extremeFor(celsius);
  return (
    <div className={`lab-wx-panel${overridden ? " lab-overridden" : ""}${extreme ? ` ${extreme}` : ""}`}>
      <div className={`lab-wx-scene${extreme ? ` ${extreme}` : ""}`} style={extreme === "heat" ? { filter: `url(#${hazeId})` } : undefined}>
        <WeatherBackdrop axes={axes} fog={scheduled.fog} w={w} h={h} />
      </div>
      {extreme && <ExtremeTemperature extreme={extreme} filterId={hazeId} />}
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
        {celsius}°C<sup>{Math.round(celsius * 1.8 + 32)}°F</sup>
      </span>
      {overridden && <ReleaseOverride onRelease={release} />}
      {ring?.axis === "precip" && (
        <RingMenu at={ring.at} options={precipOptions} current={axes.precip} onPick={(precip) => pick({ ...axes, precip })} onClose={() => setRing(null)} />
      )}
      {ring?.axis === "wind" && (
        <RingMenu at={ring.at} options={WIND_OPTIONS} current={windChoice(axes)} onPick={(choice) => pick(withWind(axes, choice))} onClose={() => setRing(null)} />
      )}
    </div>
  );
};

/* ---------- When: scene time over a night skyline ---------- */


/** Tonight's sun times in minutes from midnight; dawn is on the next day, so it is above 1440. */
type SunTimes = { readonly dusk: number; readonly dawn: number };

const SKETCH_SUN: SunTimes = { dusk: 19 * 60 + 2, dawn: 24 * 60 + 6 * 60 + 58 };

const minuteOfDay = (at: Date): number => at.getHours() * 60 + at.getMinutes();

const sunTimes = (dusk: Date | undefined, dawn: Date | undefined): SunTimes => {
  if (!dusk || !dawn) {
    return SKETCH_SUN;
  }
  const duskMinutes = minuteOfDay(dusk);
  const dawnMinutes = minuteOfDay(dawn);
  return { dusk: duskMinutes, dawn: dawnMinutes > duskMinutes ? dawnMinutes : dawnMinutes + 1440 };
};

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
const nightFraction = (minutes: number, sun: SunTimes): number | null => {
  const ofDay = ((minutes % 1440) + 1440) % 1440;
  const sinceDusk = ofDay >= 12 * 60 ? ofDay - sun.dusk : ofDay + 1440 - sun.dusk;
  const t = sinceDusk / (sun.dawn - sun.dusk);
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

/**
 * The moon's arc, as fractions of the sky: it appears low at the left at dusk and is still low at the right at
 * dawn, always above the skyline so it can be grabbed at any hour.
 */
const MOON_ARC = { left: 0.08, right: 0.92, low: 0.4, high: 0.16 } as const;
const moonPosition = (t: number, w: number, h: number): Point => ({
  x: w * (MOON_ARC.left + (MOON_ARC.right - MOON_ARC.left) * t),
  y: h * (MOON_ARC.low - (MOON_ARC.low - MOON_ARC.high) * Math.sin(Math.PI * t))
});

type MoonDrag = { readonly target: number | null; readonly onDrag: (t: number) => void };

/**
 * Sky from dusk to dawn: the moon crosses, city windows go dark one by one, and the horizon warms before dawn.
 * The moon can be dragged along its arc (shown while a target is set) to pick a later or earlier time tonight.
 */
const NightSky = ({ minutes, sun, w, h, drag }: { minutes: number; sun: SunTimes; w: number; h: number; drag: MoonDrag }): ReactElement => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const city = useMemo(() => skyline(w, h), [w, h]);
  const stars = useMemo(() => {
    const random = seeded(3);
    return Array.from({ length: 46 }, () => ({ x: random() * w, y: random() * h * 0.55, r: 0.4 + random() * 0.8 }));
  }, [w, h]);
  const t = nightFraction(minutes, sun);
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
    return Math.min(1, Math.max(0, (x / w - MOON_ARC.left) / (MOON_ARC.right - MOON_ARC.left)));
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

const formatLongDate = (at: Date): string => at.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });

const formatClock = (minutes: number): string => formatTime(new Date(2000, 0, 1, Math.floor(minutes / 60) % 24, minutes % 60));

const sameDay = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString();

const shift = (at: Date, minutes: number): Date => new Date(at.getTime() + minutes * 60_000);

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const CALENDAR_CELLS = 42;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Month grid for picking the scene's date (keeps the time of day); the present day is ringed in green. */
const SceneCalendar = ({ at, present, onPick }: { at: Date; present: Date; onPick: (next: Date) => void }): ReactElement => {
  const [month, setMonth] = useState(() => new Date(at.getFullYear(), at.getMonth(), 1));
  const lead = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // Always six weeks, so the pop-up keeps its height from month to month.
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, index) => index + 1)];
  cells.push(...Array.from({ length: CALENDAR_CELLS - cells.length }, () => null));
  const dayDate = (day: number): Date => new Date(month.getFullYear(), month.getMonth(), day, at.getHours(), at.getMinutes());
  const step = (delta: number): void => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  return (
    <div className="lab-cal">
      <div className="lab-cal-head">
        <button type="button" className="lab-btn" onClick={() => step(-1)}>‹</button>
        <span>{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <button type="button" className="lab-btn" onClick={() => step(1)}>›</button>
      </div>
      <div className="lab-cal-grid">
        {WEEKDAYS.map((day) => <span key={day} className="lab-cal-dow">{day}</span>)}
        {cells.map((day, index) => day === null ? <span key={`lead${index}`} /> : (
          <button
            key={day}
            type="button"
            className={`lab-cal-day${sameDay(dayDate(day), at) ? " scene" : ""}${sameDay(dayDate(day), present) ? " present" : ""}`}
            onClick={() => onPick(dayDate(day))}
          >
            {day}
          </button>
        ))}
      </div>
      <label className="lab-cal-time">
        Time
        <input
          type="time"
          className="lab-select"
          value={`${pad2(at.getHours())}:${pad2(at.getMinutes())}`}
          onChange={(event) => {
            const [hours, mins] = event.target.value.split(":").map(Number);
            if (hours !== undefined && mins !== undefined) {
              onPick(new Date(at.getFullYear(), at.getMonth(), at.getDate(), hours, mins));
            }
          }}
        />
      </label>
    </div>
  );
};

const FIVE_MINUTES = 300_000;

type RealTimeRate = 1 | 2 | 5;

const REAL_TIME_RATES: readonly RingOption<RealTimeRate>[] = [
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 5, label: "5x" }
];

/**
 * Scene date and time over the sky, with tonight's dusk (left) and dawn (right) in the bottom corners and
 * the real-time toggle top right (a clock while off, its speed while running; right-click it for 1x / 2x / 5x).
 * Present-day time appears (green) only when it differs from
 * scene time; scene time can never pass it (TTS moves present day forward). A scene before the
 * present day is a flashback (yellow glow). Drag the moon to pick a time tonight, then press play over the
 * clock to move TTS there. Click anywhere else for the calendar pop-up. With no live scene (presentOnly) the
 * panel shows present day, and the moon, calendar and Move button set present day instead of scene time.
 */
export const WhenPanel = ({ at, present, presentOnly = false, sceneOnly = false, live, w, h }: {
  at: Date;
  present: Date;
  presentOnly?: boolean;
  /** A preview's scene time: no real-time clock and no present-day changes. */
  sceneOnly?: boolean;
  /**
   * TTS's real-time state and tonight's sun times; the caller advances `at`. `allowed` is false outside Play's
   * Main and Memoriam, where TTS keeps real time off and the toggle is hidden.
   */
  live: { readonly running: boolean; readonly speed: number; readonly allowed: boolean; readonly dusk?: Date; readonly dawn?: Date };
  w: number;
  h: number;
}): ReactElement => {
  const [open, setOpen] = useState(false);
  const command = useScenesCommand();
  const realTime = live.running;
  const rate = live.speed;
  const [draft, setDraft] = useState<Date | null>(null);
  const closeCalendar = (): void => {
    setOpen(false);
    setDraft(null);
  };
  const [rateRing, setRateRing] = useState<Point | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const minutes = minuteOfDay(at);
  const sun = sunTimes(live.dusk, live.dawn);
  const differs = at.getTime() !== present.getTime();
  const flashback = at.getTime() < present.getTime();
  const tonight = nightFraction(minutes, sun);
  const targetTime = target === null || tonight === null
    ? null
    : new Date(Math.round(shift(at, (target - tonight) * (sun.dawn - sun.dusk)).getTime() / FIVE_MINUTES) * FIVE_MINUTES);
  /** TTS animates scene moves itself; present-day moves are instant. */
  const moveTo = (next: Date): void =>
    command(presentOnly ? { op: "presentDay", datetime: fromDate(next) } : { op: "clockTo", datetime: fromDate(next) });
  const play = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    if (targetTime) {
      moveTo(targetTime);
    }
    setTarget(null);
  };
  return (
    <>
      <div className={`lab-when${flashback ? " lab-flashback" : ""}`} onClick={() => setOpen(true)}>
        <NightSky minutes={minutes} sun={sun} w={w} h={h} drag={{ target, onDrag: setTarget }} />
        <span className={`lab-when-present${differs ? "" : " hidden"}`}>
          {sameDay(at, present) ? formatTime(present) : `${formatDate(present)} · ${formatTime(present)}`}
        </span>
        <span className="lab-when-date">{formatLongDate(at)}</span>
        <span className="lab-when-time">{formatTime(at)}</span>
        {!sceneOnly && live.allowed && <button
          type="button"
          className={`lab-when-realtime${realTime ? " on" : ""}`}
          style={realTime ? { animationDuration: `${1 / rate}s` } : undefined}
          title={`${realTime ? `Real time is on: scene time runs at ${rate}× the real clock` : "Real time is off"}. Right-click to set the speed.`}
          onClick={(event) => {
            event.stopPropagation();
            // Turning real time on starts at 2x unless a faster speed was picked.
            command({ op: "realTime", running: !realTime, speed: realTime || rate > 1 ? rate : 2 });
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setRateRing(canvasPoint(event));
          }}
        >
          {realTime ? <span className="lab-when-rate">{rate}×</span> : <Icon name="clock" />}
        </button>}
        {rateRing && (
          <RingMenu
            at={rateRing}
            options={REAL_TIME_RATES}
            current={rate as RealTimeRate}
            onPick={(next) => command({ op: "realTime", running: realTime, speed: next })}
            onClose={() => setRateRing(null)}
          />
        )}
        {targetTime && (
          <span className="lab-when-play">
            <button type="button" className="lab-when-play-go" onClick={play} title={presentOnly ? "Set present day to this time" : "Run the time animation in TTS"}>
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
        <span className="lab-when-edge dusk" title="Dusk"><span>{formatClock(sun.dusk)}</span></span>
        <span className="lab-when-edge dawn" title="Dawn"><span>{formatClock(sun.dawn)}</span></span>
      </div>
      {open && (
        <Overlay onClose={closeCalendar}>
          <div className="lab-modal lab-clock-modal">
            <span className="lab-modal-title">{presentOnly ? "Present day" : "Scene date"} · {formatLongDate(at)} · {formatTime(at)}</span>
            {/* Picks are a draft: each TTS clock move runs an animation, so one Move button sends the choice. */}
            <SceneCalendar at={draft ?? at} present={present} onPick={setDraft} />
            <div className="lab-row">
              <button
                type="button"
                className="lab-btn primary"
                disabled={draft === null}
                onClick={() => {
                  if (draft) {
                    moveTo(draft);
                  }
                  closeCalendar();
                }}
              >
                {draft
                  ? `Move ${presentOnly ? "present day" : "the scene"} to ${formatDate(draft)} · ${formatTime(draft)}`
                  : presentOnly ? "Pick a new present day" : "Pick a new scene time"}
              </button>
              {!presentOnly && (
                <>
                  <button type="button" className="lab-btn" onClick={() => command({ op: "clockTo", datetime: fromDate(present) })}>
                    Set scene time to present day
                  </button>
                  {!sceneOnly && (
                    <button type="button" className="lab-btn" onClick={() => command({ op: "presentDay", datetime: fromDate(at) })}>
                      Set present day to scene time
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
};

/* ---------- Sound: one row per channel ---------- */

type Overridable<T> = {
  readonly value: T;
  readonly set: (next: T) => void;
  readonly overridden: boolean;
  readonly release: () => void;
};

const noop = (): void => undefined;

/** A value shown as TTS reports it that sends a command when changed (the push brings the new value back). */
const commanded = <T,>(value: T, set: (next: T) => void): Overridable<T> => ({ value, set, overridden: false, release: noop });

const LEVEL_ECHO_MS = 1500;

/**
 * A live level the Storyteller can drag: shows the dragged value until TTS has had a moment to echo it back, so
 * the slider does not jump under the pointer.
 */
const useLiveLevel = (value: number, onSet: (next: number) => void): Overridable<number> => {
  const [held, setHeld] = useState<number | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return commanded(held ?? value, (next) => {
    setHeld(next);
    onSet(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setHeld(null), LEVEL_ECHO_MS);
  });
};

const Slider = ({ level }: { level: Overridable<number> }): ReactElement => (
  <input
    type="range"
    className="lab-slider"
    min={0}
    max={100}
    value={level.value}
    onChange={(event) => level.set(Number(event.target.value))}
  />
);

/** One mixer control group; a playing channel pulses yellow, an override glows red with a release button in its corner. */
const MixerGroup = ({ playing = false, values, children }: { playing?: boolean; values: readonly Pick<Overridable<unknown>, "overridden" | "release">[]; children: ReactNode }): ReactElement => {
  const overridden = values.some((value) => value.overridden);
  return (
    <span className={`lab-mixer-group${playing ? " playing" : ""}${overridden ? " overridden" : ""}`}>
      {children}
      {overridden && (
        <button type="button" className="lab-mixer-release" title="Release override" onClick={() => values.forEach((value) => value.release())}>
          ↺
        </button>
      )}
    </span>
  );
};

const MOOD_PLAYLISTS = MUSIC_MOODS.map(playlistLabel);
const LOCATION_PLAYLISTS = LOCATION_MUSIC.map(playlistLabel);

const AMBIENT_GRID_WIDTH = 660;

const featuredLabel = (key: string | undefined): string =>
  FEATURED_TRACKS.find((track) => track.key === key)?.label ?? key ?? FEATURED_TRACKS[0]?.label ?? "";

/** An ambience loop's name; the catalog's `silent` loop and `none` both read "Silent". */
export const ambientLabel = (key: string): string =>
  AMBIENT_TRACKS.find((track) => track.key === (key === "silent" ? "none" : key))?.label ?? key;

const ambientKey = (label: string): string => AMBIENT_TRACKS.find((track) => track.label === label)?.key ?? label;

const featuredKey = (label: string): string => FEATURED_TRACKS.find((track) => track.label === label)?.key ?? label;

const moodOf = (label: string): MusicMood | undefined => MUSIC_MOODS.find((mood) => playlistLabel(mood) === label);

const locationMusicKey = (label: string): string | undefined => LOCATION_MUSIC.find((key) => playlistLabel(key) === label);

/**
 * Every ambience loop as a button grid, opened under the Ambient button: the playing loop is lit and the site's
 * own loop is marked. Picking one plays it and closes the grid.
 */
const AmbientGrid = ({ at, current, siteTrack, onPick, onClose }: {
  at: { readonly x: number; readonly y: number };
  current: string;
  siteTrack: string;
  onPick: (track: string) => void;
  onClose: () => void;
}): ReactElement => (
  <Overlay onClose={onClose}>
    <div className="lab-modal lab-ambient-grid" style={{ left: Math.min(at.x, 1920 - AMBIENT_GRID_WIDTH - 8), top: at.y }}>
      <span className="lab-modal-title">Ambient track</span>
      <div className="lab-ambient-grid-tracks">
        {AMBIENT_TRACKS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`lab-btn${label === current ? " primary" : ""}${label === siteTrack ? " site" : ""}`}
            title={label === siteTrack ? "The site's own ambience" : undefined}
            onClick={() => {
              onPick(label);
              onClose();
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  </Overlay>
);

const RowLabel = ({ icon, label }: { icon: IconName; label: string }): ReactElement => (
  <span className="lab-mixer-label" title={label}>
    <Icon name={icon} title={label} />
  </span>
);

/**
 * Music and Featured share a row because only one of them plays at a time. The playlist shows what TTS is
 * playing; changes go to TTS. Featured tracks only play on demand (▶). Ambient shows the playing loop, with the
 * site's own loop marked in the picker.
 */
export const SoundMixer = ({ indoors, sceneAmbience, live }: {
  indoors: boolean;
  sceneAmbience: string;
  /** What TTS is playing (or a preview's draft sound). */
  live: SoundView;
}): ReactElement => {
  const [ambientGridAt, setAmbientGridAt] = useState<{ x: number; y: number } | null>(null);
  const command = useScenesCommand();
  const laneSetter = (lane: SoundLane) => (next: number) => command({ op: "laneVolume", lane, volume: next / 100 });
  const music = useLiveLevel(live.levels.music, laneSetter("music"));
  const featuredLevel = useLiveLevel(live.levels.featured, laneSetter("featured"));
  const rain = useLiveLevel(live.levels.rain, laneSetter("rain"));
  const wind = useLiveLevel(live.levels.wind, laneSetter("wind"));
  const thunder = useLiveLevel(live.levels.thunder, laneSetter("thunder"));
  const ambience = useLiveLevel(live.levels.location, laneSetter("location"));
  const [featuredPick, setFeaturedPick] = useState<string | null>(null);
  const playlist = commanded(live.playlist, (next) => {
    const mood = moodOf(next);
    const site = locationMusicKey(next);
    command(mood ? { op: "musicMood", mood } : site ? { op: "locationMusic", key: site } : { op: "musicSilent" });
  });
  const ambientTrack = commanded(live.ambient ? ambientLabel(live.ambient) : "Silent", (next) => command({ op: "ambience", key: ambientKey(next) }));
  const featured = live.featuredPlaying;
  const featuredTrack = featuredPick ?? featuredLabel(live.featuredKey);
  const pickFeatured = (label: string): void => {
    setFeaturedPick(label);
    if (featured) {
      command({ op: "featuredPlay", key: featuredKey(label) });
    }
  };
  const toggleFeatured = (): void =>
    command(featured ? { op: "featuredStop" } : { op: "featuredPlay", key: featuredKey(featuredTrack) });
  return (
    <div className="lab-mixer">
      <div className="lab-mixer-row">
        <RowLabel icon="music" label="Music" />
        <MixerGroup playing={live.playing.music} values={[playlist, music]}>
          <select className="lab-select" value={playlist.value} onChange={(event) => playlist.set(event.target.value)}>
            <optgroup label="Mood">
              {MOOD_PLAYLISTS.map((name) => <option key={name}>{name}</option>)}
            </optgroup>
            <optgroup label="Location">
              {LOCATION_PLAYLISTS.map((name) => <option key={name}>{name}</option>)}
            </optgroup>
            <option>Silent</option>
          </select>
          <Slider level={music} />
        </MixerGroup>
        <MixerGroup playing={featured} values={[featuredLevel]}>
          <select className="lab-select" value={featuredTrack} title="Featured track" onChange={(event) => pickFeatured(event.target.value)}>
            {FEATURED_TRACKS.map(({ key, label }) => <option key={key}>{label}</option>)}
          </select>
          <button
            type="button"
            className={`lab-btn lab-mixer-play${featured ? " primary" : ""}`}
            title={featured ? "Stop the featured track" : "Play the featured track"}
            onClick={toggleFeatured}
          >
            {featured ? "■" : "▶"}
          </button>
          <Slider level={featuredLevel} />
        </MixerGroup>
      </div>
      <div className="lab-mixer-row" title={indoors ? "Indoors: weather sounds are not playing" : undefined}>
        <RowLabel icon="weather" label="Weather" />
        <MixerGroup playing={!indoors && live.playing.rain} values={[rain]}>
          <Icon name="rain" className="lab-mixer-icon" title="Rain" />
          <Slider level={rain} />
        </MixerGroup>
        <MixerGroup playing={live.playing.wind} values={[wind]}>
          <Icon name="wind" className="lab-mixer-icon" title="Wind" />
          <Slider level={wind} />
        </MixerGroup>
        <MixerGroup playing={!indoors && live.playing.thunder} values={[thunder]}>
          <Icon name="thunder" className="lab-mixer-icon" title="Thunder" />
          <Slider level={thunder} />
        </MixerGroup>
      </div>
      <div className="lab-mixer-row">
        <RowLabel icon="ambient" label="Ambient" />
        <MixerGroup playing={live.playing.location} values={[ambientTrack, ambience]}>
          <button
            type="button"
            className="lab-select lab-ambient-pick"
            title="Ambient track: click to choose another"
            onClick={(event) => {
              const canvas = event.currentTarget.closest(".lab-canvas");
              if (!canvas) {
                throw new Error("Ambient grid needs the Scenes canvas.");
              }
              const button = event.currentTarget.getBoundingClientRect();
              const origin = canvas.getBoundingClientRect();
              setAmbientGridAt({ x: button.left - origin.left, y: button.bottom - origin.top + 6 });
            }}
          >
            {ambientTrack.value} ▾
          </button>
          <Slider level={ambience} />
        </MixerGroup>
      </div>
      {ambientGridAt && (
        <AmbientGrid
          at={ambientGridAt}
          current={ambientTrack.value}
          siteTrack={sceneAmbience}
          onPick={ambientTrack.set}
          onClose={() => setAmbientGridAt(null)}
        />
      )}
      <button type="button" className="lab-mixer-mute" title="Silence every sound layer in TTS" onClick={() => command({ op: "stopAll" })}>
        <Icon name="mute" />
      </button>
    </div>
  );
};

/* ---------- Stage queue: pop-up over the stage board while stage edits wait ---------- */

/** The stage queue's lines and what Send, × and Clear do. */
export type StageQueueView = {
  readonly lines: readonly { readonly id: number; readonly text: string }[];
  readonly send: () => void;
  readonly remove: (id: number) => void;
  readonly clear: () => void;
};

/**
 * Stage board edits waiting for Send, listed in order; it shows only while something waits, in the stage's top
 * right corner (under the help button).
 */
export const StageQueue = ({ right, top, connected, live: view }: { right: number; top: number; connected: boolean; live: StageQueueView }): ReactElement | null => {
  const { lines } = view;
  if (lines.length === 0) {
    return null;
  }
  return (
    <div className="lab-queue stage-queue" style={{ right, top }}>
      <ol className="lab-queue-list">
        {lines.map((line) => (
          <li key={line.id}>
            <span>{line.text}</span>
            <button type="button" className="lab-queue-remove" title="Remove from the queue" onClick={() => view.remove(line.id)}>
              ×
            </button>
          </li>
        ))}
      </ol>
      <div className="lab-queue-actions">
        <button type="button" className="lab-btn" onClick={view.clear}>Clear</button>
        <button
          type="button"
          className="lab-btn primary"
          disabled={!connected}
          title={connected ? undefined : "TTS is not connected"}
          onClick={view.send}
        >
          {`Send ${lines.length} change${lines.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
};

/* ---------- Phases: bar under the top strip ---------- */

type Phase = "Intermission" | "Play" | "Spotlight" | "End";
const NEXT_PHASE: Record<Phase, Phase> = { Intermission: "Play", Play: "Spotlight", Spotlight: "End", End: "Intermission" };
const ARM_MS = 2500;

/** A button that only acts on a second click (a double-click works too); it disarms itself after a moment. */
export const ConfirmButton = ({ label, className = "", onConfirm, style, title }: {
  label: string;
  className?: string;
  onConfirm: () => void;
  style?: CSSProperties;
  /** What the button does; "click twice" is added. */
  title?: string;
}): ReactElement => {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) {
      return undefined;
    }
    const timer = window.setTimeout(() => setArmed(false), ARM_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      className={`${className}${armed ? " armed" : ""}`}
      style={style}
      title={title ? `${title} (click twice to confirm)` : "Click twice to confirm"}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? `Confirm: ${label}` : label}
    </button>
  );
};

/** A carousel seat is the 24px headshot inside a 2px border; the gap is set here so the ring's step always matches it. */
const CAROUSEL_SEAT = 28;
const CAROUSEL_GAP = 4;
const CAROUSEL_PITCH = CAROUSEL_SEAT + CAROUSEL_GAP;

/** Mirrors the TTS Spotlight controls: PCs keep their places; ‹ and › (or a click) move the glowing ring. */
export const SpotlightCarousel = ({ live: { order, front } }: { live: SpotlightView }): ReactElement => {
  const command = useScenesCommand();
  const setFront = (index: number): void => {
    const pc = order[index];
    if (pc) {
      command({ op: "spotlightFront", color: pc.color });
    }
  };
  const step = (by: number): void => command({ op: "spotlightRotate", delta: by });
  const lit = order[front];
  return (
    <span className="lab-carousel">
      <button type="button" className="lab-carousel-step" title="Previous PC" onClick={() => step(-1)}>‹</button>
      <span className="lab-carousel-track" style={{ gap: CAROUSEL_GAP }}>
        {order.map((pc, index) => (
          <button
            key={pc.color}
            type="button"
            className={`lab-carousel-pc${index === front ? " front" : ""}`}
            style={{ "--seat-color": SEAT_ACCENT[pc.color] } as CSSProperties}
            title={index === front ? `${pc.color} has the spotlight` : `Give ${pc.color} the spotlight`}
            onClick={() => setFront(index)}
          >
            <Headshot className="lab-carousel-head" characterKey={pc.characterKey} />
          </button>
        ))}
        <span
          className="lab-carousel-ring"
          style={{ transform: `translateX(${front * CAROUSEL_PITCH}px)`, "--seat-color": lit ? SEAT_ACCENT[lit.color] : undefined } as CSSProperties}
        />
      </span>
      <button type="button" className="lab-carousel-step" title="Next PC" onClick={() => step(1)}>›</button>
    </span>
  );
};

/** TTS's phase bar state (`phase` and `seats` world slices). */
export type LivePhase = {
  readonly phase: string;
  readonly subPhase?: string;
  readonly sessionNum?: number;
  readonly sessionName: string;
  readonly spotlight: SpotlightView;
  /** The Memoriam slider's right end. */
  readonly presentYear?: number;
  /** During a Memoriam: the scene leaving it returns to (none: Downtime). */
  readonly memoriamReturn?: string;
};

const isPhase = (value: string): value is Phase => value in NEXT_PHASE;

/** A scene by library key and the title shown. */
export type SceneRef = { readonly key: string; readonly title: string };

/** Scenes live in TTS: the one on the table, plus every ongoing scene and any put on deck, to switch to in one click. */
export type LiveScenes = { readonly live: readonly DeckScene[]; readonly current: SceneRef | null };

/** A scene library row as the picker lists it; `editing` has a preview open, `saved: false` is a new scene's draft. */
export type LibraryEntry = SceneRef & { readonly status: SceneStatus; readonly location?: LabLocation; readonly editing?: boolean; readonly saved?: boolean };

/** Library housekeeping in the scene picker; `note` explains a library that could not load or copy from TTS. */
export type LibraryActions = {
  readonly rename: (key: string, title: string) => void;
  readonly setStatus: (key: string, status: SceneStatus) => void;
  /** Puts a new scene or template on the deck, or takes it off (ongoing scenes are always on it). */
  readonly setOnDeck: (key: string, on: boolean) => void;
  readonly remove: (key: string) => void;
  readonly move: (key: string, by: -1 | 1) => void;
  readonly note?: { readonly text: string; readonly retry?: () => void };
};

/**
 * The table's scene and the library: linked means TTS writes the live scene into its library row. Unlink stops
 * that; Fork keeps a snapshot in the old row (optionally renamed) and carries on in a new row.
 */
export type LinkMenu = {
  readonly linked: boolean;
  readonly onUnlink: () => void;
  readonly onFork: (newTitle: string, oldTitle: string) => void;
};

/** Edits stay in the field until Enter or leaving it, then send once; Escape restores TTS's value, as does a push. */
const CommitInput = ({ value, onCommit, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue"> & {
  value: string;
  onCommit: (text: string) => void;
}): ReactElement => (
  <input
    {...rest}
    key={value}
    defaultValue={value}
    onBlur={(event) => {
      if (event.target.value !== value) {
        onCommit(event.target.value);
      }
    }}
    onKeyDown={(event) => {
      if (event.key === "Enter") {
        event.currentTarget.blur();
      }
      if (event.key === "Escape") {
        event.currentTarget.value = value;
        event.currentTarget.blur();
      }
    }}
  />
);

/** Holding the left button this long turns a click into a hold, so a quick click never shows the fill. */
const HOLD_DELAY_MS = 180;
/** How long the red fill takes to cross a deck scene once the hold has started. */
const HOLD_FILL_MS = 1200;

/**
 * Press and hold with the left button: after `HOLD_DELAY_MS` the element is `holding` (its CSS fill runs for
 * `HOLD_FILL_MS`) and `onHold` fires when it is full. Releasing or leaving first cancels. `wasHold` tells the click
 * that follows a hold to do nothing.
 */
const useHoldToConfirm = (onHold: () => void): {
  holding: boolean;
  wasHold: () => boolean;
  handlers: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onPointerCancel: () => void;
  };
} => {
  const [holding, setHolding] = useState(false);
  const timers = useRef<number[]>([]);
  const held = useRef(false);
  useEffect(() => {
    const pending = timers;
    return () => pending.current.forEach((id) => window.clearTimeout(id));
  }, []);
  const cancel = (): void => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setHolding(false);
  };
  return {
    holding,
    wasHold: () => {
      const was = held.current;
      held.current = false;
      return was;
    },
    handlers: {
      onPointerDown: (event) => {
        if (event.button !== 0) {
          return;
        }
        cancel();
        held.current = false;
        timers.current = [
          window.setTimeout(() => {
            held.current = true;
            setHolding(true);
          }, HOLD_DELAY_MS),
          window.setTimeout(() => {
            cancel();
            onHold();
          }, HOLD_DELAY_MS + HOLD_FILL_MS)
        ];
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel
    }
  };
};

/**
 * A live scene on the deck: ongoing (green) or a new scene or template (gold). Click plays it, right-click opens
 * its preview, and holding the left button fills it red, then ends it (ongoing) or takes it off the deck.
 */
const DeckChip = ({ scene, onPlay, onEdit, onHold }: {
  scene: DeckScene;
  onPlay: (at: Point) => void;
  onEdit: () => void;
  onHold: () => void;
}): ReactElement => {
  const hold = useHoldToConfirm(onHold);
  const ongoing = scene.status === "ongoing";
  return (
    <button
      type="button"
      className={`lab-phase-deck ${ongoing ? "ongoing" : "fresh"}${hold.holding ? " holding" : ""}`}
      style={{ "--hold-ms": `${HOLD_FILL_MS}ms` } as CSSProperties}
      title={ongoing
        ? `Go back to ${scene.title} at its own time. Hold to end it; right-click to edit it.`
        : `Start ${scene.title}. Hold to take it off the deck; right-click to edit it.`}
      {...hold.handlers}
      onClick={(event) => {
        if (!hold.wasHold()) {
          onPlay(canvasPoint(event));
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onEdit();
      }}
    >
      <span className="lab-phase-deck-text">{scene.title}</span>
    </button>
  );
};

/**
 * Two rows. The top row has the phase name at the far left, the table's scene (Play; click it for Unlink and
 * Fork) or the next session's number and title (Intermission) in the middle, and the phase buttons at the right
 * (in Spotlight the carousel takes over the stage). The row beneath holds the deck, centered: a `DeckChip` for each
 * other live scene. Clicking an ongoing scene switches to it at once, back at its own time; a new one first asks how
 * to set the clock (`useSceneEntry`). Chips shrink (ellipsized) when the deck is too wide and grow back while
 * hovered. In Play, Scene ▸ opens the scene library (which also holds End Scene and Memoriam); in a Memoriam
 * it becomes Return ▸ (back to the scene it interrupted) or Downtime ▸. The right-hand button always names the
 * next phase; leaving a Memoriam and advancing need a second click.
 */
export const PhaseStrip = ({ library, libraryActions, scenes, linkMenu, onSwitch, onEndScene, onEndDeckScene, onRemoveFromDeck, onPlay, onEdit, onPrepare, live }: {
  library: readonly LibraryEntry[];
  libraryActions?: LibraryActions;
  scenes: LiveScenes;
  linkMenu?: LinkMenu;
  onSwitch: PlayScene;
  onEndScene: () => void;
  /** Ends an ongoing scene that is not on the table (it leaves the deck for the archive). */
  onEndDeckScene: (key: string) => void;
  /** Takes a new scene or template off the deck (the library keeps it). */
  onRemoveFromDeck: (key: string) => void;
  onPlay: PlayScene;
  onEdit: (key: string) => void;
  /** A new scene at this location, titled "District — Site". */
  onPrepare: (location: LabLocation, districtName: string, siteName: string) => void;
  /** TTS's phase, session, and spotlight. */
  live: LivePhase;
}): ReactElement => {
  const [linkAt, setLinkAt] = useState<Point | null>(null);
  const [modal, setModal] = useState<"scene" | "memoriam" | null>(null);
  const entry = useSceneEntry();
  const phase: Phase = isPhase(live.phase) ? live.phase : "Intermission";
  const session = { number: live.sessionNum ?? 1, title: live.sessionName };
  const subPhase = live.subPhase ?? "Main";
  const command = useScenesCommand();
  const next = NEXT_PHASE[phase];
  return (
    <div className="lab-phase">
      <div className="lab-phase-top">
        <span className="lab-phase-tag">
          {phase}
          {phase === "Play" && <span className="lab-phase-sub">{subPhase}</span>}
        </span>
        <span className="lab-phase-now">
          {phase === "Play" && (scenes.current && linkMenu ? (
            <button type="button" className="lab-phase-scene" title="Unlink or fork this scene" onClick={(event) => setLinkAt(canvasPoint(event))}>
              {scenes.current.title}
              {!linkMenu.linked && <span className="lab-phase-unlinked" title="The table no longer writes into this scene's library copy">unlinked</span>}
            </button>
          ) : scenes.current ? (
            <span className="lab-phase-scene">{scenes.current.title}</span>
          ) : null)}
          {phase === "Intermission" && (
            <span className="lab-phase-session">
              <label>
                Session
                <CommitInput
                  type="number"
                  className="lab-select lab-phase-session-number"
                  min={1}
                  value={String(session.number)}
                  onCommit={(text) => command({ op: "sessionNum", num: Number(text) })}
                />
              </label>
              <CommitInput
                className="lab-select lab-phase-session-title"
                placeholder="Session title"
                value={session.title}
                onCommit={(text) => command({ op: "sessionName", name: text.trim() })}
              />
            </span>
          )}
        </span>
        <span className="lab-phase-advance">
          {phase === "Play" && (subPhase === "Memoriam" ? (
            <ConfirmButton
              label={live.memoriamReturn ? "Return ▸" : "Downtime ▸"}
              className="lab-btn"
              title={live.memoriamReturn
                ? `Leave the Memoriam and go back to ${live.memoriamReturn}`
                : "Leave the Memoriam for Downtime, with no scene on the table"}
              onConfirm={() => command({ op: "leaveMemoriam" })}
            />
          ) : (
            <button type="button" className="lab-btn" title="Play a scene, end this one, or start a Memoriam" onClick={() => setModal("scene")}>
              Scene ▸
            </button>
          ))}
          <ConfirmButton key={phase} label={`${next} ▸`} className="lab-btn primary" onConfirm={() => command({ op: "phaseAdvance" })} />
        </span>
      </div>
      <div className="lab-phase-decks">
        {phase === "Play" && scenes.live.filter((scene) => scene.key !== scenes.current?.key).map((scene) => (
          <DeckChip
            key={scene.key}
            scene={scene}
            onPlay={(at) => entry.enter(scene.key, at, (clock, edit) => onSwitch(scene.key, clock, edit))}
            onEdit={() => onEdit(scene.key)}
            onHold={() => (scene.status === "ongoing" ? onEndDeckScene(scene.key) : onRemoveFromDeck(scene.key))}
          />
        ))}
      </div>
      {modal === "scene" && (
        <SceneModal
          library={library}
          actions={libraryActions}
          scenes={scenes}
          onClose={() => setModal(null)}
          onEndScene={() => {
            setModal(null);
            onEndScene();
          }}
          {...(live.presentYear !== undefined ? { onMemoriam: () => setModal("memoriam") } : {})}
          onPlay={(key, at) => {
            setModal(null);
            entry.enter(key, at, (clock, edit) => onPlay(key, clock, edit));
          }}
          onEdit={(key) => {
            setModal(null);
            onEdit(key);
          }}
          onPrepare={(location, districtName, siteName) => {
            setModal(null);
            onPrepare(location, districtName, siteName);
          }}
        />
      )}
      {linkAt && linkMenu && scenes.current && (
        <LinkMenuPopover at={linkAt} menu={linkMenu} title={scenes.current.title} onClose={() => setLinkAt(null)} />
      )}
      {modal === "memoriam" && live.presentYear !== undefined && (
        <MemoriamModal
          presentYear={live.presentYear}
          onClose={() => setModal(null)}
          onAdvance={(payload) => command({ op: "memoriam", payload })}
        />
      )}
      {entry.modal}
    </div>
  );
};

const locationText = (data: ChronicleLocations | null, location: LabLocation | undefined): string => {
  if (!location) {
    return "";
  }
  const found = data ? resolveLocation(data, location) : null;
  return found && typeof found !== "string" ? `${found.district.name} · ${siteLabel(found.site)}` : `${location.districtKey} · ${location.siteKey}`;
};

/** Ongoing scenes (green) are always on deck; a new scene's or template's star (gold) puts it on or takes it off. */
const DeckStar = ({ entry, onDeck, actions }: { entry: LibraryEntry; onDeck: boolean; actions: LibraryActions | undefined }): ReactElement =>
  entry.status === "ongoing" ? (
    <span className="lab-star ongoing on" title="Ongoing: always on the deck until it is ended">★</span>
  ) : (
    <button
      type="button"
      className={`lab-star fresh${onDeck ? " on" : ""}`}
      disabled={!actions || entry.saved === false}
      title={entry.saved === false ? "Save the scene to put it on the deck" : onDeck ? "Take it off the deck" : "Put it on the deck"}
      onClick={() => actions?.setOnDeck(entry.key, !onDeck)}
    >
      {onDeck ? "★" : "☆"}
    </button>
  );

/**
 * The scene library: search by title or place. Each row's star shows whether it is on the deck (`DeckStar`), and
 * deck scenes sort to the top (ongoing first). Play (an ongoing scene switches at once; a new one asks how to set
 * the clock), Edit (opens a preview) and housekeeping (reorder, rename, delete with a second click). Templates
 * show in brackets and play as a dated copy. Ended scenes wait in the archive, where their status can be changed.
 * The header holds End Scene (the table's scene, then Downtime) and Memoriam; "Prepare a new scene" picks its
 * location first.
 */
const SceneModal = ({ library, actions, scenes, onClose, onPlay, onEdit, onPrepare, onEndScene, onMemoriam }: {
  library: readonly LibraryEntry[];
  actions?: LibraryActions;
  scenes: LiveScenes;
  onClose: () => void;
  onPlay: (key: string, at: Point) => void;
  onEdit: (key: string) => void;
  onPrepare: (location: LabLocation, districtName: string, siteName: string) => void;
  onEndScene: () => void;
  /** Absent while TTS has no present day. */
  onMemoriam?: () => void;
}): ReactElement => {
  const { data } = useChronicleLocations();
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [archive, setArchive] = useState(false);
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const onDeck = (key: string): boolean => scenes.live.some((scene) => scene.key === key);
  const archived = library.filter((entry) => entry.status === "ended").length;
  const rows = library
    .filter((entry) => (entry.status === "ended") === archive)
    .map((entry) => ({ entry, where: locationText(data, entry.location) }))
    .filter(({ entry, where }) => words.every((word) => `${entry.title} ${where}`.toLowerCase().includes(word)))
    .sort((a, b) => libraryRank(a.entry.status, onDeck(a.entry.key)) - libraryRank(b.entry.status, onDeck(b.entry.key)));
  if (picking && data) {
    return (
      <LocationPicker
        data={data}
        location={library.find((entry) => entry.key === scenes.current?.key)?.location}
        heading="Where does the new scene take place?"
        onPick={(location) => {
          const found = resolveLocation(data, location);
          if (typeof found !== "string") {
            onPrepare(location, found.district.name, siteLabel(found.site));
          }
        }}
        onClose={() => setPicking(false)}
      />
    );
  }
  return (
    <Overlay onClose={onClose}>
      <div className="lab-modal lab-advance">
        <span className="lab-advance-head">
          <span className="lab-modal-title">{archive ? "Ended scenes" : "Play a scene"}</span>
          <span className="lab-row">
            <button
              type="button"
              className="lab-btn"
              disabled={!onMemoriam}
              title={onMemoriam ? "Set up a Memoriam" : "TTS has no present day yet"}
              onClick={onMemoriam}
            >
              Memoriam…
            </button>
            {scenes.current ? (
              <ConfirmButton label="End Scene" className="lab-btn danger" title={`End ${scenes.current.title} and go to Downtime`} onConfirm={onEndScene} />
            ) : (
              <button type="button" className="lab-btn danger" title="No scene on the table" disabled>End Scene</button>
            )}
          </span>
        </span>
        {actions?.note && (
          <span className="lab-advance-note">
            {actions.note.text}
            {actions.note.retry && <button type="button" className="lab-btn" onClick={actions.note.retry}>Try again</button>}
          </span>
        )}
        <input
          className="lab-select lab-advance-search"
          placeholder="Search the scene library…"
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ul className="lab-advance-list">
          {rows.map(({ entry, where }) => {
            const onTable = entry.key === scenes.current?.key;
            const index = library.indexOf(entry);
            return (
              <li key={entry.key} className={onTable ? "live" : onDeck(entry.key) ? "prep" : undefined}>
                {!archive && <DeckStar entry={entry} onDeck={onDeck(entry.key)} actions={actions} />}
                <span className="lab-advance-name">
                  {renaming === entry.key && actions ? (
                    <input
                      className="lab-select"
                      autoFocus
                      defaultValue={entry.title}
                      onBlur={(event) => {
                        const text = event.target.value.trim();
                        setRenaming(null);
                        if (text && text !== entry.title) {
                          actions.rename(entry.key, text);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.currentTarget.value = entry.title;
                        }
                        if (event.key === "Enter" || event.key === "Escape") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    <span>
                      {displayTitle(entry)}
                      {onTable && " (on the table)"}
                      {entry.editing && <span className="lab-advance-editing">{entry.saved === false ? "new · being prepared" : "being edited"}</span>}
                    </span>
                  )}
                  {where && <span className="lab-advance-where">{where}</span>}
                </span>
                <span className="lab-row">
                  {actions && entry.saved !== false && (
                    <>
                      <button type="button" className="lab-btn icon" title="Move up" disabled={index <= 0} onClick={() => actions.move(entry.key, -1)}>▲</button>
                      <button type="button" className="lab-btn icon" title="Move down" disabled={index >= library.length - 1} onClick={() => actions.move(entry.key, 1)}>▼</button>
                      <button type="button" className="lab-btn icon" title="Rename" onClick={() => setRenaming(entry.key)}>✎</button>
                      {onTable ? (
                        <button type="button" className="lab-btn danger" disabled title="End the scene before deleting it">Delete</button>
                      ) : (
                        <ConfirmButton label="Delete" className="lab-btn danger" onConfirm={() => actions.remove(entry.key)} />
                      )}
                    </>
                  )}
                  <button type="button" className="lab-btn" onClick={() => onEdit(entry.key)}>Edit</button>
                  {archive ? (
                    actions && (
                      <select
                        className="lab-select"
                        value="ended"
                        title="Change this scene's status to bring it back"
                        onChange={(event) => actions.setStatus(entry.key, event.target.value as SceneStatus)}
                      >
                        <option value="ended" disabled>Ended</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="new">New</option>
                        <option value="template">Template</option>
                      </select>
                    )
                  ) : (
                    <button
                      type="button"
                      className="lab-btn live"
                      disabled={onTable}
                      title={entry.status === "ongoing" ? "Go back to this scene at its own time" : entry.status === "template" ? "Play a fresh copy of this template" : undefined}
                      onClick={(event) => onPlay(entry.key, canvasPoint(event))}
                    >
                      Play
                    </button>
                  )}
                </span>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="lab-note">{archive ? "No scene has been ended." : library.length === 0 ? "The library is empty." : "No scene matches."}</li>
          )}
        </ul>
        <span className="lab-row lab-advance-foot">
          {!archive && <button type="button" className="lab-btn" disabled={!data} onClick={() => setPicking(true)}>+ Prepare a new scene…</button>}
          <button type="button" className="lab-btn" onClick={() => setArchive(!archive)}>
            {archive ? "Back to the library" : `Archive (${archived})`}
          </button>
        </span>
      </div>
    </Overlay>
  );
};

/** Unlink / Fork for the table's scene; Fork names the scene the table carries on in, and the snapshot it leaves. */
const LinkMenuPopover = ({ at, menu, title, onClose }: { at: Point; menu: LinkMenu; title: string; onClose: () => void }): ReactElement => {
  const [forking, setForking] = useState(false);
  const [newTitle, setNewTitle] = useState(`${title} (continued)`);
  const [oldTitle, setOldTitle] = useState(title);
  return (
    <Overlay onClose={onClose}>
      <div className="lab-modal lab-link-menu" style={{ left: Math.min(at.x, 1920 - 420), top: at.y + 12 }}>
        {forking ? (
          <>
            <span className="lab-modal-title">Fork “{title}”</span>
            <label>
              The table carries on as
              <input className="lab-select" autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
            </label>
            <label>
              The library keeps a snapshot of now as
              <input className="lab-select" value={oldTitle} onChange={(event) => setOldTitle(event.target.value)} />
            </label>
            <span className="lab-row">
              <button
                type="button"
                className="lab-btn primary"
                disabled={!newTitle.trim()}
                onClick={() => {
                  menu.onFork(newTitle.trim(), oldTitle.trim());
                  onClose();
                }}
              >
                Fork
              </button>
              <button type="button" className="lab-btn" onClick={onClose}>Cancel</button>
            </span>
          </>
        ) : (
          <>
            <span className="lab-note">
              {menu.linked
                ? "Linked: the table writes this scene into its library copy as it plays."
                : "Unlinked: the library copy stays as it was; the table no longer writes into it."}
            </span>
            <button
              type="button"
              className="lab-btn"
              disabled={!menu.linked}
              onClick={() => {
                menu.onUnlink();
                onClose();
              }}
            >
              Unlink from the library
            </button>
            <button type="button" className="lab-btn" onClick={() => setForking(true)}>Fork…</button>
          </>
        )}
      </div>
    </Overlay>
  );
};
