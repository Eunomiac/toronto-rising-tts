import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfig } from "./config.js";
import { generateNpcImage, generateNpcs, rerollNpcField } from "./npcService.js";
import { parseGenerateImageRequest, parseGenerateNpcRequest, parseRerollFieldRequest } from "../shared/npc.js";

const config = getConfig();
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
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

const handleApi = async (request: IncomingMessage, response: ServerResponse, pathname: string): Promise<void> => {
  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { ok: true, hasOpenAiKey: Boolean(config.openAiApiKey), textModel: config.textModel, imageModel: config.imageModel });
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

createServer((request, response) => {
  void (async () => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      if (url.pathname.startsWith("/api/")) {
        await handleApi(request, response, url.pathname);
        return;
      }

      await serveFile(response, url.pathname);
    } catch (error: unknown) {
      sendError(response, error);
    }
  })();
}).listen(config.port, "127.0.0.1", () => {
  console.log(`Storyteller dashboard listening on http://127.0.0.1:${config.port}`);
});
