"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { build, parseSettings, readInputs, DECKS, RARITIES, SETTINGS, FOLDER, JOB } = require("./build-decks.js");
const sync = require("../../cloud-asset-sync.js");

const clone = (o) => JSON.parse(JSON.stringify(o));
const quiet = () => {};
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tr-complications-decks-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const assetsDir = path.join(root, "assets"), settingsDir = path.join(root, "settings");
  fs.mkdirSync(path.join(assetsDir, FOLDER), { recursive: true });
  fs.cpSync(SETTINGS, settingsDir, { recursive: true });
  for (const [rarity] of RARITIES) for (const { style } of DECKS) {
    const name = `${rarity}-${style}`;
    const s = parseSettings(fs.readFileSync(path.join(settingsDir, `${name}-settings.txt`), "utf8"), name);
    // Only the PNG header is relevant to the generator; production sheets are tested separately.
    const png = Buffer.alloc(33);
    Buffer.from("89504e470d0a1a0a", "hex").copy(png);
    png.write("IHDR", 12); png.writeUInt32BE(s.pixelWidth, 16); png.writeUInt32BE(s.pixelHeight, 20);
    fs.writeFileSync(path.join(assetsDir, FOLDER, `complicationsDeck_${name}.png`), png);
  }
  const card = { GUID: "aaaaaa", Name: "Card", GMNotes: "40:Powderkeg", Tags: ["deckOfComplications"],
    Transform: { posX: 1, posY: 2, posZ: 3, rotX: 0, rotY: 0, rotZ: 180, scaleX: 1.8, scaleY: 1, scaleZ: 1.8 },
    Hands: true, DragSelectable: true, Tooltip: true, LuaScript: "", XmlUI: "", CardID: 100,
    CustomDeck: { 1: { BackURL: "https://example.test/back", FaceURL: "https://example.test/old" } } };
  const save = { SaveName: "Keep me", LuaScriptState: JSON.stringify({ projects: { existing: true } }),
    ObjectStates: DECKS.map((spec, i) => ({ GUID: spec.guid, Name: "DeckCustom", Tags: spec.tags,
      Transform: { ...card.Transform, posX: 10 + i }, GMNotes: "Author deck notes", Locked: false,
      CustomDeck: clone(card.CustomDeck), DeckIDs: [100],
      ContainedObjects: [{ ...clone(card), GUID: i ? "bbbbbb" : "aaaaaa", Tags: spec.tags }] })) };
  // State-only objects also reserve GUIDs and CustomDeck IDs.
  save.ObjectStates.push({ GUID: "eeeeee", Name: "Custom_Model", States: { 2: { GUID: "ffffff", CustomDeck: { 950: {} } } } });
  const savePath = path.join(root, "TS_Save_test.json"), manifestPath = path.join(root, "manifest.json");
  fs.writeFileSync(savePath, JSON.stringify(save));
  const options = { savePath, assetsDir, settingsDir, manifestPath, log: quiet, warn: quiet };
  function syncImages() {
    const inputs = readInputs(assetsDir, settingsDir);
    const rows = inputs.map((s) => ({ path: s.path, name: s.filename.slice(0, -4), sha1: s.sha1, size: s.size,
      url: `https://example.test/${s.sha1}/${encodeURIComponent(s.filename)}` }));
    fs.writeFileSync(manifestPath, JSON.stringify({ jobs: { [JOB]: { folder: FOLDER, output: "Manifest", rows } } }));
    fs.writeFileSync(path.join(assetsDir, ".cloud-ledger.json"), JSON.stringify({ files: Object.fromEntries(inputs.map((s, i) =>
      [s.path, { key: `${s.sha1}_${s.filename}`, url: rows[i].url, size: s.size }])) }));
  }
  syncImages();
  return { ...options, root, save, options, syncImages, read: () => JSON.parse(fs.readFileSync(savePath, "utf8")) };
}

test("assembles 254 Standard and 66 Enhanced cards, with correct identities, image slots and multiplicities", (t) => {
  const f = fixture(t);
  assert.deepEqual(build(f.options), { status: "rebuilt", changed: 2 });
  const result = f.read();
  assert.deepEqual(result.ObjectStates[2], f.save.ObjectStates[2]);
  assert.equal(result.LuaScriptState, f.save.LuaScriptState);
  const guids = new Set(["eeeeee", "ffffff", ...DECKS.map((d) => d.guid)]);
  for (const [i, spec] of DECKS.entries()) {
    const deck = result.ObjectStates[i], original = f.save.ObjectStates[i];
    assert.equal(deck.GUID, original.GUID);
    assert.deepEqual(deck.Transform, original.Transform);
    assert.equal(deck.Locked, original.Locked);
    assert.match(deck.GMNotes, /^Author deck notes\n\[complications-deck-build:v1:/);
    assert.equal(deck.ContainedObjects.length, i ? 66 : 254);
    assert.ok(deck.Tags.includes("masterDeck"));
    const indices = deck.ContainedObjects.map((c) => parseInt(c.GMNotes, 10));
    assert.deepEqual(indices, [...indices].sort((a, b) => a - b));
    assert.equal(Object.keys(deck.CustomDeck).length, 4);
    assert.deepEqual(deck.DeckIDs, deck.ContainedObjects.map((c) => c.CardID));
    const expectedCounts = new Map();
    for (const input of readInputs(f.assetsDir, f.settingsDir).filter((s) => s.style === spec.style)) {
      const [id, definition] = Object.entries(deck.CustomDeck).find(([, d]) => d.FaceURL.split("/").at(-1) === encodeURIComponent(input.filename));
      assert.ok(Number(id) > 950);
      assert.equal(definition.NumWidth, input.width); assert.equal(definition.NumHeight, input.height);
      assert.equal(definition.BackURL, "https://example.test/back");
      assert.equal(definition.UniqueBack, false); assert.equal(definition.BackIsHidden, true);
      for (const [slot, identity] of input.cards.entries()) {
        const notes = `${identity.index}:${identity.name}${i ? ":Enhanced" : ""}`;
        expectedCounts.set(notes, input.copies);
        const cards = deck.ContainedObjects.filter((c) => c.GMNotes === notes);
        assert.equal(cards.length, input.copies);
        for (const card of cards) {
          assert.equal(card.CardID, Number(id) * 100 + slot);
          assert.deepEqual(card.CustomDeck, { [id]: definition });
          assert.deepEqual(card.Tags, spec.tags);
          assert.equal(card.Hands, true); assert.equal(card.DragSelectable, true);
          assert.match(card.GUID, /^[a-f0-9]{6}$/);
          assert.ok(!guids.has(card.GUID)); guids.add(card.GUID);
        }
      }
    }
    assert.equal(expectedCounts.size, 66);
    const powderkegs = deck.ContainedObjects.filter((c) => c.GMNotes.startsWith("40:"));
    assert.equal(powderkegs.length, i ? 1 : 12);
    assert.ok(powderkegs.every((c) => c.CardID % 100 === 0));
    assert.equal(Object.values(deck.CustomDeck).filter((d) => d.NumWidth === 2 && d.NumHeight === 2).length, 1);
  }
  assert.equal(fs.readdirSync(path.join(f.root, "tts-assets-backups")).length, 1);
});

test("unchanged builds preserve a shuffled/partly played deck and active game byte for byte", (t) => {
  const f = fixture(t); build(f.options);
  const played = f.read();
  const deck = played.ObjectStates[0];
  const loose = deck.ContainedObjects.pop(); deck.DeckIDs.pop();
  deck.ContainedObjects.reverse(); deck.DeckIDs.reverse();
  played.ObjectStates.push(loose);
  played.LuaScriptState = JSON.stringify({ complications: { id: "active-game" } });
  fs.writeFileSync(f.savePath, JSON.stringify(played));
  const before = fs.readFileSync(f.savePath, "utf8"), mtime = fs.statSync(f.savePath).mtimeMs;
  assert.equal(build(f.options).status, "unchanged");
  assert.equal(fs.readFileSync(f.savePath, "utf8"), before);
  assert.equal(fs.statSync(f.savePath).mtimeMs, mtime);
  assert.equal(fs.readdirSync(path.join(f.root, "tts-assets-backups")).length, 1);
});

test("changed PNGs wait for matching Cloud bytes, then rebuild only the affected deck", (t) => {
  const f = fixture(t); build(f.options);
  const enhancedBefore = clone(f.read().ObjectStates[1]);
  const file = path.join(f.assetsDir, FOLDER, "complicationsDeck_Very Common-Standard.png");
  fs.appendFileSync(file, "new art");
  const before = fs.readFileSync(f.savePath, "utf8");
  assert.equal(build(f.options).status, "held");
  assert.equal(fs.readFileSync(f.savePath, "utf8"), before);
  // Even a manifest with a fresh local hash cannot bless an old ledger URL.
  const manifest = JSON.parse(fs.readFileSync(f.manifestPath));
  const input = readInputs(f.assetsDir, f.settingsDir).find((s) => s.filename === "complicationsDeck_Very Common-Standard.png");
  Object.assign(manifest.jobs[JOB].rows.find((r) => r.path === input.path), { sha1: input.sha1, size: input.size });
  fs.writeFileSync(f.manifestPath, JSON.stringify(manifest));
  assert.equal(build(f.options).status, "held");
  f.syncImages();
  assert.equal(build(f.options).changed, 1);
  assert.deepEqual(f.read().ObjectStates[1], enhancedBefore);
  assert.equal(build(f.options).status, "unchanged");
});

test("settings-only and Cloud-URL-only changes invalidate the fingerprint", (t) => {
  const f = fixture(t); build(f.options);
  for (const { style } of DECKS) {
    const file = path.join(f.settingsDir, `Common-${style}-settings.txt`);
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("1: 2 A Moment of Despair.webp\n2: 4 A Moment of Inspiration.webp", "1: 4 A Moment of Inspiration.webp\n2: 2 A Moment of Despair.webp"));
  }
  assert.equal(build(f.options).changed, 2);
  const m = JSON.parse(fs.readFileSync(f.manifestPath));
  const ledgerPath = path.join(f.assetsDir, ".cloud-ledger.json"), ledger = JSON.parse(fs.readFileSync(ledgerPath));
  const row = m.jobs[JOB].rows[0]; row.url += "/relocated"; ledger.files[row.path].url = row.url;
  fs.writeFileSync(f.manifestPath, JSON.stringify(m)); fs.writeFileSync(ledgerPath, JSON.stringify(ledger));
  assert.equal(build(f.options).changed, 1);
});

test("dry-run does not write a save, stamp, or backup", (t) => {
  const f = fixture(t), before = fs.readFileSync(f.savePath, "utf8");
  assert.equal(build({ ...f.options, dryRun: true }).status, "dry-run");
  assert.equal(fs.readFileSync(f.savePath, "utf8"), before);
  assert.equal(fs.existsSync(path.join(f.root, "tts-assets-backups")), false);
  assert.equal(build(f.options).changed, 2);
});

test("generated card GUIDs avoid collisions with unrelated saved objects", (t) => {
  const f = fixture(t); build(f.options);
  const collision = f.read().ObjectStates[0].ContainedObjects[0].GUID;
  const original = clone(f.save);
  original.ObjectStates.push({ GUID: collision, Name: "BlockSquare", GMNotes: "Keep this unrelated object" });
  fs.writeFileSync(f.savePath, JSON.stringify(original));
  build(f.options);
  const result = f.read();
  assert.deepEqual(result.ObjectStates.at(-1), original.ObjectStates.at(-1));
  const cards = result.ObjectStates.slice(0, 2).flatMap((d) => d.ContainedObjects);
  assert.ok(cards.every((c) => c.GUID !== collision));
  assert.equal(new Set(cards.map((c) => c.GUID)).size, 320);
});

test("first-time builds hold when manifest or ledger is missing", (t) => {
  const f = fixture(t), before = fs.readFileSync(f.savePath, "utf8");
  fs.unlinkSync(f.manifestPath);
  assert.equal(build(f.options).status, "held");
  f.syncImages(); fs.unlinkSync(path.join(f.assetsDir, ".cloud-ledger.json"));
  assert.equal(build(f.options).status, "held");
  assert.equal(fs.readFileSync(f.savePath, "utf8"), before);
});

test("rebuild refuses active games, loose cards, missing targets and ambiguous backs without writing", (t) => {
  const f = fixture(t);
  const cases = [
    [(s) => { s.LuaScriptState = JSON.stringify({ complications: { id: "active" } }); }, /saved as active/],
    [(s) => { s.ObjectStates.push({ GUID: "123456", Name: "Card", Tags: ["deckOfComplications"] }); }, /outside the two source decks/],
    [(s) => { s.ObjectStates.shift(); }, /Expected one top-level Standard/],
    [(s) => { s.ObjectStates[0].CustomDeck[2] = { BackURL: "https://example.test/different" }; }, /shared card-back/],
  ];
  for (const [mutate, expected] of cases) {
    const save = clone(f.save); mutate(save); fs.writeFileSync(f.savePath, JSON.stringify(save));
    const before = fs.readFileSync(f.savePath, "utf8");
    assert.throws(() => build(f.options), expected);
    assert.equal(fs.readFileSync(f.savePath, "utf8"), before);
  }
});

test("malformed sidecars and mismatched PNGs fail without touching the save", (t) => {
  const f = fixture(t), before = fs.readFileSync(f.savePath, "utf8");
  const file = path.join(f.settingsDir, "Very Common-Standard-settings.txt"), text = fs.readFileSync(file, "utf8");
  for (const replacement of [text.replace("Number: 1", "Number: 4"), text.replace("1: 40", "2: 40"), text.replace("Width: 2", "Width: 3")]) {
    fs.writeFileSync(file, replacement); assert.throws(() => build(f.options), /grid|entry|dimensions/);
    assert.equal(fs.readFileSync(f.savePath, "utf8"), before);
  }
  fs.writeFileSync(file, text.replace("Powderkeg.webp", "Different.webp"));
  assert.throws(() => build(f.options), /lists disagree/);
  fs.writeFileSync(file, text);
  fs.writeFileSync(path.join(f.assetsDir, FOLDER, "complicationsDeck_Very Common-Standard.png"), Buffer.alloc(33));
  assert.throws(() => build(f.options), /PNG dimensions/);
  assert.equal(fs.readFileSync(f.savePath, "utf8"), before);
});

test("CLI can inspect a copied save using explicit paths without a live TTS config", (t) => {
  const f = fixture(t);
  const output = execFileSync(process.execPath, [path.join(__dirname, "build-decks.js"), "--save", f.savePath,
    "--assets-dir", f.assetsDir, "--settings-dir", f.settingsDir, "--manifest", f.manifestPath, "--dry-run"], { encoding: "utf8" });
  assert.match(output, /Would rebuild Standard: 254 cards/);
  assert.match(output, /Would rebuild Enhanced: 66 cards/);
  assert.deepEqual(f.read(), f.save);
});

test("Cloud job claims exactly the eight sheets and Full build assembles after sync and consolidation", () => {
  const root = path.resolve(__dirname, "../../..");
  const config = JSON.parse(sync.stripJsonc(fs.readFileSync(path.join(root, ".tools/cloud-asset-sync.jsonc"), "utf8")));
  const job = sync.validateConfig(config).find((j) => j.id === JOB);
  assert.equal(job.output, "Manifest"); assert.equal(job.folder, FOLDER); assert.notEqual(job.literal, "");
  const re = new RegExp(job.searchPattern);
  for (const [rarity] of RARITIES) for (const { style } of DECKS) assert.ok(re.test(`complicationsDeck_${rarity}-${style}.png`));
  for (const stray of ["Other-Standard.png", "Common-Standard-settings.txt", "Common-Standard.jpg", "back.png"]) assert.ok(!re.test(stray));
  const pipeline = JSON.parse(fs.readFileSync(path.join(root, "package.json"))).scripts["build:all-tooling"];
  assert.ok(pipeline.indexOf("npm run cloud-asset-sync &&") < pipeline.indexOf("npm run complications:decks &&"));
  assert.ok(pipeline.indexOf("npm run cloud:consolidate -- --apply &&") < pipeline.indexOf("npm run complications:decks &&"));
});
