export const SPECIES_OPTIONS = ["Mortal", "Ghoul", "Kindred", "Werewolf", "Wraith", "Thin-blood", "Other"] as const;
export const GENDER_OPTIONS = ["Any", "Woman", "Man", "Nonbinary", "Girl", "Boy", "Other"] as const;
export const ROLE_OPTIONS = ["Antagonistic", "Distracting", "Helpful", "Knowledgeable", "Victim", "Fixer", "Witness", "Wildcard"] as const;
export const THREAT_OPTIONS = ["Low", "Moderate", "Dangerous", "Predator", "Catastrophic"] as const;
export const TONE_OPTIONS = ["Gothic-punk", "Political", "Personal", "Monstrous", "Sympathetic", "Street-level", "Elegant rot"] as const;
export const PC_RELATIONSHIP_OPTIONS = ["None specified", "Ally", "Rival", "Debtor", "Creditor", "Family", "Obsessed", "Knows a secret", "Useful stranger"] as const;

export type Npc = {
  readonly id: string;
  readonly name: string;
  readonly species: string;
  readonly ageGender: string;
  readonly apparentAge: string;
  readonly description: string;
  readonly overview: string;
  readonly roleplay: readonly string[];
  readonly publicFace: string;
  readonly privateNeed: string;
  readonly immediateWant: string;
  readonly fear: string;
  readonly secret: string;
  readonly leverageOverThem: string;
  readonly leverageTheyHold: string;
  readonly chronicleRelationships: string;
  readonly mannerisms: readonly string[];
  readonly voiceCadence: string;
  readonly sampleDialogue: readonly string[];
  readonly notableDicePools: readonly string[];
  readonly disciplines: readonly string[];
  readonly tactics: string;
  readonly escapePlan: string;
  readonly masqueradeRisk: string;
  readonly sceneHooks: readonly string[];
  readonly storytellerNotes: string;
  readonly imagePrompt: string;
  readonly imageDataUrl?: string;
};

export type QuickTags = {
  readonly species: string;
  readonly gender: string;
  readonly sceneRole: string;
  readonly threatLevel: string;
  readonly tone: string;
  readonly pcRelationship: string;
};

export type GenerateNpcRequest = {
  readonly prompt: string;
  readonly count: number;
  readonly includeImages: boolean;
  readonly quickTags: QuickTags;
  readonly direction?: string;
};

export type GenerateNpcResponse = {
  readonly npcs: readonly Npc[];
  readonly chronicleContextUsed: boolean;
  readonly chronicleContextFiles: readonly string[];
  readonly chronicleStatus: string;
};

export type GenerateImageResponse = {
  readonly imageDataUrl: string;
};

export type RerollFieldRequest = {
  readonly npc: Npc;
  readonly field: keyof Npc;
  readonly prompt: string;
  readonly quickTags: QuickTags;
};

export const NPC_FIELDS = ["id", "name", "species", "ageGender", "apparentAge", "description", "overview", "roleplay", "publicFace", "privateNeed", "immediateWant", "fear", "secret", "leverageOverThem", "leverageTheyHold", "chronicleRelationships", "mannerisms", "voiceCadence", "sampleDialogue", "notableDicePools", "disciplines", "tactics", "escapePlan", "masqueradeRisk", "sceneHooks", "storytellerNotes", "imagePrompt", "imageDataUrl"] as const;

const stringFields: readonly (keyof Npc)[] = ["id", "name", "species", "ageGender", "apparentAge", "description", "overview", "publicFace", "privateNeed", "immediateWant", "fear", "secret", "leverageOverThem", "leverageTheyHold", "chronicleRelationships", "voiceCadence", "tactics", "escapePlan", "masqueradeRisk", "storytellerNotes", "imagePrompt"];
const arrayFields: readonly (keyof Npc)[] = ["roleplay", "mannerisms", "sampleDialogue", "notableDicePools", "disciplines", "sceneHooks"];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isStringArray = (value: unknown): value is readonly string[] => Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);

const assertCondition: (condition: boolean, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

export const parseNpc = (value: unknown): Npc => {
  assertCondition(isRecord(value), "NPC must be an object.");
  const record = value as Record<string, unknown>;

  for (const field of stringFields) {
    assertCondition(typeof record[field] === "string" && record[field].trim().length > 0, `NPC field ${String(field)} must be a non-empty string.`);
  }

  for (const field of arrayFields) {
    assertCondition(isStringArray(record[field]), `NPC field ${String(field)} must be a string array.`);
  }

  if (record.imageDataUrl !== undefined) {
    assertCondition(typeof record.imageDataUrl === "string", "NPC imageDataUrl must be a string when present.");
  }

  return record as Npc;
};

export const parseGenerateNpcResponse = (value: unknown): GenerateNpcResponse => {
  assertCondition(isRecord(value), "Generate response must be an object.");
  assertCondition(Array.isArray(value.npcs) && value.npcs.length > 0, "Generate response must include NPCs.");
  const chronicleContextUsed = typeof value.chronicleContextUsed === "boolean" ? value.chronicleContextUsed : false;
  const chronicleContextFiles = isStringArray(value.chronicleContextFiles) ? value.chronicleContextFiles : [];
  const chronicleStatus = typeof value.chronicleStatus === "string" ? value.chronicleStatus : "";
  return { npcs: value.npcs.map(parseNpc), chronicleContextUsed, chronicleContextFiles, chronicleStatus };
};

export const parseGenerateNpcRequest = (value: unknown): GenerateNpcRequest => {
  assertCondition(isRecord(value), "Generate request must be an object.");
  assertCondition(typeof value.prompt === "string" && value.prompt.trim().length > 0, "Prompt is required.");
  assertCondition(typeof value.count === "number" && Number.isInteger(value.count) && value.count >= 1 && value.count <= 6, "Count must be between 1 and 6.");
  assertCondition(typeof value.includeImages === "boolean", "includeImages must be a boolean.");
  assertCondition(isRecord(value.quickTags), "quickTags are required.");
  const quickTags = value.quickTags;
  for (const field of ["species", "gender", "sceneRole", "threatLevel", "tone", "pcRelationship"] as const) {
    assertCondition(typeof quickTags[field] === "string", `quickTags.${field} must be a string.`);
  }
  const request: GenerateNpcRequest = { prompt: value.prompt, count: value.count, includeImages: value.includeImages, quickTags: quickTags as QuickTags };
  return typeof value.direction === "string" ? { ...request, direction: value.direction } : request;
};

export const parseGenerateImageRequest = (value: unknown): { readonly npc: Npc } => {
  assertCondition(isRecord(value), "Image request must be an object.");
  return { npc: parseNpc(value.npc) };
};

export const parseGenerateImageResponse = (value: unknown): GenerateImageResponse => {
  assertCondition(isRecord(value), "Image response must be an object.");
  assertCondition(typeof value.imageDataUrl === "string" && value.imageDataUrl.length > 0, "Image response must include imageDataUrl.");
  return { imageDataUrl: value.imageDataUrl };
};

export const parseRerollFieldRequest = (value: unknown): RerollFieldRequest => {
  assertCondition(isRecord(value), "Reroll request must be an object.");
  assertCondition(typeof value.field === "string" && NPC_FIELDS.includes(value.field as keyof Npc), "Reroll field is invalid.");
  assertCondition(typeof value.prompt === "string" && value.prompt.trim().length > 0, "Reroll prompt is required.");
  const base = parseGenerateNpcRequest({ prompt: value.prompt, count: 1, includeImages: false, quickTags: value.quickTags });
  return { npc: parseNpc(value.npc), field: value.field as keyof Npc, prompt: value.prompt, quickTags: base.quickTags };
};
