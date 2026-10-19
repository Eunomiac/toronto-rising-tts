import { createReadStream, existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chronicleHealthInfo } from "./chronicleContext.js";
import { getConfig } from "./config.js";
import { loadEnvFile } from "./loadEnv.js";
import { generateNpcImage, generateNpcs, rerollNpcField } from "./npcService.js";
import { loadGenericNpcCatalog, resolveGenericNpcImagePath } from "./genericNpcCatalog.js";
import { refreshGenericNpcCatalogOnStartup } from "./refreshGenericNpcCatalog.js";
import { refreshMemoriamNpcCatalogOnStartup } from "./refreshMemoriamNpcCatalog.js";
import { loadMemoriamNpcCatalog } from "./memoriamNpcCatalog.js";
import { applyMemoriamFields, sheetMemoriamLists } from "../shared/memoriamNpc.js";
import {
  createMemoriamFieldStore,
  MemoriamFieldError,
  parseMemoriamFieldBody,
  requireMemoriamFieldKey
} from "./memoriamNpcFields.js";
import { createHeadshotCropStore, HeadshotCropError, parseHeadshotCrop, requireHeadshotKey } from "./headshotCrops.js";
import { createNpcOverrideStore, NpcOverrideError, parseNpcOverrideBody, requireNpcOverrideKey } from "./npcOverrides.js";
import { createDataFileStore, resolveDashboardBackupDir, type DataFileStore } from "./dataFileStore.js";
import { parseSceneDeckPatch } from "../shared/sceneDeck.js";
import { normalizeNpcStatsFile, parseNpcStatsPatch, type NpcStatsFile } from "../shared/npcStats.js";
import { editedNamedKeys, markPending, PENDING_FILE_NAME } from "./npcStatsPending.js";
import { createSceneDeckStore } from "./sceneDeckStore.js";
import { normalizeSceneLibrary, parseSceneLibraryPatch, type SceneLibrary } from "../shared/sceneLibrary.js";
import { normalizeRollChronicle, parseRollChroniclePatch, type RollChronicle } from "../shared/rollChronicle.js";
import { createLabNoteStore, LabNoteError, parseLabNoteCreate, parseLabNotePatch } from "./labNotes.js";
import { createTermImageStore, MAX_TERM_IMAGE_BYTES, TERM_IMAGE_CONTENT_TYPES, TermImageError } from "./termImages.js";
import { dashboardTtsBridge } from "./ttsExecuteLua.js";
import { ttsEventHub } from "./ttsEvents.js";
import { parseGenerateImageRequest, parseGenerateNpcRequest, parseRerollFieldRequest } from "../shared/npc.js";
import { stripJsonComments } from "../shared/compulsionText.js";

loadEnvFile();
const config = getConfig();
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboardRoot = path.resolve(distDir, "..");
const repoRoot = path.resolve(dashboardRoot, "..", "..");
const genericNpcCatalogPath = path.join(dashboardRoot, "data", "generic-npcs.json");
const memoriamNpcCatalogPath = path.join(dashboardRoot, "data", "memoriam-npcs.json");
const figurineDir = path.join(repoRoot, "assets", "NPC Art", "Figurines");
const genericNpcImageDir = path.join(figurineDir, "Generic");
const sceneCatalogsPath = path.join(dashboardRoot, "data", "scene-catalogs.json");
const controlBoardSnapsPath = path.join(dashboardRoot, "data", "control-board-snaps.json");
const compulsionsPath = path.join(dashboardRoot, "data", "compulsions.jsonc");
const cataloguedNpcImageDir = path.join(figurineDir, "Catalogued");
const memoriamNpcImageDir = path.join(figurineDir, "Memoriam");
const scenesAssetDir = path.join(dashboardRoot, "assets", "scenes");
const pcSheetAssetDir = path.join(dashboardRoot, "assets");
/** TTS sheet art (assets/CSheets, the Cloud mirror); a name on several pages resolves to the first folder here. */
const sheetArtRoot = path.join(repoRoot, "assets", "CSheets");
const sheetPortraitDir = path.join(sheetArtRoot, "Page4", "Portraits");
const sheetArtDirs = [
  ...["Page1", "Page2", "Page3", "Page4", "Page5", "Page6", "Shared"].map((folder) => path.join(sheetArtRoot, folder)),
  sheetPortraitDir
];
const termImages = createTermImageStore(path.join(dashboardRoot, "data", "term-images"));
const labNotes = createLabNoteStore(path.join(dashboardRoot, "agent", "lab-notes.json"));
const headshotCrops = createHeadshotCropStore(path.join(dashboardRoot, "data", "headshot-crops.json"));
const npcOverrides = createNpcOverrideStore(path.join(dashboardRoot, "data", "npc-overrides.json"));
const memoriamFields = createMemoriamFieldStore(path.join(dashboardRoot, "data", "memoriam-npc-fields.json"));
const dashboardBackupDir = resolveDashboardBackupDir(repoRoot).then((backupDir) => {
  if (!backupDir) {
    console.warn("tts-assets.config.json has no backupDir; scene deck, scene library and NPC stats backups are off.");
  }
  return backupDir;
});
const sceneDeck = dashboardBackupDir.then((backupDir) => createSceneDeckStore({ dataDir: path.join(dashboardRoot, "data"), backupDir }));
const sceneLibrary = dashboardBackupDir.then((backupDir) => createDataFileStore<SceneLibrary>({
  filePath: path.join(dashboardRoot, "data", "scene-library.json"),
  backupDir,
  backupPrefix: "scene-library",
  normalize: normalizeSceneLibrary
}));
const rollChronicle = dashboardBackupDir.then((backupDir) => createDataFileStore<RollChronicle>({
  filePath: path.join(dashboardRoot, "data", "roll-chronicle.json"),
  backupDir,
  backupPrefix: "roll-chronicle",
  normalize: normalizeRollChronicle
}));
const npcStats = dashboardBackupDir.then((backupDir) => createDataFileStore<NpcStatsFile>({
  filePath: path.join(dashboardRoot, "data", "npc-stats.json"),
  backupDir,
  backupPrefix: "npc-stats",
  normalize: normalizeNpcStatsFile
}));
const npcStatsPendingPath = path.join(dashboardRoot, "data", PENDING_FILE_NAME);
const publicDir = path.join(distDir, "public");
const isDev = process.argv.includes("--dev");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff": "font/woff"
};

const sendJson = (response: ServerResponse, statusCode: number, body: unknown): void => {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
};

const sendError = (response: ServerResponse, error: unknown): void => {
  const raw = error instanceof Error ? error.message : "Unknown server error";
  const message = /Command failed:/i.test(raw)
    ? "Could not inspect or clear port 39998."
    : raw;
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

const readRequestBuffer = async (request: IncomingMessage, maxBytes: number): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      throw new TermImageError("That image is larger than 15 MB.", 413);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
};

const handleTermImages = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> => {
  try {
    const key = url.searchParams.get("key") ?? "";
    if (url.pathname === "/api/term-images/text") {
      if (request.method !== "PUT") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }
      const body = await readRequestJson(request);
      const text = typeof body === "object" && body !== null ? (body as { text?: unknown }).text : undefined;
      if (typeof text !== "string") {
        throw new TermImageError("Expected a JSON body with a text string.", 400);
      }
      sendJson(response, 200, await termImages.putText(key, text));
      return;
    }
    if (request.method === "GET") {
      sendJson(response, 200, await termImages.list());
      return;
    }
    if (request.method === "PUT") {
      const bytes = await readRequestBuffer(request, MAX_TERM_IMAGE_BYTES);
      sendJson(response, 200, await termImages.put(key, request.headers["content-type"] ?? "", bytes));
      return;
    }
    if (request.method === "DELETE") {
      sendJson(response, 200, await termImages.remove(key, url.searchParams.get("part") === "image" ? "image" : "all"));
      return;
    }
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error: unknown) {
    if (error instanceof TermImageError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    throw error;
  }
};

const handleLabNotes = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> => {
  try {
    const id = Number(url.searchParams.get("id"));
    if (request.method === "GET") {
      sendJson(response, 200, await labNotes.list());
      return;
    }
    if (request.method === "POST") {
      sendJson(response, 200, await labNotes.add(parseLabNoteCreate(await readRequestJson(request))));
      return;
    }
    if (!Number.isInteger(id) || id <= 0) {
      throw new LabNoteError("Expected ?id=<note number>.", 400);
    }
    if (request.method === "PATCH") {
      sendJson(response, 200, await labNotes.update(id, parseLabNotePatch(await readRequestJson(request))));
      return;
    }
    if (request.method === "DELETE") {
      sendJson(response, 200, await labNotes.remove(id));
      return;
    }
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error: unknown) {
    if (error instanceof LabNoteError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    throw error;
  }
};

const handleHeadshotCrops = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> => {
  try {
    if (request.method === "GET") {
      sendJson(response, 200, await headshotCrops.list());
      return;
    }
    const key = requireHeadshotKey(url.searchParams.get("key"));
    if (request.method === "PUT") {
      sendJson(response, 200, await headshotCrops.put(key, parseHeadshotCrop(await readRequestJson(request))));
      return;
    }
    if (request.method === "DELETE") {
      sendJson(response, 200, await headshotCrops.remove(key));
      return;
    }
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error: unknown) {
    if (error instanceof HeadshotCropError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    throw error;
  }
};

const loadKnownMemoriamPeriods = async (): Promise<Set<string>> => {
  let text: string;
  try {
    text = await readFile(sceneCatalogsPath, "utf8");
  } catch {
    throw new MemoriamFieldError("Scene catalogs are missing, so Memoriam periods cannot be checked.", 500);
  }
  const parsed: unknown = JSON.parse(text);
  const periods = typeof parsed === "object" && parsed !== null ? (parsed as { memoriamPeriods?: unknown }).memoriamPeriods : undefined;
  const keys = new Set<string>();
  if (Array.isArray(periods)) {
    for (const period of periods) {
      if (typeof period === "object" && period !== null && typeof (period as { key?: unknown }).key === "string") {
        keys.add((period as { key: string }).key);
      }
    }
  }
  if (keys.size < 1) {
    throw new MemoriamFieldError("Scene catalogs list no Memoriam periods.", 500);
  }
  return keys;
};

const memoriamNpcViews = async () => {
  const catalog = await loadMemoriamNpcCatalog(memoriamNpcCatalogPath);
  const fields = await memoriamFields.list();
  return catalog.npcs.map((npc) => applyMemoriamFields(npc, fields.fields[npc.key]));
};

const handleMemoriamNpcs = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> => {
  try {
    if (request.method === "GET") {
      sendJson(response, 200, { npcs: await memoriamNpcViews() });
      return;
    }
    const key = requireMemoriamFieldKey(url.searchParams.get("key"));
    if (request.method === "PUT") {
      const catalog = await loadMemoriamNpcCatalog(memoriamNpcCatalogPath);
      const npc = catalog.npcs.find((row) => row.key === key);
      if (!npc) {
        throw new MemoriamFieldError(`No Memoriam NPC named ${key}.`, 404);
      }
      const parsed = parseMemoriamFieldBody(await readRequestJson(request), await loadKnownMemoriamPeriods());
      if (typeof parsed === "string") {
        throw new MemoriamFieldError(parsed, 400);
      }
      await memoriamFields.put(key, parsed, sheetMemoriamLists(npc));
      sendJson(response, 200, { npcs: await memoriamNpcViews() });
      return;
    }
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error: unknown) {
    if (error instanceof MemoriamFieldError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    throw error;
  }
};

const handleNpcOverrides = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> => {
  try {
    if (request.method === "GET") {
      sendJson(response, 200, await npcOverrides.list());
      return;
    }
    const key = requireNpcOverrideKey(url.searchParams.get("key"));
    if (request.method === "PUT") {
      sendJson(response, 200, await npcOverrides.put(key, parseNpcOverrideBody(await readRequestJson(request))));
      return;
    }
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error: unknown) {
    if (error instanceof NpcOverrideError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    throw error;
  }
};

/** GET the whole file; PUT replaces the sections in the body. */
const handleDataFile = async <T extends object>(
  request: IncomingMessage,
  response: ServerResponse,
  store: DataFileStore<T>,
  parsePatch: (value: unknown) => Partial<T>,
  afterPatch?: (before: T, after: T, patch: Partial<T>) => Promise<void>
): Promise<void> => {
  if (request.method === "GET") {
    sendJson(response, 200, await store.get());
    return;
  }
  if (request.method === "PUT") {
    let patch: Partial<T>;
    try {
      patch = parsePatch(await readRequestJson(request));
    } catch (error: unknown) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Bad request body." });
      return;
    }
    const before = afterPatch ? await store.get() : undefined;
    const after = await store.patch(patch);
    if (afterPatch && before) {
      await afterPatch(before, after, patch);
    }
    sendJson(response, 200, after);
    return;
  }
  sendJson(response, 405, { error: "Method not allowed" });
};

const serveTermImage = async (response: ServerResponse, pathname: string): Promise<void> => {
  const file = decodeURIComponent(pathname.slice("/term-images/".length));
  const filePath = termImages.resolveFile(file);
  if (!filePath) {
    sendJson(response, 400, { error: "Invalid term image filename." });
    return;
  }
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendJson(response, 404, { error: "Term image not found." });
      return;
    }
    response.writeHead(200, {
      "Content-Type": TERM_IMAGE_CONTENT_TYPES[path.extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { error: "Term image not found." });
  }
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

/** Serves the first of `imageDirs` that holds `filename`. */
const serveSafeWebp = async (response: ServerResponse, imageDirs: readonly string[], filename: string, invalidMessage: string): Promise<void> => {
  for (const imageDir of imageDirs) {
    const filePath = resolveGenericNpcImagePath(imageDir, filename);
    if (!filePath) {
      sendJson(response, 400, { error: invalidMessage });
      return;
    }
    const fileStat = await stat(filePath).catch(() => null);
    if (fileStat?.isFile()) {
      response.writeHead(200, { "Content-Type": "image/webp" });
      createReadStream(filePath).pipe(response);
      return;
    }
  }
  sendJson(response, 404, { error: `Missing image: ${filename}` });
};

const servePcSheetAsset = async (response: ServerResponse, pathname: string): Promise<void> => {
  const relative = decodeURIComponent(pathname.slice("/pc-sheet-assets/".length));
  if (relative.length === 0 || relative.includes("\0") || /(^|[\\/])\.\.([\\/]|$)/.test(relative)) {
    sendJson(response, 400, { error: "Invalid PC sheet asset path." });
    return;
  }
  const assetRoot = path.resolve(pcSheetAssetDir);
  const filePath = path.resolve(assetRoot, relative);
  const fromRoot = path.relative(assetRoot, filePath);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendJson(response, 404, { error: "Asset not found." });
      return;
    }
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { error: "Asset not found." });
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

  if (request.method === "GET" && pathname === "/api/sheet-portraits") {
    const files = await readdir(sheetPortraitDir);
    sendJson(response, 200, files.filter((file) => /^[A-Za-z0-9]+Portrait\.webp$/.test(file)).map((file) => file.slice(0, -".webp".length)).sort());
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

  if (request.method === "GET" && pathname === "/api/compulsions") {
    let text: string;
    try {
      text = await readFile(compulsionsPath, "utf8");
    } catch {
      sendJson(response, 500, { error: "data/compulsions.jsonc is missing from .dev/storyteller-dashboard." });
      return;
    }
    try {
      sendJson(response, 200, JSON.parse(stripJsonComments(text)) as unknown);
    } catch (error: unknown) {
      sendJson(response, 500, { error: `data/compulsions.jsonc is not valid JSON: ${error instanceof Error ? error.message : String(error)}` });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/tts-bridge-status") {
    const status = await dashboardTtsBridge.getBridgeStatus();
    sendJson(response, 200, status);
    return;
  }

  if (request.method === "GET" && pathname === "/api/tts/events") {
    ttsEventHub.subscribe(response);
    // Auto-connect so TTS pushes reach this server even before any tab calls execute-lua.
    void dashboardTtsBridge.getBridgeStatus();
    return;
  }

  if (request.method === "GET" && pathname === "/api/tts/cache") {
    sendJson(response, 200, ttsEventHub.cached());
    return;
  }

  if (request.method === "POST" && pathname === "/api/tts/release-editor-port") {
    const result = await dashboardTtsBridge.releasePort();
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "POST" && pathname === "/api/tts/reclaim-editor-port") {
    try {
      const result = await dashboardTtsBridge.reclaimAndListen();
      sendJson(response, 200, result);
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : "Could not clear port 39998.";
      sendJson(response, 200, {
        listening: false,
        killed: [],
        leftover: [],
        failed: [],
        message: /Command failed:/i.test(raw) ? "Could not inspect port 39998." : raw
      });
    }
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

  if (pathname === "/api/term-images" || pathname === "/api/term-images/text") {
    await handleTermImages(request, response, url);
    return true;
  }

  if (pathname === "/api/headshot-crops") {
    await handleHeadshotCrops(request, response, url);
    return true;
  }

  if (pathname === "/api/npc-overrides") {
    await handleNpcOverrides(request, response, url);
    return true;
  }

  if (pathname === "/api/memoriam-npcs") {
    await handleMemoriamNpcs(request, response, url);
    return true;
  }

  if (pathname === "/api/scene-deck") {
    await handleDataFile(request, response, await sceneDeck, parseSceneDeckPatch);
    return true;
  }

  if (pathname === "/api/npc-stats") {
    await handleDataFile(request, response, await npcStats, parseNpcStatsPatch, async (before, after, patch) => {
      const edited = editedNamedKeys(before, after, Object.keys(patch));
      if (edited.length > 0) {
        await markPending(npcStatsPendingPath, edited, new Date());
      }
    });
    return true;
  }

  if (pathname === "/api/scene-library") {
    await handleDataFile(request, response, await sceneLibrary, parseSceneLibraryPatch);
    return true;
  }

  if (pathname === "/api/roll-chronicle") {
    await handleDataFile(request, response, await rollChronicle, parseRollChroniclePatch);
    return true;
  }

  if (pathname === "/api/lab-notes" && isDev) {
    await handleLabNotes(request, response, url);
    return true;
  }

  if (pathname.startsWith("/api/")) {
    await handleApi(request, response, pathname);
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/term-images/")) {
    await serveTermImage(response, pathname);
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/figurine-images/")) {
    await serveSafeWebp(
      response,
      [cataloguedNpcImageDir, genericNpcImageDir, memoriamNpcImageDir],
      `npc_${decodeURIComponent(pathname.slice("/figurine-images/".length))}`,
      "Invalid NPC figurine image filename."
    );
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/scenes-assets/")) {
    await serveSafeWebp(
      response,
      [scenesAssetDir],
      decodeURIComponent(pathname.slice("/scenes-assets/".length)),
      "Invalid scenes asset filename."
    );
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/sheet-art/")) {
    await serveSafeWebp(
      response,
      sheetArtDirs,
      `${decodeURIComponent(pathname.slice("/sheet-art/".length))}.webp`,
      "Invalid sheet art name."
    );
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/pc-sheet-assets/")) {
    await servePcSheetAsset(response, pathname);
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
  await refreshMemoriamNpcCatalogOnStartup(memoriamNpcCatalogPath);
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
