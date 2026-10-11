import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCompulsionText,
  missingCards,
  parseCompulsionText,
  parseMapping,
  parseReferenceIndex,
  parseTextLayers,
  placeholderCompulsionText,
  type CompulsionTextFile
} from "../src/shared/compulsionText.ts";

/**
 * npm run compulsion-text — the seat badges' Compulsion text (data/compulsion-text.json, git-ignored).
 *   no arguments: writes placeholder text when the file is missing, else reports what it holds.
 *   <dump.json> <mapping.txt> [reference-index.txt]: imports the Photoshop dump (.tools/photoshop/dump-text-layers.jsx)
 *   through the mapping (one line per card: `<card> <influence layer> <burden layer> <catharsis layer>`, the card a
 *   reference deck number or `<Compulsion>:<N>`). The reference index defaults to the file written by
 *   `DEBUG.buildCompulsionReferenceDeck()`.
 */

const dashboardDir = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(dashboardDir, "..", "..");
const outputPath = path.join(dashboardDir, "data", "compulsion-text.json");
const defaultReferencePath = path.join(repoRoot, ".dev", ".debug", "compulsion-reference-index.txt");

const report = (file: CompulsionTextFile): void => {
  const missing = missingCards(file);
  console.log(`${outputPath}: ${Object.keys(file.entries).length} cards${file.placeholder ? " (placeholder text)" : ""}.`);
  if (missing.length > 0) {
    console.warn(`No text for ${missing.length} cards: ${missing.join(", ")}`);
  }
};

const write = async (file: CompulsionTextFile): Promise<void> => {
  await writeFile(outputPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  report(file);
};

const [dumpPath, mappingPath, referencePath = defaultReferencePath] = process.argv.slice(2);

if (dumpPath === undefined) {
  if (existsSync(outputPath)) {
    report(parseCompulsionText(JSON.parse(await readFile(outputPath, "utf8")) as unknown));
  } else {
    await write(placeholderCompulsionText());
  }
} else {
  if (mappingPath === undefined) {
    throw new Error("Usage: npm run compulsion-text -- <dump.json> <mapping.txt> [reference-index.txt]");
  }
  const layers = parseTextLayers(JSON.parse(await readFile(dumpPath, "utf8")) as unknown);
  const reference = parseReferenceIndex(existsSync(referencePath) ? await readFile(referencePath, "utf8") : "");
  await write(buildCompulsionText(parseMapping(await readFile(mappingPath, "utf8"), reference), layers));
}
