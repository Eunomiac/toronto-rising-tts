#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { loadCloudConfig, REPO_ROOT } = require("../../tts-cloud/lib/cloud_config.js");
const { loadLedger } = require("../../tts-cloud/lib/assets_tree.js");
const { backupSaveBeforeWrite, findExistingConfig } = require("../../custom-ui-assets/lib/tts-assets-config.js");
const { writeAtomic } = require("../../custom-ui-assets/lib/custom-ui-assets-save.js");

const FOLDER = "Deck of Complications";
const JOB = "complicationsDeckSheets";
const SETTINGS = path.join(__dirname, "settings");
const MANIFEST = path.join(REPO_ROOT, "lib/json/cloud-assets.json");
const RARITIES = [["Very Common", 12], ["Common", 6], ["Uncommon", 3], ["Rare", 1]];
const DECKS = [
  { style: "Standard", guid: "11e747", tags: ["deckOfComplications"] },
  { style: "Enhanced", guid: "2d57f2", tags: ["deckOfComplications", "enhancedComplication"] },
];
// Stored on the deck, so TTS round trips and copied saves retain the build stamp.
// Never use card order/count as a rebuild trigger: playing changes those normally.
const STAMP = /\n?\[complications-deck-build:v1:[a-f0-9]{64}\]/g;
const hash = (bytes, algorithm = "sha256") => crypto.createHash(algorithm).update(bytes).digest("hex");
const clone = (value) => JSON.parse(JSON.stringify(value));

function parseSettings(text, basename) {
  const lines = text.replace(/\r\n/g, "\n").trimEnd().split("\n");
  const field = (name) => {
    const matches = lines.filter((line) => line.startsWith(`${name}: `));
    if (matches.length !== 1) throw new Error(`${basename}: expected one ${name} field.`);
    return matches[0].slice(name.length + 2);
  };
  const number = (name) => {
    const value = field(name);
    if (!/^[1-9]\d*$/.test(value)) throw new Error(`${basename}: invalid ${name}.`);
    return Number(value);
  };
  const width = number("Width"), height = number("Height"), count = number("Number");
  if (width < 2 || width > 10 || height < 2 || height > 7 || count >= width * height) {
    throw new Error(`${basename}: invalid grid or reserved bottom-right cell is occupied.`);
  }
  if (field("Face") !== `${basename}.png` || field("Unique Backs") !== "OFF" || field("Back is Hidden") !== "ON") {
    throw new Error(`${basename}: unexpected face image or back settings.`);
  }
  const sheet = field("Sheet").match(/^(\d+) x (\d+) pixels \(RGB PNG\)$/);
  const cell = field("Card cell").match(/^(\d+) x (\d+) pixels$/);
  if (!sheet || !cell || Number(cell[1]) < 1 || Number(cell[2]) < 1 ||
      Number(sheet[1]) !== width * Number(cell[1]) || Number(sheet[2]) !== height * Number(cell[2])) {
    throw new Error(`${basename}: sheet and cell dimensions disagree with the grid.`);
  }
  const start = lines.indexOf("Card order (left to right, then top to bottom):");
  if (start < 0) throw new Error(`${basename}: missing card order.`);
  const cards = lines.slice(start + 1).filter((line) => line.trim()).map((line, slot) => {
    const match = line.match(/^(\d+): (\d+) (.+)\.webp$/);
    if (!match || Number(match[1]) !== slot + 1 || !Number.isSafeInteger(Number(match[2])) || Number(match[2]) < 1 || match[3].includes(":")) {
      throw new Error(`${basename}: invalid card order entry ${line}.`);
    }
    return { index: Number(match[2]), name: match[3] };
  });
  if (cards.length !== count || new Set(cards.map((c) => c.index)).size !== count) {
    throw new Error(`${basename}: card count or identities disagree with the list.`);
  }
  return { width, height, count, pixelWidth: Number(sheet[1]), pixelHeight: Number(sheet[2]), cards };
}

function readInputs(assetsDir, settingsDir) {
  const sheets = [];
  for (const [rarity, copies] of RARITIES) {
    for (const { style } of DECKS) {
      const basename = `${rarity}-${style}`;
      const settingsText = fs.readFileSync(path.join(settingsDir, `${basename}-settings.txt`), "utf8");
      const settings = parseSettings(settingsText, basename);
      const filename = `complicationsDeck_${basename}.png`;
      const imagePath = path.join(assetsDir, FOLDER, filename);
      if (!fs.existsSync(imagePath)) throw new Error(`Missing ${imagePath}. Install the deck sheet images before building.`);
      const image = fs.readFileSync(imagePath);
      if (image.length < 33 || image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
          image.toString("ascii", 12, 16) !== "IHDR" || image.readUInt32BE(16) !== settings.pixelWidth ||
          image.readUInt32BE(20) !== settings.pixelHeight) {
        throw new Error(`${filename}: PNG dimensions do not match the settings.`);
      }
      sheets.push({ rarity, copies: style === "Enhanced" ? 1 : copies, style, filename,
        path: `${FOLDER}/${filename}`, sha1: hash(image, "sha1").toUpperCase(), size: image.length, ...settings });
    }
  }
  for (const { style } of DECKS) {
    const cards = sheets.filter((s) => s.style === style).flatMap((s) => s.cards);
    if (new Set(cards.map((c) => c.index)).size !== cards.length || new Set(cards.map((c) => c.name)).size !== cards.length) {
      throw new Error(`${style}: duplicate card identity across rarities.`);
    }
  }
  for (const [rarity] of RARITIES) {
    const pair = sheets.filter((s) => s.rarity === rarity);
    if (JSON.stringify(pair[0].cards) !== JSON.stringify(pair[1].cards)) throw new Error(`${rarity}: Standard and Enhanced lists disagree.`);
  }
  return sheets;
}

function resolveCloud(sheets, manifest, ledger) {
  const job = manifest.jobs?.[JOB];
  const pending = [];
  for (const sheet of sheets) {
    const matches = (job?.rows || []).filter((r) => r.path === sheet.path);
    const entry = ledger.files?.[sheet.path];
    const row = matches[0];
    if (job?.output !== "Manifest" || job?.folder !== FOLDER || matches.length !== 1 ||
        row.sha1?.toUpperCase() !== sheet.sha1 || row.size !== sheet.size ||
        entry?.key !== `${sheet.sha1}_${sheet.filename}` || row.url !== entry?.url || !/^https:\/\//.test(row.url || "")) {
      pending.push(sheet.filename);
    } else sheet.url = row.url;
  }
  return pending;
}

function visitObjects(save, visit) {
  const walk = (o) => {
    visit(o);
    for (const child of o.ContainedObjects || []) walk(child);
    for (const state of Object.values(o.States || {})) walk(state);
  };
  for (const o of save.ObjectStates || []) walk(o);
}

function commonBack(deck) {
  const backs = new Set(Object.values(deck.CustomDeck || {}).map((d) => d.BackURL));
  if (backs.size !== 1 || !/^https:\/\//.test([...backs][0] || "")) throw new Error(`Deck ${deck.GUID} needs one existing shared card-back URL.`);
  return [...backs][0];
}

function assertIdle(save, decks) {
  const state = JSON.parse(save.LuaScriptState || "{}");
  if (state.complications) throw new Error("A Complications game is saved as active. Stop the game and save in TTS before rebuilding the decks.");
  const inside = new Set();
  for (const deck of decks) visitObjects({ ObjectStates: [deck] }, (o) => inside.add(o));
  visitObjects(save, (o) => {
    if (!inside.has(o) && (o.Tags || []).includes("deckOfComplications")) {
      throw new Error(`Complications object ${o.GUID} is outside the two source decks. Return loose cards and save in TTS before rebuilding.`);
    }
  });
}

function planDecks(save, sheets) {
  const targets = DECKS.map((spec) => {
    const matches = [];
    visitObjects(save, (o) => { if (o.GUID === spec.guid) matches.push(o); });
    const deck = matches[0];
    if (matches.length !== 1 || !save.ObjectStates.includes(deck) || deck.Name !== "DeckCustom" ||
        !spec.tags.every((tag) => (deck.Tags || []).includes(tag)) ||
        (deck.Tags || []).includes("enhancedComplication") !== (spec.style === "Enhanced")) {
      throw new Error(`Expected one top-level ${spec.style} deck ${spec.guid} with its Complications tags.`);
    }
    const back = commonBack(deck);
    const inputs = sheets.filter((s) => s.style === spec.style);
    const fingerprint = hash(JSON.stringify({ version: 1, style: spec.style, back, tags: spec.tags, inputs }));
    const stamp = `[complications-deck-build:v1:${fingerprint}]`;
    return { spec, deck, back, inputs, stamp, changed: !(deck.GMNotes || "").includes(stamp) };
  });
  if (!targets.some((t) => t.changed)) return [];
  assertIdle(save, targets.map((t) => t.deck));

  const usedGuids = new Set();
  let sheetId = 0;
  visitObjects(save, (o) => {
    if (o.GUID) usedGuids.add(o.GUID.toLowerCase());
    for (const key of Object.keys(o.CustomDeck || {})) {
      if (!/^[1-9]\d*$/.test(key)) throw new Error(`Invalid CustomDeck key ${key} on ${o.GUID}.`);
      sheetId = Math.max(sheetId, Number(key));
    }
  });
  const newGuid = (seed) => {
    let nonce = 0, guid;
    do { guid = hash(`${seed}:${nonce++}`).slice(0, 6); } while (guid === "000000" || usedGuids.has(guid));
    usedGuids.add(guid);
    return guid;
  };

  return targets.filter((t) => t.changed).map(({ spec, deck, back, inputs, stamp }) => {
    const prototype = deck.ContainedObjects?.find((o) => o.Name === "Card" || o.Name === "CardCustom");
    if (!prototype) throw new Error(`${spec.style} deck has no card to use as an object-settings template.`);
    const next = clone(deck);
    next.CustomDeck = {};
    next.ContainedObjects = [];
    next.DeckIDs = [];
    const notes = (deck.GMNotes || "").replace(STAMP, "");
    next.GMNotes = `${notes}${notes && !notes.endsWith("\n") ? "\n" : ""}${stamp}`;
    for (const input of inputs) {
      const id = ++sheetId;
      if (!Number.isSafeInteger(id * 100 + 99)) throw new Error("Custom deck IDs exceed safe integer range.");
      const definition = { FaceURL: input.url, BackURL: back, NumWidth: input.width,
        NumHeight: input.height, BackIsHidden: true, UniqueBack: false, Type: 0 };
      next.CustomDeck[id] = definition;
      for (let copy = 0; copy < input.copies; copy += 1) {
        input.cards.forEach((identity, slot) => {
          const card = clone(prototype);
          card.GMNotes = `${identity.index}:${identity.name}${spec.style === "Enhanced" ? ":Enhanced" : ""}`;
          card.GUID = newGuid(`${deck.GUID}:${stamp}:${card.GMNotes}:${copy}`);
          card.Tags = [...spec.tags];
          card.CardID = id * 100 + slot;
          card.CustomDeck = { [id]: clone(definition) };
          // Contained cards take the deck's current pose, retaining their card interaction settings.
          card.Transform = clone(deck.Transform);
          next.ContainedObjects.push(card);
          next.DeckIDs.push(card.CardID);
        });
      }
    }
    return { original: deck, replacement: next, style: spec.style };
  });
}

function build({ savePath, assetsDir, settingsDir = SETTINGS, manifestPath = MANIFEST, dryRun = false,
  backupConfig = null, log = console.log, warn = console.warn }) {
  const sheets = readInputs(assetsDir, settingsDir);
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const pending = resolveCloud(sheets, manifest, loadLedger(assetsDir));
  if (pending.length) {
    warn(`[complications:decks] WARN HOLD: ${pending.length} deck sheet(s) are not synced: ${pending.join(", ")}. Close TTS, run cloud-asset-sync, and rebuild. Decks were not changed.`);
    return { status: "held", changed: 0 };
  }
  const before = fs.readFileSync(savePath, "utf8");
  const save = JSON.parse(before);
  const plans = planDecks(save, sheets);
  if (!plans.length) {
    log("[complications:decks] Unchanged inputs; source decks left intact.");
    return { status: "unchanged", changed: 0 };
  }
  for (const { original, replacement, style } of plans) {
    save.ObjectStates[save.ObjectStates.indexOf(original)] = replacement;
    log(`[complications:decks] ${dryRun ? "Would rebuild" : "Rebuild"} ${style}: ${replacement.ContainedObjects.length} cards, ${Object.keys(replacement.CustomDeck).length} sheets.`);
  }
  if (!dryRun) {
    // Guard against another build or TTS saving while the replacement was prepared.
    if (fs.readFileSync(savePath, "utf8") !== before) throw new Error("The save changed during deck generation. Retry after saving has finished.");
    backupSaveBeforeWrite(savePath, backupConfig);
    writeAtomic(savePath, `${JSON.stringify(save, null, 2)}\n`);
    log("[complications:decks] Wrote save. Load it from TTS's Games menu to use the new decks.");
  }
  return { status: dryRun ? "dry-run" : "rebuilt", changed: plans.length };
}

function main(argv) {
  const options = {};
  const values = { "--save": "savePath", "--assets-dir": "assetsDir", "--manifest": "manifestPath", "--settings-dir": "settingsDir" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--dry-run") options.dryRun = true;
    else if (values[argv[i]] && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      const option = values[argv[i]];
      options[option] = path.resolve(argv[++i]);
    }
    else if (argv[i] === "--help") {
      console.log("Usage: npm run complications:decks -- [--dry-run] [--save <json>] [--assets-dir <dir>] [--manifest <json>] [--settings-dir <dir>]\nDefaults: configured live save/assets, cloud manifest, checked-in sidecars.");
      return;
    } else throw new Error(`Unexpected or incomplete argument: ${argv[i]}`);
  }
  if (!options.savePath || !options.assetsDir) {
    const cfg = loadCloudConfig();
    options.savePath ||= cfg.saveFile;
    options.assetsDir ||= cfg.assetsDir;
  }
  options.backupConfig = findExistingConfig()?.config || null;
  return build(options);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (err) { console.error(`[complications:decks] FAIL: ${err.message}`); process.exitCode = 1; }
}
module.exports = { build, planDecks, parseSettings, readInputs, resolveCloud, DECKS, RARITIES, FOLDER, JOB, SETTINGS };
