import type { ClientPoint, DragPayload, DropTarget, PanelEdge } from "./types";
import { edgesWithBins } from "./matrix";

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
  veil: false
};

let state: DragSessionState = idle;
const listeners = new Set<() => void>();

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const setState = (next: DragSessionState): void => {
  state = next;
  notify();
};

export const subscribeDndSession = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getDndSession = (): DragSessionState => state;

/** Start a drag; opens edge panels that have bins for this drag kind. */
export const beginDrag = (payload: DragPayload, pointer?: ClientPoint, preview?: DragPreview): void => {
  setState({
    preview: preview ?? ("characterKey" in payload && payload.characterKey ? { members: [{ characterKey: payload.characterKey, name: payload.characterKey }] } : { label: "rollType" in payload ? payload.rollType ?? "Roll" : "Scene" }),
    active: true,
    payload,
    pointer: pointer ?? null,
    highlight: null,
    openEdges: edgesWithBins(payload.dragKind),
    hover: null,
    hoverPointer: null,
    veil: true
  });
};

/** Update pointer without forcing React on every consumer — callers that need position subscribe. */
export const moveDrag = (pointer: ClientPoint, highlight: DropTarget | null, hover: DropTarget | null = null): void => {
  if (!state.active) {
    return;
  }
  const sameHover = JSON.stringify(state.hover) === JSON.stringify(hover);
  setState({ ...state, pointer, highlight, hover, hoverPointer: hover ? (sameHover ? state.hoverPointer : pointer) : null });
};

export const endDrag = (): void => {
  if (!state.active) {
    return;
  }
  setState(idle);
};

export const cancelDrag = (): void => {
  endDrag();
};
