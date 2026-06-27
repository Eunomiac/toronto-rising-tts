# Inbox

## Quick Fixes

- [Bug] When switching scenes, the weather audio does not fade in -- it starts playing at full volume.


## Active

- [Stage Control] When an NPC is cleared from a stage position and they occupy a table seat, their seat status should not necessarily default to the status recorded in the scene library, but rather adhere to the following:
  - Case 1: Their Seat is marked "disabled" and they are cleared from the stage -- If their stage light was set to "Standard" at the time they were cleared, their seat should be activated (i.e. if they were visible on the stage, they should be visible when they return to the table)
  - Case 2: Their Seat is marked "enabled" and they are cleared from the stage -- Their seat should be enabled when they return to the table, regardless of their staged light mode.
  Important Note: If they are seated at the table and the Storyteller activates their seat, this should be written to the scene library data so that their seat remains active on refresh/sync. Likewise for deactivating seats.  The scene library data is meant to be updated as the scene progresses and NPCs move in and out of stage/seat slots -- so that, if/when the scene is returned to, the state of the stage is as we left it, not as it was when the scene was first initiated.

### Storyteller Panel for Editing Advantages
_(Shipped — TOR-279 Storyteller Stats panel — advantage editor)_


## Needs clarification

### Unclear Bugs

### Unclear Intents

### Unclear Ideas

---

## Processed

2026-06-27 Map pins on scene change — present PCs show immediately (clock gate `< 0`); absent PCs keep prior pin across scenes (`lastActiveMapPin` moved to top-level gameState, was wiped by sessionScene replace on apply)
2026-06-27 RT clock acceleration on scene change — epoch guard in game_state_overlay ticker so stale Wait callbacks can't spawn duplicate tick chains
2026-06-27 Scene transition sound timing — new-location ambient fade-in deferred to end of settle (shortly before blindfold lift) in runStagedTransition
2026-06-27 Overlay management — blindfold variants 1..22 randomization (BLINDFOLD_VARIANT_COUNT was 6); removed impaired-willpower + torpor HUD overlays; added derived `stained` overlay (Humanity stains ≥ 1)
2026-06-26 INBOX Quick Fixes — TOR-268 (control-board table-only minimap), TOR-151 amend (no-scene Table B0 baseline), TOR-269 (load soundscape dual-apply), TOR-270 (weather volume-0 before playback)
2026-06-25 TOR-265 — Control-board Apply/Clear flickers off-seat NPC lights on then off (promoted; relatedTo TOR-250/TOR-178)
2026-06-25 TOR-266 — Reposition NPC figurine lights: point down, +5 above top, +3 toward table origin (promoted; relatedTo TOR-234; commit 36b0259 was doc-only despite message)
2026-06-25 TOR-264 — Double music emitters on load: dual-apply fix (`Sync.full` skipSoundscape; load helpers single soundscape authority) (shipped)
2026-06-25 TOR-255 — Blood Surge active disables Take Half (shipped)
2026-06-25 TOR-256 — PC seat deactivate/activate syncs hosted scene+location conditions (shipped)
2026-06-25 TOR-257 — NPC figurine tooltips sync with player visibility (shipped)
2026-06-25 TOR-258 — Automatic table selection by occupied NPC seat count (promoted)
2026-06-25 TOR-259 — Willpower, Discipline, Humanity, Frenzy roll types (promoted)
2026-06-25 TOR-260 — ST Roll Options dash roll-type selector rows (promoted; blockedBy TOR-259)
2026-06-25 TOR-261 — Workshop pentagonal Table B0 model (promoted; human gate)
2026-06-25 TOR-262 — Single live PC roll + lower other trays (promoted)
2026-06-25 TOR-263 — Session number + End Session button (promoted; relatedTo TOR-143)
2026-06-25 ST dice arcs — Rage dice → Hunger (inner) arc not shared w/ Werewolf; ST arc cap 7/arc (vs player 10) (shipped)
2026-06-25 TOR-252 — NPC roll broadcast figurine for duplicate fullName (shipped; authoritative `npcCharacterKey`)
2026-06-25 TOR-253 — Dice spawn-arc overflow layering (cap 10/arc; elevate + nudge extras) (shipped)
2026-06-25 TOR-251 — ST normal grid labels shift by hunger offset (shipped; `refreshStNormalStripLabels`)
2026-06-25 TOR-252 — NPC roll broadcast wrong figurine for duplicate fullName (promoted; display-name lookup root cause documented)
2026-06-25 TOR-250 — Deactivated seat when NPC on stage + scene import rules (promoted from Active)
2026-06-25 pc_control_token load invisibility — `TAG_PC_TOKEN` added to control-board component sweep (partial; toolbar Host visibility already TOR-176)
2026-06-23 TOR-240 — No Take Half player panel phase label (shipped)
2026-06-23 TOR-241 — Player dice spawn arc RING_STEP 1.5 (shipped)
2026-06-23 TOR-242 — CONTROL_BOARD seat row lower-left u/v (shipped)
2026-06-23 TOR-244 — Scene library selection preview + edit-before-apply (promoted)
2026-06-23 TOR-245 — Map pins last active location + timestamp (promoted)
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
