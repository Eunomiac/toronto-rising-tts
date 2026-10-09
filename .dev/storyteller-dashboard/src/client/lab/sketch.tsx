import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Headshot } from "../headshots/Headshot";
import { applyLocal } from "../pcSheet/applyLocal";
import { emptySeat } from "../pcSheet/fixture";
import { SEAT_ACCENT, assetUrl } from "../pcSheet/layout";
import { paintDamageTrack, paintHumanityTrack, type BoxSlot } from "../pcSheet/paint";
import { actionsForRing } from "../pcSheet/ringActions";
import { TraitRing } from "../pcSheet/TraitRing";
import type { RingTarget, SeatColor, SeatSnapshot, SheetSnapshot } from "../pcSheet/types";
import { LIGHTING_LABEL, useScenesCommand, type LightingPreset } from "../scenesPanel/commands";
import { GENERIC_SKY } from "../scenesPanel/liveScene";
import { stagePacks, type StagePack } from "../scenesPanel/stageFrame";
import { Icon, type IconName } from "./icons";
import { groupColor, groupLeader, useControlBoardSnaps, useRosterLayout, useSceneCatalogs } from "./labRoster";

/**
 * Grey-box building blocks for Lab sketches. Every sketch is laid out in absolute pixels on the
 * fixed 1920×1042 canvas (1080 minus the app tab bar), so sizes on screen are the real sizes.
 */

export const CANVAS_W = 1920;
export const CANVAS_H = 1042;

export type Tier = "A" | "B" | "C" | "D";
export type BoxTone = "plain" | "preview" | "reserved" | "popover";

export type SketchState = {
  readonly previewOpen: boolean;
  readonly clockDiffers: boolean;
  readonly weatherOverride: boolean;
  readonly heatWave: boolean;
  readonly coldSnap: boolean;
  readonly popoverOpen: boolean;
  readonly ttsDisconnected: boolean;
};

type BoxProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Omit for a bare panel with no title line (the panel's purpose is evident from its contents). */
  readonly title?: string;
  readonly tier?: Tier;
  readonly tone?: BoxTone;
  readonly lines?: readonly string[];
  readonly children?: ReactNode;
  readonly className?: string;
};

export const Box = ({ x, y, w, h, title, tier, tone = "plain", lines, children, className }: BoxProps): ReactElement => (
  <section className={`lab-box ${tone}${className ? ` ${className}` : ""}`} style={{ left: x, top: y, width: w, height: h }}>
    {title !== undefined && (
      <header className="lab-box-head">
        <span className="lab-box-title">{title}</span>
        {tier && <span className={`lab-box-tier tier-${tier}`}>{tier}</span>}
        <span className="lab-box-size">{w}×{h}</span>
      </header>
    )}
    {children && <div className="lab-box-body">{children}</div>}
    {lines && lines.length > 0 && (
      <ul className="lab-box-lines">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    )}
  </section>
);

/** Small labelled placeholder used inside boxes. */
export const Chip = ({ children, tone, style }: { children: ReactNode; tone?: "on" | "warn" | "dim" | "accent"; style?: CSSProperties }): ReactElement => (
  <span className={`lab-chip${tone ? ` ${tone}` : ""}`} style={style}>{children}</span>
);

export const Btn = ({ children, tone }: { children: ReactNode; tone?: "primary" | "danger" | "live" }): ReactElement => (
  <span className={`lab-btn${tone ? ` ${tone}` : ""}`}>{children}</span>
);

/** The visible canvas: the Lab and the Scenes tab each have one, and only the active tab's is laid out. */
export const activeCanvas = (): HTMLElement | null =>
  Array.from(document.querySelectorAll<HTMLElement>(".lab-canvas")).find((canvas) => canvas.offsetParent !== null) ?? null;

/** Canvas-relative point for a mouse event, for placing pop-ups rendered through `Overlay`. */
export const canvasPoint = (event: MouseEvent<HTMLElement>): { x: number; y: number } => {
  const canvas = event.currentTarget.closest(".lab-canvas");
  if (!canvas) {
    throw new Error("Lab pop-up opened outside the Lab canvas.");
  }
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

/**
 * Pop-ups take focus until dismissed, so they dim everything behind them. Click the dimmed area or press
 * Escape to close. Rendered into the Lab canvas (sketch coordinates) below the pins, so pop-ups can be pinned.
 */
export const Overlay = ({ onClose, children }: { onClose: () => void; children: ReactNode }): ReactElement => {
  const canvas = activeCanvas();
  if (!canvas) {
    throw new Error("Lab overlay needs the Lab canvas.");
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div
      className="lab-scrim"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>,
    canvas
  );
};

/* ---------- seats ---------- */

/**
 * The PC's own trackers, even while they play an NPC role: Health and Willpower as [boxes, superficial,
 * aggravated], Humanity as [rating, stains].
 */
type PcTrackers = {
  readonly health: readonly [number, number, number];
  readonly willpower: readonly [number, number, number];
  readonly humanity: readonly [number, number];
  readonly hunger: number;
};

export type SeatSketch = {
  readonly slot: number;
  /** TTS seat key (player colour or NPC seat); live seats only. */
  readonly seatKey?: string;
  readonly name?: string;
  readonly characterKey?: string;
  readonly kind: "pc" | "npc" | "empty" | "nochair";
  readonly state?: "absent" | "disconnected";
  /** The player's PC name when they are playing an NPC role; `name` and the image are then the NPC's. */
  readonly playedBy?: string;
  readonly color?: SeatColor;
  readonly trackers?: PcTrackers;
};

/**
 * Left-to-right order of the control board seat row: today's colour seats renumbered, PC chairs 1–5 from the
 * centre outward and the old NPC1–NPC4 chairs as 6–9. Table B2 has seven chairs, so 8 and 9 have none.
 */
export const SEATS: readonly SeatSketch[] = [
  { slot: 9, kind: "nochair" },
  { slot: 7, name: "Lexi Madi", characterKey: "lexiMadi", kind: "npc" },
  {
    slot: 5, name: "Adrian Varga", characterKey: "adrianVarga", kind: "pc", playedBy: "Aishe Tache", color: "Pink",
    trackers: { health: [7, 2, 0], willpower: [6, 1, 0], humanity: [7, 1], hunger: 2 }
  },
  {
    slot: 3, name: "Fomórach", characterKey: "fomorach", kind: "pc", state: "disconnected", color: "Brown",
    trackers: { health: [8, 0, 0], willpower: [5, 0, 0], humanity: [5, 0], hunger: 3 }
  },
  {
    slot: 1, name: "Black Caesar", characterKey: "blackCaesar", kind: "pc", state: "absent", color: "Purple",
    trackers: { health: [9, 1, 1], willpower: [7, 0, 0], humanity: [6, 2], hunger: 1 }
  },
  {
    slot: 2, name: "Lord Lucien", characterKey: "lordLucien", kind: "pc", color: "Red",
    trackers: { health: [6, 0, 0], willpower: [8, 3, 0], humanity: [8, 0], hunger: 4 }
  },
  {
    slot: 4, name: "Rashid", characterKey: "rashid", kind: "pc", color: "Orange",
    trackers: { health: [7, 0, 0], willpower: [5, 0, 1], humanity: [7, 3], hunger: 0 }
  },
  { slot: 6, kind: "empty" },
  { slot: 8, kind: "nochair" }
];

/** Lab stand-in for the live sheet: the PC tab's seat shape carrying each PC's sample trackers. */
const labSheet = (): SheetSnapshot => ({
  ok: true,
  seats: SEATS.flatMap((seat) => {
    if (!seat.color || !seat.trackers) {
      return [];
    }
    const { health, willpower, humanity, hunger } = seat.trackers;
    const tracker = (base: number, superficial: number, aggravated: number, stains = 0) =>
      ({ base, temp: 0, disabled: 0, superficial, aggravated, stains });
    const sheet: SeatSnapshot = {
      ...emptySeat(seat.color),
      charName: seat.playedBy ?? seat.name ?? "",
      health: tracker(...health),
      healthMax: health[0],
      willpower: tracker(...willpower),
      willpowerMax: willpower[0],
      humanity: tracker(humanity[0], 0, 0, humanity[1]),
      humanityMax: humanity[0],
      hunger
    };
    return [sheet];
  })
});

/** Character sheet box art; Humanity shows all ten boxes, unfilled ones faint. */
const BoxRow = ({ boxes, showEmpty = false }: { boxes: readonly BoxSlot[]; showEmpty?: boolean }): ReactElement => (
  <>
    {boxes.map((box, index) => box.active && box.image ? (
      <span key={index} className="lab-track-box" style={{ backgroundImage: `url("${assetUrl(`boxes/${box.image}.webp`)}")` }} />
    ) : showEmpty ? (
      <span key={index} className="lab-track-box off" style={{ backgroundImage: `url("${assetUrl("boxes/box_white.webp")}")` }} />
    ) : null)}
  </>
);

const HUNGER_DOT = { "--lab-dot": `url("${assetUrl("dots/dot_red.webp")}")` } as CSSProperties;

type TrackRing = { readonly x: number; readonly y: number; readonly target: RingTarget };

/** Tracker controls float over the stage; none of their clicks (left, right, or double) may reach it. */
const swallowClicks = {
  onClick: (event: MouseEvent) => event.stopPropagation(),
  onDoubleClick: (event: MouseEvent) => event.stopPropagation(),
  onContextMenu: (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }
};

/**
 * A PC's trackers as controls, as on the PCs tab: click Health, Willpower, or Humanity for that tracker's ring
 * (left-click a button to add, right-click to remove); left-click Hunger to raise it, right-click to lower it.
 */
const TrackerPopup = ({ seat, onRing, onHunger }: {
  seat: SeatSnapshot;
  onRing: (event: MouseEvent<HTMLElement>, target: RingTarget) => void;
  onHunger: (delta: number) => void;
}): ReactElement => (
  <div className="lab-seat-pop" role="dialog" aria-label={`${seat.charName} trackers`} {...swallowClicks}>
    <span className="lab-seat-pop-name">{seat.charName}</span>
    <button type="button" className="lab-track" onClick={(event) => onRing(event, { kind: "damage", which: "health" })}>
      <Icon name="health" className="lab-track-icon health" title="Health" />
      <BoxRow boxes={paintDamageTrack(seat.health, seat.healthMax)} />
    </button>
    <button type="button" className="lab-track" onClick={(event) => onRing(event, { kind: "damage", which: "willpower" })}>
      <Icon name="willpower" className="lab-track-icon willpower" title="Willpower" />
      <BoxRow boxes={paintDamageTrack(seat.willpower, seat.willpowerMax)} />
    </button>
    <button type="button" className="lab-track" onClick={(event) => onRing(event, { kind: "humanity" })}>
      <Icon name="humanity" className="lab-track-icon humanity" title="Humanity" />
      <BoxRow boxes={paintHumanityTrack(seat.humanity, seat.humanityMax)} showEmpty />
    </button>
    <button
      type="button"
      className="lab-track"
      title="Left-click to raise Hunger, right-click to lower it"
      onClick={() => onHunger(1)}
      onContextMenu={(event) => {
        event.preventDefault();
        onHunger(-1);
      }}
    >
      <Icon name="hunger" className="lab-track-icon hunger" title="Hunger" />
      {Array.from({ length: seat.hungerMax }, (_, index) => (
        <span key={index} className={`lab-hunger-dot${index < seat.hunger ? " on" : ""}`} style={HUNGER_DOT} />
      ))}
    </button>
  </div>
);

const SeatContent = ({ seat }: { seat: SeatSketch }): ReactElement => (
  <>
    <span className="lab-seat-badge">{seat.slot}</span>
    <span className="lab-seat-text">
      {seat.playedBy && <span className="lab-seat-flag role">{seat.playedBy} as</span>}
      {seat.name && <span className="lab-seat-name">{seat.name}</span>}
    </span>
  </>
);

/**
 * One cell per chair, each a ninth of the row (the most chairs any table has); positions the table lacks are
 * left out rather than drawn, and the rest stay centred. The figurine headshot fills the cell above the name.
 * PC seats are bordered in the player's colour, NPC seats in muted grey; absent (out of the scene) and
 * disconnected seats are told apart by border style and image treatment. Clicking a PC seat opens that PC's
 * tracker controls; clicking anywhere else closes them. On the live table, right-clicking an occupied seat takes
 * that character out of the scene or brings them back (narrative presence only, never connection).
 */
export const Seats = ({ seats = SEATS, liveSheet }: { seats?: readonly SeatSketch[]; liveSheet?: SheetSnapshot }): ReactElement => {
  const [labState, setSheet] = useState(labSheet);
  const sheet = liveSheet ?? labState;
  const send = useScenesCommand();
  const [openColor, setOpenColor] = useState<SeatColor | null>(null);
  const [ring, setRing] = useState<TrackRing | null>(null);
  useEffect(() => {
    if (!openColor) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (!(event.target as HTMLElement).closest(".lab-seat-slot.open, .pc-ring-layer")) {
        setOpenColor(null);
        setRing(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openColor]);
  const openSeat = sheet.seats.find((seat) => seat.color === openColor);
  const canvas = activeCanvas();
  return (
    <div className="lab-seats">
      {seats.filter((seat) => seat.kind !== "nochair").map((seat) => {
        const className = `lab-seat ${seat.kind}${seat.state ? ` ${seat.state}` : ""}${seat.playedBy ? " role" : ""}`;
        const style = seat.color ? ({ "--seat-color": SEAT_ACCENT[seat.color] } as CSSProperties) : undefined;
        const open = seat.color !== undefined && seat.color === openColor;
        const controllable = seat.color !== undefined && sheet.seats.some((entry) => entry.color === seat.color);
        const presenceKey = send && seat.seatKey && seat.state !== "disconnected" ? seat.seatKey : undefined;
        const hints = [
          controllable && !open ? "Click for this PC's trackers" : undefined,
          presenceKey ? (seat.state === "absent" ? "Right-click to bring them into the scene" : "Right-click to take them out of the scene") : undefined
        ].filter(Boolean);
        return (
          <div
            key={seat.slot}
            className={`lab-seat-slot${controllable ? " controllable" : ""}${open ? " open" : ""}`}
            style={style}
            title={hints.length > 0 ? hints.join(". ") : undefined}
            onContextMenu={(event) => {
              if (!send || !presenceKey) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              send({ op: "seatPresence", seat: presenceKey, present: seat.state === "absent" });
            }}
            onClick={(event) => {
              if (!controllable || (event.target as HTMLElement).closest(".lab-seat-pop")) {
                return;
              }
              setRing(null);
              setOpenColor(open ? null : seat.color ?? null);
            }}
          >
            {seat.characterKey ? (
              <Headshot characterKey={seat.characterKey} className={className}>
                <SeatContent seat={seat} />
              </Headshot>
            ) : (
              <div className={className}>
                <SeatContent seat={seat} />
              </div>
            )}
            {open && openSeat && (
              <TrackerPopup
                seat={openSeat}
                onRing={(event, target) => setRing({ ...canvasPoint(event), target })}
                onHunger={(delta) => setSheet(applyLocal(sheet, { op: "hunger", color: openSeat.color, delta }))}
              />
            )}
          </div>
        );
      })}
      {ring && openSeat && canvas && createPortal(
        <div className="lab-trait-ring-host" {...swallowClicks}>
          <TraitRing
            x={ring.x}
            y={ring.y}
            actions={actionsForRing(openSeat, ring.target)}
            onPick={(action, button) => {
              setSheet(applyLocal(sheet, button === "right" ? (action.right ?? action.left) : action.left));
              if (action.closeOnPick === true) {
                setRing(null);
              }
            }}
            onClose={() => setRing(null)}
          />
        </div>,
        canvas
      )}
    </div>
  );
};

/* ---------- stage board ---------- */

const PACK_ROWS: readonly (readonly { label: string; u: number; lit?: number; size: number }[])[] = [
  [
    { label: "Far L", u: 0.14, size: 6 },
    { label: "Far CL", u: 0.38, lit: 2, size: 6 },
    { label: "Far CR", u: 0.62, size: 6 },
    { label: "Far R", u: 0.86, size: 6 }
  ],
  [
    { label: "Mid L", u: 0.22, size: 5 },
    { label: "Mid C", u: 0.5, lit: 3, size: 5 },
    { label: "Mid R", u: 0.78, size: 5 }
  ],
  [
    { label: "Center L", u: 0.28, lit: 1, size: 5 },
    { label: "CENTER", u: 0.5, lit: 5, size: 5 },
    { label: "Center R", u: 0.72, size: 5 }
  ]
];

/**
 * Schematic polar stage: four far six-packs, mid ring, center ring, optional seat row along the bottom
 * (the dashboard board art today includes the seat row). Gold dots are lit NPCs, grey dots unlit.
 */
export const Board = ({ w, h, withSeats }: { w: number; h: number; withSeats: boolean }): ReactElement => {
  const stageH = withSeats ? h * 0.84 : h;
  const rowY = [0.2, 0.5, 0.8].map((v) => v * stageH);
  const dot = Math.max(5, Math.min(w, h) / 70);
  return (
    <div className="lab-board" style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <ellipse cx={w / 2} cy={stageH * 0.98} rx={w * 0.46} ry={stageH * 0.62} className="lab-board-ring" />
        <ellipse cx={w / 2} cy={stageH * 0.98} rx={w * 0.3} ry={stageH * 0.34} className="lab-board-ring" />
        {PACK_ROWS.map((row, rowIndex) => row.map((pack) => {
          const cx = pack.u * w;
          const cy = rowY[rowIndex] ?? 0;
          const r = dot * 3.2;
          return (
            <g key={pack.label}>
              <circle cx={cx} cy={cy} r={r} className="lab-board-pack" />
              {Array.from({ length: pack.size }, (_, index) => {
                const angle = (index / pack.size) * Math.PI * 2 - Math.PI / 2;
                const lit = index < (pack.lit ?? 0);
                return (
                  <circle
                    key={index}
                    cx={cx + Math.cos(angle) * r * 0.62}
                    cy={cy + Math.sin(angle) * r * 0.62}
                    r={dot * 0.75}
                    className={lit ? "lab-board-npc lit" : (pack.lit !== undefined ? "lab-board-npc" : "lab-board-snap")}
                  />
                );
              })}
              <text x={cx} y={cy + r + 13} className="lab-board-label">{pack.label}</text>
            </g>
          );
        }))}
      </svg>
      {withSeats && (
        <div className="lab-board-seats" style={{ top: stageH, height: h - stageH }}>
          <Seats />
        </div>
      )}
    </div>
  );
};

/** Height of the wide board as a fraction of its width: the 2:1 stage plus a little margin for the seat row. */
export const WIDE_BOARD_RATIO = 0.52;

const WIDE_SEAT_BAND = 0.18;

export type StageToken = {
  readonly characterKey: string;
  readonly name: string;
  readonly lit: boolean;
  readonly at: { readonly pack: string; readonly slot: number } | { readonly u: number; readonly v: number };
};

/** Sample stage: most tokens snapped to pack slots, two dragged freely to spots of the Storyteller's choosing. */
const STAGE_TOKENS: readonly StageToken[] = [
  { characterKey: "drake", name: "Drake", lit: true, at: { pack: "Far Center-Left", slot: 5 } },
  { characterKey: "mara", name: "Mara", lit: true, at: { pack: "Far Center-Left", slot: 1 } },
  { characterKey: "victorVex", name: "Victor", lit: true, at: { pack: "Mid Center", slot: 1 } },
  { characterKey: "bee", name: "Bee", lit: true, at: { pack: "Mid Center", slot: 2 } },
  { characterKey: "eddie", name: "Eddie", lit: false, at: { pack: "Mid Center", slot: 3 } },
  { characterKey: "ren", name: "Ren", lit: true, at: { pack: "CENTER", slot: 2 } },
  { characterKey: "kai", name: "Kai", lit: true, at: { pack: "CENTER", slot: 1 } },
  { characterKey: "carol", name: "Carol", lit: false, at: { pack: "CENTER", slot: 3 } },
  { characterKey: "rosie", name: "Rosie", lit: true, at: { pack: "Center Left", slot: 2 } },
  { characterKey: "terry", name: "Terry", lit: false, at: { pack: "Far Right", slot: 4 } },
  { characterKey: "scarlett", name: "Scarlett", lit: true, at: { u: 0.2, v: 0.2 } },
  { characterKey: "drIrenaVoss", name: "Dr. Voss", lit: false, at: { u: 0.86, v: 0.7 } }
];

/** Where a token sits on the drawing; Lab tokens may name a pack slot, which needs the snap catalog loaded. */
const tokenPoint = (token: StageToken, packs: readonly StagePack[], w: number, h: number): { x: number; y: number } | null => {
  if ("u" in token.at) {
    return { x: token.at.u * w, y: token.at.v * h };
  }
  const { pack: label, slot } = token.at;
  if (packs.length === 0) {
    return null;
  }
  const point = packs.find((entry) => entry.label === label)?.slots[slot];
  if (!point) {
    throw new Error(`Lab stage token ${token.characterKey}: no slot ${slot} in pack ${label}`);
  }
  return { x: point.u * w, y: point.v * h };
};

/** Half-axes of the ellipse drawn through a Far pack's six slots. */
const farRadii = (pack: StagePack, w: number, h: number): { rx: number; ry: number } => ({
  rx: Math.max(...pack.slots.map((slot) => Math.abs(slot.u - pack.center.u))) * w,
  ry: Math.max(...pack.slots.map((slot) => Math.abs(slot.v - pack.center.v))) * h
});

/**
 * A figurine headshot with the name under it; hovering enlarges the headshot. The ring is the token's group
 * colour (thicker and brighter for the group's boss); a gold halo means lit.
 */
const Token = ({ token, x, y, color, boss }: { token: StageToken; x: number; y: number; color: string | undefined; boss: boolean }): ReactElement => (
  <div
    className={`lab-token${token.lit ? " lit" : ""}${boss ? " boss" : ""}`}
    style={{ left: x, top: y, ...(color ? { "--group": color } : {}) } as CSSProperties}
  >
    <Headshot className="lab-token-head" characterKey={token.characterKey} />
    <span className="lab-token-name">{token.name}</span>
  </div>
);

/**
 * The control board at its real in-game shape (scaled 2:1), with the seat row floating along the bottom edge,
 * on the players' side of the stage (the Far zones are furthest from them). Token positions map straight to stage positions in the game world, so tokens can sit
 * anywhere; pack slots are mild snap points and group drop targets.
 */
export type LiveBoard = {
  readonly seats: readonly SeatSketch[];
  readonly sheet: SheetSnapshot;
  readonly tokens: readonly StageToken[];
  readonly env: StageEnv;
};

/** The stage's surroundings: table, sky override ("" = the Site's own sky), and lighting preset ("" = the scene's). */
export type StageEnv = {
  readonly tableKey: string;
  readonly scatter: boolean;
  readonly sky: string;
  readonly lighting: LightingPreset | "";
};

const LAB_ENV: StageEnv = { tableKey: "Table B2", scatter: false, sky: "", lighting: "" };

export const WideBoard = ({ w, h, live }: { w: number; h: number; live?: LiveBoard }): ReactElement => {
  const [ring, setRing] = useState<{ x: number; y: number } | null>(null);
  const [labEnv, setLabEnv] = useState<StageEnv>(LAB_ENV);
  const [clearArmed, setClearArmed] = useState(false);
  const send = useScenesCommand();
  const command = live && send ? send : null;
  const env = live?.env ?? labEnv;
  const placement = env.scatter ? "Scatter" : "Standard";
  const setTable = (key: string): void =>
    command ? command({ op: "table", key }) : setLabEnv({ ...labEnv, tableKey: key === "Scatter" ? labEnv.tableKey : key, scatter: key === "Scatter" });
  const setSky = (key: string): void => (command ? command({ op: "skybox", key: key || "none" }) : setLabEnv({ ...labEnv, sky: key }));
  const setLighting = (presetKey: LightingPreset): void => (command ? command({ op: "lighting", presetKey }) : setLabEnv({ ...labEnv, lighting: presetKey }));
  const { catalogs } = useSceneCatalogs();
  const { snaps, error: snapsError } = useControlBoardSnaps();
  const packs = useMemo(() => (snaps ? stagePacks(snaps) : []), [snaps]);
  const roster = useRosterLayout();
  const tokenGroup = (characterKey: string): string | undefined =>
    catalogs?.namedNpcs.find((npc) => npc.characterKey === characterKey)?.pickerGroups[0];
  const closeRing = (): void => {
    setRing(null);
    setClearArmed(false);
  };
  const openRing = (event: MouseEvent<HTMLDivElement>): void => {
    event.preventDefault();
    if ((event.target as HTMLElement).closest(".lab-token, .lab-board-seats, .lab-board-table, .lab-help")) {
      return;
    }
    setRing(canvasPoint(event));
  };
  return (
  <div className="lab-board wide" style={{ width: w, height: h }} onContextMenu={openRing}>
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {packs.map((pack) => {
        const cx = pack.center.u * w;
        const cy = pack.center.v * h;
        const lowest = Math.max(...pack.slots.map((slot) => slot.v)) * h;
        return (
          <g key={pack.familyId}>
            {pack.far && <ellipse cx={cx} cy={cy} {...farRadii(pack, w, h)} className="lab-board-ring" />}
            {pack.slots.map((slot) => (
              <circle key={slot.snapIndex} cx={slot.u * w} cy={slot.v * h} r={5} className="lab-board-snap" />
            ))}
            <text x={cx} y={pack.far ? cy + 6 : lowest + 30} className="lab-board-label">{pack.label}</text>
          </g>
        );
      })}
    </svg>
    {snapsError && <span className="lab-board-error">{snapsError}</span>}
    {(live?.tokens ?? STAGE_TOKENS).map((token) => {
      const point = tokenPoint(token, packs, w, h);
      if (!point) {
        return null;
      }
      const group = tokenGroup(token.characterKey);
      return (
        <Token
          key={token.characterKey}
          token={token}
          x={point.x}
          y={point.y}
          color={group ? groupColor(roster, group) : undefined}
          boss={group !== undefined && groupLeader(roster, group) === token.characterKey}
        />
      );
    })}
    <div className="lab-board-seats floating bottom" style={{ top: h - h * WIDE_SEAT_BAND - 8, height: h * WIDE_SEAT_BAND }}>
      {live ? <Seats seats={live.seats} liveSheet={live.sheet} /> : <Seats />}
    </div>
    <span className="lab-board-table top">
      <select
        title={env.scatter ? "Scatter is on; pick a table to set the stage back down" : "The table the seats gather around"}
        value={env.scatter ? "" : env.tableKey}
        onChange={(event) => setTable(event.target.value)}
      >
        {env.scatter && <option value="">Scatter</option>}
        {(catalogs?.tables ?? []).filter((table) => table.key !== "Scatter").map((table) => (
          <option key={table.key} value={table.key}>{table.key}</option>
        ))}
        {!catalogs?.tables.some((table) => table.key === env.tableKey) && !env.scatter && <option value={env.tableKey}>{env.tableKey}</option>}
      </select>
      <select title="The sky over the scene" value={env.sky} onChange={(event) => setSky(event.target.value)}>
        <option value="">Site sky</option>
        <option value={GENERIC_SKY}>Generic sky</option>
        {(catalogs?.skyboxes ?? []).filter((sky) => sky.key !== GENERIC_SKY).map((sky) => (
          <option key={sky.key} value={sky.key}>{sky.display}</option>
        ))}
      </select>
      <select
        title="Room lighting"
        value={env.lighting}
        onChange={(event) => {
          const key = event.target.value;
          if (key === "AdminDark" || key === "AdminStandard" || key === "AdminBright") {
            setLighting(key);
          }
        }}
      >
        {env.lighting === "" && <option value="">Scene lighting</option>}
        {(Object.keys(LIGHTING_LABEL) as LightingPreset[]).map((key) => <option key={key} value={key}>{LIGHTING_LABEL[key]}</option>)}
      </select>
    </span>
    <span className="lab-help" tabIndex={0}>
      ?
      <span className="lab-help-tip">
        Drag anywhere; tokens snap only when dropped over a slot. Drop a whole group on a pack to arrange it.
        Double-click to light / unlight. Hover a token to enlarge it. Right-click empty stage for placement,
        Clear Stage, and Reset to Library.
      </span>
    </span>
    {ring && (
      <Overlay onClose={closeRing}>
        <div className="lab-ring" style={{ left: ring.x, top: ring.y }}>
          <button
            type="button"
            className="lab-ring-item spoke"
            style={{ left: 0, top: -64, "--i": 0 } as CSSProperties}
            onClick={() => {
              setTable(env.scatter ? "Table B" : "Scatter");
              closeRing();
            }}
          >
            <span className="lab-ring-small">Placement</span>
            {placement} ⇄ {placement === "Standard" ? "Scatter" : "Standard"}
          </button>
          <button
            type="button"
            className={`lab-ring-item spoke${clearArmed ? " armed" : ""}`}
            style={{ left: -112, top: 40, "--i": 1 } as CSSProperties}
            onClick={() => (clearArmed ? closeRing() : setClearArmed(true))}
          >
            {clearArmed ? "Click again to clear" : "Clear Stage"}
          </button>
          <button type="button" className="lab-ring-item spoke" style={{ left: 112, top: 40, "--i": 2 } as CSSProperties} onClick={closeRing}>
            Reset to Library
          </button>
        </div>
      </Overlay>
    )}
  </div>
  );
};

/* ---------- modules ---------- */

export const ClockReadout = ({ differs, big }: { differs: boolean; big: boolean }): ReactElement => (
  <div className={`lab-clock${big ? " big" : ""}`}>
    {differs && (
      <div className="lab-clock-present small">
        <span className="lab-clock-tag">Present day</span> Fri Oct 9, 2026 · 11:40 PM
      </div>
    )}
    <div className="lab-clock-main">
      <span className="lab-clock-tag">{differs ? "Scene time" : "Present day = scene time"}</span>
      <span className="lab-clock-time">{differs ? "8:15 PM" : "11:40 PM"}</span>
      <span className="lab-clock-date">{differs ? "Tue Sep 22, 2026 (flashback)" : "Fri Oct 9, 2026"}</span>
    </div>
    <div className="lab-clock-sun">
      <Chip>Dusk 7:02 PM</Chip>
      <Chip tone="warn">Dawn in {differs ? "10h 41m" : "7h 22m"}</Chip>
      <Chip tone="dim">real-time: off</Chip>
    </div>
  </div>
);

export const ClockJumps = ({ compact }: { compact: boolean }): ReactElement => (
  <div className="lab-jumps">
    <span className="lab-jumps-label">Jump scene time (left = forward, right-click = back)</span>
    <div className="lab-jumps-row">
      {(compact ? ["+10m", "+30m", "+1h", "+2h", "+1d", "+1w"] : ["+10m", "+20m", "+30m", "+1h", "+2h", "+4h", "+1d", "+3d", "+1w", "+1mo"]).map((label) => (
        <Btn key={label}>{label}</Btn>
      ))}
      <Btn>Dawn −…</Btn>
      <Btn>Dusk +…</Btn>
    </div>
  </div>
);

export const Weather = ({ override }: { override: boolean }): ReactElement => (
  <div className={`lab-weather${override ? " override" : ""}`}>
    <div className="lab-weather-icons">
      <Chip tone={override ? "accent" : "on"}>Rain: {override ? "HEAVY" : "light"}</Chip>
      <Chip tone={override ? "accent" : "dim"}>Wind: {override ? "max" : "low"}</Chip>
      <Chip tone={override ? "accent" : "dim"}>Thunder: {override ? "ON" : "off"}</Chip>
    </div>
    <p className="lab-weather-source">
      {override ? "OVERRIDE until dawn (6:58 AM)" : "Following the schedule"}
      {override && <Btn tone="danger">Back to schedule</Btn>}
    </p>
  </div>
);

export const Location = ({ stacked }: { stacked: boolean }): ReactElement => (
  <div className={`lab-location${stacked ? " stacked" : ""}`}>
    <span className="lab-location-row"><span className="lab-location-key">District</span> The Annex</span>
    <span className="lab-location-row"><span className="lab-location-key">Site</span> Elysium (Casa Loma)</span>
    <span className="lab-location-row"><span className="lab-location-key">Skybox</span> site default <Chip tone="dim">fog on</Chip></span>
    <span className="lab-location-chips">
      <Chip tone="accent">Elysium</Chip>
      <Chip tone="accent">Masquerade risk</Chip>
      <Chip>+ condition</Chip>
    </span>
  </div>
);

export const Sound = ({ withVolumes }: { withVolumes: boolean }): ReactElement => (
  <div className="lab-sound">
    <p className="lab-sound-now">Now: Intrigue · Location: Casa Loma halls · Rain (light)</p>
    <div className="lab-sound-lanes">
      <Btn>Main</Btn>
      <Btn tone="primary">Intrigue</Btn>
      <Btn>Combat</Btn>
      <Btn>Location</Btn>
      <Btn>Featured…</Btn>
      <Btn tone="danger">Stop all</Btn>
    </div>
    {withVolumes && (
      <div className="lab-sound-volumes">
        {["Music", "Location", "Featured", "Rain", "Wind"].map((lane) => (
          <span key={lane} className="lab-sound-volume"><span>{lane}</span><span className="lab-sound-bar" /></span>
        ))}
      </div>
    )}
  </div>
);

export const Queue = ({ narrow }: { narrow: boolean }): ReactElement => (
  <div className={`lab-queue${narrow ? " narrow" : ""}`}>
    <div className="lab-queue-head">
      <Chip tone="on">TTS connected</Chip>
      <span className="lab-queue-live"><span className="lab-toggle" /> Live</span>
    </div>
    <div className="lab-queue-actions">
      <Btn tone="primary">Send 3 changes</Btn>
      <Btn>Clear queue</Btn>
    </div>
    <ol className="lab-queue-list">
      <li>Light Victor (Mid Center)</li>
      <li>Black Caesar: present → absent</li>
      <li>Weather: rain → heavy</li>
    </ol>
    <p className="lab-queue-hint">Play Scene, End Scene, table / location changes, clock jumps, Clear Stage and rolls skip the queue.</p>
  </div>
);

export const Roster = ({ grid = false }: { grid?: boolean }): ReactElement => (
  <div className="lab-roster">
    <div className="lab-roster-tabs">
      <Btn tone="primary">Main NPCs</Btn>
      <Btn>Generic NPCs</Btn>
      <Btn>Memoriam</Btn>
    </div>
    <span className="lab-search">Search every NPC…</span>
    <div className={grid ? "lab-roster-trays grid" : "lab-roster-trays"}>
      {["Camarilla", "Anarchs", "Sabbat", "Independents", "Hecata", "Werewolves", "Generic: saved tags"].map((group) => (
        <div key={group} className="lab-tray">
          <span className="lab-tray-name">{group}</span>
          <span className="lab-tray-tokens">{Array.from({ length: 7 }, (_, index) => <span key={index} className="lab-tray-token" />)}</span>
        </div>
      ))}
    </div>
    <Btn>+ Add generic NPCs</Btn>
  </div>
);

export const SceneTitle = ({ withLibrary }: { withLibrary: boolean }): ReactElement => (
  <div className="lab-scene-title">
    <span className="lab-scene-live">ON THE TABLE</span>
    <span className="lab-scene-name">Elysium — The Annex</span>
    {withLibrary && <Btn>Scene library…</Btn>}
    <Btn tone="danger">End Scene</Btn>
  </div>
);

export const PreviewTabs = (): ReactElement => (
  <div className="lab-preview-tabs">
    <span className="lab-preview-tab active">Prep: Rack — Kensington</span>
    <span className="lab-preview-tab">Prep: Kai's haven</span>
    <span className="lab-preview-tab add">+ prepare a scene</span>
  </div>
);

/** Slide-out editor for a library scene that is not on the table (blue = not live). */
export const PreviewPanel = ({ x, y, w, h, wide = false }: { x: number; y: number; w: number; h: number; wide?: boolean }): ReactElement => (
  <Box x={x} y={y} w={w} h={h} title="Preview panel: Rack — Kensington (not on the table)" tone="preview" tier="B">
    <div className="lab-preview-body">
      <PreviewTabs />
      <div className="lab-preview-grid">
        <div>
          {wide
            ? <WideBoard w={Math.round(w * 0.7)} h={Math.round(w * 0.7 * WIDE_BOARD_RATIO)} />
            : <Board w={Math.round(w * 0.62)} h={Math.round((w * 0.62) / 0.9)} withSeats />}
          <p className="lab-note">Same board, blue frame: edits change the library scene only.</p>
        </div>
        <div className="lab-preview-side">
          <Location stacked />
          <ClockReadout differs big={false} />
          <Weather override={false} />
          <Sound withVolumes={false} />
        </div>
      </div>
      <div className="lab-preview-actions">
        <Btn tone="primary">Save</Btn>
        <Btn tone="live">Play Scene</Btn>
        <Btn tone="danger">Discard (double-click)</Btn>
        <span className="lab-preview-hint">Click outside to slide away; it stays in progress.</span>
      </div>
    </div>
  </Box>
);

export const RollsReserved = (): ReactElement => (
  <p className="lab-reserved">Reserved for Storyteller rolls (later step). Right-click any token or seat → ring menu: Roll…, Notes / tooltip.</p>
);
