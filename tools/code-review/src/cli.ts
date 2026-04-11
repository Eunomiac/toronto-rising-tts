#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { appendFinding, upsertRegionMetadata } from "./mergeRegistry.js";
import { validateProject } from "./validateProject.js";

type Args = Record<string, string>;

function logError(message: string): void {
  process.stderr.write(`${message}\n`);
}

/**
 * Parses `--key value` pairs from argv; flags without values become empty strings.
 */
function parseArgs(argv: string[]): { positional: string[]; flags: Args } {
  const flags: Args = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? "";
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = "";
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return { positional, flags };
}

function findRepoRoot(startDir: string): string {
  let current = startDir;
  for (;;) {
    const marker = path.join(current, "package.json");
    if (fs.existsSync(marker)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Could not locate repository root (missing package.json).");
    }
    current = parent;
  }
}

function printHelp(): void {
  process.stdout.write(`code-review CLI

Usage:
  node tools/code-review/dist/cli.js validate [--repo <dir>]
  node tools/code-review/dist/cli.js upsert-region --file <repoRel> --region-num <n> [--classification s] [--description s] [--notes s] [--repo <dir>]
  node tools/code-review/dist/cli.js add-finding --file <repoRel> --region-num <n> --agent <s> --category <s> --message <s> [--id <uuid>] [--created-at <iso>] [--repo <dir>]

Defaults:
  --repo defaults to the nearest parent directory containing package.json
`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help" || argv[0] === "-h") {
    printHelp();
    process.exit(0);
  }

  const command = argv[0];
  const { flags } = parseArgs(argv.slice(1));
  const repoFlag = flags.repo;
  const repoRoot = repoFlag && repoFlag.length > 0 ? path.resolve(repoFlag) : findRepoRoot(process.cwd());

  if (command === "validate") {
    const errors = validateProject({ repoRoot });
    if (errors.length > 0) {
      for (const line of errors) {
        logError(line);
      }
      process.exit(1);
    }
    process.exit(0);
  }

  if (command === "upsert-region") {
    const file = flags.file;
    const regionNumRaw = flags["region-num"];
    if (!file || !regionNumRaw) {
      logError("upsert-region requires --file and --region-num");
      process.exit(2);
    }
    const regionNum = Number(regionNumRaw);
    if (!Number.isInteger(regionNum) || regionNum <= 0) {
      logError("--region-num must be a positive integer");
      process.exit(2);
    }
    const errors = upsertRegionMetadata({
      repoRoot,
      file,
      regionNum,
      classification: flags.classification,
      description: flags.description,
      notes: flags.notes,
    });
    if (errors.length > 0) {
      for (const line of errors) {
        logError(line);
      }
      process.exit(1);
    }
    process.exit(0);
  }

  if (command === "add-finding") {
    const file = flags.file;
    const regionNumRaw = flags["region-num"];
    const agent = flags.agent;
    const category = flags.category;
    const message = flags.message;
    if (!file || !regionNumRaw || !agent || !category || !message) {
      logError("add-finding requires --file --region-num --agent --category --message");
      process.exit(2);
    }
    const regionNum = Number(regionNumRaw);
    if (!Number.isInteger(regionNum) || regionNum <= 0) {
      logError("--region-num must be a positive integer");
      process.exit(2);
    }
    const errors = appendFinding({
      repoRoot,
      file,
      regionNum,
      agent,
      category,
      message,
      id: flags.id,
      createdAt: flags["created-at"],
    });
    if (errors.length > 0) {
      for (const line of errors) {
        logError(line);
      }
      process.exit(1);
    }
    process.exit(0);
  }

  logError(`Unknown command: ${command}`);
  printHelp();
  process.exit(2);
}

main();
