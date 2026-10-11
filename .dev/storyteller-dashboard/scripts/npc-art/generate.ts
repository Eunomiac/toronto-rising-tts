import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadGenericNpcCatalog } from "../../src/server/genericNpcCatalog.ts";
import { isEmptyNpcOverride, NPC_OVERRIDE_KEY_PATTERN, parseNpcOverride, type NpcOverride } from "../../src/shared/npcOverride.ts";
import { drawToken, loadFont, type DrawAssets } from "./draw.ts";
import { syncSaveFigurineAssets } from "./save-assets.ts";
import {
  buildSubject,
  discrepancyReport,
  fingerprint,
  renderLuaModule,
  renderOverridesLuaModule,
  type HeadCrop,
  type NamedCatalogEntry,
  type NameSources,
  type NpcArtLinks,
  type NpcArtSubject,
  type NpcFolder,
  type Roster
} from "./model.ts";

/**
 * npm run npc-art:generate — publishes every NPC's art for TTS. One figurine file per NPC under
 * assets/images/NPCs/{Catalogued,Generic,Memoriam}; each figurine whose key is in its folder's catalog gets a
 * spotlight token (both sides) in assets/images/NPCs/Tokens and GitHub links in lib/npc_art_urls.ttslua (generic rows
 * also carry their default label from data/generic-npcs.json, which is how TTS learns the generic catalog). The TTS
 * save's roll-banner rows (CustomUIAssets named after each PC, named NPC and Memoriam key) are synced to those links,
 * and rows for removed art are dropped. Figurines in no catalog get nothing; they and catalogued NPCs without a
 * figurine are listed in .dev/build-logs/npc-art-discrepancies.txt (printed at the end of the Full build).
 * data/npc-overrides.json (the roster's token configuration window) renames and recolours tokens, and its TTS fields
 * are written to lib/npc_overrides.ttslua (bundled by Save & Play, not hosted).
 * Tokens whose inputs are unchanged are skipped. Pass --force to redraw every token.
 */

const scriptDir = import.meta.dirname;
const dashboardDir = path.resolve(scriptDir, "..", "..");
const repoRoot = path.resolve(dashboardDir, "..", "..");
const npcImageDir = path.join(repoRoot, "assets", "images", "NPCs");
const tokenDir = path.join(npcImageDir, "Tokens");
const manifestPath = path.join(tokenDir, "tokens.json");
const luaPath = path.join(repoRoot, "lib", "npc_art_urls.ttslua");
const overridesLuaPath = path.join(repoRoot, "lib", "npc_overrides.ttslua");
const discrepancyPath = path.join(repoRoot, ".dev", "build-logs", "npc-art-discrepancies.txt");
const dataDir = path.join(dashboardDir, "data");
const FOLDERS: readonly NpcFolder[] = ["Catalogued", "Generic", "Memoriam"];
const FIGURINE_BACK = "Shared/figurineBack.webp";
const BASE_URL = "https://raw.githubusercontent.com/Eunomiac/toronto-rising-tts/master/assets/images/NPCs/";
const GENERATED_BY = ".dev/storyteller-dashboard/scripts/npc-art/generate.ts (npm run npc-art:generate)";
const KEY_PATTERN = /^[A-Za-z0-9_]+$/;
const CONCURRENCY = 4;

type Manifest = { readonly generatedBy: string; readonly tokens: Record<string, string> };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = async (file: string): Promise<unknown> => JSON.parse(await readFile(file, "utf8")) as unknown;

const readOptionalJson = async (file: string, what: string): Promise<unknown> => {
  if (!existsSync(file)) {
    console.warn(`[npc-art] ${path.relative(repoRoot, file)} not found; ${what}.`);
    return undefined;
  }
  return readJson(file);
};

const luaUnescape = (value: string): string => JSON.parse(`"${value}"`) as string;

const readNamedCatalog = async (): Promise<Map<string, NamedCatalogEntry>> => {
  const file = path.join(dataDir, "scene-catalogs.json");
  if (!existsSync(file)) {
    throw new Error(`${path.relative(repoRoot, file)} is missing. Run npm run dashboard:scene-catalogs first.`);
  }
  const catalogs = await readJson(file);
  if (!isRecord(catalogs) || !Array.isArray(catalogs.namedNpcs) || !Array.isArray(catalogs.pcs)) {
    throw new Error("scene-catalogs.json has no namedNpcs / pcs lists. Regenerate it with npm run dashboard:scene-catalogs.");
  }
  const named = new Map<string, NamedCatalogEntry>();
  for (const row of [...catalogs.pcs, ...catalogs.namedNpcs] as unknown[]) {
    if (isRecord(row) && typeof row.characterKey === "string" && typeof row.fullName === "string") {
      const pickerGroups = Array.isArray(row.pickerGroups) ? row.pickerGroups.filter((group): group is string => typeof group === "string") : [];
      named.set(row.characterKey, { characterKey: row.characterKey, fullName: row.fullName, pickerGroups });
    }
  }
  return named;
};

const readGenericLabels = async (): Promise<Map<string, string>> => {
  const { npcs } = await loadGenericNpcCatalog(path.join(dataDir, "generic-npcs.json"));
  if (npcs.length === 0) {
    throw new Error("data/generic-npcs.json lists no generic NPCs. Run npm run generic-npcs:import.");
  }
  return new Map(npcs.map((npc) => [npc.key, npc.label]));
};

const readMemoriamNames = async (): Promise<Map<string, string>> => {
  const source = await readFile(path.join(repoRoot, "lib", "skyboxes_catalog.ttslua"), "utf8");
  const names = new Map<string, string>();
  for (const match of source.matchAll(/name = "(mem_[^"]+)",\s*fullName = "((?:[^"\\]|\\.)*)"/g)) {
    names.set(match[1]!, luaUnescape(match[2]!));
  }
  return names;
};

const readRoster = async (): Promise<Roster> => {
  const deck = await readOptionalJson(path.join(dataDir, "scene-deck.json"), "every token ring uses the default colour");
  const roster = isRecord(deck) && isRecord(deck.roster) ? deck.roster : {};
  const strings = (value: unknown): Record<string, string> =>
    isRecord(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
  const categories = Array.isArray(roster.categories)
    ? roster.categories.flatMap((row) => (isRecord(row) && typeof row.id === "string" && typeof row.color === "string" ? [{ id: row.id, color: row.color }] : []))
    : [];
  return { categories, assigned: strings(roster.assigned), groupColors: strings(roster.groupColors) };
};

const readCrops = async (): Promise<Record<string, HeadCrop>> => {
  const file = await readOptionalJson(path.join(dataDir, "headshot-crops.json"), "every token uses the automatic head crop");
  const crops: Record<string, HeadCrop> = {};
  if (isRecord(file) && isRecord(file.crops)) {
    for (const [key, crop] of Object.entries(file.crops)) {
      if (isRecord(crop) && typeof crop.cx === "number" && typeof crop.cy === "number" && typeof crop.size === "number") {
        crops[key] = { cx: crop.cx, cy: crop.cy, size: crop.size };
      }
    }
  }
  return crops;
};

const readOverrides = async (): Promise<Record<string, NpcOverride>> => {
  const file = await readOptionalJson(path.join(dataDir, "npc-overrides.json"), "no NPC has a name, colour, card scale or seated height override");
  const overrides: Record<string, NpcOverride> = {};
  if (isRecord(file) && isRecord(file.overrides)) {
    for (const [key, value] of Object.entries(file.overrides)) {
      const override = parseNpcOverride(value);
      if (!NPC_OVERRIDE_KEY_PATTERN.test(key) || typeof override === "string") {
        throw new Error(`data/npc-overrides.json: bad override for "${key}": ${typeof override === "string" ? override : "invalid key"}`);
      }
      if (!isEmptyNpcOverride(override)) {
        overrides[key] = override;
      }
    }
  }
  return overrides;
};

const readManifest = async (): Promise<Manifest> => {
  if (!existsSync(manifestPath)) {
    return { generatedBy: GENERATED_BY, tokens: {} };
  }
  const file = await readJson(manifestPath);
  const tokens: Record<string, string> = {};
  if (isRecord(file) && isRecord(file.tokens)) {
    for (const [key, hash] of Object.entries(file.tokens)) {
      if (typeof hash === "string") {
        tokens[key] = hash;
      }
    }
  }
  return { generatedBy: GENERATED_BY, tokens };
};

const listFigurines = async (folder: NpcFolder): Promise<string[]> =>
  (await readdir(path.join(npcImageDir, folder)))
    .filter((file) => file.toLowerCase().endsWith(".webp"))
    .map((file) => file.slice(0, -".webp".length))
    .sort();

const runPool = async <T>(items: readonly T[], worker: (item: T) => Promise<void>): Promise<void> => {
  let next = 0;
  const lanes = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next]!;
      next += 1;
      await worker(item);
    }
  });
  await Promise.all(lanes);
};

const git = (args: readonly string[]): string => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });

const ART_PATHS = ["assets/images/NPCs", "lib/npc_art_urls.ttslua"] as const;

/** TTS loads this art from GitHub master, so anything uncommitted or unpushed is invisible in game. */
const warnIfNotPublished = (): void => {
  const dirty = git(["status", "--porcelain", "--", ...ART_PATHS]).trim();
  if (dirty !== "") {
    console.warn(
      "[npc-art] NPC art changed and is not committed yet. TTS loads NPC art from GitHub, so commit and push " +
        "before the next session (git add assets/images/NPCs lib/npc_art_urls.ttslua)."
    );
    return;
  }
  try {
    const unpushed = git(["diff", "--name-only", "origin/master", "HEAD", "--", ...ART_PATHS]).trim();
    if (unpushed !== "") {
      console.warn("[npc-art] NPC art is committed but not pushed to origin/master. Push before the next session so TTS can load it.");
    }
  } catch (error) {
    console.warn(`[npc-art] Could not compare against origin/master: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const main = async (): Promise<void> => {
  const force = process.argv.includes("--force");
  const [named, genericLabels, memoriamNames, roster, crops, overrides, manifest] = await Promise.all([
    readNamedCatalog(),
    readGenericLabels(),
    readMemoriamNames(),
    readRoster(),
    readCrops(),
    readOverrides(),
    readManifest()
  ]);
  const sources: NameSources = { named, genericLabels, memoriamNames };

  const backPath = path.join(npcImageDir, FIGURINE_BACK);
  if (!existsSync(backPath)) {
    throw new Error(`Shared figurine back ${path.relative(repoRoot, backPath)} is missing.`);
  }
  const templateDir = path.join(npcImageDir, "Token Template");
  const [ringLit, ringDark, fontBytes, backBytes, drawSource, modelSource] = await Promise.all([
    readFile(path.join(templateDir, "ring-lit.svg"), "utf8"),
    readFile(path.join(templateDir, "ring-dark.svg"), "utf8"),
    readFile(path.join(dashboardDir, "assets", "fonts", "BebasNeue", "BebasNeue Regular.ttf")),
    readFile(backPath),
    readFile(path.join(scriptDir, "draw.ts")),
    readFile(path.join(scriptDir, "model.ts"))
  ]);
  const assets: DrawAssets = { ...loadFont(fontBytes), ringLit, ringDark };
  const styleHash = fingerprint(ringLit, ringDark, fontBytes, drawSource, modelSource);

  const subjects: NpcArtSubject[] = [];
  const uncatalogued: string[] = [];
  const seen = new Map<string, NpcFolder>();
  for (const folder of FOLDERS) {
    for (const key of await listFigurines(folder)) {
      if (!KEY_PATTERN.test(key)) {
        throw new Error(`NPCs/${folder}/${key}.webp: file names must be the NPC key (letters, digits, underscores).`);
      }
      const other = seen.get(key);
      if (other) {
        throw new Error(`NPC key "${key}" has a figurine in both ${other}/ and ${folder}/.`);
      }
      seen.set(key, folder);
      const subject = buildSubject(folder, key, sources, roster, crops, overrides);
      if (subject === null) {
        uncatalogued.push(`${folder}/${key}`);
      } else {
        subjects.push(subject);
      }
    }
  }

  await mkdir(tokenDir, { recursive: true });
  const links = new Map<string, NpcArtLinks>();
  const nextTokens: Record<string, string> = {};
  let drawn = 0;
  const autoCropped: string[] = [];
  await runPool(subjects, async (subject) => {
    const figurine = await readFile(path.join(npcImageDir, subject.folder, `${subject.key}.webp`));
    const figurineHash = fingerprint(figurine);
    const tokenHash = fingerprint(styleHash, figurineHash, subject.name, subject.color, JSON.stringify(subject.manualCrop));
    const frontFile = path.join(tokenDir, `${subject.key}.front.webp`);
    const backFile = path.join(tokenDir, `${subject.key}.back.webp`);
    const current = !force && manifest.tokens[subject.key] === tokenHash && existsSync(frontFile) && existsSync(backFile);
    if (!current) {
      const token = await drawToken(figurine, subject.name, subject.color, subject.manualCrop, assets).catch((error: unknown) => {
        throw new Error(`Drawing the token for ${subject.folder}/${subject.key} failed: ${error instanceof Error ? error.message : String(error)}`);
      });
      await Promise.all([writeFile(frontFile, token.front), writeFile(backFile, token.back)]);
      drawn += 1;
      if (token.autoCrop) {
        autoCropped.push(subject.key);
      }
    }
    nextTokens[subject.key] = tokenHash;
    // Links are versioned by the finished images, so a redraw that produces identical bytes keeps every link.
    const [front, back] = await Promise.all([readFile(frontFile), readFile(backFile)]);
    const tokenVersion = fingerprint(front, back);
    links.set(subject.key, {
      figurineFront: `${subject.folder}/${subject.key}.webp?v=${figurineHash}`,
      tokenFront: `Tokens/${subject.key}.front.webp?v=${tokenVersion}`,
      tokenBack: `Tokens/${subject.key}.back.webp?v=${tokenVersion}`,
      ...(subject.folder === "Generic" ? { genericLabel: genericLabels.get(subject.key)! } : {})
    });
  });

  let pruned = 0;
  for (const file of await readdir(tokenDir)) {
    const match = /^(.+)\.(front|back)\.webp$/.exec(file);
    if (match && !links.has(match[1]!)) {
      await rm(path.join(tokenDir, file));
      pruned += 1;
    }
  }

  const sortedTokens = Object.fromEntries(Object.entries(nextTokens).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(manifestPath, `${JSON.stringify({ generatedBy: GENERATED_BY, tokens: sortedTokens }, null, 2)}\n`);
  await writeFile(luaPath, renderLuaModule(BASE_URL, `${FIGURINE_BACK}?v=${fingerprint(backBytes)}`, links, GENERATED_BY));
  await writeFile(overridesLuaPath, renderOverridesLuaModule(overrides, GENERATED_BY));

  console.log(
    `[npc-art] ${subjects.length} NPCs: ${drawn} token(s) drawn, ${subjects.length - drawn} unchanged, ${pruned} stale token file(s) removed.`
  );
  if (autoCropped.length > 0) {
    console.log(`[npc-art] ${autoCropped.length} drawn token(s) used the automatic head crop (set a crop in the dashboard to override).`);
  }

  const bannerFigurines = new Map(
    subjects.filter((subject) => subject.folder !== "Generic").map((subject) => [subject.key, BASE_URL + links.get(subject.key)!.figurineFront])
  );
  const characterKeys = new Set([...named.keys(), ...genericLabels.keys(), ...memoriamNames.keys()]);
  const { saveFile, plan } = await syncSaveFigurineAssets(repoRoot, bannerFigurines, characterKeys, BASE_URL);
  console.log(
    `[npc-art] ${path.basename(saveFile)} roll-banner figurines: ${plan.added.length} added, ${plan.updated.length} updated, ` +
      `${plan.removed.length} removed${plan.removed.length > 0 ? ` (${plan.removed.join(", ")})` : ""}.`
  );

  const report = discrepancyReport(
    uncatalogued,
    FOLDERS.flatMap((folder) => {
      const keys = folder === "Catalogued" ? named.keys() : folder === "Generic" ? genericLabels.keys() : memoriamNames.keys();
      const missing = [...keys].filter((key) => !links.has(key)).sort();
      return missing.length > 0 ? [`${folder}: ${missing.join(", ")}`] : [];
    })
  );
  await mkdir(path.dirname(discrepancyPath), { recursive: true });
  await writeFile(discrepancyPath, report);
  console.warn(report.trimEnd());
  warnIfNotPublished();
};

await main();
