import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { normalizeRepoRelPath } from "./paths.js";
import { regionRegistrySchema, findingSchema, type Finding, type RegionRegistry } from "./schemas.js";
import { defaultArtifactPaths, validateProject } from "./validateProject.js";

export type UpsertRegionParams = {
  repoRoot: string;
  file: string;
  regionNum: number;
  classification?: string;
  description?: string;
  notes?: string;
  registryRel?: string;
  findingsRel?: string;
  excludedRel?: string;
};

/**
 * Updates Summarizer-style metadata fields for a single registry row, then re-validates the repo.
 */
export function upsertRegionMetadata(params: UpsertRegionParams): string[] {
  const registryPath = path.join(params.repoRoot, params.registryRel ?? defaultArtifactPaths.registryRel);
  const previous = readUtf8OrThrow(registryPath);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(previous) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [`${registryPath}: invalid JSON: ${message}`];
  }
  const parsed = regionRegistrySchema.safeParse(parsedJson);
  if (!parsed.success) {
    return [`${registryPath}: ${parsed.error.message}`];
  }
  const registry: RegionRegistry = parsed.data;
  const fileKey = normalizeRepoRelPath(params.file);
  const idx = registry.regions.findIndex((row) => normalizeRepoRelPath(row.file) === fileKey && row.regionNum === params.regionNum);
  if (idx < 0) {
    return [`No registry row for ${fileKey} regionNum ${String(params.regionNum)}.`];
  }
  const row = registry.regions[idx];
  if (!row) {
    return ["Internal error: missing registry row after index lookup."];
  }
  const next = {
    ...row,
    classification: params.classification ?? row.classification,
    description: params.description ?? row.description,
    notes: params.notes ?? row.notes,
  };
  registry.regions[idx] = next;
  writeJsonPretty(registryPath, registry);
  const errors = validateProject({
    repoRoot: params.repoRoot,
    registryRel: params.registryRel,
    findingsRel: params.findingsRel,
    excludedRel: params.excludedRel,
  });
  if (errors.length > 0) {
    fs.writeFileSync(registryPath, previous, "utf8");
  }
  return errors;
}

export type AppendFindingParams = {
  repoRoot: string;
  file: string;
  regionNum: number;
  agent: string;
  category: string;
  message: string;
  id?: string;
  createdAt?: string;
  registryRel?: string;
  findingsRel?: string;
  excludedRel?: string;
};

/**
 * Appends a validated finding line to `findings.jsonl`, then re-validates the repo.
 */
export function appendFinding(params: AppendFindingParams): string[] {
  const findingsPath = path.join(params.repoRoot, params.findingsRel ?? defaultArtifactPaths.findingsRel);
  const previous = fs.existsSync(findingsPath) ? fs.readFileSync(findingsPath, "utf8") : "";
  const finding: Finding = {
    id: params.id ?? randomUUID(),
    file: normalizeRepoRelPath(params.file),
    regionNum: params.regionNum,
    agent: params.agent,
    category: params.category,
    message: params.message,
    createdAt: params.createdAt ?? new Date().toISOString(),
  };
  const checked = findingSchema.safeParse(finding);
  if (!checked.success) {
    return [checked.error.message];
  }
  const line = `${JSON.stringify(checked.data)}\n`;
  fs.appendFileSync(findingsPath, line, "utf8");
  const errors = validateProject({
    repoRoot: params.repoRoot,
    registryRel: params.registryRel,
    findingsRel: params.findingsRel,
    excludedRel: params.excludedRel,
  });
  if (errors.length > 0) {
    fs.writeFileSync(findingsPath, previous, "utf8");
  }
  return errors;
}

function readUtf8OrThrow(absPath: string): string {
  return fs.readFileSync(absPath, "utf8");
}

function writeJsonPretty(absPath: string, value: unknown): void {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(absPath, text, "utf8");
}
