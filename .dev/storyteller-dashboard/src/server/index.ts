import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chronicleHealthInfo } from "./chronicleContext.js";
import { getConfig } from "./config.js";
import { loadEnvFile } from "./loadEnv.js";
import { generateNpcImage, generateNpcs, rerollNpcField } from "./npcService.js";
import { loadGenericNpcCatalog, resolveGenericNpcImagePath } from "./genericNpcCatalog.js";
import { refreshGenericNpcCatalogOnStartup } from "./refreshGenericNpcCatalog.js";
import { dashboardTtsBridge } from "./ttsExecuteLua.js";
import { parseGenerateImageRequest, parseGenerateNpcRequest, parseRerollFieldRequest } from "../shared/npc.js";

loadEnvFile();
const config = getConfig();
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboardRoot = path.resolve(distDir, "..");
const genericNpcCatalogPath = path.join(dashboardRoot, "data", "generic-npcs.json");
const genericNpcImageDir = path.resolve(dashboardRoot, "..", "..", "assets", "images", "NPCs", "Generic");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp"
};

const sendJson = (response: ServerResponse, statusCode: number, body: unknown): void => {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
};

const sendError = (response: ServerResponse, error: unknown): void => {
  const message = error instanceof Error ? error.message : "Unknown server error";
  sendJson(response, 500, { error: message });
};

const readRequestJson = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text.trim().length > 0 ? JSON.parse(text) as unknown : {};
};

const serveFile = async (response: ServerResponse, requestPath: string): Promise<void> => {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(distDir, safePath));

  if (!filePath.startsWith(distDir)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(302, { Location: "/" });
    response.end();
  }
};

const serveGenericNpcImage = async (response: ServerResponse, pathname: string): Promise<void> => {
  const filename = decodeURIComponent(pathname.slice("/generic-npc-images/".length));
  const filePath = resolveGenericNpcImagePath(genericNpcImageDir, filename);
  if (!filePath) {
    sendJson(response, 400, { error: "Invalid generic NPC image filename." });
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendJson(response, 404, { error: "Image not found." });
      return;
    }
    response.writeHead(200, { "Content-Type": "image/webp" });
    createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { error: "Image not found." });
  }
};

const handleApi = async (request: IncomingMessage, response: ServerResponse, pathname: string): Promise<void> => {
  if (request.method === "GET" && pathname === "/api/generic-npcs") {
    try {
      const catalog = await loadGenericNpcCatalog(genericNpcCatalogPath);
      sendJson(response, 200, catalog);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not load generic NPC catalog.";
      sendJson(response, 500, { error: message });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/tts-bridge-status") {
    const status = await dashboardTtsBridge.getBridgeStatus();
    sendJson(response, 200, status);
    return;
  }

  if (request.method === "POST" && pathname === "/api/tts/execute-lua") {
    const body = await readRequestJson(request);
    const script = typeof body === "object" && body !== null && "script" in body ? (body as { script: unknown }).script : undefined;
    if (typeof script !== "string") {
      sendJson(response, 400, { error: "Request must include a script string." });
      return;
    }
    const result = await dashboardTtsBridge.executeLua(script);
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      hasOpenAiKey: Boolean(config.openAiApiKey),
      textModel: config.textModel,
      imageModel: config.imageModel,
      ...chronicleHealthInfo(config)
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/npcs/generate") {
    const parsed = parseGenerateNpcRequest(await readRequestJson(request));
    sendJson(response, 200, await generateNpcs(config, parsed));
    return;
  }

  if (request.method === "POST" && pathname === "/api/npcs/image") {
    const parsed = parseGenerateImageRequest(await readRequestJson(request));
    sendJson(response, 200, await generateNpcImage(config, parsed.npc));
    return;
  }

  if (request.method === "POST" && pathname === "/api/npcs/reroll-field") {
    const parsed = parseRerollFieldRequest(await readRequestJson(request));
    sendJson(response, 200, { npc: await rerollNpcField(config, parsed.npc, parsed.field, parsed.prompt, parsed.quickTags) });
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
};

void (async () => {
  await refreshGenericNpcCatalogOnStartup(genericNpcCatalogPath);
  createServer((request, response) => {
    void (async () => {
      try {
        const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
        if (url.pathname.startsWith("/api/")) {
          await handleApi(request, response, url.pathname);
          return;
        }

        if (request.method === "GET" && url.pathname.startsWith("/generic-npc-images/")) {
          await serveGenericNpcImage(response, url.pathname);
          return;
        }

        await serveFile(response, url.pathname);
      } catch (error: unknown) {
        sendError(response, error);
      }
    })();
  }).listen(config.port, "127.0.0.1", () => {
    console.log(`Storyteller dashboard listening on http://127.0.0.1:${config.port}`);
    console.log(chronicleHealthInfo(config).chronicleStatus);
  });
})().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
