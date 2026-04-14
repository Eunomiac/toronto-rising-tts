import { z } from "zod";

/**
 * Zod schemas shared by the validator and CLI merge helpers.
 */
export const excludedFilesSchema = z.object({
  version: z.literal(1),
  entries: z.array(
    z.object({
      path: z.string().min(1),
      reason: z.string(),
    }),
  ),
});

export type ExcludedFiles = z.infer<typeof excludedFilesSchema>;

export const registryRegionSchema = z.object({
  file: z.string().min(1),
  regionNum: z.number().int().positive(),
  parentRegionNum: z.number().int().positive().nullable(),
  title: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  classification: z.string(),
  description: z.string(),
  notes: z.string(),
});

export type RegistryRegion = z.infer<typeof registryRegionSchema>;

export const regionRegistrySchema = z.object({
  version: z.literal(1),
  regions: z.array(registryRegionSchema),
});

export type RegionRegistry = z.infer<typeof regionRegistrySchema>;

export const findingSchema = z.object({
  id: z.string().min(1),
  file: z.string().min(1),
  regionNum: z.number().int().positive(),
  agent: z.string().min(1),
  category: z.string().min(1),
  message: z.string().min(1),
  createdAt: z.string().min(1),
});

export type Finding = z.infer<typeof findingSchema>;
