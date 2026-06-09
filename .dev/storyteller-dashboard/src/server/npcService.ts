import { randomUUID } from "node:crypto";
import type { DashboardConfig } from "./config.js";
import { chronicleSystemPromptExtension, resolveChronicleContext, vectorStoreFileSearchTool } from "./chronicleContext.js";
import {
  parseGenerateImageResponse,
  parseGenerateNpcResponse,
  type GenerateImageResponse,
  type GenerateNpcRequest,
  type GenerateNpcResponse,
  type Npc,
  type QuickTags
} from "../shared/npc.js";

type ResponsesApiResult = {
  readonly output_text?: string;
  readonly output?: readonly {
    readonly content?: readonly {
      readonly type?: string;
      readonly text?: string;
    }[];
  }[];
};

type ImagesApiResult = {
  readonly data?: readonly { readonly b64_json?: string; readonly url?: string }[];
};

const npcJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["npcs"],
  properties: {
    npcs: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "species", "ageGender", "apparentAge", "description", "overview", "roleplay", "publicFace", "privateNeed", "immediateWant", "fear", "secret", "leverageOverThem", "leverageTheyHold", "chronicleRelationships", "mannerisms", "voiceCadence", "sampleDialogue", "notableDicePools", "disciplines", "tactics", "escapePlan", "masqueradeRisk", "sceneHooks", "storytellerNotes", "imagePrompt"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          species: { type: "string" },
          ageGender: { type: "string" },
          apparentAge: { type: "string" },
          description: { type: "string" },
          overview: { type: "string" },
          roleplay: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
          publicFace: { type: "string" },
          privateNeed: { type: "string" },
          immediateWant: { type: "string" },
          fear: { type: "string" },
          secret: { type: "string" },
          leverageOverThem: { type: "string" },
          leverageTheyHold: { type: "string" },
          chronicleRelationships: { type: "string" },
          mannerisms: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
          voiceCadence: { type: "string" },
          sampleDialogue: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
          notableDicePools: { type: "array", minItems: 3, maxItems: 7, items: { type: "string" } },
          disciplines: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
          tactics: { type: "string" },
          escapePlan: { type: "string" },
          masqueradeRisk: { type: "string" },
          sceneHooks: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
          storytellerNotes: { type: "string" },
          imagePrompt: { type: "string" }
        }
      }
    }
  }
} as const;

const buildSystemPrompt = (config: DashboardConfig): string => {
  const lines = [
    "You generate immediately playable Vampire: the Masquerade 5th Edition NPCs for a modern Toronto chronicle.",
    "Use gothic-punk, political, personal, dangerous, morally compromised modern-night details.",
    "Prefer concrete table utility over florid prose. Avoid generic fantasy.",
    "Use V5-like dice pools as short labels such as \"Insight 6\", \"Subterfuge 5\", \"Firearms 4\".",
    "For mortals, write \"None\" for disciplines unless supernatural traits are truly justified.",
    "For unknown chronicle references, do not invent definitive continuity. Mark uncertain ties as Storyteller hooks.",
    "The user often enters rushed fragments or keywords. Preserve useful constraints and fill gaps with playable tension."
  ];
  const extension = chronicleSystemPromptExtension(config);
  if (extension.length > 0) {
    lines.push(extension);
  }
  return lines.join("\n");
};

const quickTagSummary = (quickTags: QuickTags): string => [
  `Species: ${quickTags.species}`,
  `Gender: ${quickTags.gender}`,
  `Scene role: ${quickTags.sceneRole}`,
  `Threat: ${quickTags.threatLevel}`,
  `Tone: ${quickTags.tone}`,
  `PC relationship: ${quickTags.pcRelationship}`
].join("; ");

const readJsonResponse = async (response: Response): Promise<unknown> => {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "object" && body.error !== null && "message" in body.error && typeof body.error.message === "string"
      ? body.error.message
      : `OpenAI request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
};

const extractResponseText = (body: unknown): string => {
  const result = body as ResponsesApiResult;
  if (typeof result.output_text === "string") {
    return result.output_text;
  }

  const text = result.output?.flatMap((item) => item.content ?? []).find((content) => content.type === "output_text" && typeof content.text === "string")?.text;
  if (text) {
    return text;
  }

  throw new Error("OpenAI response did not include structured output text.");
};

const withStableIds = (npcs: readonly Npc[]): Npc[] => npcs.map((npc) => ({
  ...npc,
  id: npc.id.trim().length > 0 ? npc.id : randomUUID()
}));

export const generateNpcs = async (config: DashboardConfig, request: GenerateNpcRequest): Promise<GenerateNpcResponse> => {
  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required to generate NPCs.");
  }

  const chronicle = resolveChronicleContext(config);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.textModel,
      tools: [vectorStoreFileSearchTool(config)],
      input: [
        { role: "system", content: buildSystemPrompt(config) },
        {
          role: "user",
          content: [
            `Generate ${request.count} NPC card(s).`,
            `Quick controls: ${quickTagSummary(request.quickTags)}.`,
            request.direction ? `Regeneration direction: ${request.direction}.` : "",
            `User prompt: ${request.prompt}`,
            `Chronicle context: ${chronicle.promptText}`
          ].filter((line) => line.length > 0).join("\n\n")
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "v5_npc_generation",
          strict: true,
          schema: npcJsonSchema
        }
      }
    })
  });

  const output = JSON.parse(extractResponseText(await readJsonResponse(response))) as unknown;
  const parsed = parseGenerateNpcResponse({ npcs: (output as { readonly npcs?: unknown }).npcs, chronicleContextUsed: false, chronicleContextFiles: [], chronicleStatus: "" });

  return parseGenerateNpcResponse({
    npcs: withStableIds(parsed.npcs),
    chronicleContextUsed: chronicle.used,
    chronicleContextFiles: [],
    chronicleStatus: chronicle.status
  });
};

export const rerollNpcField = async (config: DashboardConfig, npc: Npc, field: keyof Npc, prompt: string, quickTags: QuickTags): Promise<Npc> => {
  const result = await generateNpcs(config, {
    prompt: `Regenerate only the "${String(field)}" concept for this NPC, while keeping locked continuity from the current card: ${JSON.stringify(npc)}. Original/live prompt: ${prompt}`,
    count: 1,
    includeImages: false,
    quickTags,
    direction: `Return a full card, but change ${String(field)} most strongly and keep the rest coherent.`
  });

  const replacement = result.npcs[0];
  if (!replacement) {
    throw new Error("No replacement NPC returned for field reroll.");
  }

  return { ...npc, [field]: replacement[field] };
};

export const generateNpcImage = async (config: DashboardConfig, npc: Npc): Promise<GenerateImageResponse> => {
  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required to generate NPC images.");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.imageModel,
      prompt: [
        "Create a portrait-style image for a Vampire: the Masquerade 5th Edition modern-night NPC.",
        "Dark Toronto gothic-punk mood, grounded realism, dangerous personal tension, no text, no logo, no UI frame.",
        npc.imagePrompt,
        `NPC summary: ${npc.name}; ${npc.species}; ${npc.description}; ${npc.overview}`
      ].join("\n"),
      size: "1024x1024",
      quality: "low",
      n: 1
    })
  });

  const body = await readJsonResponse(response) as ImagesApiResult;
  const b64 = body.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image response did not include base64 image data.");
  }

  return parseGenerateImageResponse({ imageDataUrl: `data:image/png;base64,${b64}` });
};
