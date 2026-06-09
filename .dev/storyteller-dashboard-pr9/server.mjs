import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const appRoot = path.dirname(__filename);
const distRoot = path.join(appRoot, "dist");
const npcFieldKeys = [
  "name",
  "species",
  "ageAndGender",
  "description",
  "overview",
  "roleplay",
  "publicFace",
  "privateNeed",
  "immediateWant",
  "fear",
  "secret",
  "leverageOverThem",
  "leverageTheyHold",
  "chronicleRelationships",
  "mannerisms",
  "voiceCadence",
  "sampleDialogue",
  "notableDicePools",
  "disciplines",
  "tactics",
  "escapePlan",
  "masqueradeRisk",
  "sceneHooks",
  "storytellerNotes"
];
const arrayFields = new Set(["roleplay", "mannerisms", "sampleDialogue", "notableDicePools", "disciplines", "sceneHooks"]);

loadEnvFile();

function loadEnvFile() {
  const envPath = path.join(appRoot, ".env");
  if (!existsSync(envPath)) {
    return;
  }
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^['\"]|['\"]$/g, "");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}


function jsonSchemaForNpcs() {
  const properties = {
    id: { type: "string" },
    name: { type: "string" },
    species: { type: "string" },
    ageAndGender: { type: "string" },
    description: { type: "string" },
    overview: { type: "string" },
    roleplay: { type: "array", minItems: 2, items: { type: "string" } },
    publicFace: { type: "string" },
    privateNeed: { type: "string" },
    immediateWant: { type: "string" },
    fear: { type: "string" },
    secret: { type: "string" },
    leverageOverThem: { type: "string" },
    leverageTheyHold: { type: "string" },
    chronicleRelationships: { type: "string" },
    mannerisms: { type: "array", minItems: 2, items: { type: "string" } },
    voiceCadence: { type: "string" },
    sampleDialogue: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
    notableDicePools: { type: "array", minItems: 2, items: { type: "string" } },
    disciplines: { type: "array", items: { type: "string" } },
    tactics: { type: "string" },
    escapePlan: { type: "string" },
    masqueradeRisk: { type: "string" },
    sceneHooks: { type: "array", minItems: 2, items: { type: "string" } },
    storytellerNotes: { type: "string" }
  };
  return {
    type: "object",
    additionalProperties: false,
    required: ["npcs"],
    properties: {
      npcs: {
        type: "array",
        minItems: 1,
        items: { type: "object", additionalProperties: false, required: ["id", ...npcFieldKeys], properties }
      }
    }
  };
}

function fieldJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["field", "value"],
    properties: {
      field: { type: "string", enum: npcFieldKeys },
      value: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] }
    }
  };
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function validateQuickOptions(value) {
  if (!isRecord(value)) {
    throw new Error("quickOptions must be an object.");
  }
  return {
    species: requireString(value.species, "quickOptions.species"),
    gender: requireString(value.gender, "quickOptions.gender"),
    sceneRole: requireString(value.sceneRole, "quickOptions.sceneRole"),
    threatLevel: requireString(value.threatLevel, "quickOptions.threatLevel"),
    tone: requireString(value.tone, "quickOptions.tone"),
    pcRelationship: requireString(value.pcRelationship, "quickOptions.pcRelationship")
  };
}

function validateGenerateRequest(value) {
  if (!isRecord(value)) {
    throw new Error("Request body must be an object.");
  }
  const count = Number(value.count);
  if (!Number.isInteger(count) || count < 1 || count > 6) {
    throw new Error("count must be an integer from 1 to 6.");
  }
  return {
    prompt: requireString(value.prompt, "prompt"),
    count,
    includeImage: value.includeImage === true,
    quickOptions: validateQuickOptions(value.quickOptions),
    variant: typeof value.variant === "string" ? value.variant : undefined
  };
}

function validateNpc(value) {
  if (!isRecord(value)) {
    throw new Error("npc must be an object.");
  }
  for (const field of ["id", ...npcFieldKeys]) {
    if (arrayFields.has(field)) {
      if (!Array.isArray(value[field])) {
        throw new Error(`npc.${field} must be an array.`);
      }
    } else {
      requireString(value[field], `npc.${field}`);
    }
  }
  return value;
}

function validateField(value) {
  const field = requireString(value, "field");
  if (!npcFieldKeys.includes(field)) {
    throw new Error(`Unsupported NPC field: ${field}`);
  }
  return field;
}

function vectorStoreId() {
  return process.env.OPENAI_VECTOR_STORE_ID?.trim() || "";
}

function chronicleHealthInfo() {
  const storeId = vectorStoreId();
  if (!storeId) {
    return {
      chronicleMode: "unconfigured",
      hasVectorStore: false,
      chronicleStatus: "OPENAI_VECTOR_STORE_ID is not set. NPC generation requires a configured OpenAI vector store."
    };
  }
  return {
    chronicleMode: "vector_store",
    hasVectorStore: true,
    chronicleStatus: `Chronicle context: OpenAI vector store (${storeId}).`
  };
}

function buildSystemPrompt() {
  const lines = [
    "You are a fast live-play Storyteller assistant for a Vampire: The Masquerade 5th Edition chronicle set in the modern night.",
    "Generate playable NPCs, not fiction excerpts. Favor gothic-punk, politics, hunger, secrets, personal compromise, immediate table utility, and dangerous social leverage.",
    "Avoid generic fantasy, heroic fantasy races, purple prose, and lore dumps. If a user gives scraps or keywords, infer a useful NPC while preserving those clues.",
    "Use V5 terminology where helpful. Keep dice pools as concise attribute+skill pools with approximate dice counts, such as Manipulation + Subterfuge 6.",
    "For unknown chronicle references, do not invent definitive continuity. Mark the tie as a plausible hook for Storyteller approval."
  ];
  if (vectorStoreId()) {
    lines.push(
      "Chronicle knowledge lives in the attached OpenAI vector store. Use file_search before inventing continuity.",
      "Ground PC ties, factions, locations, and established NPC references in retrieved chronicle material when possible."
    );
  }
  return lines.join("\n");
}

function resolveChronicleContext() {
  const storeId = vectorStoreId();
  if (!storeId) {
    throw new Error(
      "OPENAI_VECTOR_STORE_ID is required. Upload chronicle files to an OpenAI vector store, set the store ID in .env, and restart the server."
    );
  }
  return {
    context: [
      "Use the file_search tool against the configured OpenAI vector store for chronicle facts.",
      "Retrieve player character details, factions, locations, sites, and established NPCs before inventing continuity.",
      "When retrieval is thin or ambiguous, mark chronicle ties as plausible Storyteller hooks instead of definitive canon."
    ].join(" "),
    status: `Chronicle context: OpenAI vector store (${storeId}).`
  };
}

function quickOptionText(options) {
  return [
    `Species: ${options.species}`,
    `Gender: ${options.gender}`,
    `Scene role: ${options.sceneRole}`,
    `Threat level: ${options.threatLevel}`,
    `Tone: ${options.tone}`,
    `Relationship to PCs: ${options.pcRelationship}`
  ].join("\n");
}

function apiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is required on the server. Copy .env.example to .env and set it before generating NPCs.");
  }
  return key;
}

function attachFileSearchTool(body) {
  const storeId = vectorStoreId();
  if (!storeId) {
    throw new Error(
      "OPENAI_VECTOR_STORE_ID is required. Upload chronicle files to an OpenAI vector store, set the store ID in .env, and restart the server."
    );
  }
  body.tools = [{ type: "file_search", vector_store_ids: [storeId] }];
}

async function postOpenAiResponses(body) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI Responses API error ${response.status}: ${text}`);
  }
  return JSON.parse(text);
}

function extractOutputText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  const parts = [];
  for (const item of response.output ?? []) {
    if (typeof item.text === "string") {
      parts.push(item.text);
    }
    if (Array.isArray(item.content)) {
      for (const contentItem of item.content) {
        if (isRecord(contentItem) && typeof contentItem.text === "string") {
          parts.push(contentItem.text);
        }
      }
    }
  }
  const combined = parts.join("\n").trim();
  if (!combined) {
    throw new Error("OpenAI response did not include text output.");
  }
  return combined;
}

function extractImageDataUrl(response) {
  for (const item of response.output ?? []) {
    if (item.type === "image_generation_call" && typeof item.result === "string" && item.result.length > 0) {
      return `data:image/png;base64,${item.result}`;
    }
  }
  throw new Error("OpenAI image response did not include generated image data.");
}

function validateGeneratedNpc(npc) {
  validateNpc(npc);
  return { ...npc, id: randomUUID(), lockedFields: [] };
}

async function generateNpcs(request) {
  const chronicle = resolveChronicleContext();
  const body = {
    model: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5-mini",
    instructions: buildSystemPrompt(),
    input: [
      "Generate structured V5 NPCs for live play.",
      `Count: ${request.count}`,
      "Quick options:",
      quickOptionText(request.quickOptions),
      request.variant ? `Requested variation: ${request.variant}` : "",
      "Hasty prompt / keywords:",
      request.prompt,
      "Chronicle context:",
      chronicle.context
    ].join("\n"),
    text: { format: { type: "json_schema", name: "v5_npc_batch", strict: true, schema: jsonSchemaForNpcs() } }
  };
  attachFileSearchTool(body);
  const parsed = JSON.parse(extractOutputText(await postOpenAiResponses(body)));
  if (!Array.isArray(parsed.npcs)) {
    throw new Error("OpenAI response did not include an npcs array.");
  }
  return { npcs: parsed.npcs.map(validateGeneratedNpc), chronicleContextStatus: chronicle.status };
}

async function rerollField(npc, field, prompt, quickOptions) {
  const chronicle = resolveChronicleContext();
  const body = {
    model: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5-mini",
    instructions: buildSystemPrompt(),
    input: [
      `Regenerate only the ${field} field for this V5 NPC.`,
      "Preserve continuity with the existing NPC and return only the requested field/value JSON.",
      "Original prompt:",
      prompt,
      "Quick options:",
      quickOptionText(quickOptions),
      "Current NPC JSON:",
      JSON.stringify(npc),
      "Chronicle context:",
      chronicle.context
    ].join("\n"),
    text: { format: { type: "json_schema", name: "v5_npc_field_reroll", strict: true, schema: fieldJsonSchema() } }
  };
  attachFileSearchTool(body);
  const parsed = JSON.parse(extractOutputText(await postOpenAiResponses(body)));
  const returnedField = validateField(parsed.field);
  if (returnedField !== field) {
    throw new Error(`OpenAI rerolled ${returnedField}, but the requested field was ${field}.`);
  }
  if (typeof parsed.value !== "string" && !Array.isArray(parsed.value)) {
    throw new Error("Rerolled field value must be a string or string array.");
  }
  return { field: returnedField, value: parsed.value };
}

async function rerollNpc(npc, prompt, quickOptions, lockedFields) {
  const generated = (await generateNpcs({ prompt, count: 1, includeImage: false, quickOptions })).npcs[0];
  const preserved = Object.fromEntries(lockedFields.map((field) => [field, npc[field]]));
  return { ...generated, ...preserved, id: npc.id, imageUrl: npc.imageUrl, favorite: npc.favorite, lockedFields };
}

async function generateNpcImage(npc) {
  const prompt = [
    "Generate a dark modern-night Vampire: The Masquerade character portrait for live Storyteller reference.",
    "No text, no watermark, no UI frame. Cinematic but grounded; urban gothic-punk; morally complicated expression.",
    `NPC: ${npc.name}, ${npc.species}, ${npc.ageAndGender}.`,
    `Visual description: ${npc.description}`,
    `Public face: ${npc.publicFace}`,
    `Private tension: ${npc.privateNeed}`
  ].join("\n");
  const response = await postOpenAiResponses({ model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-5-mini", input: prompt, tools: [{ type: "image_generation" }] });
  return { npcId: npc.id, imageUrl: extractImageDataUrl(response) };
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text.length === 0 ? {} : JSON.parse(text);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  const message = error instanceof Error ? error.message : "Unknown server error.";
  sendJson(response, 500, { error: message });
}

async function handleApi(request, response, pathname) {
  try {
    if (request.method === "GET" && pathname === "/api/health") {
      sendJson(response, 200, { ok: true, ...chronicleHealthInfo() });
      return;
    }
    const body = await readJsonBody(request);
    if (request.method === "POST" && pathname === "/api/npcs/generate") {
      sendJson(response, 200, await generateNpcs(validateGenerateRequest(body)));
      return;
    }
    if (request.method === "POST" && pathname === "/api/npcs/reroll-field") {
      const npc = validateNpc(body.npc);
      const field = validateField(body.field);
      const prompt = requireString(body.prompt, "prompt");
      const quickOptions = validateQuickOptions(body.quickOptions);
      sendJson(response, 200, await rerollField(npc, field, prompt, quickOptions));
      return;
    }
    if (request.method === "POST" && pathname === "/api/npcs/reroll") {
      const npc = validateNpc(body.npc);
      const prompt = requireString(body.prompt, "prompt");
      const quickOptions = validateQuickOptions(body.quickOptions);
      const lockedFields = Array.isArray(body.lockedFields) ? body.lockedFields.map(validateField) : [];
      sendJson(response, 200, await rerollNpc(npc, prompt, quickOptions, lockedFields));
      return;
    }
    if (request.method === "POST" && pathname === "/api/images/generate") {
      sendJson(response, 200, await generateNpcImage(validateNpc(body.npc)));
      return;
    }
    sendJson(response, 404, { error: "API route not found." });
  } catch (error) {
    sendError(response, error);
  }
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function serveStatic(request, response, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(distRoot, safePath));
  if (!filePath.startsWith(distRoot) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found. Run npm run build first.");
    return;
  }
  response.writeHead(200, { "Content-Type": contentType(filePath) });
  createReadStream(filePath).pipe(response);
}

const port = Number.parseInt(process.env.DASHBOARD_PORT || "8787", 10);
if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid DASHBOARD_PORT: ${process.env.DASHBOARD_PORT}`);
}

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    void handleApi(request, response, url.pathname);
    return;
  }
  serveStatic(request, response, url.pathname);
}).listen(port, () => {
  console.log(`Toronto Rising Storyteller Dashboard listening on http://localhost:${port}`);
  const chronicle = chronicleHealthInfo();
  console.log(chronicle.chronicleStatus);
});
