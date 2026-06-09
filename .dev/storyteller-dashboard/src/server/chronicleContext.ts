import type { DashboardConfig } from "./config.js";

export type ChronicleHealthInfo = {
  readonly chronicleMode: "vector_store" | "unconfigured";
  readonly hasVectorStore: boolean;
  readonly chronicleStatus: string;
};

export type ResolvedChronicleContext = {
  readonly promptText: string;
  readonly status: string;
  readonly used: boolean;
};

const vectorStorePrompt = [
  "Use the file_search tool against the configured OpenAI vector store for chronicle facts.",
  "Retrieve player character details, factions, locations, sites, and established NPCs before inventing continuity.",
  "When retrieval is thin or ambiguous, mark chronicle ties as plausible Storyteller hooks instead of definitive canon."
].join(" ");

export const chronicleHealthInfo = (config: DashboardConfig): ChronicleHealthInfo => {
  const storeId = config.openAiVectorStoreId?.trim() ?? "";
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
};

export const resolveChronicleContext = (config: DashboardConfig): ResolvedChronicleContext => {
  const storeId = config.openAiVectorStoreId?.trim() ?? "";
  if (!storeId) {
    throw new Error(
      "OPENAI_VECTOR_STORE_ID is required. Upload chronicle files to an OpenAI vector store, set the store ID in .env, and restart the server."
    );
  }

  return {
    promptText: vectorStorePrompt,
    status: `Chronicle context: OpenAI vector store (${storeId}).`,
    used: true
  };
};

export const vectorStoreFileSearchTool = (config: DashboardConfig): { readonly type: "file_search"; readonly vector_store_ids: readonly string[] } => {
  const storeId = config.openAiVectorStoreId?.trim() ?? "";
  if (!storeId) {
    throw new Error(
      "OPENAI_VECTOR_STORE_ID is required. Upload chronicle files to an OpenAI vector store, set the store ID in .env, and restart the server."
    );
  }

  return { type: "file_search", vector_store_ids: [storeId] };
};

export const chronicleSystemPromptExtension = (config: DashboardConfig): string => {
  if (!config.openAiVectorStoreId?.trim()) {
    return "";
  }

  return [
    "Chronicle knowledge lives in the attached OpenAI vector store. Use file_search before inventing continuity.",
    "Ground PC ties, factions, locations, and established NPC references in retrieved chronicle material when possible."
  ].join(" ");
};
