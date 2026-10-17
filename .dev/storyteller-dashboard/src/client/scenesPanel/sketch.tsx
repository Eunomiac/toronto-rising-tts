import { useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Headshot } from "../headshots/Headshot";
import { SEAT_ACCENT } from "../pcSheet/layout";
import { useOpenPcSheet } from "../pcSheet/openPcSheet";
import { paintDamageTrack, paintHumanityTrack } from "../pcSheet/paint";
import { actionsForRing } from "../pcSheet/ringActions";
import { TraitRing } from "../pcSheet/TraitRing";
import type { ApplyCommand, RingTarget, SeatColor, SeatSnapshot, SheetSnapshot } from "../pcSheet/types";
import type { LiveSheetAccess } from "../pcSheet/useLiveSheet";
import { LIGHTING_PRESETS, lightingLabel, type LightingPreset } from "../catalogVocab";
import type { NpcTier } from "../../shared/npcStats";
import { GenericTiersContext, useScenesCommand, type StageChanges } from "./commands";
import { CompulsionBadge } from "./compulsionBadge";
import { TierBadge } from "./tierBadge";
import { BoxRow, HUNGER_DOT, NpcLevelBadge, NpcLiveContext, NpcTrackerPopup } from "./npcTrackers";
import { GENERIC_SKY, stageName, tableUsesRandomSeating } from "./liveScene";
import { SignalFlame } from "./signal";
import { RollsCommandContext } from "./rolls/commands";
import { beginDrag, endDrag } from "./dnd/session";
import { startNativeDrag } from "./dnd/native";
import { moveInScatter, NPC_DRAG_TYPE, SEAT_DRAG_TYPE, withChanges, type ScatterMove, type StageSpot } from "./stage";
import { stagePacks } from "./stageFrame";
import type { GenericNpc, ScatterGroup } from "../worldState";
import { Icon } from "./icons";
import { useControlBoardSnaps, useSceneCatalogs } from "./roster";
import { farRadii, ScatterLayer, StageLayer } from "./stageEdit";

/**
 * Building blocks for the Scenes tab. Every panel is laid out in absolute pixels on the fixed 1920×1042 canvas
 * (1080 minus the app tab bar), so sizes on screen are the real sizes.
 */

export const CANVAS_W = 1920;
export const CANVAS_H = 1042;

type BoxProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly children?: ReactNode;
  readonly className?: string;
};

export const Box = ({ x, y, w, h, children, className }: BoxProps): ReactElement => (
  <section className={`lab-box${className ? ` ${className}` : ""}`} style={{ left: x, top: y, width: w, height: h }}>
    {children && <div className="lab-box-body">{children}</div>}
  </section>
);

export const Btn = ({ children, tone }: { children: ReactNode; tone?: "primary" | "danger" | "live" }): ReactElement => (
  <span className={`lab-btn${tone ? ` ${tone}` : ""}`}>{children}</span>
);

/** The Scenes tab's canvas, while that tab is showing. */
export const activeCanvas = (): HTMLElement | null =>
  Array.from(document.querySelectorAll<HTMLElement>(".lab-canvas")).find((canvas) => canvas.offsetParent !== null) ?? null;

/** Canvas-relative point for a mouse event, for placing pop-ups rendered through `Overlay`. */
export const canvasPoint = (event: MouseEvent<HTMLElement>): { x: number; y: number } => {
  const canvas = event.currentTarget.closest(".lab-canvas");
  if (!canvas) {
    throw new Error("Pop-up opened outside the Scenes canvas.");
  }
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

/**
 * Pop-ups take focus until dismissed, so they dim everything behind them. Click the dimmed area or press
 * Escape to close. Rendered into the Scenes canvas (canvas coordinates) below the note pins, so pop-ups can be pinned.
 */
export const Overlay = ({ onClose, children }: { onClose: () => void; children: ReactNode }): ReactElement => {
  const canvas = activeCanvas();
  if (!canvas) {
    throw new Error("Overlay needs the Scenes canvas.");
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

export type SeatSketch = {
  readonly slot: number;
  /** TTS seat key (player colour or NPC seat); none for an empty chair. */
  readonly seatKey?: string;
  readonly name?: string;
  readonly characterKey?: string;
  readonly kind: "pc" | "npc" | "empty" | "nochair";
  readonly state?: "absent" | "disconnected";
  /** The player's PC name when they are playing an NPC role; `name` and the image are then the NPC's. */
  readonly playedBy?: string;
  readonly color?: SeatColor;
  /** The player's signal fire is lit. */
  readonly signal?: boolean;
};

const NO_SEATS: SheetSnapshot = { ok: true, seats: [] };

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
const TrackerPopup = ({ seat, onRing, onHunger, onOpenSheet }: {
  seat: SeatSnapshot;
  onRing: (event: MouseEvent<HTMLElement>, target: RingTarget) => void;
  onHunger: (delta: number) => void;
  onOpenSheet?: () => void;
}): ReactElement => (
  <div className="lab-seat-pop" role="dialog" aria-label={`${seat.charName} trackers`} {...swallowClicks}>
    <span className="lab-seat-pop-head">
      <span className="lab-seat-pop-name">{seat.charName}</span>
      {onOpenSheet && (
        <button type="button" className="lab-btn lab-seat-pop-sheet" title="Show this character's sheet on the PCs tab" onClick={onOpenSheet}>
          Open sheet
        </button>
      )}
    </span>
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

const SeatContent = ({ seat, tier }: { seat: SeatSketch; tier: NpcTier | undefined }): ReactElement => (
  <>
    <span className="lab-seat-badge">{seat.slot}</span>
    {tier && <TierBadge tier={tier} where="seat" />}
    {seat.kind === "npc" && seat.characterKey && <NpcLevelBadge characterKey={seat.characterKey} where="seat" />}
    <span className="lab-seat-text">
      {seat.playedBy && <span className="lab-seat-flag role">{seat.playedBy} as</span>}
      {seat.name && <span className="lab-seat-name">{seat.name}</span>}
    </span>
  </>
);

/** Seat drags on the table: a seat holder to another chair (swapping), a roster NPC into an empty chair. */
export type SeatDrops = {
  readonly move: (seatKey: string, chair: number) => void;
  readonly seatNpc: (characterKey: string, chair: number) => void;
  /** With it, an NPC dropped on another NPC's chair takes it (the transition strip's orphans). */
  readonly displace?: (characterKey: string, chair: number) => void;
};

/**
 * One cell per chair, each a ninth of the row (the most chairs any table has); positions the table lacks are
 * left out rather than drawn, and the rest stay centred. The figurine headshot fills the cell above the name.
 * PC seats are bordered in the player's colour, NPC seats in muted grey; absent (out of the scene) and
 * disconnected seats are told apart by border style and image treatment. Clicking a PC seat opens that PC's
 * tracker controls; clicking anywhere else closes them. Double-clicking it (or Open sheet in the controls) shows
 * the PC's sheet on the PCs tab. Right-clicking an occupied seat hands it to `onMenu`
 * (the wide board's roll ring, which also takes the character out of the scene or brings them back). With
 * `onPresence` (scene drafts) a click on an occupied, connected seat toggles presence instead. With `seating`
 * (the live table, or a draft on a table TTS does not seat from the session chairs) a seated character drags as a token:
 * onto another chair to swap, and a seated NPC onto the stage; roster NPCs drop into empty chairs. Every cell
 * carries `data-chair` for stage tokens dropped on it.
 */
export const Seats = ({ seats, liveSheet, onMenu, onPresence, onNpcTrackers, seating }: {
  seats: readonly SeatSketch[];
  /** Live sheets (fetched as soon as the seats show, for each PC's Desire); scene previews have none and show no sheet. */
  liveSheet?: LiveSheetAccess;
  onMenu?: (event: MouseEvent<HTMLElement>, seat: SeatSketch) => void;
  onPresence?: (seatKey: string, present: boolean) => void;
  /** The live table: a click on a seated NPC opens its trackers. */
  onNpcTrackers?: (event: MouseEvent<HTMLElement>, characterKey: string, name: string) => void;
  seating?: SeatDrops;
}): ReactElement => {
  const [dropChair, setDropChair] = useState<number | null>(null);
  const send = useScenesCommand();
  const tiers = useContext(GenericTiersContext);
  const openPcSheet = useOpenPcSheet();
  const sheet = liveSheet?.sheet ?? NO_SEATS;
  const apply = (command: ApplyCommand): void => {
    if (!liveSheet) {
      throw new Error("Seat trackers changed without a live sheet.");
    }
    liveSheet.apply(command);
  };
  const [openColor, setOpenColor] = useState<SeatColor | null>(null);
  const [ring, setRing] = useState<TrackRing | null>(null);
  const sheetMissing = liveSheet !== undefined && liveSheet.sheet === null && liveSheet.error === null;
  useEffect(() => {
    if (sheetMissing) {
      liveSheet?.load();
    }
  }, [sheetMissing, liveSheet]);
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
        const togglesPresence = onPresence !== undefined && seat.seatKey !== undefined && (seat.kind === "pc" || seat.kind === "npc") && seat.state !== "disconnected";
        const controllable = !onPresence && liveSheet !== undefined && seat.color !== undefined && seat.kind === "pc";
        const npcTrackers = !onPresence && seat.kind === "npc" && seat.characterKey !== undefined ? onNpcTrackers : undefined;
        const menu = onMenu && (seat.kind === "pc" || seat.kind === "npc") ? onMenu : undefined;
        const seatKey = seat.seatKey ?? (seat.kind === "pc" ? seat.color : undefined);
        // DnD session (slide-out bins, out, etc.) works in downtime too; chair swaps still need `seating`.
        const draggable = seatKey !== undefined && (seat.kind === "pc" || seat.kind === "npc");
        const takesNpc = seat.kind === "empty" || (seat.kind === "npc" && seating?.displace !== undefined);
        const accepts = (event: DragEvent<HTMLElement>): boolean =>
          seating !== undefined
          && (event.dataTransfer.types.includes(SEAT_DRAG_TYPE) || (takesNpc && event.dataTransfer.types.includes(NPC_DRAG_TYPE)));
        const opensSheet = controllable && openPcSheet !== null;
        const hints = [
          controllable && !open ? "Click for this PC's trackers" : undefined,
          npcTrackers ? "Click for this NPC's trackers" : undefined,
          opensSheet ? "Double-click for their character sheet" : undefined,
          togglesPresence ? (seat.state === "absent" ? "Out of this scene — click to bring them in" : "In this scene — click to take them out") : undefined,
          menu && !togglesPresence ? "Right-click to roll, or to take them out of the scene / bring them back" : undefined,
          draggable ? `Drag to another chair to swap places${seat.kind === "npc" ? ", or onto the stage" : ""}` : undefined,
          seating && seat.kind === "empty" ? "Drop an NPC from the roster or the stage here to seat them" : undefined
        ].filter(Boolean);
        const pcSheet = seat.kind === "pc" ? sheet.seats.find((entry) => entry.color === seat.color) : undefined;
        const desire = pcSheet?.desire ?? "";
        return (
          <div
            key={seat.slot}
            className={`lab-seat-slot${controllable || npcTrackers ? " controllable" : ""}${open ? " open" : ""}${seat.signal ? " signal" : ""}${draggable ? " draggable" : ""}${dropChair === seat.slot ? " drop" : ""}`}
            style={style}
            title={hints.length > 0 ? hints.join(". ") : undefined}
            data-chair={seat.slot}
            data-chair-holder={seat.kind === "npc" ? seat.characterKey ?? "" : seat.kind === "pc" ? "pc" : ""}
            data-chair-kind={seat.kind === "pc" ? "pc" : seat.kind === "npc" ? "npc" : "empty"}
            data-seat-key={seatKey ?? ""}
            draggable={draggable}
            onDragStart={(event) => {
              if (!draggable || !seatKey) {
                return;
              }
              event.dataTransfer.setData(SEAT_DRAG_TYPE, seatKey);
              if (seat.kind === "npc" && seat.characterKey) {
                event.dataTransfer.setData(NPC_DRAG_TYPE, seat.characterKey);
              }
              event.dataTransfer.effectAllowed = "move";
              if (seat.kind === "pc" && seat.color) {
                startNativeDrag(event,
                  { dragKind: "pcSeated", color: seat.color, seatKey, chair: seat.slot },
                  { members: [{ characterKey: seat.characterKey ?? seat.color, name: seat.name ?? seat.color }] }
                );
              } else if (seat.kind === "npc" && seat.characterKey) {
                startNativeDrag(event,
                  { dragKind: "npcSeated", characterKey: seat.characterKey, seatKey, chair: seat.slot },
                  { members: [{ characterKey: seat.characterKey, name: seat.name ?? seat.characterKey }] }
                );
              }
            }}
            onDragEnd={() => endDrag()}
            onDragOver={(event) => {
              if (accepts(event)) {
                event.preventDefault();
                setDropChair(seat.slot);
              }
            }}
            onDragLeave={() => setDropChair((chair) => (chair === seat.slot ? null : chair))}
            onDrop={(event) => {
              setDropChair(null);
              if (!seating) {
                return;
              }
              if (!accepts(event)) return;
              event.preventDefault();
              event.stopPropagation();
              endDrag();
              const from = event.dataTransfer.getData(SEAT_DRAG_TYPE);
              if (from) {
                if (from !== seatKey) {
                  seating.move(from, seat.slot);
                }
                return;
              }
              const npc = event.dataTransfer.getData(NPC_DRAG_TYPE);
              if (npc && seat.kind === "empty") {
                seating.seatNpc(npc, seat.slot);
              } else if (npc && seat.kind === "npc" && seating.displace) {
                seating.displace(npc, seat.slot);
              }
            }}
            onContextMenu={(event) => {
              if (!menu) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              menu(event, seat);
            }}
            onClick={(event) => {
              if (togglesPresence && seat.seatKey) {
                onPresence(seat.seatKey, seat.state === "absent");
                return;
              }
              if (npcTrackers && seat.characterKey) {
                npcTrackers(event, seat.characterKey, seat.name ?? seat.characterKey);
                return;
              }
              if (!controllable || (event.target as HTMLElement).closest(".lab-seat-pop")) {
                return;
              }
              setRing(null);
              setOpenColor(open ? null : seat.color ?? null);
              liveSheet?.load();
            }}
            onDoubleClick={() => {
              if (opensSheet && seat.color) {
                setOpenColor(null);
                openPcSheet(seat.color);
              }
            }}
          >
            {desire !== "" && <span className="lab-seat-desire">{desire}</span>}
            {pcSheet?.compulsion && <CompulsionBadge active={pcSheet.compulsion} clan={pcSheet.clan} />}
            {seat.signal && seat.color && (
              <button
                type="button"
                className="lab-seat-signal"
                title="Signal fire lit: click to put it out"
                aria-label="Put out the signal fire"
                {...swallowClicks}
                onClick={(event) => {
                  event.stopPropagation();
                  if (seat.color) {
                    send({ op: "signalOff", color: seat.color });
                  }
                }}
              >
                <SignalFlame />
              </button>
            )}
            {seat.characterKey ? (
              <Headshot characterKey={seat.characterKey} className={className}>
                <SeatContent seat={seat} tier={seat.kind === "npc" ? tiers[seat.characterKey] : undefined} />
              </Headshot>
            ) : (
              <div className={className}>
                <SeatContent seat={seat} tier={undefined} />
              </div>
            )}
            {open && openSeat && (
              <TrackerPopup
                seat={openSeat}
                onRing={(event, target) => setRing({ ...canvasPoint(event), target })}
                onHunger={(delta) => apply({ op: "hunger", color: openSeat.color, delta })}
                onOpenSheet={openPcSheet ? () => {
                  setOpenColor(null);
                  openPcSheet(openSeat.color);
                } : undefined}
              />
            )}
            {open && !openSeat && liveSheet && (
              <div className="lab-seat-pop" {...swallowClicks}>
                <span className="lab-note">{liveSheet.error ?? "Reading the sheet…"}</span>
              </div>
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
              apply(button === "right" ? (action.right ?? action.left) : action.left);
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

const WIDE_SEAT_BAND = 0.18;

/** A stage token at its stage position (fractions of the board). */
export type StageToken = {
  readonly characterKey: string;
  readonly name: string;
  readonly lit: boolean;
  readonly at: { readonly u: number; readonly v: number };
};

/**
 * The control board at its real in-game shape (scaled 2:1), with the seat row floating along the bottom edge,
 * on the players' side of the stage (the Far zones are furthest from them). Token positions map straight to stage
 * positions in the game world, so tokens can sit anywhere; pack slots are mild snap points and group drop targets.
 */
export type LiveBoard = {
  readonly seats: readonly SeatSketch[];
  /** Live PC sheets for the seat tracker pop-ups; none in scene drafts. */
  readonly sheet?: LiveSheetAccess;
  /** Scene drafts: a seat click marks the character present or out of the scene, instead of opening trackers. */
  readonly presenceClicks?: boolean;
  readonly tokens: readonly StageToken[];
  readonly env: StageEnv;
  /** Stage changes waiting in the Send queue, drawn as if sent. */
  readonly pending: StageChanges;
  /** Scatter moves waiting in the Send queue. */
  readonly pendingScatter: readonly ScatterMove[];
  /** Generic NPCs the Send queue will spawn (catalog key → name), and renames it will make. */
  readonly spawning?: Readonly<Record<string, string>>;
  readonly renames?: Readonly<Record<string, string>>;
  readonly generics: readonly GenericNpc[];
  readonly scatter: readonly ScatterGroup[];
  readonly rollRing: RollRingData;
};

/** What a character's right-click roll ring needs to pick its roll types. */
export type RollRingData = {
  /** NPC keys flagged Werewolf in the NPC data. */
  readonly werewolves: readonly string[];
  /** PC seats with an Oblivion-Rouse dice bag. */
  readonly oblivionSeats: readonly string[];
  /** The End phase turns the Oblivion-Rouse bag into Remorse. */
  readonly endPhase: boolean;
};

type CharacterRing = {
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly roller: { readonly kind: "pc"; readonly color: string } | { readonly kind: "npc"; readonly characterKey: string };
  /** Narrative presence toggle for an occupied seat (never connection). */
  readonly presence?: { readonly seat: string; readonly present: boolean };
  /** A generic NPC's key, for Rename; `pending` while it waits in the Send queue to be spawned. */
  readonly generic?: { readonly key: string; readonly pending: boolean };
};

type GenericRename = { readonly x: number; readonly y: number; readonly key: string; readonly pending: boolean; readonly name: string };

type NpcPop = { readonly characterKey: string; readonly name: string; readonly at: { readonly x: number; readonly y: number; readonly up: boolean } };

/** Canvas point for a screen point, while the Scenes tab shows. */
const canvasPointAt = (clientX: number, clientY: number): { x: number; y: number } => {
  const canvas = activeCanvas();
  if (!canvas) {
    throw new Error("Scenes canvas is not showing.");
  }
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
};

const RING_RX = 150;
const RING_RY = 86;

/** Keep the whole roll ring (spokes included) on the canvas. */
const ringCentre = (point: { x: number; y: number }): { x: number; y: number } => ({
  x: Math.min(Math.max(point.x, RING_RX + 70), CANVAS_W - RING_RX - 70),
  y: Math.min(Math.max(point.y, RING_RY + 20), CANVAS_H - RING_RY - 20)
});

/** The stage's surroundings: table, sky override ("" = the Site's own sky), and lighting preset ("" = the scene's). */
export type StageEnv = {
  readonly tableKey: string;
  readonly scatter: boolean;
  readonly sky: string;
  readonly lighting: LightingPreset | "";
};

/** An edit stays drawn until TTS pushes the stage back, or this long if it never does (TTS refused it). */
const OPTIMISTIC_MS = 6000;

/** The stage with no scene on the table: seats stay along the bottom (trackers, sheets, and DnD to slide-out bins; no chair swaps). */
export const IdleBoard = ({ w, h, seats, liveSheet }: { w: number; h: number; seats: readonly SeatSketch[]; liveSheet?: LiveSheetAccess }): ReactElement => (
  <div className="lab-board wide idle" style={{ width: w, height: h }}>
    <span className="lab-board-idle">(No Active Scene)</span>
    <div className="lab-board-seats floating bottom" style={{ top: h - h * WIDE_SEAT_BAND - 8, height: h * WIDE_SEAT_BAND }}>
      <Seats seats={seats} {...(liveSheet ? { liveSheet } : {})} />
    </div>
  </div>
);

export const WideBoard = ({ w, h, live }: { w: number; h: number; live: LiveBoard }): ReactElement => {
  const [ring, setRing] = useState<{ x: number; y: number } | null>(null);
  const [charRing, setCharRing] = useState<CharacterRing | null>(null);
  const [renaming, setRenaming] = useState<GenericRename | null>(null);
  const [npcPop, setNpcPop] = useState<NpcPop | null>(null);
  const npcLive = useContext(NpcLiveContext);
  const rollsSend = useContext(RollsCommandContext);
  const tiers = useContext(GenericTiersContext);
  const [clearArmed, setClearArmed] = useState(false);
  const [local, setLocal] = useState<StageChanges>({});
  const [localScatter, setLocalScatter] = useState<readonly ScatterMove[]>([]);
  const board = useRef<HTMLDivElement>(null);
  const command = useScenesCommand();
  const { env } = live;
  const placement = env.scatter ? "Scatter" : "Standard";
  const setTable = (key: string): void => command({ op: "table", key });
  const setSky = (key: string): void => command({ op: "skybox", key: key || "none" });
  const setLighting = (presetKey: LightingPreset): void => command({ op: "lighting", presetKey });
  const { catalogs } = useSceneCatalogs();
  const { snaps, error: snapsError } = useControlBoardSnaps();
  const packs = useMemo(() => (snaps ? stagePacks(snaps) : []), [snaps]);

  const { tokens: liveTokens, pending: livePending, scatter: liveGroups } = live;
  useEffect(() => {
    setLocal((previous) => (Object.keys(previous).length === 0 ? previous : {}));
  }, [liveTokens, livePending]);
  useEffect(() => {
    setLocalScatter((previous) => (previous.length === 0 ? previous : []));
  }, [liveGroups]);
  const editing = Object.keys(local).length > 0 || localScatter.length > 0;
  useEffect(() => {
    if (!editing) {
      return undefined;
    }
    const id = window.setTimeout(() => {
      setLocal({});
      setLocalScatter([]);
    }, OPTIMISTIC_MS);
    return () => window.clearTimeout(id);
  }, [editing, local, localScatter]);

  const { generics, seats } = live;
  const spawning = live.spawning ?? {};
  const nameOf = (characterKey: string): string =>
    live.renames?.[characterKey]
    ?? spawning[characterKey]
    ?? liveTokens.find((token) => token.characterKey === characterKey)?.name
    ?? catalogs?.pcs.find((pc) => pc.characterKey === characterKey)?.fullName
    ?? stageName(characterKey, catalogs, generics);
  const spots = withChanges(
    liveTokens.map((token): StageSpot => ({ characterKey: token.characterKey, lit: token.lit, u: token.at.u, v: token.at.v })),
    { ...livePending, ...local }
  );
  // A seated NPC on the stage sits dark (and lights again when they leave it); show that for queued edits too.
  const liveStaged = new Set(liveTokens.map((token) => token.characterKey));
  const staged = new Set(spots.map((spot) => spot.characterKey));
  const seatsShown = seats.map((seat): SeatSketch => {
    if (seat.kind !== "npc" || !seat.characterKey || liveStaged.has(seat.characterKey) === staged.has(seat.characterKey)) {
      return seat;
    }
    if (staged.has(seat.characterKey)) {
      return { ...seat, state: "absent" };
    }
    const { state: _dark, ...lit } = seat;
    return lit;
  });
  // A scene preview edits its own seating, except on a table that TTS seats when the scene plays (session chairs).
  const previewShuffled = live.presenceClicks === true && tableUsesRandomSeating(env.tableKey, catalogs);
  const seating: SeatDrops | null = !env.scatter && !previewShuffled
    ? {
      move: (seat, chair) => command({ op: "seatMove", seat, chair }),
      seatNpc: (characterKey, chair) => command({ op: "seatNpc", characterKey, chair })
    }
    : null;
  const edit = (changes: StageChanges): void => {
    if (Object.keys(changes).length === 0) {
      return;
    }
    setLocal((previous) => ({ ...previous, ...changes }));
    command({ op: "stage", changes });
  };
  const groups = [...live.pendingScatter, ...localScatter].reduce(moveInScatter, liveGroups);
  const placeScatter = (characterKey: string, kind: "pc" | "npc", group: number | undefined): void => {
    const move: ScatterMove = group === undefined ? { characterKey, kind } : { characterKey, kind, group };
    setLocalScatter((previous) => [...previous, move]);
    command({ op: "scatterPlace", ...move });
  };
  const clearStage = (): void => {
    if (env.scatter) {
      for (const entry of groups) {
        for (const npc of entry.npcs) {
          placeScatter(npc.characterKey, "npc", undefined);
        }
      }
      return;
    }
    setLocal(Object.fromEntries(spots.map((spot) => [spot.characterKey, { remove: true } as const])));
    command({ op: "stage", clear: true });
  };
  const resetStage = (): void => {
    setLocal({});
    command({ op: "stage", reset: true });
  };

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
  const { rollRing } = live;
  const openSeatRing = (event: MouseEvent<HTMLElement>, seat: SeatSketch): void => {
    const roller = seat.kind === "pc" && seat.color
      ? { kind: "pc" as const, color: seat.color }
      : seat.characterKey ? { kind: "npc" as const, characterKey: seat.characterKey } : null;
    if (!roller) {
      return;
    }
    // DnD slide-outs replace the roll ring: open panels for this character; keep a slim ring only for presence.
    if (roller.kind === "pc" && seat.seatKey) {
      beginDrag(
        { dragKind: "pcSeated", color: roller.color, seatKey: seat.seatKey, chair: seat.slot },
        { x: event.clientX, y: event.clientY }
      );
    } else if (roller.kind === "npc" && seat.seatKey && seat.characterKey) {
      beginDrag(
        { dragKind: "npcSeated", characterKey: seat.characterKey, seatKey: seat.seatKey, chair: seat.slot },
        { x: event.clientX, y: event.clientY }
      );
    }
    if (seat.seatKey && seat.state !== "disconnected") {
      setCharRing({
        ...ringCentre(canvasPoint(event)),
        name: seat.playedBy ?? seat.name ?? seat.characterKey ?? "",
        roller,
        presence: { seat: seat.seatKey, present: seat.state === "absent" }
      });
    }
  };
  const openTokenRing = (event: MouseEvent<HTMLElement>, characterKey: string, kind: "pc" | "npc"): void => {
    event.preventDefault();
    event.stopPropagation();
    const color = kind === "pc" ? seats.find((seat) => seat.characterKey === characterKey && seat.color)?.color : undefined;
    if (kind === "pc" && !color) {
      return;
    }
    const pending = characterKey in spawning;
    const generic = kind === "npc" && (pending || generics.some((npc) => npc.characterKey === characterKey));
    if (color) {
      const seat = seats.find((row) => row.color === color);
      if (seat?.seatKey) {
        beginDrag(
          { dragKind: "pcSeated", color, seatKey: seat.seatKey, chair: seat.slot },
          { x: event.clientX, y: event.clientY }
        );
      }
    } else {
      beginDrag({ dragKind: "npcStaged", characterKey }, { x: event.clientX, y: event.clientY });
    }
    if (generic) {
      setCharRing({
        ...ringCentre(canvasPoint(event)),
        name: nameOf(characterKey),
        roller: color ? { kind: "pc", color } : { kind: "npc", characterKey },
        generic: { key: characterKey, pending }
      });
    }
  };
  const openNpcTrackers = (clientX: number, clientY: number, characterKey: string, name?: string): void => {
    const point = canvasPointAt(clientX, clientY);
    setNpcPop({ characterKey, name: name ?? nameOf(characterKey), at: { ...point, up: point.y > CANVAS_H / 2 } });
  };
  const rename = (target: GenericRename): void => {
    const name = target.name.trim();
    if (name === "") {
      return;
    }
    const tier = tiers[target.key];
    command(target.pending
      ? { op: "genericAdd", keys: [target.key], labels: { [target.key]: name }, ...(tier ? { tiers: { [target.key]: tier } } : {}) }
      : { op: "genericRename", key: target.key, name });
    setRenaming(null);
  };
  return (
  <div ref={board} className="lab-board wide" style={{ width: w, height: h }} onContextMenu={openRing}>
    {!env.scatter && (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {packs.map((pack) => (
          <g key={pack.familyId}>
            {pack.far && <ellipse cx={pack.center.u * w} cy={pack.center.v * h} {...farRadii(pack, w, h)} className="lab-board-ring" />}
            {pack.slots.map((slot) => (
              <circle key={slot.snapIndex} cx={slot.u * w} cy={slot.v * h} r={5} className="lab-board-snap" />
            ))}
          </g>
        ))}
      </svg>
    )}
    {snapsError && <span className="lab-board-error">{snapsError}</span>}
    {env.scatter ? (
      <ScatterLayer w={w} h={h} board={board} groups={groups} catalogs={catalogs} nameOf={nameOf} onPlace={placeScatter} onMenu={openTokenRing} />
    ) : (
      <StageLayer
        w={w}
        h={h}
        board={board}
        packs={packs}
        spots={spots}
        catalogs={catalogs}
        nameOf={nameOf}
        onEdit={edit}
        onMenu={openTokenRing}
        {...(seating ? { onSeat: seating.seatNpc } : {})}
        {...(npcLive ? { onOpen: (characterKey: string, client: { x: number; y: number }) => openNpcTrackers(client.x, client.y, characterKey) } : {})}
      />
    )}
    <div className="lab-board-seats floating bottom" style={{ top: h - h * WIDE_SEAT_BAND - 8, height: h * WIDE_SEAT_BAND }}>
      <Seats
        seats={seatsShown}
        {...(live.sheet ? { liveSheet: live.sheet } : {})}
        {...(live.presenceClicks ? { onPresence: (seatKey: string, present: boolean) => command({ op: "seatPresence", seat: seatKey, present }) } : {})}
        {...(npcLive ? { onNpcTrackers: (event: MouseEvent<HTMLElement>, characterKey: string, name: string) => openNpcTrackers(event.clientX, event.clientY, characterKey, name) } : {})}
        {...(seating ? { seating } : {})}
        onMenu={openSeatRing}
      />
    </div>
    {npcPop && (
      <Overlay onClose={() => setNpcPop(null)}>
        <NpcTrackerPopup characterKey={npcPop.characterKey} name={npcPop.name} at={npcPop.at} send={command} />
      </Overlay>
    )}
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
          const preset = LIGHTING_PRESETS.find((key) => key === event.target.value);
          if (preset) {
            setLighting(preset);
          }
        }}
      >
        {env.lighting === "" && <option value="">Scene lighting</option>}
        {LIGHTING_PRESETS.map((key) => <option key={key} value={key}>{lightingLabel(key)}</option>)}
      </select>
    </span>
    <span className="lab-help" tabIndex={0}>
      ?
      <span className="lab-help-tip">
        {env.scatter
          ? "Drag a PC or NPC into another group to move them there; drag an NPC out of every group to take them off. Drop roster NPCs or a whole group into a circle."
          : "Drag tokens anywhere; they snap only when dropped over a slot, and leave the stage when dropped off it. Drag the space around a pack's slots to move the whole pack. Drop a roster NPC anywhere, or a whole group on a pack (the leader takes the anchor). Double-click to light / darken."}
        {seating && " Drag a seated character to another chair to swap places, or a seated NPC onto the stage (their seat goes dark until they leave it). Drop a stage token or a roster NPC on an empty chair to seat them."}
        {previewShuffled && !env.scatter && " On this table each PC keeps their chair for the session and NPCs sit after them, so seats cannot be rearranged here."}
        {" "}Right-click empty stage for placement, Clear Stage{env.scatter ? "" : ", and Reset to Library"}.
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
            onClick={() => {
              if (clearArmed) {
                clearStage();
                closeRing();
              } else {
                setClearArmed(true);
              }
            }}
          >
            {clearArmed ? "Click again to clear" : "Clear Stage"}
          </button>
          {!env.scatter && (
            <button
              type="button"
              className="lab-ring-item spoke"
              style={{ left: 112, top: 40, "--i": 2 } as CSSProperties}
              title="Put the stage back the way the scene's library row has it"
              onClick={() => {
                resetStage();
                closeRing();
              }}
            >
              Reset to Library
            </button>
          )}
        </div>
      </Overlay>
    )}
    {charRing && (
      <Overlay onClose={() => setCharRing(null)}>
        <div className="lab-ring wide" style={{ left: charRing.x, top: charRing.y }}>
          <span className="lab-ring-name">{charRing.name}</span>
          {[
            ...(charRing.presence
              ? [{
                key: "presence",
                label: charRing.presence.present ? "Into the scene" : "Out of the scene",
                run: () => charRing.presence && command({ op: "seatPresence", ...charRing.presence })
              }]
              : []),
            ...(charRing.generic
              ? [{
                key: "rename",
                label: "Rename…",
                run: () => charRing.generic && setRenaming({ x: charRing.x, y: charRing.y, ...charRing.generic, name: charRing.name })
              }]
              : [])
          ].map((item, index, items) => {
            const angle = -Math.PI / 2 + (index / items.length) * Math.PI * 2;
            return (
              <button
                key={item.key}
                type="button"
                className="lab-ring-item spoke"
                style={{ left: Math.cos(angle) * RING_RX, top: Math.sin(angle) * RING_RY, "--i": index } as CSSProperties}
                onClick={() => {
                  item.run();
                  setCharRing(null);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </Overlay>
    )}
    {renaming && (
      <Overlay onClose={() => setRenaming(null)}>
        <form
          className="lab-modal lab-generic-rename"
          style={{ left: renaming.x - 140, top: renaming.y - 40 }}
          onSubmit={(event) => {
            event.preventDefault();
            rename(renaming);
          }}
        >
          <span className="lab-modal-title">Rename {nameOf(renaming.key)}</span>
          <input
            className="lab-select"
            autoFocus
            value={renaming.name}
            title="The name the players will see"
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setRenaming({ ...renaming, name: event.target.value })}
          />
          <span className="lab-row">
            <button type="submit" className="lab-btn primary" disabled={renaming.name.trim() === ""}>Rename</button>
            <button type="button" className="lab-btn" onClick={() => setRenaming(null)}>Cancel</button>
          </span>
        </form>
      </Overlay>
    )}
  </div>
  );
};
