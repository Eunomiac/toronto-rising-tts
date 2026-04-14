import fs from "node:fs";
import path from "node:path";

const PRODUCTION_DIRS = ["core", "lib", "ui"] as const;

/**
 * Normalizes Windows paths to forward slashes for registry and exclusion lists.
 */
export function toRepoPath(absolutePath: string, repoRoot: string): string {
  const rel = path.relative(repoRoot, absolutePath);
  return normalizeRepoRelPath(rel);
}

/**
 * Normalizes a repo-relative path string to forward slashes without leading slashes.
 */
export function normalizeRepoRelPath(input: string): string {
  return input.split("\\").join("/").replace(/^\/+/, "");
}

/**
 * Lists every `.ttslua` file under production directories.
 */
export function listProductionTtsluaFiles(repoRoot: string): string[] {
  const results: string[] = [];
  for (const dir of PRODUCTION_DIRS) {
    const base = path.join(repoRoot, dir);
    if (!fs.existsSync(base)) {
      continue;
    }
    walkTtslua(base, repoRoot, results);
  }
  return results.sort((a, b) => a.localeCompare(b));
}

function walkTtslua(dir: string, repoRoot: string, out: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTtslua(full, repoRoot, out);
    } else if (entry.isFile() && entry.name.endsWith(".ttslua")) {
      out.push(toRepoPath(full, repoRoot));
    }
  }
}
