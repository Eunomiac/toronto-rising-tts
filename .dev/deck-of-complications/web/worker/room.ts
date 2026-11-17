import { Server, type Connection, type ConnectionContext } from "partyserver";
import catalogJson from "../public/data/catalog.json";
import {
  adjust,
  armSelect,
  cancelConfirm,
  candidates,
  confirmEnd,
  createGame,
  discardSelected,
  maybeAutoEnd,
  publicView,
  requestStop,
  resumePlay,
  reveal,
  selectCard,
  setCardValue,
  setModeStop,
  toggleCategories,
  toggleEnhance,
  toggleNegate,
  type PublicGameView,
} from "../src/engine/game";
import type { CatalogCard, ClientRole, GameState, TargetRoll } from "../src/engine/types";
import type { ClientMessage, GameIntent, ServerMessage } from "../src/protocol";

const catalog = (catalogJson as { cards: CatalogCard[] }).cards;
const IDLE_MS = 1000 * 60 * 60; // 1 hour
const ENDED_MS = 1000 * 60 * 15; // 15 minutes after end

export type RoomEnv = {
  GameRoom: DurableObjectNamespace<GameRoom>;
  ASSETS: Fetcher;
  HOST_SECRET: string;
  PUBLIC_ORIGIN: string;
};

type RoomMeta = {
  stToken: string;
  playerToken: string;
  createdAt: number;
};

export class GameRoom extends Server<RoomEnv> {
  static options = { hibernate: true };

  game: GameState | null = null;
  meta: RoomMeta | null = null;

  async onStart() {
    const stored = await this.ctx.storage.get<{
      game: GameState;
      meta: RoomMeta;
    }>("room");
    if (stored) {
      this.game = stored.game;
      this.meta = stored.meta;
    }
  }

  async persist() {
    if (!this.game || !this.meta) return;
    await this.ctx.storage.put("room", { game: this.game, meta: this.meta });
    const delay = this.game.ended ? ENDED_MS : IDLE_MS;
    await this.ctx.storage.setAlarm(Date.now() + delay);
  }

  async onAlarm() {
    await this.ctx.storage.deleteAll();
    this.game = null;
    this.meta = null;
    for (const conn of this.getConnections()) {
      conn.close(4000, "Room expired");
    }
  }

  async onRequest(request: Request): Promise<Response> {
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/init")) {
      return this.handleInit(request);
    }
    if (request.method === "GET" && new URL(request.url).pathname.endsWith("/state")) {
      if (!this.game) return Response.json({ error: "Room not found" }, { status: 404 });
      return Response.json(publicView(this.game));
    }
    return new Response("Not found", { status: 404 });
  }

  async handleInit(request: Request): Promise<Response> {
    const secret = request.headers.get("x-host-secret") || "";
    if (!this.env.HOST_SECRET || secret !== this.env.HOST_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (this.game) {
      return Response.json({ error: "Room already initialized" }, { status: 409 });
    }
    const body = (await request.json()) as {
      target: TargetRoll;
      stToken: string;
      playerToken: string;
    };
    this.game = createGame(body.target, catalog, Math.random, this.name);
    this.meta = {
      stToken: body.stToken,
      playerToken: body.playerToken,
      createdAt: Date.now(),
    };
    await this.persist();
    return Response.json({ ok: true, view: publicView(this.game) });
  }

  async onConnect(conn: Connection, ctx: ConnectionContext) {
    const url = new URL(ctx.request.url);
    const role = (url.searchParams.get("role") || "") as ClientRole;
    const token = url.searchParams.get("token") || "";
    if (!this.game || !this.meta) {
      this.send(conn, { type: "error", message: "This game room does not exist or has expired." });
      conn.close(4004, "missing");
      return;
    }
    if (!this.authorize(role, token)) {
      this.send(conn, { type: "error", message: "Invalid join link for this room." });
      conn.close(4003, "forbidden");
      return;
    }
    conn.setState({ role, token });
    this.pushState(conn);
  }

  authorize(role: ClientRole, token: string): boolean {
    if (!this.meta) return false;
    if (role === "storyteller") return token === this.meta.stToken;
    if (role === "player") return token === this.meta.playerToken;
    return false;
  }

  send(conn: Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  broadcastState() {
    for (const conn of this.getConnections()) {
      this.pushState(conn);
    }
  }

  pushState(conn: Connection) {
    if (!this.game) return;
    const state = conn.state as { role?: ClientRole } | null;
    const role = state?.role;
    if (!role) return;
    const view = publicView(this.game);
    const msg: ServerMessage = this.game.ended
      ? { type: "ended", view }
      : { type: "state", view, role };
    this.send(conn, msg);
  }

  async onMessage(conn: Connection, message: string | ArrayBuffer) {
    if (typeof message !== "string" || !this.game || !this.meta) return;
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message) as ClientMessage;
    } catch {
      this.send(conn, { type: "error", message: "Bad message" });
      return;
    }
    const state = conn.state as { role?: ClientRole; token?: string } | null;
    if (!state?.role || !this.authorize(state.role, state.token || "")) {
      this.send(conn, { type: "error", message: "Not authorized" });
      return;
    }
    if (parsed.type !== "intent") return;
    try {
      this.applyIntent(state.role, parsed.intent);
      await this.persist();
      this.broadcastState();
    } catch (err) {
      this.send(conn, {
        type: "error",
        message: err instanceof Error ? err.message : "Action failed",
      });
    }
  }

  applyIntent(role: ClientRole, intent: GameIntent) {
    const g = this.game!;
    if (g.ended && intent.op !== "confirmEnd") {
      throw new Error("This game has already ended.");
    }

    const playerAllowed = new Set(["flip", "stop"]);
    if (role === "player" && !playerAllowed.has(intent.op)) {
      throw new Error("Only the Storyteller can do that.");
    }

    switch (intent.op) {
      case "flip": {
        if (g.mode !== "stop") throw new Error("Cannot flip right now.");
        const result = reveal(g, intent.cardId, catalog);
        if (!result.ok) throw new Error("That card cannot be flipped.");
        maybeAutoEnd(g);
        break;
      }
      case "stop": {
        if (role === "player") {
          requestStop(g);
          break;
        }
        if (g.mode === "select") {
          setModeStop(g);
        } else if (g.mode === "confirm") {
          confirmEnd(g);
        } else {
          requestStop(g);
        }
        break;
      }
      case "confirmEnd":
        if (role !== "storyteller") throw new Error("Only the Storyteller can confirm.");
        confirmEnd(g);
        break;
      case "cancelConfirm":
        cancelConfirm(g);
        break;
      case "resume":
        resumePlay(g);
        break;
      case "forceSelect":
        if (role !== "storyteller") throw new Error("ST only");
        armSelect(g);
        break;
      case "select":
        if (role !== "storyteller") throw new Error("ST only");
        if (!selectCard(g, intent.cardId)) throw new Error("Cannot select that card.");
        break;
      case "enhance":
        if (role !== "storyteller") throw new Error("ST only");
        if (!toggleEnhance(g)) throw new Error("Select a face-up card first.");
        break;
      case "negate":
        if (role !== "storyteller") throw new Error("ST only");
        if (!toggleNegate(g)) throw new Error("Select a face-up card first.");
        break;
      case "discard":
        if (role !== "storyteller") throw new Error("ST only");
        if (!discardSelected(g)) throw new Error("Select a face-up card first.");
        break;
      case "random": {
        if (role !== "storyteller") throw new Error("ST only");
        const list = candidates(g, intent.mode);
        if (!list.length) throw new Error("No eligible cards.");
        selectCard(g, list[Math.floor(Math.random() * list.length)]);
        g.mode = "select";
        break;
      }
      case "adjust":
        if (role !== "storyteller") throw new Error("ST only");
        adjust(g, intent.delta);
        break;
      case "setValue":
        if (role !== "storyteller") throw new Error("ST only");
        if (!setCardValue(g, intent.value)) throw new Error("Select a face-up card first.");
        break;
      case "toggleAutoDiscard":
        if (role !== "storyteller") throw new Error("ST only");
        toggleCategories(g);
        break;
      default:
        throw new Error("Unknown action");
    }
  }
}

export type { PublicGameView };
