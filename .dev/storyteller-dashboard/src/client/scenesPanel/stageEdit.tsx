import { useContext, useEffect, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent, type ReactElement, type RefObject } from "react";
import { Headshot } from "../headshots/Headshot";
import { useNpcOverrides } from "../npcOverrides";
import type { SceneCatalogs } from "./catalogs";
import { GenericTiersContext, type StageChange, type StageChanges } from "./commands";
import { beginDrag, endDrag, hitTestDrop, moveDrag, pointIn, useBoardDrag, type PointerHandlers } from "./dnd";
import { TierBadge } from "./tierBadge";
import { NpcLevelBadge } from "./npcTrackers";
import {
  GROUP_DRAG_TYPE,
  NPC_DRAG_TYPE,
  NPC_ROLL_DROP_EVENT,
  movePack,
  nearestPack,
  offStage,
  rollCardAt,
  scatterCenter,
  slotNear,
  slotOf,
  spreadOnPack,
  type StageSpot
} from "./stage";
import { stageToBoard, type StagePack, type StagePoint } from "./stageFrame";
import type { ScatterGroup } from "../worldState";
import { groupColor, groupLeader, useRosterLayout } from "./roster";

/**
 * Editing layers of the wide stage board. Tokens drag with the pointer (they snap only when dropped over a slot,
 * and leave the stage when dropped off it); the space around a pack's slots drags the whole pack; roster NPCs and groups drop in with
 * HTML drag and drop. Every edit goes out through `onEdit` / `onPlace`, which queue or send it.
 */

/** A token click waits this long for a second click (double-click lights) before it opens the NPC's trackers. */
const TAP_WAIT_MS = 260;

/**
 * The seat-row chair under a screen point: its number, and who holds it (`""` empty, a seated NPC's key, or `"pc"`).
 * Seat cells carry `data-chair` / `data-chair-holder`.
 */
const chairAt = (clientX: number, clientY: number): { chair: number; holder: string } | null => {
  for (const element of document.elementsFromPoint(clientX, clientY)) {
    const cell = element.closest<HTMLElement>("[data-chair]");
    if (cell) {
      return { chair: Number(cell.dataset.chair), holder: cell.dataset.chairHolder ?? "" };
    }
  }
  return null;
};

/** Picker-group members, the group's leader first. */
const groupMembers = (catalogs: SceneCatalogs | null, leader: string | undefined, groupKey: string): readonly string[] =>
  (catalogs?.namedNpcs ?? [])
    .filter((npc) => npc.pickerGroups.includes(groupKey))
    .map((npc) => npc.characterKey)
    .sort((a, b) => Number(b === leader) - Number(a === leader));

const acceptsRoster = (event: DragEvent<HTMLElement>): boolean =>
  event.dataTransfer.types.includes(NPC_DRAG_TYPE) || event.dataTransfer.types.includes(GROUP_DRAG_TYPE);

type TokenProps = {
  readonly characterKey: string;
  readonly name: string;
  readonly lit: boolean;
  readonly x: number;
  readonly y: number;
  readonly color: string | undefined;
  readonly boss: boolean;
  readonly dragging?: boolean;
  readonly pc?: boolean;
  readonly handlers?: PointerHandlers;
  /** A click opens the NPC's trackers (the live table). */
  readonly opens?: boolean;
  readonly onDoubleClick?: () => void;
  readonly onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
};

/** Right-click on a stage token: the board opens that character's roll ring. */
export type TokenMenu = (event: MouseEvent<HTMLElement>, characterKey: string, kind: "pc" | "npc") => void;

/**
 * A figurine headshot with the name under it; hovering enlarges the headshot. The ring is the token's group
 * colour (thicker and brighter for the group's boss); a gold halo means lit. A generic NPC's stat tier badge sits
 * at its top-left.
 */
export const StageTokenView = ({ characterKey, name, lit, x, y, color, boss, dragging, pc, handlers, opens, onDoubleClick, onContextMenu }: TokenProps): ReactElement => {
  const tier = useContext(GenericTiersContext)[characterKey];
  return (
    <div
      className={`lab-token${lit ? " lit" : ""}${boss ? " boss" : ""}${dragging ? " dragging" : ""}${pc ? " pc" : ""}${handlers ? " editable" : ""}`}
      style={{ left: x, top: y, ...(color ? { "--group": color } : {}) } as CSSProperties}
      title={handlers ? `${name}: drag to move, ${opens ? "click for trackers, " : ""}double-click to ${lit ? "darken" : "light"}, right-click for options` : name}
      data-tr-dnd-staged={pc ? undefined : characterKey}
      {...handlers}
      {...(onDoubleClick ? { onDoubleClick } : {})}
      {...(onContextMenu ? { onContextMenu } : {})}
    >
      <Headshot className="lab-token-head" characterKey={characterKey} />
      {tier && <TierBadge tier={tier} where="stage" />}
      {!pc && <NpcLevelBadge characterKey={characterKey} where="stage" />}
      <span className="lab-token-name">{name}</span>
    </div>
  );
};

/** Half-axes of the ellipse drawn through a Far pack's six slots. */
export const farRadii = (pack: StagePack, w: number, h: number): { rx: number; ry: number } => ({
  rx: Math.max(...pack.slots.map((slot) => Math.abs(slot.u - pack.center.u))) * w,
  ry: Math.max(...pack.slots.map((slot) => Math.abs(slot.v - pack.center.v))) * h
});

const PACK_GRAB_PAD = 18;

/** A pack's grab area in pixels: its Far ellipse, or the box around its arc of snaps, padded. */
const packGrabArea = (pack: StagePack, w: number, h: number): { left: number; top: number; width: number; height: number } => {
  if (pack.far) {
    const { rx, ry } = farRadii(pack, w, h);
    return { left: pack.center.u * w - rx - PACK_GRAB_PAD, top: pack.center.v * h - ry - PACK_GRAB_PAD, width: 2 * (rx + PACK_GRAB_PAD), height: 2 * (ry + PACK_GRAB_PAD) };
  }
  const xs = pack.slots.map((slot) => slot.u * w);
  const ys = pack.slots.map((slot) => slot.v * h);
  const left = Math.min(...xs) - PACK_GRAB_PAD;
  const top = Math.min(...ys) - PACK_GRAB_PAD;
  return { left, top, width: Math.max(...xs) + PACK_GRAB_PAD - left, height: Math.max(...ys) + PACK_GRAB_PAD - top };
};

type StageLayerProps = {
  readonly w: number;
  readonly h: number;
  readonly board: RefObject<HTMLDivElement | null>;
  readonly packs: readonly StagePack[];
  readonly spots: readonly StageSpot[];
  readonly catalogs: SceneCatalogs | null;
  readonly nameOf: (characterKey: string) => string;
  readonly onEdit: (changes: StageChanges) => void;
  readonly onMenu: TokenMenu;
  /** A token dropped on an empty chair (or the NPC's own) takes that chair; without it, the seat row is off the stage. */
  readonly onSeat?: (characterKey: string, chair: number) => void;
  /** A single click on a token (no drag, no second click): the live table opens the NPC's trackers. */
  readonly onOpen?: (characterKey: string, client: { x: number; y: number }) => void;
};

/** Standard placement: tokens anywhere on the stage, packs as mild snap points and group drop targets. */
export const StageLayer = ({ w, h, board, packs, spots, catalogs, nameOf, onEdit, onMenu, onSeat, onOpen }: StageLayerProps): ReactElement => {
  const roster = useRosterLayout();
  const overrides = useNpcOverrides();
  const [over, setOver] = useState(false);
  const tapTimer = useRef<number | null>(null);
  const cancelTap = (): void => {
    if (tapTimer.current !== null) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
  };
  useEffect(() => cancelTap, []);
  const place = (key: string, point: StagePoint): void => {
    if (offStage(point)) {
      if (spots.some((spot) => spot.characterKey === key)) {
        onEdit({ [key]: { remove: true } });
      }
      return;
    }
    const from = spots.find((spot) => spot.characterKey === key);
    const near = slotNear(point, packs, w, h);
    const occupant = near ? spots.find((spot) => spot.characterKey !== key && slotOf(spot, packs)?.slot === near.slot) : undefined;
    const to = near && (!occupant || from) ? near.slot : point;
    const at = stageToBoard(to.u, to.v);
    const changes: Record<string, StageChange> = { [key]: from ? { u: at.u, v: at.v } : { u: at.u, v: at.v, lightMode: "STANDARD" } };
    if (occupant && from && near) {
      const back = stageToBoard(from.u, from.v);
      changes[occupant.characterKey] = { u: back.u, v: back.v };
    }
    onEdit(changes);
  };
  const tokens = useBoardDrag<string>(
    board,
    (key, point, client) => {
      const rollCard = rollCardAt(client.x, client.y);
      if (rollCard) {
        rollCard.dispatchEvent(new CustomEvent(NPC_ROLL_DROP_EVENT, { detail: key }));
        endDrag();
        return;
      }
      const seat = onSeat ? chairAt(client.x, client.y) : null;
      // SD-38: stage token onto a seat moves onto that chair (lit); empty or same holder, or displace via onSeat.
      if (seat && onSeat) {
        onSeat(key, seat.chair);
        endDrag();
        return;
      }
      place(key, point);
      endDrag();
    },
    onOpen
      ? (key, client) => {
          cancelTap();
          tapTimer.current = window.setTimeout(() => {
            tapTimer.current = null;
            onOpen(key, client);
          }, TAP_WAIT_MS);
        }
      : undefined,
    (key, _point, client) => {
      beginDrag({ dragKind: "npcStaged", characterKey: key }, client);
      moveDrag(client, hitTestDrop(client));
    }
  );
  const packDrag = useBoardDrag<StagePack>(board, (pack, point) => {
    const keys = spots.filter((spot) => slotOf(spot, packs)?.pack === pack).map((spot) => spot.characterKey);
    if (offStage(point)) {
      onEdit(Object.fromEntries(keys.map((key) => [key, { remove: true } as const])));
      return;
    }
    const target = slotNear(point, packs, w, h)?.pack ?? nearestPack(point, packs, w, h);
    if (target) {
      onEdit(movePack(pack, target, packs, spots));
    }
  });
  const dropFromRoster = (event: DragEvent<HTMLDivElement>): void => {
    setOver(false);
    const point = pointIn(board, event.clientX, event.clientY);
    const npc = event.dataTransfer.getData(NPC_DRAG_TYPE);
    if (npc) {
      place(npc, point);
      return;
    }
    const group = event.dataTransfer.getData(GROUP_DRAG_TYPE);
    const pack = slotNear(point, packs, w, h)?.pack ?? nearestPack(point, packs, w, h);
    if (group && pack && !offStage(point)) {
      onEdit(spreadOnPack(groupMembers(catalogs, groupLeader(roster, catalogs?.groupBosses, group), group), pack, packs, spots));
    }
  };
  const tokenGroup = (characterKey: string): string | undefined =>
    catalogs?.namedNpcs.find((npc) => npc.characterKey === characterKey)?.pickerGroups[0];
  return (
    <div
      className={`lab-stage-layer${over ? " drop" : ""}`}
      data-tr-dnd-stage=""
      onDragOver={(event) => {
        if (acceptsRoster(event)) {
          event.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={dropFromRoster}
    >
      {packs.map((pack) => {
        const area = packGrabArea(pack, w, h);
        const dragging = packDrag.drag?.item === pack ? packDrag.drag.point : null;
        const shown = dragging ? { ...area, left: dragging.u * w - area.width / 2, top: dragging.v * h - area.height / 2 } : area;
        return (
          <span
            key={pack.familyId}
            className={`lab-pack-handle${pack.far ? " far" : ""}${dragging ? " dragging" : ""}`}
            style={shown}
            title={`${pack.label}: drag to move this pack's NPCs onto another pack, or off the stage`}
            data-tr-dnd-pack={pack.familyId}
            {...packDrag.handlers(pack)}
          />
        );
      })}
      {spots.map((spot) => {
        const dragging = tokens.drag?.item === spot.characterKey ? tokens.drag.point : null;
        const group = tokenGroup(spot.characterKey);
        const at = dragging ?? spot;
        return (
          <StageTokenView
            key={spot.characterKey}
            characterKey={spot.characterKey}
            name={nameOf(spot.characterKey)}
            lit={spot.lit}
            x={at.u * w}
            y={at.v * h}
            color={overrides[spot.characterKey]?.color ?? (group ? groupColor(roster, group) : undefined)}
            boss={group !== undefined && groupLeader(roster, catalogs?.groupBosses, group) === spot.characterKey}
            dragging={dragging !== null}
            handlers={tokens.handlers(spot.characterKey)}
            opens={onOpen !== undefined}
            onDoubleClick={() => {
              cancelTap();
              const at = stageToBoard(spot.u, spot.v);
              onEdit({ [spot.characterKey]: { u: at.u, v: at.v, lightMode: spot.lit ? "OFF" : "STANDARD" } });
            }}
            onContextMenu={(event) => onMenu(event, spot.characterKey, "npc")}
          />
        );
      })}
    </div>
  );
};

type ScatterLayerProps = {
  readonly w: number;
  readonly h: number;
  readonly board: RefObject<HTMLDivElement | null>;
  readonly groups: readonly ScatterGroup[];
  readonly catalogs: SceneCatalogs | null;
  readonly nameOf: (characterKey: string) => string;
  readonly onPlace: (characterKey: string, kind: "pc" | "npc", group: number | undefined) => void;
  readonly onMenu: TokenMenu;
};

/** A dropped token joins the group whose circle it lands in (a little slack around the edge). */
const groupAt = (point: StagePoint, count: number, w: number, h: number, radius: number): number | undefined => {
  for (let group = 1; group <= count; group += 1) {
    const center = scatterCenter(group, count);
    if (Math.hypot((point.u - center.u) * w, (point.v - center.v) * h) <= radius * 1.25) {
      return group;
    }
  }
  return undefined;
};

/**
 * Scatter placement: six groups, each a circle of PCs and NPCs. Drag a token into another circle to move it there;
 * drag an NPC out of every circle to take them off. PCs always stand in a group.
 */
export const ScatterLayer = ({ w, h, board, groups, catalogs, nameOf, onPlace, onMenu }: ScatterLayerProps): ReactElement => {
  const roster = useRosterLayout();
  const [over, setOver] = useState(false);
  const radius = Math.min(w, h) * 0.13;
  const count = Math.max(groups.length, 1);
  const drop = (member: { key: string; kind: "pc" | "npc" }, point: StagePoint): void => {
    const group = groupAt(point, count, w, h, radius);
    if (member.kind === "pc" && group === undefined) {
      return;
    }
    onPlace(member.key, member.kind, group);
  };
  const drag = useBoardDrag<{ key: string; kind: "pc" | "npc" }>(board, drop);
  return (
    <div
      className={`lab-stage-layer${over ? " drop" : ""}`}
      onDragOver={(event) => {
        if (acceptsRoster(event)) {
          event.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        const point = pointIn(board, event.clientX, event.clientY);
        const group = groupAt(point, count, w, h, radius);
        if (group === undefined) {
          return;
        }
        const npc = event.dataTransfer.getData(NPC_DRAG_TYPE);
        const pickerGroup = event.dataTransfer.getData(GROUP_DRAG_TYPE);
        const keys = npc ? [npc] : pickerGroup ? groupMembers(catalogs, groupLeader(roster, catalogs?.groupBosses, pickerGroup), pickerGroup) : [];
        for (const key of keys) {
          onPlace(key, "npc", group);
        }
      }}
    >
      {groups.map((entry) => {
        const center = scatterCenter(entry.group, count);
        const members = [
          ...entry.pcs.map((member) => ({ key: member.characterKey, kind: "pc" as const })),
          ...entry.npcs.map((member) => ({ key: member.characterKey, kind: "npc" as const }))
        ];
        return (
          <div key={entry.group}>
            <span
              className="lab-scatter-group"
              style={{ left: center.u * w - radius, top: center.v * h - radius, width: radius * 2, height: radius * 2 }}
            />
            <span className="lab-scatter-label" style={{ left: center.u * w, top: center.v * h + radius + 4 }}>Group {entry.group}</span>
            {members.map((member, index) => {
              const angle = (index / Math.max(members.length, 1)) * Math.PI * 2 - Math.PI / 2;
              const ring = members.length === 1 ? 0 : radius * 0.6;
              const dragging = drag.drag?.item.key === member.key ? drag.drag.point : null;
              const x = dragging ? dragging.u * w : center.u * w + Math.cos(angle) * ring;
              const y = dragging ? dragging.v * h : center.v * h + Math.sin(angle) * ring;
              return (
                <StageTokenView
                  key={member.key}
                  characterKey={member.key}
                  name={nameOf(member.key)}
                  lit
                  x={x}
                  y={y}
                  color={undefined}
                  boss={false}
                  pc={member.kind === "pc"}
                  dragging={dragging !== null}
                  handlers={drag.handlers(member)}
                  onContextMenu={(event) => onMenu(event, member.key, member.kind)}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
