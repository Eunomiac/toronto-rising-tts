export type DashboardConfig = {
  readonly port: number;
  readonly openAiApiKey: string | undefined;
  readonly openAiVectorStoreId: string | undefined;
  readonly textModel: string;
  readonly imageModel: string;
};

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return 8788;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return parsed;
};

export const getConfig = (): DashboardConfig => ({
  port: parsePort(process.env.PORT),
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiVectorStoreId: process.env.OPENAI_VECTOR_STORE_ID,
  textModel: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini",
  imageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1"
});
