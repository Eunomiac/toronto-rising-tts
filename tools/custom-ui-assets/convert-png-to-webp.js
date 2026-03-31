#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

/**
 * Parse CLI args of shape: --key value
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for argument "${token}"`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

/**
 * Convert one PNG file into WEBP using ffmpeg.
 * Uses lossless WEBP to preserve alpha quality.
 * @param {string} absolutePngPath
 * @param {string} absoluteWebpPath
 */
function convertPngToWebp(absolutePngPath, absoluteWebpPath) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      absolutePngPath,
      "-c:v",
      "libwebp",
      "-lossless",
      "1",
      "-compression_level",
      "6",
      "-preset",
      "picture",
      absoluteWebpPath,
    ],
    { stdio: "pipe" },
  );

  if (result.error) {
    throw new Error(
      `Failed to run ffmpeg. Ensure ffmpeg is installed and available on PATH. ${String(result.error.message || result.error)}`,
    );
  }
  if (result.status !== 0) {
    const stderrText = String(result.stderr || "").trim();
    throw new Error(
      `ffmpeg conversion failed for "${absolutePngPath}" (${result.status}). ${stderrText.length > 0 ? stderrText : "No stderr output."}`,
    );
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = args.input;
  if (!inputDir) {
    throw new Error("Required argument missing: --input <directory>");
  }

  const absoluteInputDir = path.resolve(inputDir);
  if (!fs.existsSync(absoluteInputDir) || !fs.statSync(absoluteInputDir).isDirectory()) {
    throw new Error(`Input directory does not exist: ${absoluteInputDir}`);
  }

  const dirEntries = fs.readdirSync(absoluteInputDir, { withFileTypes: true });
  const pngFiles = dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => path.extname(fileName).toLowerCase() === ".png")
    .sort((a, b) => a.localeCompare(b, "en"));

  if (pngFiles.length === 0) {
    console.log(`No PNG files found in: ${absoluteInputDir}`);
    return;
  }

  let convertedCount = 0;
  for (const pngFileName of pngFiles) {
    const parsed = path.parse(pngFileName);
    const webpFileName = `${parsed.name}.webp`;
    const absolutePngPath = path.resolve(absoluteInputDir, pngFileName);
    const absoluteWebpPath = path.resolve(absoluteInputDir, webpFileName);

    convertPngToWebp(absolutePngPath, absoluteWebpPath);
    fs.unlinkSync(absolutePngPath);
    convertedCount += 1;
    console.log(`Converted and removed: ${pngFileName} -> ${webpFileName}`);
  }

  console.log(`PNG -> WEBP complete. Converted: ${convertedCount}`);
}

main();
