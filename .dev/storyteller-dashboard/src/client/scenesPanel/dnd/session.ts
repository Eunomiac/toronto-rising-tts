import type { ClientPoint, DragPayload, DropTarget, PanelEdge } from "./types";
import { edgesWithBins } from "./matrix";
import type { ScenesSend } from "../commands";

export type DragPreview = {
  readonly members?: readonly { readonly characterKey: string; readonly name: string }[];
  readonly label?: string;
};

export type DragSessionState = {
  readonly preview: DragPreview | null;
  readonly active: boolean;
  readonly payload: DragPayload | null;
  readonly pointer: ClientPoint | null;
  readonly highlight: DropTarget | null;
  readonly openEdges: readonly PanelEdge[];
  readonly hover: DropTarget | null;
  readonly hoverPointer: ClientPoint | null;
  readonly veil: boolean;
  /** The live table command by default; scene previews replace it with their draft writer. */
  readonly scenes: ScenesSend | null;
};

const idle: DragSessionState = {
  preview: null,
  active: false,
  payload: null,
  pointer: null,
  highlight: null,
  openEdges: [],
  hover: null,
  hoverPointer: null,
  veil: false,
  scenes: null
};

let state: DragSessionState = idle;
const listeners = new Set<() => void>();
const pointerListeners = new Set<() => void>();

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const setState = (next: DragSessionState): void => {
  state = next;
  notify();
};

const notifyPointer = (): void => {
  for (const listener of pointerListeners) listener();
};

const sameTarget = (a: DropTarget | null, b: DropTarget | null): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  const aRow = a as unknown as Record<string, unknown>;
  const bRow = b as unknown as Record<string, unknown>;
  const keys = Object.keys(aRow);
  return keys.length === Object.keys(bRow).length && keys.every((key) => aRow[key] === bRow[key]);
};

export const subscribeDndSession = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getDndSession = (): DragSessionState => state;

/** Pointer-only subscription for the floating preview; it deliberately does not rebuild the drag chrome. */
export const subscribeDndPointer = (listener: () => void): (() => void) => {
  pointerListeners.add(listener);
  return () => pointerListeners.delete(listener);
};

export const getDndPointer = (): ClientPoint | null => state.pointer;

/** Start a drag; opens edge panels that have bins for this drag kind. */
export const beginDrag = (payload: DragPayload, pointer?: ClientPoint, preview?: DragPreview, scenes?: ScenesSend): void => {
  setState({
    preview: preview ?? ("characterKey" in payload && payload.characterKey ? { members: [{ characterKey: payload.characterKey, name: payload.characterKey }] } : { label: "rollType" in payload ? payload.rollType ?? "Roll" : "Scene" }),
    active: true,
    payload,
    pointer: pointer ?? null,
    highlight: null,
    openEdges: edgesWithBins(payload.dragKind),
    hover: null,
    hoverPointer: null,
    veil: true,
    scenes: scenes ?? null
  });
  notifyPointer();
};

/** Update the hot pointer path without rebuilding React chrome unless the actual target changes. */
export const moveDrag = (pointer: ClientPoint, highlight: DropTarget | null, hover: DropTarget | null = null): void => {
  if (!state.active) {
    return;
  }
  const hoverSame = sameTarget(state.hover, hover);
  const highlightSame = sameTarget(state.highlight, highlight);
  state = { ...state, pointer, highlight, hover, hoverPointer: hover ? (hoverSame ? state.hoverPointer : pointer) : null };
  notifyPointer();
  if (!hoverSame || !highlightSame) notify();
};

export const endDrag = (): void => {
  if (!state.active) {
    return;
  }
  setState(idle);
  notifyPointer();
};

export const cancelDrag = (): void => {
  endDrag();
};
