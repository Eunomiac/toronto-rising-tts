export const npcFieldKeys = [
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
] as const;

export type NpcFieldKey = (typeof npcFieldKeys)[number];

export type Npc = {
  id: string;
  name: string;
  species: string;
  ageAndGender: string;
  description: string;
  overview: string;
  roleplay: string[];
  publicFace: string;
  privateNeed: string;
  immediateWant: string;
  fear: string;
  secret: string;
  leverageOverThem: string;
  leverageTheyHold: string;
  chronicleRelationships: string;
  mannerisms: string[];
  voiceCadence: string;
  sampleDialogue: string[];
  notableDicePools: string[];
  disciplines: string[];
  tactics: string;
  escapePlan: string;
  masqueradeRisk: string;
  sceneHooks: string[];
  storytellerNotes: string;
  imageUrl?: string;
  favorite?: boolean;
  lockedFields?: NpcFieldKey[];
};

export type QuickOptions = {
  species: string;
  gender: string;
  sceneRole: string;
  threatLevel: string;
  tone: string;
  pcRelationship: string;
};

export type GenerateNpcRequest = {
  prompt: string;
  count: number;
  includeImage: boolean;
  quickOptions: QuickOptions;
  variant?: string;
};

export type GenerateNpcResponse = {
  npcs: Npc[];
  chronicleContextStatus: string;
};

export type ImageResponse = {
  npcId: string;
  imageUrl: string;
};

export type RerollFieldResponse = {
  field: NpcFieldKey;
  value: string | string[];
};

export const fieldLabels: Record<NpcFieldKey, string> = {
  name: "Name",
  species: "Species",
  ageAndGender: "Age & Gender",
  description: "Description",
  overview: "Overview",
  roleplay: "Roleplay",
  publicFace: "Public Face",
  privateNeed: "Private Need",
  immediateWant: "Immediate Want",
  fear: "Fear",
  secret: "Secret",
  leverageOverThem: "Leverage Over Them",
  leverageTheyHold: "Leverage They Hold",
  chronicleRelationships: "Chronicle Ties",
  mannerisms: "Mannerisms",
  voiceCadence: "Voice / Cadence",
  sampleDialogue: "Sample Dialogue",
  notableDicePools: "Notable Dice Pools",
  disciplines: "Disciplines / Signature Uses",
  tactics: "Combat / Social Tactics",
  escapePlan: "Escape Plan",
  masqueradeRisk: "Masquerade Risk",
  sceneHooks: "Scene Hooks",
  storytellerNotes: "Storyteller Notes"
};
