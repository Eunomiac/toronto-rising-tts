# Inbox

## Quick Fixes

## Active

- [NPC Control Board] When an NPC occupies a seat but is moved to an area on the stage, their seat should remain occupied by that NPC -- just deactivated, with their figurine moved to the stage. On a "Clear", that NPC should return to their claimed seat. Importantly, this includes scene library definitions where an NPC is registered as both occupying a seat AND occupying a stage position: This is fine, as long as their seat is flagged "`isPresent = false`" -- the scene should be set up with that seat occupied but inactive, and the NPC properly positioned on the stage. If an NPC is registered as being in two places at once (i.e. in two positions on the stage, or in an _active_ seat and a stage position), the scene JSON import should fail to validate.

---

## Needs clarification

### Unclear Bugs

### Unclear Intents

### Unclear Ideas

---

## Processed

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
