import fs from "node:fs";
import path from "node:path";

import { parseMarkerFile, type ParsedRegion } from "./markerParser.js";
import { listProductionTtsluaFiles, normalizeRepoRelPath } from "./paths.js";
import { excludedFilesSchema, regionRegistrySchema, findingSchema, type RegionRegistry } from "./schemas.js";

const DEFAULT_EXCLUDED_REL = path.join("dev", "Code Review", "excluded_files.json");
const DEFAULT_REGISTRY_REL = path.join("dev", "Code Review", "region_registry.json");
const DEFAULT_FINDINGS_REL = path.join("dev", "Code Review", "findings.jsonl");

export type ValidateOptions = {
  repoRoot: string;
  excludedRel?: string;
  registryRel?: string;
  findingsRel?: string;
};

/**
 * Runs the full repository validation pass and returns a non-empty list on failure.
 */
export function validateProject(options: ValidateOptions): string[] {
  const repoRoot = options.repoRoot;
  const excludedPath = path.join(repoRoot, options.excludedRel ?? DEFAULT_EXCLUDED_REL);
  const registryPath = path.join(repoRoot, options.registryRel ?? DEFAULT_REGISTRY_REL);
  const findingsPath = path.join(repoRoot, options.findingsRel ?? DEFAULT_FINDINGS_REL);

  const errors: string[] = [];

  const excluded = readJson(excludedPath, excludedFilesSchema, errors);
  const registry = readJson(registryPath, regionRegistrySchema, errors);
  if (!excluded || !registry) {
    return errors;
  }

  const excludedSet = new Map<string, string>();
  for (const entry of excluded.entries) {
    const normalized = normalizeRepoPath(entry.path);
    if (excludedSet.has(normalized)) {
      errors.push(`excluded_files.json: duplicate path: ${normalized}`);
    }
    excludedSet.set(normalized, entry.reason);
  }

  const productionFiles = new Set(listProductionTtsluaFiles(repoRoot));
  for (const p of excludedSet.keys()) {
    if (!productionFiles.has(p)) {
      errors.push(`excluded_files.json: path is not a production .ttslua file: ${p}`);
    }
  }

  const registryByFile = groupRegistry(registry);

  for (const region of registry.regions) {
    const normalized = normalizeRepoPath(region.file);
    if (excludedSet.has(normalized)) {
      errors.push(
        `region_registry.json: region references excluded file ${normalized} (regionNum ${String(region.regionNum)}). Remove exclusion or delete registry rows.`,
      );
    }
  }

  for (const file of productionFiles) {
    const abs = path.join(repoRoot, ...file.split("/"));
    const content = readFileUtf8(abs, errors);
    if (content === null) {
      continue;
    }

    if (excludedSet.has(file)) {
      const rows = registryByFile.get(file) ?? [];
      if (rows.length > 0) {
        errors.push(
          `File ${file} is excluded but region_registry.json contains ${String(rows.length)} row(s). Delete registry rows or un-exclude the file.`,
        );
      }
      continue;
    }

    const { parsed, errors: parseErrors } = parseMarkerFile(file, content);
    errors.push(...parseErrors);
    if (!parsed) {
      continue;
    }

    if (parsed.flat.length === 0 && parsed.lineCount > 0) {
      errors.push(`${file}: Partitioned files must declare at least one root #region (file has ${String(parsed.lineCount)} lines).`);
    }

    const rows = registryByFile.get(file) ?? [];
    const registryNums = new Set(rows.map((row) => row.regionNum));
    const parsedNums = new Set(parsed.flat.map((region) => region.regionNum));

    for (const num of parsedNums) {
      if (!registryNums.has(num)) {
        errors.push(`${file}: Missing registry row for regionNum ${String(num)}.`);
      }
    }
    for (const num of registryNums) {
      if (!parsedNums.has(num)) {
        errors.push(`${file}: Registry contains unknown regionNum ${String(num)} (not present in markers).`);
      }
    }

    const parsedByNum = new Map<number, ParsedRegion>();
    for (const region of parsed.flat) {
      parsedByNum.set(region.regionNum, region);
    }

    for (const row of rows) {
      const parsedRegion = parsedByNum.get(row.regionNum);
      if (!parsedRegion) {
        continue;
      }
      if (row.title.trim() !== parsedRegion.title.trim()) {
        errors.push(
          `${file}: Registry title mismatch for [${String(row.regionNum)}]: registry=${JSON.stringify(row.title)} markers=${JSON.stringify(parsedRegion.title)}`,
        );
      }
      if (row.parentRegionNum !== parsedRegion.parentRegionNum) {
        errors.push(
          `${file}: Registry parentRegionNum mismatch for [${String(row.regionNum)}]: registry=${String(row.parentRegionNum)} markers=${String(parsedRegion.parentRegionNum)}`,
        );
      }
      if (row.startLine !== parsedRegion.startLine || row.endLine !== parsedRegion.endLine) {
        errors.push(
          `${file}: Registry line span mismatch for [${String(row.regionNum)}]: registry ${String(row.startLine)}-${String(row.endLine)} vs markers ${String(parsedRegion.startLine)}-${String(parsedRegion.endLine)}`,
        );
      }
    }
  }

  validateFindingsAgainstRegistry(findingsPath, registry, excludedSet, errors);

  return errors;
}

function validateFindingsAgainstRegistry(
  findingsPath: string,
  registry: RegionRegistry,
  excludedSet: Map<string, string>,
  errors: string[],
): void {
  if (!fs.existsSync(findingsPath)) {
    errors.push(`Missing findings file: ${findingsPath}`);
    return;
  }
  const raw = readFileUtf8(findingsPath, errors);
  if (raw === null) {
    return;
  }
  const lines = raw.split(/\r?\n/);
  const registryKey = new Set(
    registry.regions.map((row) => `${normalizeRepoPath(row.file)}::${String(row.regionNum)}`),
  );
  let lineNo = 0;
  for (const line of lines) {
    lineNo += 1;
    if (line.trim().length === 0) {
      continue;
    }
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(line) as unknown;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${findingsPath}:${String(lineNo)}: Invalid JSON: ${message}`);
      continue;
    }
    const parsed = findingSchema.safeParse(parsedJson);
    if (!parsed.success) {
      errors.push(`${findingsPath}:${String(lineNo)}: ${parsed.error.message}`);
      continue;
    }
    const finding = parsed.data;
    const normalizedFile = normalizeRepoPath(finding.file);
    if (excludedSet.has(normalizedFile)) {
      errors.push(`${findingsPath}:${String(lineNo)}: Finding references excluded file ${normalizedFile} (id ${finding.id}).`);
      continue;
    }
    const key = `${normalizedFile}::${String(finding.regionNum)}`;
    if (!registryKey.has(key)) {
      errors.push(
        `${findingsPath}:${String(lineNo)}: Finding references unknown registry region ${key} (id ${finding.id}).`,
      );
    }
  }
}

function groupRegistry(registry: RegionRegistry): Map<string, typeof registry.regions> {
  const map = new Map<string, typeof registry.regions>();
  for (const row of registry.regions) {
    const key = normalizeRepoPath(row.file);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

function normalizeRepoPath(input: string): string {
  return normalizeRepoRelPath(input);
}

function readFileUtf8(absPath: string, errors: string[]): string | null {
  try {
    return fs.readFileSync(absPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Failed to read ${absPath}: ${message}`);
    return null;
  }
}

function readJson<T>(absPath: string, schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: { message: string } } }, errors: string[]): T | null {
  if (!fs.existsSync(absPath)) {
    errors.push(`Missing required file: ${absPath}`);
    return null;
  }
  const text = readFileUtf8(absPath, errors);
  if (text === null) {
    return null;
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${absPath}: invalid JSON: ${message}`);
    return null;
  }
  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    errors.push(`${absPath}: ${parsed.error.message}`);
    return null;
  }
  return parsed.data;
}

/**
 * Exposes default relative paths for CLI wiring.
 */
export const defaultArtifactPaths = {
  excludedRel: DEFAULT_EXCLUDED_REL,
  registryRel: DEFAULT_REGISTRY_REL,
  findingsRel: DEFAULT_FINDINGS_REL,
} as const;
