# Inbox

## Quick Fixes

- [Player Activation & Scene Presence] When a player's seat is deactivated, any location and/or scene Conditions on that player should be disabled -- by deactivating them, they are no longer present at the location or in the scene. Likewise, if a player's seat is _activated_, any scene and/or location conditions should be enabled on that player.
- [Dice Rolls] When a player makes a roll in which Blood Surge is active, Take Half should be _disabled_.

## Active

- [Automatic Table Selection] In `C.Tables`, we currently have a `Table A`, a `Table B`, and then several variants of `Table B` based on the number of available NPC slots at the table -- `Table B1`, `Table B2`, etc. I'd like to change this so that, when a table is called by its letter alone (e.g. "`Table B`"), the script checks to see if their are numbered variants ("`Table B<#>`"). If NOT, then there must be an entry for the table as given ("`Table B`"), and that is the data that should be returned.  If there ARE variants, then there will not be `Table B` data -- instead, the script checks how many NPC seats are occupied, appends that number to the table reference, and loads the data for that table automatically. (This will require changing the current `Table B` entry to `Table B5`, corresponding to the available NPC slots -- even though only four are defined, there are technically enough sides for five, so this is where that particular table model should be registered. With no `Table B` entry, the number of occupied NPC slots must be counted and appended to the key, and that data returned.  If that key cannot be found -- e.g. no `Table B0` when zero NPC slots are occupied -- throw an error.)
- [New Roll Types] These new roll types should be added to the PCs panel alongside the other rolls, and registered as unique roll types.
  * Willpower Roll -- Auto-populate the pool with a number of Standard Dice equal to the player's _undamaged_ Willpower boxes. No Hunger Dice, no Blood Surge, and No WP Reroll should be enabled for this roll.
  * Discipline Roll -- Auto-populate the pool with a number of dice equal to the player's discipline bonus (`C.BloodPotency[character's blood potency rating].discBonus`). Auto-hunger is enabled. Take Half is _disabled_.
  * Humanity Roll -- Auto-populate the pool with the player's Humanity rating worth of Standard Dice. No Hunger dice, no Blood Surge, no Take Half, and no spending Willpower to reroll.
  * Frenzy Roll -- (We already have this roll type, but it should be updated to function as follows). Auto-populate the pool with a number of Standard Dice equal to the player's _undamaged_ Willpower PLUS one-third their Humanity rating, rounded down. No Hunger Dice, no Blood Surge, no Take Half, no WP Reroll.

---

## Needs clarification

### Unclear Bugs

### Unclear Intents

### Unclear Ideas

---

## Processed

2026-06-25 TOR-253 — Dice spawn-arc overflow layering (cap 10/arc; elevate + nudge extras) (shipped)
2026-06-25 TOR-251 — ST normal grid labels shift by hunger offset (shipped; `refreshStNormalStripLabels`)
2026-06-25 TOR-252 — NPC roll broadcast wrong figurine for duplicate fullName (promoted; display-name lookup root cause documented)
2026-06-25 TOR-250 — Deactivated seat when NPC on stage + scene import rules (promoted from Active)
2026-06-25 pc_control_token load invisibility — `TAG_PC_TOKEN` added to control-board component sweep (partial; toolbar Host visibility already TOR-176)
2026-06-23 TOR-240 — No Take Half player panel phase label (shipped)
2026-06-23 TOR-241 — Player dice spawn arc RING_STEP 1.5 (shipped)
2026-06-23 TOR-242 — CONTROL_BOARD seat row lower-left u/v (shipped)
2026-06-23 TOR-244 — Scene library selection preview + edit-before-apply (promoted)
2026-06-23 TOR-245 — Map pins last active location + timestamp (promoted; blockedBy TOR-151)
2026-06-23 TOR-247 — Rotational seat index layout (promoted)
2026-06-21 Roll broadcast NPC cutout — prune ST duplicate-roll label suffix " (N)" before cutout lookup (`roll_ui.resolveRollFigureAssetKey`)
2026-06-21 Clear off-world tokens — Y-aware board/palette surface checks; confirmed Clear parks fallen tokens
2026-06-21 Clear first-click lag — arm confirm only (no stray recovery scan on first click)
2026-06-21 TOR-235 — Figurine backs fixed in save (generic transparent back URL; Done)
2026-06-21 TOR-234 — NPC spotlight Y wrong when seat moves to lit stage placement
2026-06-21 TOR-233 — PCs panel HP/WP/Hum tracker row width (shipped)
2026-06-21 TOR-227 — Palette parking snap Z offset (+0.1 board-local) for group labels beneath tokens
2026-06-21 TOR-228 — Design ST Projects panel + modal XML partials (External In Progress)
2026-06-21 TOR-229 — Design coterieData state schema (External In Progress)
2026-06-21 TOR-230 — Design Coterie sidebar sheet XML (External In Progress)
2026-06-21 TOR-231 — Finish Projects planning in Project System Overview.md (External In Progress)
2026-06-21 TOR-232 — Implement Projects system; blockedBy TOR-228–231 (Backlog, High)
