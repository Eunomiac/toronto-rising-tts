import { useRef, useState, type CSSProperties, type DragEvent, type PointerEvent, type ReactElement, type RefObject } from "react";
import { Headshot } from "../headshots/Headshot";
import type { SceneCatalogs } from "../scenes/types";
import type { StageChange, StageChanges } from "../scenesPanel/commands";
import {
  GROUP_DRAG_TYPE,
  NPC_DRAG_TYPE,
  movePack,
  nearestPack,
  offStage,
  scatterCenter,
  slotNear,
  slotOf,
  spreadOnPack,
  type StageSpot
} from "../scenesPanel/stage";
import { stageToBoard, type StagePack, type StagePoint } from "../scenesPanel/stageFrame";
import type { ScatterGroup } from "../worldState";
import { groupColor, groupLeader, useRosterLayout } from "./labRoster";

/**
 * Editing layers of the wide stage board. Tokens drag with the pointer (they snap only when dropped over a slot,
 * and leave the stage when dropped off it); pack names drag the whole pack; roster NPCs and groups drop in with
 * HTML drag and drop. Every edit goes out through `onEdit` / `onPlace`, which queue or send it.
 */

/** Pointer position as a fraction of the board. */
const pointIn = (board: RefObject<HTMLDivElement | null>, clientX: number, clientY: number): StagePoint => {
  const element = board.current;
  if (!element) {
    throw new Error("Stage board is not mounted.");
  }
  const rect = element.getBoundingClientRect();
  return { u: (clientX - rect.left) / rect.width, v: (clientY - rect.top) / rect.height };
};

type PointerHandlers = {
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerCancel: () => void;
};

/** A press that moves more than this many pixels is a drag; less is a click (double-click lights). */
const DRAG_PX = 4;

const useBoardDrag = <T,>(board: RefObject<HTMLDivElement | null>, onDrop: (item: T, point: StagePoint) => void): {
  drag: { item: T; point: StagePoint } | null;
  handlers: (item: T) => PointerHandlers;
} => {
  const [drag, setDrag] = useState<{ item: T; point: StagePoint } | null>(null);
  const press = useRef<{ item: T; x: number; y: number; moved: boolean } | null>(null);
  const handlers = (item: T): PointerHandlers => ({
    onPointerDown: (event) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      press.current = { item, x: event.clientX, y: event.clientY, moved: false };
    },
    onPointerMove: (event) => {
      const held = press.current;
      if (!held || (!held.moved && Math.hypot(event.clientX - held.x, event.clientY - held.y) < DRAG_PX)) {
        return;
      }
      held.moved = true;
      setDrag({ item: held.item, point: pointIn(board, event.clientX, event.clientY) });
    },
    onPointerUp: (event) => {
      const held = press.current;
      press.current = null;
      setDrag(null);
      if (held?.moved) {
        onDrop(held.item, pointIn(board, event.clientX, event.clientY));
      }
    },
    onPointerCancel: () => {
      press.current = null;
      setDrag(null);
    }
  });
  return { drag, handlers };
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
  readonly onDoubleClick?: () => void;
};

/**
 * A figurine headshot with the name under it; hovering enlarges the headshot. The ring is the token's group
 * colour (thicker and brighter for the group's boss); a gold halo means lit.
 */
export const StageTokenView = ({ characterKey, name, lit, x, y, color, boss, dragging, pc, handlers, onDoubleClick }: TokenProps): ReactElement => (
  <div
    className={`lab-token${lit ? " lit" : ""}${boss ? " boss" : ""}${dragging ? " dragging" : ""}${pc ? " pc" : ""}${handlers ? " editable" : ""}`}
    style={{ left: x, top: y, ...(color ? { "--group": color } : {}) } as CSSProperties}
    title={handlers ? `${name}: drag to move, double-click to ${lit ? "darken" : "light"}` : name}
    {...handlers}
    {...(onDoubleClick ? { onDoubleClick } : {})}
  >
    <Headshot className="lab-token-head" characterKey={characterKey} />
    <span className="lab-token-name">{name}</span>
  </div>
);

/** Half-axes of the ellipse drawn through a Far pack's six slots. */
export const farRadii = (pack: StagePack, w: number, h: number): { rx: number; ry: number } => ({
  rx: Math.max(...pack.slots.map((slot) => Math.abs(slot.u - pack.center.u))) * w,
  ry: Math.max(...pack.slots.map((slot) => Math.abs(slot.v - pack.center.v))) * h
});

/** Where a pack's name sits: inside a Far ellipse, under the others. */
const packLabelPoint = (pack: StagePack, h: number): StagePoint =>
  pack.far ? { u: pack.center.u, v: pack.center.v + 6 / h } : { u: pack.center.u, v: Math.max(...pack.slots.map((slot) => slot.v)) + 30 / h };

type StageLayerProps = {
  readonly w: number;
  readonly h: number;
  readonly board: RefObject<HTMLDivElement | null>;
  readonly packs: readonly StagePack[];
  readonly spots: readonly StageSpot[];
  readonly catalogs: SceneCatalogs | null;
  readonly nameOf: (characterKey: string) => string;
  readonly onEdit: (changes: StageChanges) => void;
};

/** Standard placement: tokens anywhere on the stage, packs as mild snap points and group drop targets. */
export const StageLayer = ({ w, h, board, packs, spots, catalogs, nameOf, onEdit }: StageLayerProps): ReactElement => {
  const roster = useRosterLayout();
  const [over, setOver] = useState(false);
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
  const tokens = useBoardDrag<string>(board, place);
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
      onEdit(spreadOnPack(groupMembers(catalogs, groupLeader(roster, group), group), pack, packs, spots));
    }
  };
  const tokenGroup = (characterKey: string): string | undefined =>
    catalogs?.namedNpcs.find((npc) => npc.characterKey === characterKey)?.pickerGroups[0];
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
      onDrop={dropFromRoster}
    >
      {packs.map((pack) => {
        const at = packLabelPoint(pack, h);
        const dragging = packDrag.drag?.item === pack;
        const shown = dragging && packDrag.drag ? packDrag.drag.point : at;
        return (
          <span
            key={pack.familyId}
            className={`lab-pack-handle${dragging ? " dragging" : ""}`}
            style={{ left: shown.u * w, top: shown.v * h }}
            title="Drag to move this pack's NPCs onto another pack, or off the stage"
            {...packDrag.handlers(pack)}
          >
            {pack.label}
          </span>
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
            color={group ? groupColor(roster, group) : undefined}
            boss={group !== undefined && groupLeader(roster, group) === spot.characterKey}
            dragging={dragging !== null}
            handlers={tokens.handlers(spot.characterKey)}
            onDoubleClick={() => {
              const at = stageToBoard(spot.u, spot.v);
              onEdit({ [spot.characterKey]: { u: at.u, v: at.v, lightMode: spot.lit ? "OFF" : "STANDARD" } });
            }}
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
export const ScatterLayer = ({ w, h, board, groups, catalogs, nameOf, onPlace }: ScatterLayerProps): ReactElement => {
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
        const keys = npc ? [npc] : pickerGroup ? groupMembers(catalogs, groupLeader(roster, pickerGroup), pickerGroup) : [];
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
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
