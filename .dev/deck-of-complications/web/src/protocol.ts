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
  | { op: "select"; cardId: string | null }
  | { op: "enhance" }
  | { op: "negate" }
  | { op: "discard" }
  | { op: "random"; mode: "all" | "normal" | "enhanced" }
  | { op: "adjust"; delta: number }
  | { op: "setValue"; value: number }
  | { op: "toggleAutoDiscard" };

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
