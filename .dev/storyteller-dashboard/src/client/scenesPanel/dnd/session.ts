import type { ClientPoint, DragPayload, DropTarget, PanelEdge } from "./types";
import { edgesWithBins } from "./matrix";

export type DragSessionState = {
  readonly active: boolean;
  readonly payload: DragPayload | null;
  readonly pointer: ClientPoint | null;
  readonly highlight: DropTarget | null;
  readonly openEdges: readonly PanelEdge[];
  readonly hover: DropTarget | null;
  readonly veil: boolean;
};

const idle: DragSessionState = {
  active: false,
  payload: null,
  pointer: null,
  highlight: null,
  openEdges: [],
  hover: null,
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
export const beginDrag = (payload: DragPayload, pointer?: ClientPoint): void => {
  setState({
    active: true,
    payload,
    pointer: pointer ?? null,
    highlight: null,
    openEdges: edgesWithBins(payload.dragKind),
    hover: null,
    veil: true
  });
};

/** Update pointer without forcing React on every consumer — callers that need position subscribe. */
export const moveDrag = (pointer: ClientPoint, highlight: DropTarget | null, hover: DropTarget | null = null): void => {
  if (!state.active) {
    return;
  }
  setState({ ...state, pointer, highlight, hover });
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
