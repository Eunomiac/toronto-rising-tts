import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
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
const repoRoot = path.resolve(dashboardRoot, "..", "..");
const genericNpcCatalogPath = path.join(dashboardRoot, "data", "generic-npcs.json");
const genericNpcImageDir = path.join(repoRoot, "assets", "images", "NPCs", "Generic");
const sceneCatalogsPath = path.join(dashboardRoot, "data", "scene-catalogs.json");
const controlBoardSnapsPath = path.join(dashboardRoot, "data", "control-board-snaps.json");
const cataloguedNpcImageDir = path.join(repoRoot, "assets", "images", "NPCs", "Catalogued");
const scenesAssetDir = path.join(dashboardRoot, "assets", "scenes");
const publicDir = path.join(distDir, "public");
const isDev = process.argv.includes("--dev");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
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
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] ?? "application/octet-stream" });
      createReadStream(filePath).pipe(response);
      return;
    }
  } catch {
    // Serve the SPA shell when the path is not a built file.
  }

  try {
    const indexPath = path.join(publicDir, "index.html");
    response.writeHead(200, { "Content-Type": contentTypes[".html"] ?? "text/html; charset=utf-8" });
    createReadStream(indexPath).pipe(response);
  } catch {
    sendJson(response, 404, { error: "Not found" });
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

const serveSafeWebp = async (response: ServerResponse, imageDir: string, filename: string, invalidMessage: string): Promise<void> => {
  const filePath = resolveGenericNpcImagePath(imageDir, filename);
  if (!filePath) {
    sendJson(response, 400, { error: invalidMessage });
    return;
  }
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendJson(response, 404, { error: `Missing image: ${filename}` });
      return;
    }
    response.writeHead(200, { "Content-Type": "image/webp" });
    createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { error: `Missing image: ${filename}` });
  }
};

const serveJsonFile = async (response: ServerResponse, filePath: string, missingMessage: string): Promise<void> => {
  try {
    const text = await readFile(filePath, "utf8");
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(text);
  } catch {
    sendJson(response, 500, { error: missingMessage });
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

  if (request.method === "GET" && pathname === "/api/scene-catalogs") {
    await serveJsonFile(
      response,
      sceneCatalogsPath,
      "scene-catalogs.json is missing. Run npm run dashboard:scene-catalogs from the repo root."
    );
    return;
  }

  if (request.method === "GET" && pathname === "/api/control-board-snaps") {
    await serveJsonFile(
      response,
      controlBoardSnapsPath,
      "control-board-snaps.json is missing. Run npm run dashboard:scene-catalogs from the repo root."
    );
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

const tryHandleDedicatedRoutes = async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    await handleApi(request, response, pathname);
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/generic-npc-images/")) {
    await serveGenericNpcImage(response, pathname);
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/catalogued-npc-images/")) {
    await serveSafeWebp(
      response,
      cataloguedNpcImageDir,
      decodeURIComponent(pathname.slice("/catalogued-npc-images/".length)),
      "Invalid catalogued NPC image filename."
    );
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/scenes-assets/")) {
    await serveSafeWebp(
      response,
      scenesAssetDir,
      decodeURIComponent(pathname.slice("/scenes-assets/".length)),
      "Invalid scenes asset filename."
    );
    return true;
  }

  return false;
};

const attachRequestHandler = (httpServer: ReturnType<typeof createServer>, handleFallback: (request: IncomingMessage, response: ServerResponse) => void): void => {
  httpServer.on("request", (request, response) => {
    void (async () => {
      try {
        if (await tryHandleDedicatedRoutes(request, response)) {
          return;
        }
        handleFallback(request, response);
      } catch (error: unknown) {
        if (!response.headersSent) {
          sendError(response, error);
        }
      }
    })();
  });
};

void (async () => {
  await refreshGenericNpcCatalogOnStartup(genericNpcCatalogPath);
  const httpServer = createServer();

  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.join(dashboardRoot, "vite.config.ts"),
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa"
    });
    attachRequestHandler(httpServer, (request, response) => {
      vite.middlewares(request, response, () => {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
      });
    });
  } else {
    attachRequestHandler(httpServer, (request, response) => {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      void serveFile(response, url.pathname);
    });
  }

  httpServer.listen(config.port, "127.0.0.1", () => {
    console.log(`Storyteller dashboard listening on http://127.0.0.1:${config.port}`);
    console.log(chronicleHealthInfo(config).chronicleStatus);
    console.log(`Catalogued NPC images: ${cataloguedNpcImageDir}`);
    if (isDev) {
      console.log("Vite HMR is enabled (--dev).");
    }
    if (!existsSync(cataloguedNpcImageDir)) {
      console.error("Catalogued NPC image folder is missing.");
    }
  });
})().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
