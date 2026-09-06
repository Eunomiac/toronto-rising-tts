#!/usr/bin/env node
"use strict";

/**
 * Recursively find image files, strip a trailing `_` + digits suffix, then
 * renumber each name-group from 01.
 *
 * Example:
 *   civilianTeenGirl_03.png, _04, _07, _08
 *     → civilianTeenGirl_01.png … _04.png
 *
 * Dry-run by default. Pass --apply to rename.
 *
 * Usage:
 *   node .dev/scripts/renumber-image-suffixes.js --input "D:\\path\\to\\images"
 *   node .dev/scripts/renumber-image-suffixes.js --input "D:\\path\\to\\images" --apply
 *   node .dev/scripts/renumber-image-suffixes.js --input "D:\\path\\to\\images" --per-folder
 */

const fs = require("fs");
const path = require("path");

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".avif",
]);

const SUFFIX_PATTERN = /^(.+)_(\d+)$/;

function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--apply") {
      args.apply = true;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--per-folder") {
      args.perFolder = true;
      continue;
    }
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for argument "${token}"`);
      }
      args[key] = value;
      i += 1;
      continue;
    }
    args.positional.push(token);
  }
  return args;
}

function usage() {
  return [
    "Renumber image files by stripping a trailing _digits suffix, then counting from 01.",
    "",
    "Usage:",
    "  node .dev/scripts/renumber-image-suffixes.js --input <folder>",
    "  node .dev/scripts/renumber-image-suffixes.js --input <folder> --apply",
    "  node .dev/scripts/renumber-image-suffixes.js --input <folder> --per-folder",
    "",
    "Options:",
    "  --input <folder>   Root folder to scan (required; a trailing path also works)",
    "  --apply            Perform the renames (default is a dry run)",
    "  --dry-run          Force a dry run even if --apply is also passed",
    "  --per-folder       Number each folder separately instead of one sequence per name",
    "  --help             Show this help",
    "",
    "Files keep their original folders and extensions. Only names matching",
    "something_01.png (underscore + digits before the extension) are renamed.",
  ].join("\n");
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function parseNumberedImageName(fileName) {
  const extension = path.extname(fileName);
  const stem = fileName.slice(0, fileName.length - extension.length);
  const match = stem.match(SUFFIX_PATTERN);
  if (!match) {
    return null;
  }
  return {
    baseName: match[1],
    number: Number(match[2]),
    extension,
  };
}

function collectImageFiles(rootDir) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      if (entry.name === "." || entry.name === ".." || entry.name.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !isImageFile(entry.name)) {
        continue;
      }
      const parsed = parseNumberedImageName(entry.name);
      if (!parsed) {
        continue;
      }
      results.push({
        fullPath,
        relativePath: path.relative(rootDir, fullPath),
        dir: currentDir,
        fileName: entry.name,
        baseName: parsed.baseName,
        number: parsed.number,
        extension: parsed.extension,
      });
    }
  }

  walk(rootDir);
  return results;
}

function padWidthForCount(count) {
  return Math.max(2, String(count).length);
}

function formatPaddedNumber(index, padWidth) {
  return String(index).padStart(padWidth, "0");
}

function groupKey(file, perFolder) {
  const extensionKey = file.extension.toLowerCase();
  if (perFolder) {
    return `${file.dir.toLowerCase()}|${file.baseName}|${extensionKey}`;
  }
  return `${file.baseName}|${extensionKey}`;
}

function compareFiles(a, b) {
  if (a.number !== b.number) {
    return a.number - b.number;
  }
  return a.relativePath.localeCompare(b.relativePath, "en");
}

function planRenames(files, options) {
  const perFolder = Boolean(options && options.perFolder);
  const groups = new Map();

  for (const file of files) {
    const key = groupKey(file, perFolder);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(file);
  }

  const planned = [];
  const groupNames = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, "en"));

  for (const key of groupNames) {
    const group = groups.get(key).slice().sort(compareFiles);
    const padWidth = padWidthForCount(group.length);
    group.forEach((file, index) => {
      const nextNumber = formatPaddedNumber(index + 1, padWidth);
      const nextFileName = `${file.baseName}_${nextNumber}${file.extension}`;
      const nextFullPath = path.join(file.dir, nextFileName);
      planned.push({
        fromPath: file.fullPath,
        toPath: nextFullPath,
        fromRelative: file.relativePath,
        toRelative: path.join(path.dirname(file.relativePath), nextFileName),
        baseName: file.baseName,
        skipped: pathsEqual(file.fullPath, nextFullPath),
      });
    });
  }

  return planned;
}

function pathsEqual(a, b) {
  const left = path.normalize(a);
  const right = path.normalize(b);
  if (process.platform === "win32") {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}

function assertNoCollisions(planned) {
  const reserved = new Map();
  for (const item of planned) {
    const key = process.platform === "win32" ? item.toPath.toLowerCase() : item.toPath;
    if (reserved.has(key) && !pathsEqual(reserved.get(key), item.fromPath)) {
      throw new Error(
        `Two files would both become "${item.toRelative}". Refusing to rename.`,
      );
    }
    reserved.set(key, item.fromPath);
  }

  for (const item of planned) {
    if (item.skipped) {
      continue;
    }
    if (!fs.existsSync(item.toPath)) {
      continue;
    }
    const occupiedByPlannedSource = planned.some((other) => pathsEqual(other.fromPath, item.toPath));
    if (!occupiedByPlannedSource) {
      throw new Error(
        `Cannot rename "${item.fromRelative}" to "${item.toRelative}" because that name is already used by a file this script is not renaming.`,
      );
    }
  }
}

function applyRenames(planned) {
  const toMove = planned.filter((item) => !item.skipped);
  const temps = toMove.map((item, index) => {
    const tempName = `.__renumber_tmp_${index}_${path.basename(item.fromPath)}`;
    return {
      ...item,
      tempPath: path.join(path.dirname(item.fromPath), tempName),
    };
  });

  for (const item of temps) {
    fs.renameSync(item.fromPath, item.tempPath);
  }
  for (const item of temps) {
    fs.renameSync(item.tempPath, item.toPath);
  }
}

function printPlan(planned, applying) {
  const changes = planned.filter((item) => !item.skipped);
  const unchanged = planned.length - changes.length;

  if (planned.length === 0) {
    console.log("No numbered image files found (name_01.png and similar).");
    return;
  }

  if (changes.length === 0) {
    console.log(`All ${planned.length} numbered image file(s) already use a compact 01, 02, 03… sequence.`);
    return;
  }

  console.log(applying ? "Renaming:" : "Dry run (pass --apply to rename):");
  for (const item of changes) {
    console.log(`  ${item.fromRelative}  →  ${item.toRelative}`);
  }
  if (unchanged > 0) {
    console.log(`Unchanged: ${unchanged} file(s) already had the target name.`);
  }
  console.log(`${applying ? "Renamed" : "Would rename"} ${changes.length} file(s).`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const inputDir = args.input || args.positional[0];
  if (!inputDir) {
    throw new Error(`Required argument missing: --input <folder>\n\n${usage()}`);
  }

  const absoluteInputDir = path.resolve(inputDir);
  if (!fs.existsSync(absoluteInputDir) || !fs.statSync(absoluteInputDir).isDirectory()) {
    throw new Error(`Not a folder: "${absoluteInputDir}"`);
  }

  const files = collectImageFiles(absoluteInputDir);
  const planned = planRenames(files, { perFolder: Boolean(args.perFolder) });
  assertNoCollisions(planned);

  const applying = Boolean(args.apply) && !args.dryRun;
  printPlan(planned, applying);
  if (applying) {
    applyRenames(planned);
  }
}

module.exports = {
  IMAGE_EXTENSIONS,
  parseNumberedImageName,
  collectImageFiles,
  planRenames,
  padWidthForCount,
  formatPaddedNumber,
  applyRenames,
  assertNoCollisions,
  parseArgs,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error && error.message ? error.message : error);
    process.exitCode = 1;
  }
}
