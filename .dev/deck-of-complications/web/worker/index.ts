import { routePartykitRequest } from "partyserver";
import { GameRoom, type RoomEnv } from "./room";

export { GameRoom };

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cors(res: Response, origin: string): Response {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", origin || "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type, x-host-secret");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request: Request, env: RoomEnv): Promise<Response> {
    const url = new URL(request.url);
    const publicOrigin = env.PUBLIC_ORIGIN || url.origin;

    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }), publicOrigin);
    }

    if (url.pathname === "/api/health") {
      return cors(Response.json({ ok: true, service: "complications" }), publicOrigin);
    }

    if (url.pathname === "/api/create" && request.method === "POST") {
      return cors(await createRoom(request, env, publicOrigin), publicOrigin);
    }

    // Init / state against a specific room DO via /parties/game-room/:id/...
    const party = await routePartykitRequest(request, env as never);
    if (party) return cors(party, publicOrigin);

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return cors(new Response("Not found", { status: 404 }), publicOrigin);
  },
} satisfies ExportedHandler<RoomEnv>;

async function createRoom(
  request: Request,
  env: RoomEnv,
  publicOrigin: string,
): Promise<Response> {
  const secret = request.headers.get("x-host-secret") || "";
  if (!env.HOST_SECRET || secret !== env.HOST_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    target: {
      color: string;
      rollId: string;
      rollType: string;
      playerLabel: string;
      margin: number;
    };
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const target = body.target;
  if (
    !target ||
    typeof target.margin !== "number" ||
    !target.rollId ||
    !target.rollType ||
    !target.color
  ) {
    return Response.json({ error: "Missing target roll fields" }, { status: 400 });
  }

  const roomId = randomToken().slice(0, 12);
  const stToken = randomToken();
  const playerToken = randomToken();

  const id = env.GameRoom.idFromName(roomId);
  const stub = env.GameRoom.get(id);
  const initUrl = new URL(`/parties/game-room/${roomId}/init`, request.url);
  const initRes = await stub.fetch(
    new Request(initUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-host-secret": env.HOST_SECRET,
      },
      body: JSON.stringify({ target, stToken, playerToken }),
    }),
  );
  if (!initRes.ok) {
    const err = await initRes.text();
    return Response.json(
      { error: "Failed to initialize room", detail: err },
      { status: 500 },
    );
  }

  const stUrl = `${publicOrigin}/g/${roomId}?role=storyteller&token=${stToken}`;
  const playerUrl = `${publicOrigin}/g/${roomId}?role=player&token=${playerToken}`;

  return Response.json({
    roomId,
    stUrl,
    playerUrl,
    stToken,
    playerToken,
  });
}
