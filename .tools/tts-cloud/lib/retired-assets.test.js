"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { planOrphanRetirements, describeCloudStray } = require("./retired-assets.js");

const root = "Test Cloud";
const row = (folder, name, key = "OLD_file") => ({ folder: `${root}/${folder}`, name, key });
const local = (relPath, key = "NEW_file") => ({ relPath, key });

test("same visible path with different contents retires only the old Cloud identity", () => {
  const old = row("Decks", "card.png");
  const current = row("Decks", "card.png", "NEW_file");
  const rows = planOrphanRetirements([old, current], [local("Decks/card.png")], root, []);
  assert.deepEqual(rows.map(x => x.row.key), [old.key]);
  assert.equal(rows[0].reason, "superseded Cloud version");
});

test("completed generator output owns renamed tokens and deliberately shared backs", () => {
  const stale = row("NPC Art/Tokens", "npcToken_old.front.webp");
  const sharedBack = row("NPC Art/Tokens", "npcToken_current.back.webp");
  const files = [local("NPC Art/Tokens/npcToken_current.front.webp")];
  assert.equal(planOrphanRetirements([stale, sharedBack], files, root, ["current"]).length, 2);
  assert.deepEqual(planOrphanRetirements([stale], files, root, ["current", "unfinished"]), []);
  assert.deepEqual(planOrphanRetirements([stale], files, root, []), []);
});

test("unowned images, other mods, read-only mirrors and case aliases are not retired", () => {
  const rows = [row("Objects", "hand-upload.webp"), row("Save Only", "image.webp"),
    row("Protected Cloud Files", "image.webp"), { ...row("Objects", "other.webp"), folder: "Other Mod" },
    row("Objects", "Case.webp", "HASH_Case.webp")];
  const files = [local("Objects/Case.webp", "HASH_case.webp")];
  assert.deepEqual(planOrphanRetirements(rows, files, root, []), []);
});

test("stray explanation distinguishes old contents from the current named file and job", () => {
  const text = describeCloudStray({ sha1: "OLD" }, { path: "assets/Decks/card.png", sha1: "NEW", job: "deck" });
  assert.match(text, /Cloud SHA-1 OLD; superseded by assets\/Decks\/card.png/);
  assert.match(text, /SHA-1 NEW, job deck/);
});
