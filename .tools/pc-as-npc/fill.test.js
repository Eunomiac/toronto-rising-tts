"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  fillNpcSheet,
  parsePowersHierarchy,
  powerDisplayName,
  paintBoxes,
  paintHunger,
  listXmlIds,
  loadTemplate,
} = require("./fill.js");

const ren = {
  Title: "Prince",
  Name: "Ren",
  Clan: "Ministry",
  Sect: "Camarilla",
  Rank: "Prince",
  Kind: "Vampire",
  Subkind: "",
  "Coterie / Pack": "",
  "Sect Status": "3",
  "Clan Status": "5",
  Health: "6",
  Willpower: "5",
  Phy: "4",
  Soc: "5",
  Men: "3",
  Pow: "4",
  Difficulty: "4/2",
  "Exceptional Pools": "Animal Ken:Charisma+Animal Ken|Melee:Dexterity+Melee|Performance:Charisma+Performance",
  Attacks: "Fists=Phy+0:Strength+Brawl|Knife=Melee+2:Dexterity+Melee",
  Powers:
    "Obfuscate 3 (Silence of Death,Unseen Passage,Mask of Isolation)|Presence 3 (Eyes of the Serpent,Predator's Lure,True Love's Face,3-1:Lay Down the Chain=POW)|Protean 2 (Weight of the Feather,Serpent's Kiss)|Dominate 2 (Compel,The Stolen Voice)",
  "Ancilla Power(s)":
    "Lay Down the Chain (Presence 3. After a willing target confesses a secret, Ren may compel silence.)",
  "Elder Power(s)": "",
  "Methuselah Power(s)": "",
  Advantages: "Haven3|Mask2",
  "Special Abilities": "",
};

test("identity joins and Title ◆ Name", () => {
  const { elements } = fillNpcSheet(ren);
  assert.equal(elements.npc_name_title.text, "Prince ◆ Ren");
  assert.equal(elements.npc_clan_sect_rank.text, "Ministry ◆ Camarilla ◆ Prince");
  assert.equal(elements.npc_kind_subkind_coterie.text, "Vampire");
});

test("empty identity fields hide", () => {
  const { elements } = fillNpcSheet({ Name: "~", Title: "" });
  assert.equal(elements.npc_name_title.active, false);
});

test("generic Label aliases Name", () => {
  const { elements } = fillNpcSheet({ Label: "Extra", Title: "Scout" });
  assert.equal(elements.npc_name_title.text, "Scout ◆ Extra");
});

test("standard pools casing and Pow hide", () => {
  const { elements } = fillNpcSheet({ Phy: "3", Soc: "~", Men: "2", Pow: "0" });
  assert.equal(elements.npc_phy.text, "PHYSICAL •••");
  assert.equal(elements.npc_soc.text, "SOCIAL ~");
  assert.equal(elements.npc_men.text, "MENTAL ••");
  assert.equal(elements.npc_pow.active, false);
});

test("exceptional pools use left Difficulty × 2 dots", () => {
  const { elements } = fillNpcSheet(ren);
  assert.equal(elements.npc_exceptional_pool_1.text, "Animal Ken •••• ••••");
  assert.equal(elements.npc_exceptional_pool_2.text, "Melee •••• ••••");
  assert.equal(elements.npc_exceptional_pool_4.active, false);
});

test("attacks omit (+0) and keep nonzero bonus", () => {
  const { elements } = fillNpcSheet(ren);
  assert.equal(elements.npc_attack_1.text, "Fists");
  assert.equal(elements.npc_attack_2.text, "Knife (+2)");
  assert.equal(elements.npc_attack_3.active, false);
});

test("powersDisciplineRows + custom display name", () => {
  assert.equal(powerDisplayName("3-1:Lay Down the Chain=POW"), "Lay Down the Chain");
  const groups = parsePowersHierarchy(ren.Powers);
  assert.equal(groups.length, 4);
  assert.equal(groups[1].names[3], "Lay Down the Chain");
  const { elements } = fillNpcSheet(ren);
  assert.equal(elements.npc_power_row_1_label.text, "Obfuscate ••• (");
  assert.equal(elements.npc_power_row_2_p4.text, "Lay Down the Chain");
  assert.equal(elements.npc_power_row_2_sep3.text, ", ");
  assert.equal(elements.npc_power_row_2_sep4.active, false);
  assert.equal(elements.npc_power_row_5.active, false);
});

test("Ancilla overlays tooltip and strips Discipline N. prefix", () => {
  const { elements, warnings } = fillNpcSheet(ren, {
    disciplines: [
      {
        Discipline: "Obfuscate",
        Name: "Silence of Death",
        Description: "Cat tip",
        System: "Sys",
        Duration: "",
      },
    ],
  });
  assert.match(elements.npc_power_row_2_p4.tooltip, /willing target confesses/);
  assert.doesNotMatch(elements.npc_power_row_2_p4.tooltip, /^Presence 3\./);
  assert.match(elements.npc_power_row_1_p1.tooltip, /Cat tip/);
  assert.equal(warnings.length, 0);
});

test("unmatched Ancilla warns", () => {
  const { warnings } = fillNpcSheet({
    ...ren,
    "Ancilla Power(s)": "Not A Real Power (Presence 3. Rules.)",
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Not A Real Power/);
});

test("roleplay notes fill right pane; blank hides", () => {
  const withNotes = fillNpcSheet({ ...ren, "Roleplay Notes": "Speak softly." });
  assert.equal(withNotes.elements.npc_roleplay_notes_label.text, "Roleplay Notes");
  assert.equal(withNotes.elements.npc_roleplay_notes.text, "Speak softly.");
  const overridden = fillNpcSheet(ren, { tracker: { roleplayNotes: "From assignment" } });
  assert.equal(overridden.elements.npc_roleplay_notes.text, "From assignment");
  const blank = fillNpcSheet({ Name: "X", Kind: "Mortal" });
  assert.equal(blank.elements.npc_roleplay_notes.active, false);
});

test("trackers use glyphs; Hunger hides for mortal", () => {
  assert.equal(paintHunger(2, loadTemplate().trackerGlyphs), "●●○○○");
  assert.equal(paintBoxes(4, 1, 1, loadTemplate().trackerGlyphs), "╳╱□□");
  const vamp = fillNpcSheet(ren, {
    tracker: { healthSuperficial: 1, healthAggravated: 0, willpowerSuperficial: 0, willpowerAggravated: 0, hunger: 2 },
  });
  assert.equal(vamp.elements.npc_hunger.text, "●●○○○");
  assert.equal(vamp.elements.npc_health.text, "╱□□□□□");
  const mortal = fillNpcSheet({ Kind: "Mortal", Health: "5", Willpower: "3" });
  assert.equal(mortal.elements.npc_hunger.active, false);
  assert.equal(mortal.elements.npc_hunger_label.active, false);
  assert.equal(mortal.elements.npc_health.text, "□□□□□");
});

test("template fill ids are subset of npc_sheet.xml ids", () => {
  const xml = fs.readFileSync(path.join(__dirname, "../../ui/player/csheets/npc_sheet.xml"), "utf8");
  const xmlIds = listXmlIds(xml);
  const { elements } = fillNpcSheet(ren);
  for (const id of Object.keys(elements)) {
    assert.ok(xmlIds.has(id), `missing xml id: ${id}`);
  }
  const template = loadTemplate();
  assert.equal(template.trackerGlyphs.hungerFilled, "●");
  assert.ok(template.elements.some((e) => e.id === "npc_hunger"));
});
