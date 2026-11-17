import type { PublicGameView } from "./engine/game";
import type { ClientRole, TargetRoll } from "./engine/types";

/** Messages client → room */
export type ClientMessage =
  | { type: "hello"; role: ClientRole; token: string }
  | { type: "intent"; intent: GameIntent };

export type GameIntent =
  | { op: "flip"; cardId: string }
  | { op: "stop" }
  | { op: "confirmEnd" }
  | { op: "cancelConfirm" }
  | { op: "resume" }
  | { op: "forceSelect" }
  | { op: "toggleSelect"; cardId: string }
  | { op: "clearSelection" }
  | { op: "enhance"; cardId: string }
  | { op: "negate"; cardId: string }
  | { op: "discard"; cardId: string }
  | { op: "setValue"; cardId: string; value: number }
  | { op: "pickRandomSelected" }
  | { op: "adjust"; delta: number }
  | { op: "setAdjust"; value: number }
  | { op: "setMargin"; value: number }
  | { op: "toggleAutoDiscard" }
  /** @deprecated legacy single-select; kept only if old clients linger */
  | { op: "select"; cardId: string | null }
  | { op: "random"; mode: "all" | "normal" | "enhanced" };

/** Messages room → client */
export type ServerMessage =
  | { type: "state"; view: PublicGameView; role: ClientRole }
  | { type: "error"; message: string }
  | { type: "ended"; view: PublicGameView };

export interface CreateRoomRequest {
  target: TargetRoll;
  hostSecret: string;
}

export interface CreateRoomResponse {
  roomId: string;
  stUrl: string;
  playerUrl: string;
  stToken: string;
  playerToken: string;
}
