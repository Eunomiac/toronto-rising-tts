import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type DragEvent, type InputHTMLAttributes, type MouseEvent, type PointerEvent, type ReactElement, type ReactNode } from "react";
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
import { SEAT_ACCENT } from "../pcSheet/layout";
import { Icon, type IconName } from "./icons";
import { groupColor, groupLeader, setRosterLayout, useRosterLayout, useSceneCatalogs, type RosterCategory } from "./labRoster";
import { SceneNotes } from "./labNotes";
import {
  INTENSITIES,
  eligibleFlavors,
  flavorOdds,
  intensityOdds,
  netModifiers,
  sample,
  type Flavor,
  type HuntOutcome,
  type Intensity,
  type Odds
} from "./huntOdds";
import { Btn, Overlay, canvasPoint } from "./sketch";
import { useScenesCommand, type ScenesSend, type SoundLane } from "../scenesPanel/commands";
import { fromDate, type SoundView, type SpotlightView } from "../scenesPanel/liveScene";

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

type RingOption<T> = { readonly value: T; readonly label: string };
type Point = { readonly x: number; readonly y: number };

/** Choices spread evenly around the click point; the current choice is highlighted. Clicking off closes it. */
const RingMenu = <T,>({ at, options, current, onPick, onClose }: {
  at: Point;
  options: readonly RingOption<T>[];
  current: T;
  onPick: (value: T) => void;
  onClose: () => void;
}): ReactElement => (
  <Overlay onClose={onClose}>
    <div className="lab-ring" style={{ left: Math.min(Math.max(at.x, RING_EDGE), 1920 - RING_EDGE), top: Math.max(at.y, 86) }}>
      {options.map((option, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / options.length;
        return (
          <button
            key={String(option.value)}
            type="button"
            className={`lab-ring-item spoke${option.value === current ? " current" : ""}`}
            style={{ left: Math.cos(angle) * 112, top: Math.sin(angle) * 64, "--i": index } as CSSProperties}
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

/**
 * District and Site names with their resonances over the Site card's illustration; click to change either
 * (an override of the scene's location).
 */
export const LocationPanel = ({ location, overridden, onChange, onRelease, readOnly = false }: {
  location: LabLocation;
  overridden: boolean;
  onChange: (next: LabLocation) => void;
  onRelease: () => void;
  readOnly?: boolean;
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
    <div
      className={`lab-where${overridden ? " lab-overridden" : ""}`}
      title={readOnly ? undefined : "Click to change the District or Site"}
      style={{ backgroundImage: `url("${cardUrl(`Sites/${site.key}.webp`)}")` }}
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

type NpcGroup = {
  readonly key: string;
  readonly label: string;
  readonly labelWidth: number;
  readonly members: readonly CatalogCharacter[];
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

const GROUP_DRAG_TYPE = "application/x-tr-npc-group";

/**
 * Drags show a copy of the group cell held off-screen. Chrome's own drag picture of an element inside a scrolled
 * list can take in whatever lies under it (the categories below), so it is not used.
 */
const setGroupDragImage = (event: DragEvent<HTMLElement>): void => {
  const source = event.currentTarget;
  const holder = document.createElement("div");
  holder.className = "lab-canvas lab-drag-ghost";
  const copy = source.cloneNode(true) as HTMLElement;
  copy.style.width = `${source.offsetWidth}px`;
  holder.append(copy);
  document.body.append(holder);
  const rect = source.getBoundingClientRect();
  event.dataTransfer.setDragImage(copy, event.clientX - rect.left, event.clientY - rect.top);
  window.setTimeout(() => holder.remove(), 0);
};
const NEW_CATEGORY_COLOR = "#9c7bd6";
const UNSORTED_GROUP_COLOR = "#7a7a86";

const GROUP_EDITOR_WIDTH = 270;

/**
 * A group's colour and leader. The colour starts from the category's until the group is given its own (↺ goes
 * back); the leader defaults to the chronicle sheet's boss and can be anyone in the group, or nobody.
 */
const GroupEditor = ({ group, at, color, own, leader, onColor, onLeader, onClose }: {
  group: NpcGroup;
  at: Point;
  color: string;
  own: boolean;
  leader: string | undefined;
  onColor: (next: string | null) => void;
  onLeader: (characterKey: string) => void;
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
      <label className="lab-group-edit-row">
        <span>Leader</span>
        <select className="lab-select" value={leader ?? ""} onChange={(event) => onLeader(event.target.value)}>
          <option value="">No leader</option>
          {group.members.map((npc) => <option key={npc.characterKey} value={npc.characterKey}>{npc.fullName}</option>)}
        </select>
      </label>
    </div>
  </Overlay>
);

/** Category header: twirl to show or hide its groups; drop a group on it to file the group there. */
const CategoryHeader = ({ category, count, onToggle, onDrop, onRemove }: {
  category: RosterCategory | null;
  count: number;
  onToggle?: () => void;
  onDrop: (groupKey: string) => void;
  onRemove?: () => void;
}): ReactElement => {
  const [over, setOver] = useState(false);
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
      <span className="lab-cat-name">{category ? category.name : "Unsorted"}</span>
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
 */
export const MasonryRoster = (): ReactElement => {
  const { catalogs, error } = useSceneCatalogs();
  const [open, setOpen] = useState<string | null>("beesHive");
  const layout = useRosterLayout();
  const [draft, setDraft] = useState<{ name: string; color: string } | null>(null);
  const [editing, setEditing] = useState<{ key: string; at: Point } | null>(null);
  const [dragging, setDragging] = useState(false);
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
    const category: RosterCategory = { id: `cat-${Date.now()}`, name: draft.name.trim(), color: draft.color, open: true };
    setRosterLayout({ ...layout, categories: [...layout.categories, category] });
    setDraft(null);
  };
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
    return [...byKey].map(([key, members]) => {
      const label = catalogs.pickerGroupLabels[key] ?? key;
      return { key, label, labelWidth: groupLabelWidth(label), members };
    });
  }, [catalogs]);

  const leaderFirst = (group: NpcGroup): readonly CatalogCharacter[] => {
    const leader = groupLeader(layout, group.key);
    return [...group.members].sort((a, b) => Number(b.characterKey === leader) - Number(a.characterKey === leader));
  };
  const tokenClass = (group: NpcGroup, npc: CatalogCharacter): string =>
    `lab-group-head${groupLeader(layout, group.key) === npc.characterKey ? " boss" : ""}`;
  const masonry = (list: readonly NpcGroup[]): ReactElement => (
    <div className="lab-masonry">
      {list.map((group) => {
        const color = groupColor(layout, group.key);
        const style = { "--group": color ?? UNSORTED_GROUP_COLOR } as CSSProperties;
        const tinted = color ? " tinted" : "";
        return group.key === open ? (
          <div key={group.key} className={`lab-group open${tinted}`} style={style}>
            <button type="button" className="lab-group-label" onClick={() => setOpen(null)}>{group.label} ▴</button>
            <span className="lab-group-tokens">
              {leaderFirst(group).map((npc) => (
                <span key={npc.characterKey} className="lab-group-token" title={npc.fullName}>
                  <Headshot className={tokenClass(group, npc)} characterKey={npc.characterKey} />
                  <span className="lab-group-name">{npc.fullName}</span>
                </span>
              ))}
            </span>
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
              setGroupDragImage(event);
              setDragging(true);
            }}
            onDragEnd={() => setDragging(false)}
            onClick={() => setOpen(group.key)}
            title={group.members.map((npc) => npc.fullName).join(", ")}
          >
            <span className="lab-group-colors">
              <button
                type="button"
                className={`lab-group-color${group.key in layout.groupColors ? " own" : ""}`}
                title="Group colour and leader"
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
  const knownCategories = new Set(layout.categories.map((category) => category.id));
  const unsorted = groups.filter((group) => !knownCategories.has(layout.assigned[group.key] ?? ""));
  const editingGroup = editing ? groups.find((group) => group.key === editing.key) : undefined;

  return (
    <div className="lab-mroster">
      <div className="lab-mroster-head">
        <Btn tone="primary">Main</Btn>
        <Btn>Generic</Btn>
        <Btn>Memoriam</Btn>
        <span className="lab-search">Search every NPC…</span>
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
      <div className="lab-mroster-body">
        {layout.categories.map((category) => {
          const members = groups.filter((group) => layout.assigned[group.key] === category.id);
          return (
            <section key={category.id} className="lab-cat" style={{ "--cat": category.color } as CSSProperties}>
              <CategoryHeader
                category={category}
                count={members.length}
                onToggle={() => updateCategory(category.id, { open: !category.open })}
                onDrop={fileGroup(category.id)}
                onRemove={() => removeCategory(category.id)}
              />
              {category.open && members.length > 0 && masonry(members)}
            </section>
          );
        })}
        {(unsorted.length > 0 || dragging) && (
          <section className="lab-cat unsorted">
            {layout.categories.length > 0 && <CategoryHeader category={null} count={unsorted.length} onDrop={fileGroup(null)} />}
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
          leader={groupLeader(layout, editingGroup.key)}
          onColor={(next) => setGroupColor(editingGroup.key, next)}
          onLeader={(characterKey) => setGroupLeader(editingGroup.key, characterKey)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

const RAIL_OPEN_MS = 150;
const RAIL_CLOSE_MS = 500;

/**
 * The left column below the hunt roll: scene notes, with the NPC roster folded to a rail along their left
 * edge. Hovering or clicking the rail opens the roster over the notes. It folds back once the pointer has been
 * off it for a moment (not while you are typing in it or one of its pop-ups is open), or on a click elsewhere.
 */
export const RosterDock = ({ scene }: { scene: string }): ReactElement => {
  const layout = useRosterLayout();
  const [open, setOpen] = useState(false);
  const timer = useRef(0);
  const clickedInside = useRef(false);
  const later = (next: boolean, ms: number): void => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (!next && document.activeElement?.matches(".lab-dock-roster :is(input, select), .lab-group-edit :is(input, select)")) {
        return;
      }
      setOpen(next);
    }, ms);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (): void => {
      if (clickedInside.current) {
        clickedInside.current = false;
        return;
      }
      window.clearTimeout(timer.current);
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);
  return (
    <div className="lab-dock">
      <div className="lab-dock-notes">
        <SceneNotes scene={scene} />
      </div>
      <div
        className={`lab-dock-roster${open ? " open" : ""}`}
        onPointerDownCapture={() => {
          clickedInside.current = true;
        }}
        onMouseEnter={() => later(true, open ? 0 : RAIL_OPEN_MS)}
        onMouseLeave={() => later(false, RAIL_CLOSE_MS)}
      >
        {open ? (
          <MasonryRoster />
        ) : (
          <button type="button" className="lab-dock-rail" title="NPC roster" onClick={() => setOpen(true)}>
            <span className="lab-dock-rail-label">NPC Roster</span>
            {layout.categories.map((category) => (
              <span key={category.id} className="lab-dock-rail-cat" style={{ "--cat": category.color } as CSSProperties} title={category.name} />
            ))}
          </button>
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
 * long as its chance; click a flavor to mark it as the one the player is seeking (again to clear). The lower
 * bar is the intensity, darker to brighter. Right-click either bar and both markers slide and settle; the
 * winners widen and glow, the rest fade, and Confirm clears the bars, sets the margin to 0 and the star to normal,
 * and drops the sought flavor (the real build broadcasts the result in TTS).
 */
export const HuntRoller = ({ location }: { location: LabLocation }): ReactElement => {
  const { data } = useChronicleLocations();
  const [margin, setMargin] = useState(3);
  const [outcome, setOutcome] = useState<HuntOutcome>("basic");
  const [target, setTarget] = useState<Flavor | null>(null);
  const [markers, setMarkers] = useState<{ flavor: number; intensity: number } | null>(null);
  const [result, setResult] = useState<HuntResult | null>(null);
  const [barW, setBarW] = useState(0);
  const [fontReady, setFontReady] = useState(false);
  const barRef = useRef<HTMLButtonElement>(null);
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
  const rollOnRightClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    spin();
  };
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
        {margin}
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
        <button
          ref={barRef}
          type="button"
          className="lab-hunt-bar"
          title={settled ? undefined : "Right-click to roll for resonance. Click a flavor to mark it as the one the player is seeking."}
          onContextMenu={rollOnRightClick}
        >
          {flavors.map((flavor, index) => {
            const won = result?.flavor === flavor;
            const name = FLAVOR_LABEL[flavor];
            return (
              <span
                key={flavor}
                className={`lab-hunt-seg ${index % 2 === 0 ? "light" : "dark"}${flavor === seeking ? " sought" : ""}${won ? " won" : ""}`}
                style={segmentFlex(odds[flavor], won, settled, measured ? textWidth(name, FLAVOR_FONT) + WINNER_PAD : 0, barW)}
                title={`${name} ${percent(odds[flavor])}${flavor === seeking ? " (sought)" : ""}`}
                onClick={() => {
                  setTarget(flavor === seeking ? null : flavor);
                  reset();
                }}
              >
                {measured && (won ? name : settled ? "" : segmentText(name, odds[flavor] * barW))}
              </span>
            );
          })}
          {markers && !settled && <span className="lab-hunt-marker" style={{ left: `${markers.flavor * 100}%` }} />}
        </button>
        <button type="button" className="lab-hunt-bar intensity" title={settled ? undefined : "Right-click to roll for resonance"} onContextMenu={rollOnRightClick}>
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
        </button>
      </div>
      {settled && (
        <button
          type="button"
          className="lab-btn primary lab-hunt-confirm"
          title="Clear the bars, the margin, the outcome star, and the sought flavor (the real build broadcasts the result in TTS)"
          onClick={() => {
            reset();
            setMargin(0);
            setOutcome("basic");
            setTarget(null);
          }}
        >
          Confirm
        </button>
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
export const WeatherPanel = ({ at, forceOverride, forceCelsius, live, w, h }: {
  at: Date;
  forceOverride: boolean;
  forceCelsius: number | null;
  /** The weather TTS is playing; the calendar then only supplies temperature and fog. Overrides wait for the TTS command bridge. */
  live?: WeatherAxes;
  w: number;
  h: number;
}): ReactElement => {
  const { data, error } = useWeatherCalendar();
  const hazeId = useId().replace(/[^a-zA-Z0-9]/g, "");
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
  const base: WeatherAxes = live ?? { precip: scheduled.precip, wind: scheduled.wind, thunder: scheduled.thunder };
  const axes: WeatherAxes = override ?? base;
  const overridden = override !== null && !sameAxes(override, base);
  const openRing = (axis: "precip" | "wind") => (event: MouseEvent<HTMLButtonElement>): void => {
    if (!live) {
      setRing({ axis, at: canvasPoint(event) });
    }
  };
  const celsius = forceCelsius ?? scheduled.celsius;
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

const NIGHT_MINUTES = DAWN - DUSK;
const PLAY_MS = 1800;
const FIVE_MINUTES = 300_000;

const easeInOut = (f: number): number => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);

const toMinute = (ms: number): Date => new Date(Math.round(ms / 60_000) * 60_000);

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
 * scene time; scene time can never pass it (the caller moves present day forward). A scene before the
 * present day is a flashback (yellow glow). Drag the moon to pick a time tonight, then press play over the
 * clock to run the time animation. Click anywhere else for the calendar pop-up. With no live scene (presentOnly) the
 * panel shows present day, and the moon, calendar and Move button set present day instead of scene time.
 */
export const WhenPanel = ({ at, present, onChange, onSetPresent, forceOpen, presentOnly = false, live, w, h }: {
  at: Date;
  present: Date;
  onChange: (next: Date) => void;
  onSetPresent: (next: Date) => void;
  forceOpen: boolean;
  presentOnly?: boolean;
  /**
   * TTS's real-time state and tonight's sun times; the caller advances `at`. Changes go to TTS when the Scenes tab
   * provides a command sender; without one the panel is read-only (no calendar, no moon drag).
   */
  live?: { readonly running: boolean; readonly speed: number; readonly dusk?: Date; readonly dawn?: Date };
  w: number;
  h: number;
}): ReactElement => {
  const [open, setOpen] = useState(false);
  const [localRealTime, setRealTime] = useState(false);
  const [localRate, setRate] = useState<RealTimeRate>(2);
  const send = useScenesCommand();
  const command: ScenesSend | null = live && send ? send : null;
  const realTime = live ? live.running : localRealTime;
  const rate = live ? live.speed : localRate;
  const readOnly = live !== undefined && command === null;
  const [draft, setDraft] = useState<Date | null>(null);
  const closeCalendar = (): void => {
    setOpen(false);
    setDraft(null);
  };
  const [rateRing, setRateRing] = useState<Point | null>(null);
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
  const atRef = useRef(at);
  atRef.current = at;
  useEffect(() => {
    if (!realTime || live) {
      return undefined;
    }
    const id = window.setInterval(() => changeRef.current(new Date(atRef.current.getTime() + 1000 * rate)), 1000);
    return () => window.clearInterval(id);
  }, [realTime, rate, live]);
  const minutes = at.getHours() * 60 + at.getMinutes();
  const differs = at.getTime() !== present.getTime();
  const flashback = at.getTime() < present.getTime();
  const tonight = nightFraction(minutes);
  const targetTime = target === null || tonight === null
    ? null
    : new Date(Math.round(shift(at, (target - tonight) * NIGHT_MINUTES).getTime() / FIVE_MINUTES) * FIVE_MINUTES);
  /** Live: TTS animates scene moves itself; present-day moves are instant. */
  const moveTo = (next: Date): void => {
    if (command) {
      command(presentOnly ? { op: "presentDay", datetime: fromDate(next) } : { op: "clockTo", datetime: fromDate(next) });
    } else if (presentOnly) {
      onSetPresent(next);
    } else {
      setPlaying({ from: at.getTime(), to: next.getTime() });
    }
  };
  const play = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    if (targetTime) {
      moveTo(targetTime);
    }
    setTarget(null);
  };
  return (
    <>
      <div className={`lab-when${flashback ? " lab-flashback" : ""}`} onClick={() => setOpen(!readOnly)}>
        <NightSky minutes={minutes} w={w} h={h} drag={{ target: playing ? null : target, onDrag: readOnly ? () => undefined : setTarget }} />
        <span className={`lab-when-present${differs ? "" : " hidden"}`}>
          {sameDay(at, present) ? formatTime(present) : `${formatDate(present)} · ${formatTime(present)}`}
        </span>
        <span className="lab-when-date">{formatLongDate(at)}</span>
        <span className="lab-when-time">{formatTime(at)}</span>
        <button
          type="button"
          className={`lab-when-realtime${realTime ? " on" : ""}`}
          style={realTime ? { animationDuration: `${1 / rate}s` } : undefined}
          title={`${realTime ? `Real time is on: scene time runs at ${rate}× the real clock` : "Real time is off"}. Right-click to set the speed.`}
          onClick={(event) => {
            event.stopPropagation();
            if (command) {
              // Turning real time on starts at 2x unless a faster speed was picked.
              command({ op: "realTime", running: !realTime, speed: realTime || rate > 1 ? rate : 2 });
            } else if (!readOnly) {
              setRealTime(!realTime);
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!readOnly) {
              setRateRing(canvasPoint(event));
            }
          }}
        >
          {realTime ? <span className="lab-when-rate">{rate}×</span> : <Icon name="clock" />}
        </button>
        {rateRing && (
          <RingMenu
            at={rateRing}
            options={REAL_TIME_RATES}
            current={(live ? live.speed : localRate) as RealTimeRate}
            onPick={(next) => (command ? command({ op: "realTime", running: realTime, speed: next }) : setRate(next))}
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
        <span className="lab-when-edge dusk" title="Dusk"><span>{live?.dusk ? formatTime(live.dusk) : formatClock(DUSK)}</span></span>
        <span className="lab-when-edge dawn" title="Dawn"><span>{live?.dawn ? formatTime(live.dawn) : formatClock(DAWN)}</span></span>
      </div>
      {(open || forceOpen) && (
        <Overlay onClose={closeCalendar}>
          <div className="lab-modal lab-clock-modal">
            <span className="lab-modal-title">{presentOnly ? "Present day" : "Scene date"} · {formatLongDate(at)} · {formatTime(at)}</span>
            {/* Live picks are a draft: each TTS clock move runs an animation, so one Move button sends the choice. */}
            <SceneCalendar at={command ? draft ?? at : at} present={present} onPick={command ? setDraft : presentOnly ? onSetPresent : onChange} />
            <div className="lab-row">
              {command && (
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
              )}
              {!presentOnly && (
                <>
                  <button
                    type="button"
                    className="lab-btn"
                    onClick={() => (command ? command({ op: "clockTo", datetime: fromDate(present) }) : onChange(present))}
                  >
                    Set scene time to present day
                  </button>
                  <button
                    type="button"
                    className="lab-btn"
                    onClick={() => (command ? command({ op: "presentDay", datetime: fromDate(at) }) : onSetPresent(at))}
                  >
                    Set present day to scene time
                  </button>
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
  readonly readOnly?: boolean;
};

/** A sound value that starts at the scene's value; any other value is an override until released. */
const useOverridable = <T,>(base: T): Overridable<T> => {
  const [value, set] = useState(base);
  return { value, set, overridden: value !== base, release: () => set(base) };
};

const noop = (): void => undefined;

/** A value shown as TTS reports it, with no local edits. */
const fixed = <T,>(value: T): Overridable<T> => ({ value, set: noop, overridden: false, release: noop, readOnly: true });

/** A value shown as TTS reports it that sends a command when changed (the push brings the new value back). */
const commanded = <T,>(value: T, set: (next: T) => void): Overridable<T> => ({ value, set, overridden: false, release: noop });

const LEVEL_ECHO_MS = 1500;

/**
 * A live level the Storyteller can drag: shows the dragged value until TTS has had a moment to echo it back, so
 * the slider does not jump under the pointer. Without a sender it is shown as TTS reports it.
 */
const useLiveLevel = (value: number, onSet: ((next: number) => void) | null): Overridable<number> => {
  const [held, setHeld] = useState<number | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!onSet) {
    return fixed(value);
  }
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
    disabled={level.readOnly === true}
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

const MUSIC_PLAYLISTS = ["Main", "Combat", "Intrigue", "Silent"] as const;

/** Featured tracks in `lib/soundscape_catalog.ttslua` (type `featureMusic`). */
const FEATURED_TRACKS = ["TR Theme (full)", "TR Theme (intro)", "TR Loop", "House of the Rising Sun"] as const;

/** Location ambience loops in `lib/soundscape_catalog.ttslua` (type `location`), alphabetical. */
const AMBIENT_TRACKS = [
  "Silent", "Airport", "Apothecary", "Autoshop", "Church", "City Chatter", "City Park", "City Revelers", "City Suburb",
  "City Traffic", "City Walking", "Computer Lab", "Crickets", "Dive Bar", "Dungeon", "Eerie Forest", "Fast Clock",
  "Fireplace", "Hospital", "Indoor Market", "Industry", "Laboratory", "Library", "Low Wind Ambient", "Medical Clinic",
  "Nightclub", "Office", "Quiet City", "Ritual Room", "Rooftop", "Sewers", "Soft Hum", "Soft Indoor", "Subway",
  "Tinkle", "Urban Dark", "Warrens", "Waterside", "Whisper Ghosts"
] as const;

const AMBIENT_GRID_WIDTH = 660;

/** Catalog keys of `FEATURED_TRACKS`, in the same order. */
const FEATURED_KEYS = ["TR_Full", "TR_Intro", "TR_Loop", "STB_HouseOfTheRisingSun"] as const;

const featuredLabel = (key: string | undefined): string => {
  const index = FEATURED_KEYS.findIndex((entry) => entry === key);
  return FEATURED_TRACKS[index] ?? key ?? FEATURED_TRACKS[0];
};

/** Location catalog keys are the labels in camelCase (`softIndoor` → "Soft Indoor"). */
const ambientLabel = (key: string): string =>
  AMBIENT_TRACKS.find((label) => label.replace(/ /g, "").toLowerCase() === key.toLowerCase()) ?? key;

const ambientKey = (label: string): string =>
  label === "Silent" ? "none" : label.charAt(0).toLowerCase() + label.slice(1).replace(/ /g, "");

const featuredKey = (label: string): string => FEATURED_KEYS[FEATURED_TRACKS.findIndex((entry) => entry === label)] ?? label;

const MOODS: Readonly<Record<string, "main" | "combat" | "intrigue">> = { Main: "main", Combat: "combat", Intrigue: "intrigue" };

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
        {AMBIENT_TRACKS.map((track) => (
          <button
            key={track}
            type="button"
            className={`lab-btn${track === current ? " primary" : ""}${track === siteTrack ? " site" : ""}`}
            title={track === siteTrack ? "The site's own ambience" : undefined}
            onClick={() => {
              onPick(track);
              onClose();
            }}
          >
            {track}
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
 * Music and Featured share a row because only one of them plays at a time. The playlist shows what is playing:
 * the scene library's choice (usually Main) unless changed here. Featured tracks only play on demand (▶).
 * Ambient shows the site's ambience loop; picking another is an override.
 */
export const SoundMixer = ({ indoors, scenePlaylist = "Main", sceneAmbience = "Soft Indoor", live }: {
  indoors: boolean;
  scenePlaylist?: string;
  sceneAmbience?: string;
  /** What TTS is playing; changes go to TTS when the Scenes tab provides a command sender. */
  live?: SoundView;
}): ReactElement => {
  const [labFeatured, setFeatured] = useState(false);
  const [labFeaturedTrack, setFeaturedTrack] = useState<string>("TR Loop");
  const labAmbientTrack = useOverridable(sceneAmbience);
  const [ambientGridAt, setAmbientGridAt] = useState<{ x: number; y: number } | null>(null);
  const [muted, setMuted] = useState(false);
  const labPlaylist = useOverridable(scenePlaylist);
  const labMusic = useOverridable(70);
  const labFeaturedLevel = useOverridable(80);
  const labRain = useOverridable(60);
  const labWind = useOverridable(40);
  const labThunder = useOverridable(75);
  const labAmbience = useOverridable(55);
  const send = useScenesCommand();
  const command: ScenesSend | null = live && send ? send : null;
  const laneSetter = (lane: SoundLane) => (command ? (next: number) => command({ op: "laneVolume", lane, volume: next / 100 }) : null);
  const liveMusic = useLiveLevel(live?.levels.music ?? 0, laneSetter("music"));
  const liveFeaturedLevel = useLiveLevel(live?.levels.featured ?? 0, laneSetter("featured"));
  const liveRain = useLiveLevel(live?.levels.rain ?? 0, laneSetter("rain"));
  const liveWind = useLiveLevel(live?.levels.wind ?? 0, laneSetter("wind"));
  const liveAmbience = useLiveLevel(live?.levels.location ?? 0, laneSetter("location"));
  const [liveFeaturedPick, setLiveFeaturedPick] = useState<string | null>(null);
  const livePlaylist = (value: string): Overridable<string> => command
    ? commanded(value, (next) => {
      const mood = MOODS[next];
      command(mood ? { op: "musicMood", mood } : { op: "musicSilent" });
    })
    : fixed(value);
  const liveAmbientTrack = (value: string): Overridable<string> => command
    ? commanded(value, (next) => command({ op: "ambience", key: ambientKey(next) }))
    : fixed(value);
  const playlist = live ? livePlaylist(live.playlist) : labPlaylist;
  const music = live ? liveMusic : labMusic;
  const featuredLevel = live ? liveFeaturedLevel : labFeaturedLevel;
  const rain = live ? liveRain : labRain;
  const wind = live ? liveWind : labWind;
  const thunder = live ? fixed(0) : labThunder;
  const ambience = live ? liveAmbience : labAmbience;
  const ambientTrack = live ? liveAmbientTrack(live.ambient ? ambientLabel(live.ambient) : "Silent") : labAmbientTrack;
  const featured = live ? live.featuredPlaying : labFeatured;
  const featuredTrack = live ? liveFeaturedPick ?? featuredLabel(live.featuredKey) : labFeaturedTrack;
  const pickFeatured = (label: string): void => {
    if (!live) {
      setFeaturedTrack(label);
      return;
    }
    setLiveFeaturedPick(label);
    if (featured) {
      command?.({ op: "featuredPlay", key: featuredKey(label) });
    }
  };
  const toggleFeatured = (): void => {
    if (!live) {
      setFeatured(!featured);
      return;
    }
    command?.(featured ? { op: "featuredStop" } : { op: "featuredPlay", key: featuredKey(featuredTrack) });
  };
  const rainPlaying = live ? live.playing.rain : true;
  const thunderPlaying = false;
  const audible = !muted;
  const weatherAudible = audible && !indoors;
  const musicPlaying = live ? live.playing.music : audible && !featured;
  const ambientPlaying = live ? live.playing.location : audible;
  const windPlaying = live ? live.playing.wind : weatherAudible;
  const readOnly = live !== undefined && command === null;
  return (
    <div className="lab-mixer">
      <div className="lab-mixer-row">
        <RowLabel icon="music" label="Music" />
        <MixerGroup playing={musicPlaying} values={[playlist, music]}>
          <select className="lab-select" disabled={readOnly} value={playlist.value} onChange={(event) => playlist.set(event.target.value)}>
            {MUSIC_PLAYLISTS.map((name) => <option key={name}>{name}</option>)}
          </select>
          <Slider level={music} />
        </MixerGroup>
        <MixerGroup playing={audible && featured} values={[featuredLevel]}>
          <select className="lab-select" disabled={readOnly} value={featuredTrack} title="Featured track" onChange={(event) => pickFeatured(event.target.value)}>
            {FEATURED_TRACKS.map((name) => <option key={name}>{name}</option>)}
          </select>
          <button
            type="button"
            className={`lab-btn lab-mixer-play${featured ? " primary" : ""}`}
            title={featured ? "Stop the featured track" : "Play the featured track"}
            disabled={readOnly}
            onClick={toggleFeatured}
          >
            {featured ? "■" : "▶"}
          </button>
          <Slider level={featuredLevel} />
        </MixerGroup>
      </div>
      <div className="lab-mixer-row" title={indoors ? "Indoors: weather sounds are not playing" : undefined}>
        <RowLabel icon="weather" label="Weather" />
        <MixerGroup playing={weatherAudible && rainPlaying} values={[rain]}>
          <Icon name="rain" className="lab-mixer-icon" title="Rain" />
          <Slider level={rain} />
        </MixerGroup>
        <MixerGroup playing={windPlaying} values={[wind]}>
          <Icon name="wind" className="lab-mixer-icon" title="Wind" />
          <Slider level={wind} />
        </MixerGroup>
        <MixerGroup playing={weatherAudible && thunderPlaying} values={[thunder]}>
          <Icon name="thunder" className="lab-mixer-icon" title="Thunder" />
          <Slider level={thunder} />
        </MixerGroup>
      </div>
      <div className="lab-mixer-row">
        <RowLabel icon="ambient" label="Ambient" />
        <MixerGroup playing={ambientPlaying} values={[ambientTrack, ambience]}>
          <button
            type="button"
            disabled={readOnly}
            className="lab-select lab-ambient-pick"
            title="Ambient track: click to choose another"
            onClick={(event) => {
              const canvas = event.currentTarget.closest(".lab-canvas");
              if (!canvas) {
                throw new Error("Ambient grid needs the Lab canvas.");
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
      <button
        type="button"
        className={`lab-mixer-mute${muted ? " on" : ""}`}
        title={command ? "Silence every sound layer in TTS" : muted ? "All sound muted: click to restore" : "Mute all sound"}
        disabled={readOnly}
        onClick={() => (command ? command({ op: "stopAll" }) : setMuted(!muted))}
      >
        <Icon name="mute" />
      </button>
    </div>
  );
};

/* ---------- Queue: connection light doubles as the live / queued switch ---------- */

type QueuedChange = { readonly id: number; readonly subject: string; readonly to: string; readonly label?: string };

/** What the table shows now, before any queued change is sent. */
const QUEUE_BASE: Readonly<Record<string, string>> = { Victor: "unlit", "Black Caesar": "present", Weather: "rain" };

const QUEUE_SAMPLE: readonly QueuedChange[] = [
  { id: 1, subject: "Victor", to: "lit", label: "Light Victor (Mid Center)" },
  { id: 2, subject: "Black Caesar", to: "absent" },
  { id: 3, subject: "Weather", to: "heavy rain" },
  { id: 4, subject: "Weather", to: "thunderstorm" }
];

/**
 * Each change reads its "from" value from the table plus the changes queued before it, so removing one rewrites
 * the ones after it; a change left with nothing to do drops out.
 */
const describeQueue = (queue: readonly QueuedChange[]): readonly { readonly id: number; readonly text: string }[] => {
  const state: Record<string, string> = { ...QUEUE_BASE };
  const lines: { id: number; text: string }[] = [];
  for (const change of queue) {
    const from = state[change.subject];
    if (from === change.to) {
      continue;
    }
    lines.push({ id: change.id, text: change.label ?? `${change.subject}: ${from ?? "?"} → ${change.to}` });
    state[change.subject] = change.to;
  }
  return lines;
};

/** Offline (red) while TTS is not connected; otherwise queued (yellow) or live (green). The light is always lit. */
export const QueuePanel = ({ connected }: { connected: boolean }): ReactElement => {
  const [live, setLive] = useState(false);
  const [queue, setQueue] = useState(QUEUE_SAMPLE);
  const lines = describeQueue(queue);
  const mode = !connected ? "offline" : live ? "live" : "queued";
  return (
    <div className={`lab-queue ${mode}`}>
      <button
        type="button"
        className="lab-conn-light"
        title={`${connected ? "TTS connected" : "TTS not connected"} · click for ${live ? "queued" : "live"} mode`}
        onClick={() => setLive(!live)}
      />
      <div className="lab-queue-actions">
        {live ? <Btn tone="live">Live</Btn> : (
          <Btn tone="primary">{lines.length === 0 ? "Nothing queued" : `Send ${lines.length} change${lines.length === 1 ? "" : "s"}`}</Btn>
        )}
      </div>
      {!live && (
        <>
          <ol className="lab-queue-list">
            {lines.map((line) => (
              <li key={line.id}>
                <span>{line.text}</span>
                <button
                  type="button"
                  className="lab-queue-remove"
                  title="Remove from the queue"
                  onClick={() => setQueue(queue.filter((change) => change.id !== line.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
          {lines.length > 0 && (
            <div className="lab-queue-actions">
              <button type="button" className="lab-btn" onClick={() => setQueue([])}>Clear queue</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ---------- Phases: bar under the top strip ---------- */

type Phase = "Intermission" | "Play" | "Spotlight" | "End";
const NEXT_PHASE: Record<Phase, Phase> = { Intermission: "Play", Play: "Spotlight", Spotlight: "End", End: "Intermission" };
const ARM_MS = 2500;

/** A button that only acts on a second click (a double-click works too); it disarms itself after a moment. */
export const ConfirmButton = ({ label, className = "", onConfirm, style }: {
  label: string;
  className?: string;
  onConfirm: () => void;
  style?: CSSProperties;
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
      title="Click twice to confirm"
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

/** Spotlight carousel order as TTS shuffled it (mock); the front PC holds the spotlight. */
const SPOTLIGHT_ORDER: readonly { readonly color: keyof typeof SEAT_ACCENT; readonly characterKey: string }[] = [
  { color: "Orange", characterKey: "rashid" },
  { color: "Red", characterKey: "lordLucien" },
  { color: "Pink", characterKey: "aishe" },
  { color: "Brown", characterKey: "fomorach" },
  { color: "Purple", characterKey: "blackCaesar" }
];

/** A carousel seat is the 24px headshot inside a 2px border; the gap is set here so the ring's step always matches it. */
const CAROUSEL_SEAT = 28;
const CAROUSEL_GAP = 4;
const CAROUSEL_PITCH = CAROUSEL_SEAT + CAROUSEL_GAP;

/** Mirrors the TTS Spotlight controls: PCs keep their places; ‹ and › (or a click) move the glowing ring. */
const SpotlightCarousel = ({ live }: { live?: SpotlightView }): ReactElement => {
  const [labFront, setLabFront] = useState(0);
  const send = useScenesCommand();
  const command: ScenesSend | null = live && send ? send : null;
  const order = live?.order ?? SPOTLIGHT_ORDER;
  const front = live ? live.front : labFront;
  const setFront = (index: number): void => {
    const pc = order[index];
    if (command && pc) {
      command({ op: "spotlightFront", color: pc.color });
    } else if (!live) {
      setLabFront(index);
    }
  };
  const count = order.length;
  const step = (by: number): void => {
    if (command) {
      command({ op: "spotlightRotate", delta: by });
    } else {
      setFront((front + by + count) % count);
    }
  };
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
};

const isPhase = (value: string): value is Phase => value in NEXT_PHASE;

/** Scenes live in TTS: the one on the table, plus any on deck to switch to in one click. */
export type LiveScenes = { readonly live: readonly string[]; readonly current: string | null };

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

/**
 * Phase name at the far left. The middle holds the live scenes (Play): the one on the table, then a button for
 * each scene on deck to switch to it. Intermission shows the next session's number and title; Spotlight the
 * carousel. In Play, End Scene (takes the current scene out of the live list) sits just left of Advance, and
 * Advance opens a ring: Scene (scene picker), Memoriam (Memoriam set-up), or Spotlight (click twice). In any
 * other phase, Advance names the next phase and needs a second click.
 */
export const PhaseStrip = ({ library, scenes, onSwitch, onEndScene, onPlay, onPrepare, live }: {
  library: readonly string[];
  scenes: LiveScenes;
  onSwitch: (title: string) => void;
  onEndScene: () => void;
  onPlay: (title: string) => void;
  onPrepare: () => void;
  /** TTS's phase, session, and spotlight; buttons send commands when the Scenes tab provides a sender. */
  live?: LivePhase;
}): ReactElement => {
  const [labPhase, setPhase] = useState<Phase>("Play");
  const [ring, setRing] = useState<Point | null>(null);
  const [modal, setModal] = useState<"scene" | "memoriam" | null>(null);
  const [labSession, setSession] = useState({ number: 43, title: "" });
  const phase: Phase = live ? (isPhase(live.phase) ? live.phase : "Intermission") : labPhase;
  const session = live ? { number: live.sessionNum ?? 1, title: live.sessionName } : labSession;
  const send = useScenesCommand();
  const command: ScenesSend | null = live && send ? send : null;
  const waiting = live && !command ? "Arrives with the TTS command bridge" : undefined;
  const advance = (): void => (command ? command({ op: "phaseAdvance" }) : setPhase(next));
  const next = NEXT_PHASE[phase];
  const open = (which: "scene" | "memoriam") => (): void => {
    setRing(null);
    setModal(which);
  };
  return (
    <div className="lab-phase">
      <span className="lab-phase-tag">
        {phase}
        {phase === "Play" && <span className="lab-phase-sub">{live ? live.subPhase ?? "" : "Main"}</span>}
      </span>
      <span className="lab-phase-now">
        {phase === "Play" && (
          <span className="lab-phase-scenes">
            <span className={`lab-phase-scene${scenes.current ? "" : " none"}`}>{scenes.current ?? "No scene on the table"}</span>
            {scenes.live.filter((title) => title !== scenes.current).map((title) => (
              <button key={title} type="button" className="lab-phase-deck" title={`Switch the table to ${title}`} onClick={() => onSwitch(title)}>
                {title}
              </button>
            ))}
          </span>
        )}
        {phase === "Intermission" && (
          <span className="lab-phase-session">
            <label>
              Session
              {command ? (
                <CommitInput
                  type="number"
                  className="lab-select lab-phase-session-number"
                  min={1}
                  value={String(session.number)}
                  onCommit={(text) => command({ op: "sessionNum", num: Number(text) })}
                />
              ) : (
                <input
                  type="number"
                  className="lab-select lab-phase-session-number"
                  min={1}
                  readOnly={live !== undefined}
                  value={session.number}
                  onChange={(event) => setSession({ ...session, number: Number(event.target.value) })}
                />
              )}
            </label>
            {command ? (
              <CommitInput
                className="lab-select lab-phase-session-title"
                placeholder="Session title"
                value={session.title}
                onCommit={(text) => command({ op: "sessionName", name: text.trim() })}
              />
            ) : (
              <input
                className="lab-select lab-phase-session-title"
                placeholder="Session title"
                readOnly={live !== undefined}
                value={session.title}
                onChange={(event) => setSession({ ...session, title: event.target.value })}
              />
            )}
          </span>
        )}
        {phase === "Spotlight" && <SpotlightCarousel live={live?.spotlight} />}
      </span>
      <span className="lab-phase-advance">
        {phase === "Play" && (command && scenes.current ? (
          <ConfirmButton label="End Scene" className="lab-btn danger" onConfirm={onEndScene} />
        ) : (
          <button type="button" className="lab-btn danger" title={waiting ?? "Main / Memoriam → Downtime"} disabled={!scenes.current || waiting !== undefined} onClick={onEndScene}>
            End Scene
          </button>
        ))}
        {phase === "Play" ? (
          <button type="button" className="lab-btn primary" title={waiting} disabled={waiting !== undefined} onClick={(event) => setRing(canvasPoint(event))}>Advance ▸</button>
        ) : waiting ? (
          <button type="button" className="lab-btn primary" title={waiting} disabled>{next} ▸</button>
        ) : (
          <ConfirmButton key={phase} label={`${next} ▸`} className="lab-btn primary" onConfirm={advance} />
        )}
      </span>
      {ring && (
        <Overlay onClose={() => setRing(null)}>
          <div className="lab-ring" style={{ left: Math.min(Math.max(ring.x, RING_EDGE), 1920 - RING_EDGE), top: Math.max(ring.y, 86) }}>
            <button type="button" className="lab-ring-item spoke" style={{ left: 0, top: -64, "--i": 0 } as CSSProperties} onClick={open("scene")}>Scene…</button>
            <button type="button" className="lab-ring-item spoke" style={{ left: -112, top: 40, "--i": 1 } as CSSProperties} onClick={open("memoriam")}>Memoriam…</button>
            <ConfirmButton
              label="Spotlight ▸"
              className="lab-ring-item spoke"
              style={{ left: 112, top: 40, "--i": 2 } as CSSProperties}
              onConfirm={() => {
                setRing(null);
                advance();
              }}
            />
          </div>
        </Overlay>
      )}
      {modal === "scene" && (
        <SceneModal
          library={library}
          scenes={scenes}
          onClose={() => setModal(null)}
          onPlay={(title) => {
            setModal(null);
            onPlay(title);
          }}
          onPrepare={() => {
            setModal(null);
            onPrepare();
          }}
        />
      )}
      {modal === "memoriam" && <MemoriamModal onClose={() => setModal(null)} />}
    </div>
  );
};

const SceneModal = ({ library, scenes, onClose, onPlay, onPrepare }: {
  library: readonly string[];
  scenes: LiveScenes;
  onClose: () => void;
  onPlay: (title: string) => void;
  onPrepare: () => void;
}): ReactElement => (
  <Overlay onClose={onClose}>
    <div className="lab-modal lab-advance">
      <span className="lab-modal-title">Play a scene</span>
      <span className="lab-search">Search the scene library…</span>
      <ul className="lab-advance-list">
        {library.map((title) => (
          <li key={title} className={title === scenes.current ? "live" : scenes.live.includes(title) ? "prep" : undefined}>
            <span>{title}{title === scenes.current ? " (on the table)" : scenes.live.includes(title) ? " (on deck)" : ""}</span>
            <span className="lab-row">
              <button type="button" className="lab-btn live" disabled={title === scenes.current} onClick={() => onPlay(title)}>Play</button>
              <button type="button" className="lab-btn" onClick={onPrepare}>Edit</button>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="lab-btn" onClick={onPrepare}>+ Prepare a new scene…</button>
    </div>
  </Overlay>
);

/* ---------- Memoriam set-up: same layout as the TTS Memoriam modal (placeholder data) ---------- */

const MEMORIAM_PCS = ["Lord Lucien", "Rashid Abdulrahman", "Aishe Tache", "Fomórach", "Black Caesar"] as const;
const MEMORIAM_PERIODS = 14;
const MEMORIAM_PANELS = ["A", "B", "C", "D"] as const;
const PERIOD_MARKS = 30;
const PERIOD_SLIDER_MAX = 5000;

/** Placeholder: which periods have a memoriam for the chosen PC, and which panels each period has. */
const memoriamPanelCount = (pcIndex: number, period: number): number => ((pcIndex * 7 + period * 3) % 5);

const MemoriamModal = ({ onClose }: { onClose: () => void }): ReactElement => {
  const [pc, setPc] = useState<number | null>(null);
  const [slider, setSlider] = useState(0);
  const [scene, setScene] = useState<string | null>(null);
  const [present, setPresent] = useState<readonly boolean[]>(MEMORIAM_PCS.map(() => false));
  const mark = Math.min(PERIOD_MARKS - 1, Math.floor((slider / PERIOD_SLIDER_MAX) * PERIOD_MARKS));
  const year = 1600 + Math.round((slider / PERIOD_SLIDER_MAX) * 400);
  return (
    <Overlay onClose={onClose}>
      <div className="lab-modal lab-memoriam">
        <span className="lab-memoriam-title">Memoriam</span>
        <div className="lab-memoriam-pcs">
          {MEMORIAM_PCS.map((name, index) => (
            <button
              key={name}
              type="button"
              className={`lab-memoriam-pick${pc === index ? " selected" : ""}`}
              onClick={() => {
                setPc(index);
                setScene(null);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <span className="lab-memoriam-date">{pc === null ? "Choose a character" : `Autumn ${year}`}</span>
        <span className="lab-memoriam-place">{pc === null ? "\u00a0" : "Placeholder location"}</span>
        <div className="lab-memoriam-marks">
          {Array.from({ length: PERIOD_MARKS }, (_, index) => (
            <span key={index} className={index === mark ? "highlighted" : undefined} />
          ))}
        </div>
        <input
          type="range"
          className="lab-memoriam-slider"
          min={0}
          max={PERIOD_SLIDER_MAX}
          value={slider}
          onChange={(event) => setSlider(Number(event.target.value))}
        />
        <div className="lab-memoriam-grid">
          {Array.from({ length: MEMORIAM_PERIODS }, (_, period) => (
            <div key={period} className="lab-memoriam-period">
              {MEMORIAM_PANELS.map((panel, panelIndex) => {
                const id = `${period + 1}${panel}`;
                const exists = pc !== null && panelIndex < memoriamPanelCount(pc, period);
                return exists ? (
                  <button
                    key={panel}
                    type="button"
                    className={`lab-memoriam-pick${scene === id ? " selected" : ""}`}
                    onClick={() => setScene(id)}
                  >
                    {id}
                  </button>
                ) : <span key={panel} className="lab-memoriam-pick empty" />;
              })}
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`lab-memoriam-pick smoke${scene === "smoke" ? " selected" : " highlighted"}`}
          onClick={() => setScene("smoke")}
        >
          Just Smoke
        </button>
        <div className="lab-memoriam-cast">
          {MEMORIAM_PCS.map((name, index) => (
            <div key={name} className="lab-memoriam-cast-row">
              <button
                type="button"
                className={`lab-memoriam-presence${present[index] ? " selected" : ""}`}
                title="Present in this memoriam"
                onClick={() => setPresent(present.map((value, at) => (at === index ? !value : value)))}
              />
              <span className="lab-memoriam-pc">{name}</span>
              <span className="lab-memoriam-npc">—</span>
              <Btn>+</Btn>
            </div>
          ))}
        </div>
        <div className="lab-row lab-memoriam-actions">
          <button type="button" className="lab-btn primary" disabled={scene === null} onClick={onClose}>Advance</button>
          <button type="button" className="lab-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Overlay>
  );
};
