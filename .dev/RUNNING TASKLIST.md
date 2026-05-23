# Running Tasklist for Toronto Rising Development

This file is continuously updated with issues and plans for feature development. Merged from `.dev/Draft Tasklist.md` on 2026-05-17.

**Linear is primary project tracking.** Every bullet must have a matching Linear issue and `_(TOR-XX)_` id. Agents: follow [`.cursor/rules/toronto-rising-linear.mdc`](../.cursor/rules/toronto-rising-linear.mdc) — create/update Linear issues when adding or completing items; never leave this file and Linear out of sync. Audit trail: [`.dev/plans/linear-alignment-log.md`](plans/linear-alignment-log.md).

---

## Dice Roller

- [x] Roll conditions set on rolls via the Storyteller control panel are not persisted and do not apply to rolls. _(Addressed: `roll_ui.ttslua` `uiToggleGet` normalizes Toggle `isOn` from string/boolean/number so Apply writes correct booleans.)_ _(TOR-54)_
- [x] Automatic camera repositioning during the roll sequence is inconsistent. Should be modeled off of how the camera controls are applied in the Admin Debug panel (since they work flawlessly). _(Addressed: `main.ttslua` `M.setCamera` now applies `lookAt(intermediateCameraData)` before the final preset.)_ _(TOR-57)_
- [ ] **Roll baton-pass camera (remaining):** Too many camera applications during the rolling handoff, including some that reapply the current angle; cuts are jumpier than Admin Debug Camera or Camera PC controls. Audit the roll pipeline and route roll-time switches through the same code path as those controls. _(TOR-72)_
- [ ] **Take Half redesign:** Available on any roll without difficulty. Synthetic result = half the pool size in **normal successes (rounded down)**, remainder **blank**, all treated as normal dice (Hunger dice count toward pool size but do not use Hunger faces). Example: pool 13 → 6 successes, 7 blanks. Downstream UI/ST confirmation should behave like a completed physical roll. _(TOR-73)_
- [ ] **Extended Tests:** An "extended test" is a series of rolls, with each roll contributing to a Running Total until a Target (defined by the Storyteller) is met, or the Storyteller stops the test early for any reason. There are four types of extended tests -- Standard, Series, Hard and Cascade -- which define what the Running Total and Target count, and how each roll adds to the Running Total. When the process stops, the final result is a Win if the Running Total equals or exceeds the Target, or a Failure otherwise. _(TOR-74)_
  - **Standard:** The Target represents a total number of successes that the player's Running Total must meet. Each roll contributes its successes to the Running Total. Each roll is made against a Difficulty of zero (i.e. each roll contributes all of its successes to the Running Total).
  - **Series:** The Storyteller defines a Difficulty that applies to each roll the player makes. The Target represents the number of successful rolls the player must make (i.e. rolls where successes equal or exceed the Difficulty). Successes are not counted, only Wins.
  - **Hard:** A combination of Standard and Series: The Target represents a total number of successes, but a Difficulty _is_ applied to each roll, and only the margin on each roll contributes to the Running Total. Failures (i.e. negative margins) do not subtract from the Running Total.
  - **Cascade:** As Standard, with two changes. First, the number of successes on each roll becomes a positive modifier to the dice pool of the next roll. Second, if any roll fails, the test ends immediately in failure.
- [ ] **Oblivion rouse checks:** Finish end-to-end (`C.RollType.ROUSE_OBLIVION` — UI, validation, result handling). _(TOR-75)_

## Camera

- [ ] Nudge the **Red** player **`sheet`** preset slightly farther back on **Z** (away from table center) so the center-top game-state overlay does not block the top of the character sheet. _(TOR-78)_

## NPC Spawning

See also [NPC Object Overview](NPC%20Object%20Spawning%20%26%20Spotlighting/NPC%20Object%20Overview.md).

- [x] **Preload pool:** Spawn all NPC figurines off-table (preload grid, small scale) so cutout images are loaded before activation. _( `npcs_data` preload at y = -200; `NPCS.ensureAllNpcsPreloaded`.)_ _(TOR-60)_
- [x] **Seat spawn:** Pooled figurine uses seat `*Object` tag + `SEAT_FIGURE` rotational layout; `postCorrectionsBySeatRole`; area spotlight hidden at seat; workshop `SEAT_LIGHT_*_NPC*` only. _(TOR-64)_
- [x] **Seat tags:** `npc_figurine` ↔ `NPCnObject` on seat/unseat; layout matches pooled figurine by tag + `Figurine_Custom` (`NPCS.isPooledFigurineObject`). _(TOR-65)_
- [ ] **Group spawn exclusion:** When spawning an NPC group into a stage area, do not pull members who are already seated (e.g. `fiveKeys` spawn must leave `myleneHamelin` in her table seat). _(TOR-76)_
- [ ] _New feature:_ Storyteller rolls dice for NPCs from the dice control panel — spawn/show dice tray, appropriate camera angle, roll-controller wiring for NPC/non-player identity. _(TOR-79)_

## Soundscape

- [x] On load, emitters automatically play tracks from the last save. _(Mitigation: **Silence for save** on Sound panel → `Soundscape.prepareEmittersForSave()`; fold into End Session sequence when defined.)_ _(TOR-71)_
- [ ] **Background music policy:** In any phase **other than Session Start**, background music should always play. When the active site or scene specifies no music, default to the **`Main`** playlist (`lib/soundscape_catalog.ttslua`). _(TOR-77)_
- [ ] **Site weather ducking:** Site (not only indoors/outdoors) sets the weather audio ducking multiplier in soundscape. _(TOR-80)_

## Lighting

- [x] Reconciler lighting updates lerped (default 2s). _( `core/lighting.ttslua` `L.DEFAULT_RECONCILE_LERP_SECONDS`.)_ _(TOR-59)_
- [x] Test-bed helpers to apply seat-light settings from Red to all active seats. _( `TestBed_applyPlayerSeatLightsFromRed`.)_ _(TOR-61)_
- [ ] **Centralize light modes** in `C.LightModes` for scenes, NPCs, and reconciler. _(TOR-81)_
- [ ] **Scenes/locations** drive global/seat light mode via state → `Scenes.reconcileFromState` / lighting reconciler (no dual apply). _(TOR-84)_
- [x] **Site skybox:** `sessionScene.siteKey` → `Scenes.reconcileSkyboxFromState` (`C.Sites[*].skyboxURL` or random `C.GenericSkyboxes` via `Backgrounds.setCustomURL`). _(TOR-58)_

## Scenes Panel & Scene State

- [x] Dark panel backgrounds, site modal layout, scene location as text, scene time controls, real-time clock toggle, chronicle weather removed, game-state overlay. _(See completed UI Panels items below.)_ _(TOR-63)_
- [ ] **District/site labels:** Keep Scenes panel display fields in sync with `gameState.sessionScene` after modal picks and library Apply. _(TOR-82)_
- [ ] **Site modal overlap:** Fix overlapping site buttons so district-specific rows are fully clickable (not covered by generic site bucket). _(TOR-83)_
- [x] **Site fog:** Site controls whether the fog object is enabled/disabled (`C.Sites.isTopFogActive` or indoor/outdoor default → `sessionScene.isTopFogActive` → `Scenes.reconcileTopFogFromState`). _(TOR-56)_
- [ ] **Site & district modifiers:** Apply to rolls (and possibly stats) only for characters marked **present** in the active scene/seat layout. _(TOR-85)_

## UI Panels

- [x] All Storyteller UI panels: dark background `rgba(0, 0, 0, 0.8)`. _(TOR-68)_
- [x] **Scenes Panel:** Site modal — district-unique sites above generic bucket. _(TOR-63)_
- [x] **Scenes Panel — Scene location:** District/Site as text from modals, not free-text inputs. _(TOR-63)_
- [x] **Scenes Panel — Scene time:** Month/day/time inputs + Apply; real-time clock toggle + speed multiplier. _(TOR-63)_
- [x] **Scenes Panel:** Chronicle weather and NPC role snapshot removed. _(TOR-63)_
- [x] **Player game-state overlay:** Center-top phase, date, time (`ui/shared/game_state_overlay.xml`, `core/game_state_overlay.ttslua`). _(TOR-62)_
- [ ] **Center-top overlay polish:** Scale down overlay; fix background image alignment/scaling. _(TOR-86)_
- [ ] **Weather on overlay:** Show weather icon/label on center-top overlay (aligned with chronicle/scene clock), not only Scenes panel. _(TOR-87)_
- [ ] **PCs panel:** Manually deactivate a PC (absent without removing data). _(TOR-88)_
- [ ] **PCs panel:** Set PC map location via popout modal (writes state, reconciles overlays). _(Open: same as `seatPresent`/district-site or separate map pin?)_ _(TOR-89)_
- [ ] **Start / End Session buttons:** Place on appropriate ST panels as placeholders. **End Session** will eventually run a defined sequence including **Silence for save**. **Start Session** sequence TBD. Minimal behavior until event lists are specified. _(TOR-90)_
- [ ] **Scrolling viewbox:** Author experimenting in TTS on scroll-container height — no implementation until after tinkering. _(TOR-91)_

## Character Sheets

_Blocked: author must define data binding approach before substantial implementation._

- [ ] **Page 4:** PC relationships; Blood Bonds. _(Partial: `lib/json/PC_Relationships.json`, `lib/pcs_data.ttslua`.)_ _(TOR-93)_
- [ ] **Page 5:** Projects; Equipment; Boons. _(TOR-99)_
- [ ] **Page 6:** Character history; scrolling XP log. _(TOR-92)_
- [x] **Decals:** Sheet object decals update from Blood Potency (state → UI reconcile). _(TOR-70)_

## Players & Connection

- [ ] **Auto seat/color on connect** from Steam ID (chronicle mapping). _(TOR-94)_
- [ ] **Play as NPC:** PC at table uses NPC sheet/figurine; `sessionScene.npcRoleOverride` / `seatSlots`; lighting exception per Scene Constructor spec ([Scene Constructor Overview](Scene%20Constructor/Scene%20Constructor%20Overview.md)). _(TOR-95)_

## Table Objects

- [ ] **Tarot hide:** `G.GUIDS.TAROT_BUTTON_PINK` / [`ui/ui_tarot_button.ttslua`](../ui/ui_tarot_button.ttslua) — when hiding the deck, return all drawn tarot cards to the deck first, then hide (no orphans on table). _(TOR-96)_

## New Features (pending design)

- [ ] **Desires** — placeholder; pending author details. _(TOR-97)_
- [ ] **Spotlight phase** — placeholder; pending author details. _(TOR-98)_
- [ ] **Memoriam toggle** — placeholder; pending author details (global LUT + HUD overlay per sync architecture, not a per-player light tier). _(TOR-101)_
- [ ] **Spotlight NPC distinction:** Use player color or other visual to distinguish spotlighted NPCs in-world and UI. _(TOR-100)_

## Agent Reviews

- [x] Author **reconciler contract** doc (when each `reconcile*` runs, reads, applies, must not write back). → [Reconciler Contract](Sychronizing%20Game%20Functionality/Reconciler%20Contract.md); Prompt 1 in [Agent Reviews/AGENT_REVIEW_PROMPTS.md](Agent%20Reviews/AGENT_REVIEW_PROMPTS.md) _(TOR-48)_
- [ ] Agent prompt: find **runtime object updates outside reconcilers** (dual-apply audit). → Prompt 2 in [Agent Reviews/AGENT_REVIEW_PROMPTS.md](Agent%20Reviews/AGENT_REVIEW_PROMPTS.md) _(TOR-102)_
- [ ] Agent prompt: find **invalid `getStateVal` / `getPlayerVal`** paths; draft fix plan. → Prompt 3 in [Agent Reviews/AGENT_REVIEW_PROMPTS.md](Agent%20Reviews/AGENT_REVIEW_PROMPTS.md) _(TOR-103)_
- [x] Agent prompt: **performance** hotspots (`Sync.full`, spawn pools, lighting lerps, UI refresh). → [Performance Audit](Sychronizing%20Game%20Functionality/Performance%20Audit.md); Prompt 4 in [Agent Reviews/AGENT_REVIEW_PROMPTS.md](Agent%20Reviews/AGENT_REVIEW_PROMPTS.md) _(TOR-50)_

## Out of Scope for Cursor

_Workshop save, external art, or design TBD outside the repo. Each row has a Canceled Linear issue under epic TOR-43 for traceability._

| Item | Notes | Linear |
|------|--------|--------|
| Reference images | The Court, Social Combat, XP, Physical Combat, Frenzy, Resonance, Recovery | TOR-105 |
| Impairment overlays | Health, Willpower, Humanity | TOR-104 |
| Face-to-face table | Layout/table variant in save | TOR-107 |
| Debug sound window | ST debug panel | TOR-106 |
| Hunting vs Resonance | Feeding/resonance mechanics | TOR-108 |
| Famulus & other cutouts | Art + spawn data in workshop | TOR-110 |
| Additional skyboxes | Sites/scenes | TOR-109 |
| Hunger / frenzy overlays | Art and tuning in workshop | TOR-111 |
| Tune seat lights | All table configs (use test-bed helpers in-repo when ready) | TOR-114 |
| Tune audio volumes | Emitters, weather, ducking in save | TOR-112 |
| Scene Constructor (Google Sheets) | Import/export workflow — author to define approach first | TOR-113 |
