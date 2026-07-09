# Running Tasklist for Toronto Rising Development

## Agent Routing

Read this when:
- deciding what work to start next via `/tr-start` or "what's next"
- keeping Linear, focus order, and active domain work aligned
- closing or moving tasklist items after implementation

Source of truth:
- Linear for issue status, blockers, and priority metadata
- `.cursor/skills/tr-start/SKILL.md`
- `.cursor/skills/tr-inbox/SKILL.md`
- `.cursor/rules/toronto-rising-linear.mdc`
- `.dev/INBOX.md` for raw capture before triage

Verification:
- every active bullet has a matching `TOR-*` Linear issue
- Focus order matches current Linear blocker/priority intent
- completed work is reflected in Linear and relevant docs

This file is continuously updated with issues and plans for feature development.

**Linear is primary project tracking.** Every bullet must have a matching Linear issue and `_(TOR-XX)_` id. Agents: follow [`.cursor/rules/toronto-rising-linear.mdc`](../.cursor/rules/toronto-rising-linear.mdc) — create/update Linear issues when adding or completing items; never leave this file and Linear out of sync. Audit trail: [`.dev/plans/linear-alignment-log.md`](plans/linear-alignment-log.md).

**Quick capture before items are shaped:** [INBOX.md](INBOX.md) — one-line notes only; say **“process the inbox”** to triage (agent promotes to Linear + this file when ready).

**What to work next:** skim **Focus** below, then say **“what’s next”** or pick the top unchecked Focus item. Re-stack Focus when priorities shift (after inbox triage, before a play session, or weekly).

---

## Focus

_Stack rank for the current cycle (2026-07-09 post `/tr-inbox`: **TOR-323** Clear Loading Overlay + **TOR-322** Toggle Lights shipped). **Precedence** = Focus stack + Linear **`blockedBy`** (not Linear priority). **TOR-141 (E2E playbooks)** is a living doc (In Progress, not Focus stack). **Back-burner / “Deferred this cycle” is paused** (author 2026-06-21) — open work stays in domain sections; sequence via Linear blockers only._

| # | Issue | Why now |
| --- | --- | --- |
| 1 | ~~**TOR-316** — Reverse live-roll tray motion~~ | Shipped 2026-07-09 — peers lower, roller stays |
| 2 | ~~**TOR-315** — NPC stage light before imageScalar rescale~~ | Shipped 2026-07-09 — defer align until bounds match scalar |
| 3 | **TOR-310** — Smooth preload spawn + ST Y=8 | Dice polish; unlocks **TOR-318** bag→arc choreography |
| 4 | **TOR-317** — Right-click ROLL auto-rolls | Small player UX win after tray/spawn stack |
| 5 | **TOR-309** — Difficulty-0 roll results display | Roll broadcast copy refinement |
| 6 | **TOR-312** — Narrative roll broadcast successes | Frenzy/etc. success count in broadcast |

**Also in cycle (below top stack):** **TOR-318** (spawn above bag → arc; **blockedBy** **TOR-310**). **TOR-244** (scenes library preview/edit). **TOR-303** (author review roll broadcast phrasing — External Todo). **TOR-144** (Multiplayer E2E playbook — multiclient pass via **TOR-249** human gate). **TOR-293** (absent player connect/disconnect presence; **blockedBy** **TOR-144**). **TOR-286**–**TOR-288** (visibility helper, companion toggles). **TOR-95** (play-as-NPC, **blockedBy** **TOR-247**).

**Done this cycle:** **TOR-324** (hotseat Red blindfold orphan after mid-transition seat leave; shipped 2026-07-09), **TOR-323** (Clear Loading Overlay — `active=false` so seat refresh cannot resurrect; shipped 2026-07-09), **TOR-322** (Toggle Lights ambient 0↔2 debug button; shipped 2026-07-09), **TOR-307** (startup loose-dice + ST tray restore — author verified 2026-07-09), **TOR-284** (execution model remediation — author hotseat/solo regression verified 2026-07-09; multiclient remains **TOR-144**), **TOR-308** (preload pool return + adopt-on-load reconcile — `94e3d25` + `dc7b50e`; author verified 2026-07-08, 264 `d10Preload` cap), **TOR-304** (Apply grow preflight before seat/placement commit; `567dcff`; author verified 2026-07-08), **TOR-311** (scenes panel NPC seat disable — only toggled seat; author confirmed 2026-07-08), **TOR-287** (dice preload pool — instant spawn recycle; startup warm), **TOR-296** (roll broadcast message audit doc + debug harness), **TOR-294** (rouse-only roll broadcast — main die row, author verified 2026-07-05), **TOR-302** (seated NPC ST roll drawer/spawn/light reposition — anchor-aligned, author verified 2026-07-05; `8c8e7dd` + `d4ce663`), **TOR-281** (stage Clear seat activation rules + live scene-library seat persistence — step-by-step playbook author verified 2026-07-05; commits `1291042`–`704273b`; solo Host only), **TOR-285** (connect-time / hotseat HUD visibility — global loading overlay + seat-assignment UI refresh, author verified 2026-07-05; hotseat wrinkles likely hotseat-only), **INBOX 2026-07-05 quick fixes** (Color Blitz + Jarvis Jacks coterie ref grid; seat-color gate on player dice bags + signal candles; ST roll panel click-hint font; secret ST roll tray reveal on **B** broadcast — extends **TOR-226**), **TOR-226** (secret Storyteller rolls — author Save & Play verified 2026-07-03), **TOR-225** (display strip canonical sort + ST tray ellipse spawn — author Save & Play verified 2026-07-03), **TOR-224** (ST roll panel selective dice reroll — Done 2026-07-03), **TOR-262** (single live PC roll — elevate live tray 5y before release; block peer Roll/Take Half until confirm), **TOR-259** (Willpower / Discipline / Humanity / Frenzy roll types — author verified), **TOR-260** (ST Roll Options modal roll-type selector + pool reset on type change — author verified; drawer stays open through type/pool resets), **TOR-279** (Storyteller Stats panel — PC + Coterie advantage editor), **TOR-280** (weather fades in on scene switch, no full-volume snap), **TOR-273** (new-location ambient fade-in starts as blindfold rises, 2s), **TOR-245** (map pins last active location + timestamp — Save & Play confirmed), **TOR-148** (RT clock acceleration — wall-time clock + ticker epoch guard), **TOR-274** (library Apply accepts dynamic Table B family key), **TOR-275** (stage control board syncs to seated NPCs on scene change), **TOR-276** (Table A minimap marker 180° rotation), **TOR-277** (palette-parked NPC tokens downscale to default), **TOR-278** (End scene clears seated NPC + Table B0), **TOR-272** (blindfold 1–22 randomization + overlay art changes), **TOR-268** (control-board table-only minimap), **TOR-269** (load soundscape dual-apply), **TOR-270** (weather volume-0 policy), **TOR-151** amend (no-scene Table B0 baseline — author confirmed 2026-06-26), **TOR-169** (NPC gameboard umbrella — Phase A/B verified Save & Play; stale workshop gate closed), **TOR-258** (dynamic Table B selection — author confirmed 2026-06-26), **TOR-267** (FACING Table C layout — author confirmed 2026-06-26), **TOR-255** (Blood Surge disables Take Half), **TOR-256** (PC seat deactivate syncs hosted conditions), **TOR-257** (figurine tooltips sync with visibility), **TOR-237** (control board Save / Lock / Load toolbar — Read→state only, Lock toggles `layoutLock`, Load mirrors placements past lock), **TOR-254** (PC keys excluded from NPC placement intent), **TOR-151** (default no-scene environment), **TOR-152** (Play load / Start→Play scene restore + control-board sync path), **TOR-252** (NPC roll broadcast figurine for duplicate fullName — prefer authoritative `npcCharacterKey` over ambiguous display-name lookup), **TOR-165** (WP reroll wave partial settle — per-die lock + panel refresh below cap, Confirm-only advance, cap auto-finish; author verified 2026-06-25), **TOR-253** (dice spawn-arc overflow layering), **TOR-236** (npc vs pc control-token contract — Apply-time PC seat activate/deactivate + NPC-only palette/preload), **TOR-83** (scenes site modal overlap — flowing VerticalLayout buckets), **TOR-251** (ST normal grid hunger offset labels), **TOR-240** (No Take Half player panel label), **TOR-241** (dice spawn arc RING_STEP 1.5), **TOR-242** (CONTROL_BOARD seat row lower-left). **TOR-162** (ST per-roll Opts modal persist/apply — author confirmed 2026-06-23) + **TOR-209** (roll panel active conditions display). **TOR-246** (ST POST_ROLL D/H/N pool modification on dashboard). **TOR-243** (block scene/table layout while loose dice on table — d10 guard). **canApplyManually** registry refactor (`db0f2b4`). **TOR-221** (initial host-authority hardening; execution model corrected by TOR-284; multiclient verification remains TOR-144). **TOR-233** (PCs panel HP/WP/Hum tracker rows — `pcs_track_*` 280px min/preferred, panel width 680; `npm run build` OK). **TOR-227** (palette parking snap Z offset — `parkingSnapLocalZOffset` 0.1 board-local +Z for group labels beneath tokens; `npm run build` OK). **TOR-214** (Oblivion Rouse prompt `Hunger or Stain?`; `oblivChoiceResolved` skips confirm recalculate so broadcast shows chosen outcome). **TOR-220** (Snaps toggle `textColor` on `syncControlBoardSnapsToggleLabel`). **TOR-218** (ST roll dashboard row XML templates — `ui/.templates/roll/` partials → build-time `roll_dash_generated.xml`; fixed pixel `offsetXY` layout; `npm run build` OK). **TOR-96** (Tarot hide returns drawn cards — `returnLooseTarotCardsToDeck()` sweeps `PinkObject`+`TarotDeck` loose cards into deck before off pose; `npm run build` OK; Pink Save & Play to confirm hide). **TOR-179** (unified NPC seat figurine identity — `SEAT_FIGURE_<seat>` GM Notes on pooled cutout, unified `postCorrectionsBySeatRole`, anchor dual-path removed; author confirmed seat/rotate/unseat + duplicate audit clean 2026-06-15). **TOR-181** (retire Storyteller NPC toolbar panel — removed `panel_npcs`, generator, dispatch/refresh paths; control board is sole ST NPC UI). **TOR-201** (gameboard frame hitch — author confirmed perf largely addressed 2026-06-15). **TOR-173** (lerp stage moves on Apply — anchor-family batching, leader-first stagger, unified timeline, immediate light apply; author confirmed 2026-06-15, commit `81d3710`). **TOR-174** (NPC token on ST dice bag → roll — restore home from state + `STR.initiateFromBagLabel`; bag proximity 3″, ST color early gate, local-order fix; author confirmed 2026-06-15). **TOR-178** (seat ↔ stage figurine transfer — homeland retained on stage, Clear re-seats, leaves visible + homeland spotlights OFF when stage-bound, pooled spotlight defer/park fixes; author confirmed 2026-06-15). TOR-202 (duplicate CONTROL_BOARD table model — inactive markers stashed at Y=-200 on table switch; author confirmed 2026-06-15). TOR-210 (Apply seat snap seats NPC at table — `commitNpcSeatLayout` forces `RSL.SyncTable`; author confirmed 2026-06-15). TOR-154 (C.LockedObjects interactable lock — nil-hole `DICE_DRAWER_STORYTELLER` + startup-gate apply; author confirmed 70/70). TOR-200 (seat snap Y-rotation — board-local Y=180° offsets CONTROL_BOARD world Y=180°; author confirmed). TOR-199 (seat-row token scale 0.7 on seat snaps, 0.2 polar; drop-handler scale revert). TOR-198 (Rouse check Roll doubles staged dice — `spawnMissingPoolDiceForColor`, author confirmed resolved). TOR-197 (event listener O(1) gates + Event Listener Policy). TOR-180 (control-board seat-assignment snap row — assign/presence/Clear homelands). TOR-172 (palette-drop ring `defaultLightMode` flip + stage light preview). TOR-175 (anchor family spread center-out alternating). TOR-155 (roll panel pool dots color coding). TOR-164 (Dice-E2E harness + doc). TOR-138 (silence-for-save no longer wipes soundscape state; load branch → TOR-152). TOR-141 baseline shipped (`.dev/E2E Playbooks/`); issue stays **In Progress** as living doc (`living-doc` label). TOR-159 (frenzy at hunger 5 threshold). TOR-158 (Blood Surge + conditions). **TOR-169 session:** circular-require load fix, Z-axis token flip, placements-only reconcile + byArea migration (`a0271ac`). **TOR-170/171:** load token mirror + master-origin figurine yaw (`5c3d37b`). **TOR-176/177:** Host-only control-board XmlUI + hide workshop seat-figure anchors (`b58e2fb`).

**Ongoing (not Focus stack):** TOR-141 — maintain E2E playbooks when dice/scenes/debug testing changes.

**Resurfaced this cycle:** _(none — TOR-96 gate closed 2026-06-15)_

**Deferred this cycle:** _Paused (author 2026-06-21 — no back-burner surfacing mechanism yet). Open bullets stay in domain sections below; use **Focus** + Linear **`blockedBy`** for work order._

**How blocked work unblocks:** Linear **`blockedBy`** on the waiting issue; when a prerequisite is **Done** or **Canceled**, agents remove stale blockers and may re-stack **Focus** (`/tr-inbox`, **“what’s next”**, **`/tr-start`**). Gate-close resurfacing survey still applies when Focus prerequisites finish.

---

## Dice Roller

- [x] Roll conditions set on rolls via the Storyteller control panel are not persisted and do not apply to rolls. _(Addressed: `roll_ui.ttslua` `uiToggleGet` normalizes Toggle `isOn` from string/boolean/number so Apply writes correct booleans.)_ _(TOR-54)_
- [x] Automatic camera repositioning during the roll sequence is inconsistent. Should be modeled off of how the camera controls are applied in the Admin Debug panel (since they work flawlessly). _(Addressed: `main.ttslua` `M.setCamera` now applies `lookAt(intermediateCameraData)` before the final preset.)_ _(TOR-57)_
- [ ] **Roll baton-pass camera (remaining):** Too many camera applications during the rolling handoff, including some that reapply the current angle; cuts are jumpier than Admin Debug Camera or Camera PC controls. Audit the roll pipeline and route roll-time switches through the same code path as those controls. _(TOR-72)_
- [x] **Take Half redesign:** Available on any roll without difficulty. Synthetic result = half the pool size in **normal successes (rounded down)**, remainder **blank**, all treated as normal dice (Hunger dice count toward pool size but do not use Hunger faces). Example: pool 13 → 6 successes, 7 blanks. **Broadcast:** show full-pool dice images as normal dice — half with one success face, rest blank (no numeric roll text). **Dice-E2E H2:** rouse dice must await player throw after Take Half — not auto-parse on settle. _(TOR-73)_
- [x] **Roll panel pool dots color coding:** Restore kind colors (normal white, hunger red, rouse dark red offset left, obliv-rouse purple, werewolf yellow-green, rage orange). One dot group per pool kind (`pool.rouse` = single rouse check). _(TOR-155)_
- [x] **Dice bag clicks + Blood Surge rouse isolation:** Hunger no-op without roll; surge on + Hunger L adds `bloodSurgeRouse`; Hunger R removes one surge rouse then full undo; manual rouse coexists; bag enable/disable (Hunger default off; Rouse/Obliv mutual). _(TOR-161)_
- [x] **Roll broadcast without difficulty:** Unset difficulty → default 1 for display; show dice images + successes; omit margin. _(TOR-163)_
- [x] **Roll result broadcast trim:** Fullscreen `rollRes_*` panel — split header, figure cutout, offset rouse strips, standard dice row; `UI.show`/`UI.hide` fade. _(TOR-156)_
- [x] **WP reroll wave partial settle:** Count randomized dice; lock each die after settle; **Confirm** during WP **ROLLING** wave; wave must end at cap or early confirm. Found Dice-E2E I1. Author verified 2026-06-25. _(TOR-165)_
- [x] **ST normal pool grid labels include hunger offset:** Normal strip cell labels shift by selected hunger count to show total pool on click; default hunger strip 1–4. _(TOR-251)_
- [x] **NPC roll broadcast figurine for duplicate fullName:** Garou/human pairs share display name — broadcast now prefers authoritative `npcCharacterKey` on the active roll/history (threaded from control-token-on-bag → `STR.initiateNpcRoll`); display-name lookup retained for free-text bag modal. `core/roll_ui.ttslua`, `core/roll_controller.ttslua`, `core/storyteller_rolls.ttslua`, `core/npc_gameboard.ttslua`. _(TOR-252)_
- [x] **Blood Surge + conditions:** Blood Surge uses `EffectiveStats.forSeat` → `bloodPotencyDerived` for surge dice count; fresh `rollPolicy()` at activation for `bloodSurgeDiceMultiplier`. _(TOR-158; facade in TOR-160)_
- [x] **Effective stats facade:** Unified read-time API (`lib/effective_stats.ttslua`); derive alignment; migrated roll/damage/HUD/sheet consumers. _(TOR-160)_
- [x] **Frenzy hunger threshold:** Queue frenzy only when hunger is already at 5 and would increase further — not on first transition to 5. `maybeQueueFrenzyOnHungerCap` gates on `hungerBefore >= C.MAX_HUNGER`. _(TOR-159)_
- [x] **No Take Half player panel label:** PRE_ROLL copy omits Take Half when `noTakeHalf` roll condition disables option. _(TOR-240)_
- [x] **Player dice spawn arc radii:** `RING_STEP` 2 → 1.5 in `objects/dice_bag.ttslua`. _(TOR-241)_
- [x] **Dice spawn-arc overflow layering:** cap 10 dice/arc; extras stack onto higher (+2 y), slightly-larger concentric arcs so dense pools stop scattering on unlock (player + ST). `objects/dice_bag.ttslua` `worldArcPoint`. _(TOR-253)_
- [x] **Blood Surge active disables Take Half:** `canHalf` / `phaseLabel` + `RC.takeHalf` guard when `meta.bloodSurgeActive`. _(TOR-255)_
- [x] **Willpower, Discipline, Humanity, Frenzy roll types:** PCs panel + auto-populate + roll policy per type. _(TOR-259)_
- [x] **ST Roll Options dash — roll-type selector rows:** Wire modal button rows; exclusive active class; pool reset on type change; hide O-Rouse without bag. `blockedBy` **TOR-259**. _(TOR-260)_
- [x] **Single live PC roll:** One live roll at a time; elevate live tray +5y before release; block Roll/Take Half on other PRE_ROLL seats until confirm. `lib/pc_roll_tray_lower.ttslua`, `RC.startRolling` / `takeHalf` / `initiateRoll` / confirm + cancel cleanup. _(TOR-262)_
- [ ] **Extended Tests:** An "extended test" is a series of rolls, with each roll contributing to a Running Total until a Target (defined by the Storyteller) is met, or the Storyteller stops the test early for any reason. There are four types of extended tests -- Standard, Series, Hard and Cascade -- which define what the Running Total and Target count, and how each roll adds to the Running Total. When the process stops, the final result is a Win if the Running Total equals or exceeds the Target, or a Failure otherwise. _(TOR-74)_
  - **Standard:** The Target represents a total number of successes that the player's Running Total must meet. Each roll contributes its successes to the Running Total. Each roll is made against a Difficulty of zero (i.e. each roll contributes all of its successes to the Running Total).
  - **Series:** The Storyteller defines a Difficulty that applies to each roll the player makes. The Target represents the number of successful rolls the player must make (i.e. rolls where successes equal or exceed the Difficulty). Successes are not counted, only Wins.
  - **Hard:** A combination of Standard and Series: The Target represents a total number of successes, but a Difficulty _is_ applied to each roll, and only the margin on each roll contributes to the Running Total. Failures (i.e. negative margins) do not subtract from the Running Total.
  - **Cascade:** As Standard, with two changes. First, the number of successes on each roll becomes a positive modifier to the dice pool of the next roll. Second, if any roll fails, the test ends immediately in failure.
- [x] **Oblivion rouse checks:** Finish end-to-end (`C.RollType.ROUSE_OBLIVION` — UI, validation, result handling). _(Shipped in dice pt.2: TOR-51, TOR-131; in-game verification recommended.)_ _(TOR-75)_
- [x] **Rouse check Roll doubles pool:** Clicking Roll after PRE_ROLL staging spawns duplicate Rouse/Obliv-Rouse dice (pool doubles). _(TOR-198 — `spawnMissingPoolDiceForColor`; author confirmed resolved 2026-06-14.)_
- [x] **Oblivion Rouse copy:** Prompt `Hunger or Stain?`; post-choice broadcast `Hunger Roused` / `Stained` (not stuck on choose prompt). _(TOR-214)_
- [x] **ST roll panel selective reroll:** Clickable dice images on ST dashboard; highlight + Reroll button; map to physical dice; no ST reroll caps (hunger OK, repeat until Confirm). _(TOR-224)_
- [x] **ST dice tray ellipse spawn:** Drawer center X/Z + playable-surface ellipse (bounds shrink, edge + die-footprint inset, 10/8/6 rings); author Save & Play verified 2026-07-03. `lib/st_dice_tray_spawn.ttslua`, `GlobalRepositionStorytellerTrayDice`.
- [x] **Dice display strip sort order:** Canonical face ordering on player/ST panels + broadcast; werewolf Rage Jaws pairing (floor(n/2)*2 front, odd jaw at end). Author verified 2026-07-03. _(TOR-225)_
- [x] **Secret Storyteller rolls:** Right-click Roll hides dice from players (~0.5s after randomize); right-click Confirm/Take Half suppresses auto broadcast; dashboard slot **B** manual broadcast; click hint on `rollPanelST`. Author Save & Play verified 2026-07-03. _(TOR-226)_
- [x] **REMORSE roll pool lock + phase label:** Bag clicks no-op; player phase copy **Roll When Ready**. _(TOR-289)_
- [x] **ST roll dash — broadcast button persistence:** B on all confirmed ST slots + PC snapshot rows until replaced; re-broadcast supported. _(TOR-292)_
- [x] **Rouse-only roll broadcast — main dice row:** Pure Rouse/Obliv-Rouse checks show dice in `rollRes_die_*`, not corner rouse panel. Author verified 2026-07-05. _(TOR-294)_
- [x] **Roll broadcast message audit:** Catalog broadcast copy by roll type, result class, and exceptions (no difficulty, etc.). `.dev/Dice System/Roll Broadcast Messages.md` + `DEBUG.rollBroadcastMessageAudit()`. _(TOR-296)_
- [x] **Seated NPC ST roll — reposition drawer, spawn circle, tray light:** When ST rolls for an NPC at an active table seat, move the chosen ST dice drawer (via `DICE_DRAWER_STORYTELLER_NPC<#>` anchors), spawn circle, and matching dice light in front of that seat; restore default ST drawer/light positions on roll clear. Author verified 2026-07-05 (off-anchor light + spawn center). _(TOR-302)_
- [x] **Preload parked dice pool:** Off-table invisible pool per die type; recycle on roll spawn to avoid placeholder flash while meshes load. `core/dice_preload_pool.ttslua` + Global claim/return; dice bags use pool before takeObject. _(TOR-287)_
- [x] **Startup loose-dice cleanup:** Destroy loose d10 on table + stow trays before startup table sync; preserve d10Preload pool. PC trays: scale-based detect; ST drawers: `STD.reconcileAllToWorkshopHome` restores workshop X/Y/Z + tray light. Author verified 2026-07-09. _(TOR-307)_
- [x] **Preload pool return regression:** Used dice must return to pool (12/bag); only overflow spawns destroyed on resolution. Table/tray sweeps use `DPP.releaseOrDestroy`; bag cleanup before tag sweep. Adopt-on-load `reconcileAllParkedFromWorld` prevents Save & Play pool duplication. Author verified 2026-07-08. _(TOR-308)_ _(TOR-287 amend `dc7b50e`)_
- [ ] **Smooth preload-pool spawn + ST Y=8:** Non-teleport claim from pool; ST spawn raised to y=8 before unlock. _(TOR-310)_
- [x] **Reverse live-roll tray motion:** Keep rolling player's tray in place; lower other players' trays while a roll is live (amends **TOR-262** elevate-live behavior). _(TOR-316)_
- [ ] **Right-click ROLL auto-rolls:** Player roll panel right-click ROLL immediately rolls the staged pool. _(TOR-317)_
- [ ] **Spawn above bag then smooth-move into arc:** Dice appear above bag first, then smooth-move into staging arc. `blockedBy` **TOR-310**. _(TOR-318)_
- [ ] **Difficulty-0 roll results display:** No difficulty/margin; successes-focused copy for opposed/extended contests (refines **TOR-163**). _(TOR-309)_
- [ ] **Narrative roll broadcast successes:** Frenzy/Willpower/etc. show success count + difficulty; split from hidesDifficulty margin strip. _(TOR-312)_
- [x] **Open player dice tray on roll initiate:** Tray on player bag click + ST `openRoll`; ST SETUP defers bags/tray; `changeRollType`→PRE_ROLL opens tray. Author verified 2026-07-08. _(TOR-305)_
- [x] **Take Half auto-broadcast:** Pure Take Half confirms/broadcasts without extra Confirm; tray force-closes on cleanup. Author verified 2026-07-08. _(TOR-306)_
- [x] **Hunger 5 voluntary rouse lockout:** At Hunger 5, Blood Surge + Obliv-Rouse locked; forced standard Rouse allowed; failed rouse → Frenzy Resist D4 queue. _(TOR-203 — 2026-06-15)_

## Camera

- [x] Nudge the **Red** player **`sheet`** preset slightly farther back on **Z** (away from table center) so the center-top game-state overlay does not block the top of the character sheet. _(TOR-78 — 2026-06-15)_

## NPC Spawning

See also [NPC Object Overview](NPC%20Object%20Spawning%20%26%20Spotlighting/NPC%20Object%20Overview.md).

- [x] **Preload pool:** Workshop-baked `npc_figurine` objects in preload grid (y = -200); runtime audit only (`NPCS.auditPreloadPoolFigurines`). Supersedes runtime spawn via `ensureAllNpcsPreloaded`. _(TOR-60)_
- [x] **Seat spawn:** Pooled figurine uses seat `*Object` tag + `SEAT_FIGURE` rotational layout; `postCorrectionsBySeatRole`; area spotlight hidden at seat; workshop `SEAT_LIGHT_*_NPC*` only. _(TOR-64)_
- [x] **Seat tags:** `npc_figurine` ↔ `NPCnObject` on seat/unseat; layout matches pooled figurine by tag + `Figurine_Custom` (`NPCS.isPooledFigurineObject`). _(TOR-65)_
- [x] **Group spawn exclusion:** When spawning an NPC group into a stage area, do not pull members who are already seated (e.g. `fiveKeys` spawn must leave `myleneHamelin` in her table seat). _(TOR-76)_
- [x] **Storyteller NPC gameboard (Phase A/B):** `STAGE_BOARD` + `CONTROL_BOARD`, tokens, markers, configurable `CONTROL_BOARD_SNAP` grid (~160 snaps), Apply/Clear wired; `placements` v3 + `Sync.npcs`. Phase B: **TOR-237** (Read/Lock/Load), **TOR-238** (hover stage figurine spotlight). Phase C panel retirement Done (TOR-181). Author Save & Play verified 2026-06-26. _(TOR-169)_
- [x] **Control token tag contract:** Handler matrix + `pcToken:<Color>` identity; Apply-time PC seat activate/deactivate from seat-row flip → `seatSlots[color].isPresent`; reconcile pins PC token to column (state authoritative); NPC-only palette/preload via `D.getNpcCharacters()`. Full token-as-sole-authority deferred to **TOR-247**. _(TOR-236)_
- [x] **Control board Save / Lock / Load:** XmlUI toolbar wired — Save→placements state only (board→state), Lock toggles `layoutLock`, Load mirrors tokens (state→board, bypasses lock). _(TOR-237)_
- [x] **Hover token → stage figurine spotlight preview:** Hold bound Game Key **Spotlight NPC (hold)** and sweep over on-board `npc_control_token` tiles → transient stage figurine SPOTLIGHT + storyteller board indicator at token X/Z; no `gameState` writes (`L.applyTransientLightMode`). Not game-phase Spotlight (TOR-98). _(TOR-238)_ — author Save & Play smoke pending
- [x] **Control board tokens on load:** Mirror on-stage NPCs from `sessionScene.npcWorld.placements` (exact u,v + Z flip); pull from palette via tag scan; palette onLoad no longer parks all tokens. _(TOR-170)_
- [x] **Figurine yaw from master origin:** `Gameboard.placementBoardRelYawDeg` uses top-level `CONTROL_BOARD_SNAP.origin`; stage figurines + Apply scan ignore token Y; Z flip only for light mode. _(TOR-171)_
- [x] **`snapGroups.defaultLightMode`:** Optional per-ring default; apply Z flip only when token drops from palette onto that ring (not ring-to-ring or state sync). _(TOR-172)_
- [x] **Lerp stage placement moves (Apply only):** Stage→stage and same-snap light toggles involving `STANDARD` animate via single orchestrator on Apply; anchor-family grouping, leader-first stagger, `sineInOut` position/yaw, light G/H timing. Tunables `D.STAGE_PLACEMENT_LERP`. _(TOR-173 — author confirmed 2026-06-15, commit `81d3710`)_
- [x] **Anchor family spread order:** On anchor drop, sibling tokens fill family snaps center-out by group slot index, alternating sides. _(TOR-175)_
- [x] **Control board seat-assignment row:** Nine snaps (NPC4…NPC3); present/absent flip on NPC seats; assign/unassign via Apply; Clear keeps seated tokens / homelands stage→seat. _(TOR-180)_
- [x] **Seat ↔ stage figurine transfer:** Same figurine table↔stage; retain `occupiedNPCSlots` on Apply; Clear returns to seat; `figurine.scale` on cutout. Stage-bound: homeland chair + table leaves visible; homeland seat spotlights OFF; pooled spotlight defer (stage Y) + park to preload on re-seat. _(TOR-178)_
- [x] **Retire Storyteller NPC toolbar panel:** Removed `toggle_npcs`, `panel_npcs*`, generator, `HUD_npc*` handlers, and `NPCS.refreshStorytellerUI*` / dispatch paths; CONTROL_BOARD is sole ST NPC UI. _(TOR-181 — 2026-06-15)_
- [x] **Control board XmlUI Host-only:** Apply/Clear toolbar `visibility="Black|Host"` on `gb_root`. _(TOR-176)_
- [x] **Duplicate SEAT_FIGURE on scene activate:** Step Four hides workshop `SEAT_FIGURE_*` anchors; only pooled figurine gets presence visibility. _(TOR-177 — superseded by TOR-179 ghost removal + unified identity)_
- [x] **Unified NPC seat figurine identity:** Pooled cutout uses `SEAT_FIGURE_<seatKey>` GM Notes when seated (same as PCs); unified `postCorrectionsBySeatRole`; removed NPC-only layout anchor paths. Author confirmed seat/rotate/unseat + duplicate audit clean — no separate ghost meshes in save. _(TOR-179 — 2026-06-15)_
- [x] **Widen Far Left / Far Right NPC angles:** Canceled — superseded by TOR-169 gameboard. _(TOR-166)_
- [x] **Mid-Center + Far-Center NPC areas:** Canceled — superseded by TOR-169. _(TOR-167)_
- [x] **NPC area cutouts on scene apply:** Mis-nested `npcWorld` at import root (spreadsheet JSON) left `sessionScene.npcWorld.byArea` empty — scene apply/reconcile was fine when data was nested correctly. Fixed spreadsheet; import validator now rejects unexpected root keys (no hoisting). _(TOR-135)_
- [x] **ST rolls dice for NPCs:** Control-board token on ST dice bag → `STR.initiateFromBagLabel` (TOR-174); ST dashboard roll pipeline; ST roll camera intentionally no-op for Black. _(TOR-79 — 2026-06-15)_
- [x] **NPC token on ST dice bag:** Drop control token on dice bag → roll for that NPC with bag type; token returns to committed home (placement, homeland seat row, or palette). _(TOR-174 — author confirmed 2026-06-15.)_
- [x] **ST token-on-bag roll type mapping:** Bag kind → roll type (Hunger→Discipline, Werewolf bag→Willpower, Rage→Frenzy, etc.); `Werewolf`-tagged tokens → Werewolf on any bag. NPC + PC control tokens; `STR.rollTypeForStorytellerBagDrop`. _(TOR-283)_
- [x] **Seated snap row token scale:** Seat snaps `{0.7,1,0.7}`; polar/palette/off-board `{0.2,1,0.2}` on pick-up, drop, and mirror. _(TOR-199 — author confirmed 2026-06-15.)_
- [x] **Seat snap Y-rotation:** Board-local **Y=180°** (`snapYawOffsetDeg`) on nine seat-row snaps offsets CONTROL_BOARD world Y=180°. _(TOR-200 — author confirmed 2026-06-15.)_
- [x] **Apply seat/table snap doesn't seat NPC:** `commitNpcSeatLayout` → `RSL.SyncTable({ force = true })`; layout fingerprint no longer skips in-area occupants on Apply. _(TOR-210 — author confirmed 2026-06-15.)_
- [x] **Seated NPC scale reset on refresh:** Canceled — scale `postCorrectionsBySeatRole` not needed; Y correction only in `C.TableSourceObjects`. _(TOR-215 — descoped 2026-06-15.)_
- [x] **Gameboard frame hitch (Apply/Clear):** Tier 1 cache/profile + follow-up perf pass; author confirmed largely addressed. _(TOR-201 — 2026-06-15)_
- [x] **Duplicate table model on board:** Inactive `gameboard_table` markers stashed at `MARKER_STASH_WORLD_Y` when `tableKey ~= currentTableKey`. _(TOR-202 — author confirmed 2026-06-15.)_
- [x] **Snaps toggle text color:** Reset `gb_snaps` label to `#FFFFFF` on every `UI.setAttributes` refresh (TTS reverts to black). _(TOR-220 — 2026-06-21)_
- [x] **Seated NPC active scale 53:** Set figurine ImageScalar 53 at table seat; restore `npcs_data` `figurine.scale` on unseat/stage/preload. _(TOR-223)_
- [x] **Palette parking snap Z offset:** Nudge token parking snaps toward vMax for group labels beneath (`parkingSnapLocalZOffset` default 0.1). _(TOR-227)_
- [x] **CONTROL_BOARD seat row lower-left:** Seat-assignment snaps at v=0.12, u=0.05–0.35 (center ≈ 0.2). _(TOR-242)_
- [x] **NPC spotlight Y on seat→stage:** Seated NPC moved to lit stage placement — spotlight spawns at feet instead of bounds-aligned Y. _(TOR-234 — seat→stage ImageScalar defer; scalar>53 face +24 / position +12 @63)_
- [ ] **Stage control token Description JSON stats + ST roll panel:** Token Description holds optional JSON (`hunger`, `health`, `willpower`, `commonRolls`); seed from `npcs_data.ttslua`; ST roll panel shows trackers + common-roll buttons with auto-hunger. _(TOR-282)_
- [x] **Stage control board Unlocked button font:** `fontSize="32"` / `preferredWidth="180"` on `gb_lock`. _(TOR-290)_
- [ ] **Rotational seat index layout:** Dynamic PC seat positions by presence-sorted index; hand-position reference for color-tagged objects. _(TOR-247)_
- [x] **Deactivated seat when NPC on stage:** Apply sets `isPresent = false` when homeland character gains `placements` row; retain `occupiedNPCSlots`; Clear re-seats; import validates active seat+stage (reject) vs inactive dual (allow) + duplicate seat assignment. _(TOR-250)_
- [x] **Apply/Clear off-seat light flicker:** RSL layout sync no longer eager-writes NPC homeland workshop lights; Step Four `L.reconcileForPlayer` for all assigned NPC seats (state-derived OFF for deactivated/stage-bound). _(TOR-265)_
- [x] **Stage Clear seat activation rules + live scene-library persistence:** On Clear from stage, set returning seat by staged light mode (Case 1 disabled→activate if stage light `Standard`; Case 2 enabled stays enabled), not the library default; ST seat activate/deactivate writes back to the active scene library row so progress restores on re-apply. Author verified via step-by-step playbook 2026-07-05. _(TOR-281)_
- [x] **Control board Apply dice-guard retry:** Aborted Apply (dice on table) must not fingerprint-skip retry after dice cleared. Preflight grow+dice before seat/placement commits. _(TOR-304)_
- [x] **NPC stage light before imageScalar rescale:** Seat→stage spotlight bounds calculated before figurine ImageScalar restore — defer light placement until after rescale. _(TOR-315)_
- [x] **Figurine tooltips sync with player visibility:** Pooled figurines disable tooltips when `setInvisibleTo` hides from PCs. _(TOR-257)_

## Soundscape

- [x] On load, emitters automatically play tracks from the last save. _(Mitigation: **Silence for save** on Sound panel → `Soundscape.prepareEmittersForSave()`; fold into End Session sequence when defined.)_ _(TOR-71)_
- [x] **Background music policy:** In any phase **other than Session Start**, background music should always play. When the active site or scene specifies no music, default to the **`Main`** playlist (`lib/soundscape_catalog.ttslua`). _(TOR-77)_
- [x] **Site weather ducking:** Site `weatherDucking` applies via `state.siteWeatherDucking` regardless of indoors/outdoors. _(TOR-80 — 2026-06-15)_
- [x] **Thunder indoor ducking:** `triggerThunder` uses `weatherVolume()` like rain/wind. _(TOR-150 — 2026-06-15)_
- [x] **Weather audio burst on scene switch:** Silent stub + zero gain before looping clip swap; one-frame deferred volume arm; rain/wind hold same effect without restart; library Apply defers `markReconciledToCurrentState` after weather apply. Author verified on scene switch. _(TOR-136)_
- [x] **Soundscape resync after load:** **Silence for save** no longer wipes `gameState.soundscape` via `stopAll`; load reconcile applies preserved scene audio until **TOR-152** adds explicit active-scene vs Main-only load branch. _(TOR-138)_
- [x] **Soundscape fade on blindfold down:** Staged scene transition (`HUDBF.runStagedTransition`, `U.RunSequence`): blindfold-down fades BGM + location + weather out (~1s, `Soundscape.fadeOutTransitionAmbient`), heavy reconcile runs alone, then new audio fades in (~1s transition fade window) before the settle/lift. Weather: full fade-out on track change, duck to lower volume on same-track mismatch (hold preserved). Applies to library **Apply** and **End scene**; location-only Apply keeps its standard ~4s crossfade. _Author confirmed Save & Play; multiclient unverified (TOR-144)._ _(TOR-147)_

## Lighting

- [x] Reconciler lighting updates lerped (default 2s). _( `core/lighting.ttslua` `L.DEFAULT_RECONCILE_LERP_SECONDS`.)_ _(TOR-59)_
- [x] Test-bed helpers to apply seat-light settings from Red to all active seats. _( `TestBed_applyPlayerSeatLightsFromRed`.)_ _(TOR-61)_
- [ ] **Storyteller dice tray lights:** Keep `storytellerDiceLight1`–`3` OFF in steady state; only ON during live ST roll in matching drawer (`LIGHTMODES_REGISTRY_KEYS_ORDERED` currently forces STANDARD). _(TOR-149)_
- [x] **NPC figurine light placement:** Point straight down (`rotation 0,0,0`); +5u above bounds top; +3u inward toward table origin in `buildResolvedLightModeTable`. _(TOR-266)_
- [ ] **Centralize light modes (`C.LightModes`):** Remove legacy keys (`BRIGHT`, `DIM`, `TENSION`, `STANDARD`, `AdminDark`, `AdminStandard`, `AdminBright`, `AdminDebug`); update `DEBUG`/`DARK`; Scenes panel dynamic 5-wide preset grid (all keys; active = green bg / white text). **`L.LIGHTMODES` unchanged.** _(TOR-81)_
- [ ] **Scene light modes as color tones:** Rename/reshape scene presets to tone keys (`AmberBright`, `AmberDim`, `AmberDark`, `BlueBright`, `GreenBright`, `WhiteBright`, …). `blockedBy` **TOR-81**. _(TOR-320)_
- [ ] **Subtle scene LUTs:** Light-touch LUTs for atmosphere; Memoriam sepia first (coordinate with **TOR-101**). `blockedBy` **TOR-81**. _(TOR-321)_
- [x] **Scenes/locations** drive global/seat light mode via state → `Scenes.reconcileFromState` / lighting reconciler (no dual apply). _(TOR-84 — 2026-06-15)_
- [x] **Site skybox:** `sessionScene.siteKey` → `Scenes.reconcileSkyboxFromState` (`C.Sites[*].skyboxURL` or random `C.GenericSkyboxes` via `Backgrounds.setCustomURL`). _(TOR-58)_
- [x] **Scene skybox override:** Optional `sessionScene.skyboxOverride` (URL) on Scene Constructor import + library/live state; reconciler prefers override over site/generic. _(TOR-313)_

## Scenes Panel & Scene State

- [x] Dark panel backgrounds, site modal layout, scene location as text, scene time controls, real-time clock toggle, chronicle weather removed, game-state overlay. _(See completed UI Panels items below.)_ _(TOR-63)_
- [x] **District/site labels:** Scenes panel labels sync via `U.setAttribute`; site pick derives `districtKey` from `C.Sites`. _(TOR-82 — 2026-06-15)_
- [x] **Site modal overlap:** Site-modal buckets are flowing `<VerticalLayout>` containers, not stretched `<Panel>`s, so the active district bucket and generic bucket stack without overlap and stay fully clickable; district buckets render above general sites. Generator `renderSiteModalBody`. _(TOR-83)_
- [x] **Sites import — unicode minus in offsetXY:** `.dev/scripts/normalize_sites_offset_xy.js` normalizes U+2212 → ASCII `-`. _(TOR-137 — 2026-06-15)_
- [ ] **Scenes panel UI trim + 3-column library:** Remove instructional copy; scene buttons show name + status only; three-column grid. _(TOR-139)_
- [ ] **Apply active scene — four clock buttons:** Replace single switch button with Apply (scene clock), Apply x5 until present, Apply = PRESENT, Apply (Present); all apply full scene. _(TOR-142)_
- [x] **Default no-scene environment:** When no live library scene — Table B0 (dynamic `Table B`, zero NPC seats), five PC seats, empty NPC world/stage, OutdoorDim, Main BGM, cleared location/weather on table (do not write cleared location to library or PC pins); overlay blanks date/time + hides weather; map pins hidden (`SceneLibrary.hasLiveSceneOnTable`); random generic skybox. `Scenes.applyDefaultNoSceneEnvironment`; converges `endSceneNarrative`. _(TOR-151)_
- [x] **Restore scene on Play load / Start→Play:** `Scenes.reconcilePlaySessionOnEnter` on startup gate (Play/Downtime) + `M.advancePhase`; restores active scene (`lastAppliedKey`) via `restoreActiveSceneWorld` (soundscape site+narrative+chronicle weather) or applies default no-scene; control board via `Sync.full` force. _(TOR-152)_
- [ ] **Animated narrative clock fast-forward:** Ease-in/out lerp to target date; overlay updates each frame during time jump (future/past). _(TOR-222)_
- [x] **End scene library sync:** `detachLiveTableFromLibraryMirror()` before clearing live location — stops mirroring, clears `lastAppliedKey` + `activeKey`, UI hides mirroring when no on-table scene; prevents live→library writeback of cleared keys. _(TOR-145)_
- [x] **Delete active scene:** Deleting live `lastAppliedKey` row calls `endSceneNarrative` first. _(TOR-146 — 2026-06-15)_
- [ ] **Pre-Apply seat presence modal:** Before blindfold scene transition, ST modal with per-seat present/absent toggles so PCs can be left behind at prior location. _(TOR-157)_
- [x] **Real-time clock too fast (intermittent):** `ensureTicker` no-ops when already armed; stop before re-arm on Apply/load/clock Apply. _(TOR-148 — 2026-06-15)_
- [x] **Site fog:** Site controls whether the fog object is enabled/disabled (`C.Sites.isTopFogActive` or indoor/outdoor default → `sessionScene.isTopFogActive` → `Scenes.reconcileTopFogFromState`). _(TOR-56)_
- [x] **Site & district modifiers:** Apply to rolls (and stats) only for characters marked **present** in the active scene/seat layout (`Conditions.reconcileHostedForSession` + `isSeatPresentInScene`). _(TOR-85 — 2026-06-15)_
- [x] **PC seat deactivate syncs hosted conditions:** `seatSlots.isPresent` honored in `L.isPlayerPresentInActiveSeatLayout`; gameboard Apply calls `reconcileHostedForSession` on PC seat change. _(TOR-256)_
- [x] **Scene `conditions` import:** Replace `sessionScene.rollDefaults` with `conditions` array (registry ids, `kind = scene`); unified hosted reconcile (`location` + `scene`); import hard-rejects `rollDefaults`. _(TOR-239)_
- [x] **Automatic table selection (Phase 1):** `Table B` family key → `Table B<N>` by occupied NPC seat count (B0–B4; B5 manual-only); grow-only on control-board Apply; Scenes panel buttons Table A / Table B / B0–B5 / Table C; removed bare `Table B`. Author confirmed Save & Play 2026-06-26. _(TOR-258)_
- [x] **FACING table layout (Phase 2):** `Table C` seating geometry from live bbox side segmentation (`side` = angle deg, perpendicular-to-edge orientation via flat 0°/180° rigid yaw — not look-at); shape dispatch in `resolveSeatObjectsFromTable`, shared `seatRigidByKey` camera path, FACING-aware markers + fingerprint. `relatedTo` **TOR-258**. Author confirmed Save & Play 2026-06-26. _(TOR-267)_
- [x] **Scenes panel NPC seat disable clears all seated NPCs:** Toggling one NPC seat off must only disable that slot — not vacate every seated NPC / control board. _(TOR-311)_
- [x] **Scenes location modals — HUD until Apply, sort, district→site, site/district guard:** Overlay uses `lastAppliedSiteKey`/`lastAppliedDistrictKey`; modal sort ignores leading "The"; district pick opens site modal; generic site no longer clears district; Apply + import require district when site set. _(TOR-314)_
- [ ] **Scene library selection preview + edit-before-apply:** Selecting a library row previews Table/Seats/Location/Time; edits write to selected row unless it matches live scene (then immediate apply). _(TOR-244)_
- [x] **Map pins — last active location + timestamp:** `sessionScene.lastActiveMapPin` + `core/map_pins.ttslua`; Save & Play Suites K–K4 confirmed by author. _(TOR-245 — 2026-06-27)_
- [ ] **Resonance after hunting rolls:** Odds function (location + desired resonance + hunt result); presentation + random pick; optional victim deck. _(TOR-206)_

## UI Panels

- [x] All Storyteller UI panels: dark background `rgba(0, 0, 0, 0.8)`. _(TOR-68)_
- [x] **Scenes Panel:** Site modal — district-unique sites above generic bucket. _(TOR-63)_
- [x] **Scenes Panel — Scene location:** District/Site as text from modals, not free-text inputs. _(TOR-63)_
- [x] **Scenes Panel — Scene time:** Month/day/time inputs + Apply; real-time clock toggle + speed multiplier. _(TOR-63)_
- [x] **Scenes Panel:** Chronicle weather and NPC role snapshot removed. _(TOR-63)_
- [x] **Player game-state overlay:** Center-top phase, date, time (`ui/shared/game_state_overlay.xml`, `core/game_state_overlay.ttslua`). _(TOR-62)_
- [x] **PCs panel tracker row width:** HP / WP / Hum glyph rows fit 10-wide tracks (`panel_pcs_defaults.xml`). _(TOR-233)_
- [x] **Player HUD missing on first connect:** Global startup loading overlay + `UI.getXml`/`setXml` on seat assignment (`64c1a3d`). Author verified 2026-07-05; hotseat minor wrinkles; multiclient deferred TOR-144. _(TOR-285)_
- [x] **Hotseat Red blindfold stuck:** Transition `endTransition` only cleared seated players; leaving Red mid-settle orphaned PixelPuzzler's `hudBlindfold`. Track begin IDs + clear unoccupied seats on seat refresh. _(TOR-324)_
- [x] **Clear Loading Overlay:** Hide + `active=false` on startup loading screen so seat-assignment XML refresh cannot resurrect it. _(TOR-323)_
- [x] **Toggle Lights debug button:** Ambient intensity 0 ↔ 2 via `U.changeLighting` (not persisted). _(TOR-322)_
- [x] **Coterie ref grid — Color Blitz + Jarvis Jacks:** Anarch row buttons + popups; `inCoterieRef` in constants; assets in save. relatedTo **TOR-190**. _(INBOX 2026-07-05 quick fix)_
- [x] **Storyteller Stats panel — advantage editor:** Stats toolbar tab; PC backgrounds/merits/flaws + coterie 9 categories + domain ratings; Advantage Editor modal; seed-only PCS hydrate. Save & Play pending author. _(TOR-279)_
- [ ] **Center-top overlay polish:** Scale down overlay; fix background image alignment/scaling. _(TOR-86)_
- [ ] **Weather on overlay:** Show weather icon/label on center-top overlay (aligned with chronicle/scene clock), not only Scenes panel. _(TOR-87)_
- [x] **PCs panel deactivate PC:** Canceled — superseded by control-board `pc_control_token` seat row (INBOX Active). _(TOR-88 — canceled 2026-06-15)_
- [ ] **PCs panel:** Set PC map location via popout modal (writes state, reconciles overlays). _(Open: same as `seatPresent`/district-site or separate map pin?)_ _(TOR-89)_
- [x] **Map pins — unmappable locations:** `C.isSiteMappable`; hide absent/stale pins; unmappable scene hides active PCs only; absent may keep cached mappable offset. _(TOR-153 — 2026-06-15)_
- [x] **Map pins — last active location + timestamp:** See Scenes section; implementation shipped, Save & Play confirmed. _(TOR-245 — 2026-06-27)_
- [ ] **Phase system redesign:** Four primary phases (`Start`, `Play`, `Spotlight`, `End`); Play sub-phases (`Scene`, `Downtime`, `Memoriam`); trim PHASES panel copy; **Begin Session** / **End Session** buttons; `sessionNum` in gameState + spaced roman overlay; theme playlist on Start/End; silent Spotlight. _(TOR-143)_ _(Supersedes canceled TOR-90.)_
- [ ] **Intermission phase:** Between-session phase — all lights dark; connect during Intermission keeps blindfold up; blindfold lowers on advance to Start; optional countdown/theme TBD. `blockedBy` **TOR-143**. _(TOR-319)_
- [ ] **Session number + End Session (narrow slice):** Editable session number on Phases panel + roman overlay; End Session in End phase (blindfold + increment; phase stays End). Related **TOR-143**. _(TOR-263)_
- [ ] **Scrolling viewbox:** Author experimenting in TTS on scroll-container height — no implementation until after tinkering. _(TOR-91)_
- [ ] **Sound panel UI trim + larger text:** Remove excess instructional copy; increase Text element font size. _(TOR-140)_

### Roll conditions (UI)

- [x] **ST roll dashboard row XML templates:** `ui/.templates/roll/` partials → build-time `roll_dash_generated.xml`; fixed pixel `offsetXY` layout (`rollPanel_ST` 750px outer / 730px content). _(TOR-218)_
- [x] **ST per-roll Opts modal:** Roll conditions unified with structural toggles; per-roll overlay; `UI.setClass` toggles; generated modal from `CD.Defs`. _(TOR-162)_
- [x] **Roll panel active conditions:** `rollDash_conds_<Color>` shows effective roll condition `displayName` values on ST dashboard. _(TOR-209)_
- [x] **ST POST_ROLL pool modification:** D/H/N add-remove strip on ST dashboard; physical pool mutate + recalculate. _(TOR-246)_

## Character Sheets

_Blocked: author must define data binding approach before substantial implementation._

- [ ] **Page 4:** PC relationships; Blood Bonds. _(Partial: `lib/json/PC_Relationships.json`, `lib/pcs_data.ttslua`.)_ _(TOR-93)_
- [ ] **Page 5:** Projects; Equipment; Boons. _(TOR-99)_ — implementation umbrella **TOR-232** (`blockedBy` TOR-228, TOR-231 design gates)
- [ ] **Projects — design ST panel + modal XML:** Author-owned XML partials before agent wiring. _(TOR-228 — External In Progress, human gate)_
- [x] **Projects — coterieData state schema:** Coterie backgrounds/merits/flaws in state. _(TOR-229 — Done 2026-06-25)_
- [x] **Projects — Coterie sidebar sheet XML:** Prince's Court reference panel. _(TOR-230 — Done 2026-06-25)_
- [ ] **Projects — finish planning doc:** Complete `.dev/Projects/Project System Overview.md`. _(TOR-231 — External In Progress, human gate)_
- [ ] **Projects system (mission-critical):** Create/approve/launch/lifecycle per overview doc. _(TOR-232 — Backlog; `blockedBy` TOR-228, TOR-231)_
- [ ] **Page 6:** Character history; scrolling XP log. _(TOR-92)_
- [ ] **Discipline card grimoire:** Drop zone + page navigation near sheet for stored power/ritual/ceremony cards. _(TOR-205)_
- [x] **Decals:** Sheet object decals update from Blood Potency (state → UI reconcile). _(TOR-70)_

## Players & Connection

- [x] **Auto seat/color on connect** from Steam ID (`onPlayerConnect` + `C.PlayerData` chronicle mapping). _(TOR-94 — 2026-06-15)_
- [ ] **Absent player presence override:** Disconnected chronicle seats inactive; connect restores scene presence + auto-seat + camera then blindfold; disconnect disables present seats; DEBUG toggle skips for dev. `blockedBy` **TOR-144** (multiclient E2E). _(TOR-293)_
- [ ] **Play as NPC:** Control-board `pc_control_token` seat activate/deactivate (baseline shipped TOR-236); play-as-NPC swaps sheet by tag; `sessionScene.npcRoleOverride` / `seatSlots`; lighting exception per Scene Constructor spec ([Scene Constructor Overview](Scene%20Constructor/Scene%20Constructor%20Overview.md)). `blockedBy` **TOR-247** (rotational seat decoupling + full PC-token authority). _(TOR-95)_

## Table Objects

- [x] **Seat-color gate — player dice bags + signal candles:** Only the seated owner can click their seat's bag buttons or signal candle. _(INBOX 2026-07-05 quick fix)_
- [x] **C.LockedObjects interactable lock:** Startup-gate apply + `pairs()` iteration; fixed nil `DICE_DRAWER_STORYTELLER` hole; audit script. _(TOR-154 — author confirmed 2026-06-15.)_
- [x] **Tarot hide:** `G.GUIDS.TAROT_BUTTON_PINK` / [`ui/ui_tarot_button.ttslua`](../ui/ui_tarot_button.ttslua) — when hiding the deck, return all drawn tarot cards to the deck first, then hide (no orphans on table). _(TOR-96)_
- [ ] **Compulsions deck — pick-and-present flow:** Per-player generic deck draw → master deck match (up to 4) → anchor placement + lock → player Draw one → selected card lerp/lock; unselected return to master deck. GM Notes `Compulsion:<Type>-<playerKey>:…`; anchors in `C.ObjectPositions.COMPULSION_CARD_*`. _(TOR-204)_
- [ ] **Centralize object visibility:** Helper for reveal/hide-all-players vs Host-only (incl. Grey/White); migrate `setInvisibleTo` call sites; audit Text-tool object visibility. _(TOR-286)_
- [ ] **Player companion toggle tiles:** Five `COMPANION_TOGGLE_*` tiles drive figurine on/off via Y-rotation; dual-face UI (Tarot pattern); optional multi-state right-click cycle. _(TOR-288)_

## New Features (pending design)

- [ ] **Desires** — placeholder; pending author details. _(TOR-97)_
- [ ] **Spotlight phase** — primary phase + silent audio in TOR-143; NPC spotlight mechanics / visual distinction still TBD (see TOR-100). _(TOR-98)_
- [ ] **Memoriam toggle** — Play sub-phase placement in TOR-143; global LUT + HUD overlay when Memoriam active still TBD. _(TOR-101)_
- [ ] **Spotlight NPC distinction:** Use player color or other visual to distinguish spotlighted NPCs in-world and UI. _(TOR-100)_

## Agent Reviews

- [x] Author **reconciler contract** doc (when each `reconcile*` runs, reads, applies, must not write back). → [Reconciler Contract](Sychronizing%20Game%20Functionality/Reconciler%20Contract.md); Prompt 1 in [Agent Reviews/AGENT_REVIEW_PROMPTS.md](Agent%20Reviews/AGENT_REVIEW_PROMPTS.md) _(TOR-48)_
- [ ] Agent prompt: find **runtime object updates outside reconcilers** (dual-apply audit). → Prompt 2 in [Agent Reviews/AGENT_REVIEW_PROMPTS.md](Agent%20Reviews/AGENT_REVIEW_PROMPTS.md) _(TOR-102)_
- [ ] Agent prompt: find **invalid `getStateVal` / `getPlayerVal`** paths; draft fix plan. → Prompt 3 in [Agent Reviews/AGENT_REVIEW_PROMPTS.md](Agent%20Reviews/AGENT_REVIEW_PROMPTS.md) _(TOR-103)_
- [x] **Manual E2E test playbooks (Dice + Scenes) — baseline:** [`.dev/E2E Playbooks/`](E2E%20Playbooks/README.md) shipped; legacy Testing Suites removed from DEBUG panel. _(TOR-141)_ — **ongoing:** update playbooks when related APIs change (`living-doc`; issue stays open).
- [x] **Dice-E2E playbook + rollTest harness:** Solo-host doc (no View); `rollE2eSeatPrep`, `rollSetFaces`, hunger 5th param, Suite F conditions helpers; `rollCancel` clears ST slots. _(TOR-164)_ — sub-issue of TOR-141; re-verify in TTS after Save & Play
- [ ] **Multiplayer E2E playbook:** Pre-invite solo checklist + multiclient test plan (Preparing §1–§2; sub-issue of TOR-141). Initial pass when friend available — _(TOR-144)_; execution _(TOR-249 — External Todo, human gate)_
- [x] ~~Multi-client TTS session workflow (same PC)~~ — **Canceled:** not viable; use Steam invite + second machine. _(TOR-248)_
- [x] **Phase 1 zones integration test** — **Canceled:** scripting zones module removed; Toronto Rising uses hand zones only. _(TOR-11)_
- [x] **TTS execution authority audit:** Corrected by **TOR-284**; mod Lua runs on the host only, with actor identity handled by player parameters and per-client UI handled by XmlUI visibility. _(TOR-221)_
- [x] **Execution model remediation:** Host-execution gates removed; actor identity + per-client UI retained (`77cac3f`). Author verified hotseat/solo regression 2026-07-09; multiclient remains **TOR-144**. _(TOR-284)_
- [x] Agent prompt: **performance** hotspots (`Sync.full`, spawn pools, lighting lerps, UI refresh). → [Performance Audit](Sychronizing%20Game%20Functionality/Performance%20Audit.md); Prompt 4 in [Agent Reviews/AGENT_REVIEW_PROMPTS.md](Agent%20Reviews/AGENT_REVIEW_PROMPTS.md) _(TOR-50)_
- [ ] **Sync.full call-site audit:** Inventory every `Sync.full(` in production Lua; classify Keep full vs narrow (`Sync.player`, `Sync.soundscape`, `NPCS.reconcileAllFromState`, planned `Sync.npcs`); update Performance Audit with findings. _(TOR-168)_
- [x] **Event listener early-return audit + policy:** O(1) guards on all active physical Global listeners; `.dev/Sychronizing Game Functionality/Event Listener Policy.md`. _(TOR-197)_
- [x] **Gitignore bundle-size-gate artifact:** `.dev/build-logs/bundle-size-gate.json` gitignored and untracked. _(TOR-291)_

## Out of Scope for Cursor

_Workshop save, external art, or design TBD outside the repo. Each row has an open **Backlog** Linear issue under epic **TOR-43** (`workshop-only` — agents do not implement; author-owned)._

| Item | Notes | Linear |
|------|--------|--------|
| Reference images | The Court, Social Combat, XP, Physical Combat, Frenzy, Resonance, Recovery | TOR-105 ✓ |
| Coterie infographics | Colour Blitz, Jarvis Jacks — **repo grid wired 2026-07-05**; infographic assets author workshop | TOR-190 _(TOR-192, TOR-193)_ |
| Reference overlay copy fixes | Physical Combat / Resonance typos; Compulsion XP on Experience overlay | TOR-295 _(relatedTo TOR-105)_ |
| Famulus sheet Disciplines | Revise famulus sheets | TOR-297 _(relatedTo TOR-110)_ |
| Black Caesar ghoul companions | Cutouts + sheets (crise de lwa? TBD) | TOR-298 |
| CSHEET Clan Compulsions trim | Influence line only on character sheets | TOR-299 _(parent TOR-38)_ |
| GM sheet reference review | Advantages + in-play essentials across all sheets | TOR-300 _(relatedTo TOR-38, TOR-279)_ |
| Impairment overlays | Health, Willpower, Humanity | TOR-104 |
| Face-to-face table | Layout/table variant in save | TOR-107 |
| Debug sound window | ST debug panel | TOR-106 |
| Hunting vs Resonance | Feeding/resonance mechanics | TOR-108 |
| Famulus & other cutouts | Art + spawn data in workshop | TOR-110 |
| Additional skyboxes | Sites/scenes | TOR-109 |
| Hunger / frenzy overlays | Art and tuning in workshop | TOR-111 |
| Tune seat lights | All table configs (use test-bed helpers in-repo when ready) | TOR-114 |
| Tune audio volumes | Emitters, weather, ducking in save | TOR-112 |
| Pentagonal Table B0 model | ~~Zero-seat table variant for TOR-258 automatic selection~~ **Done 2026-06-26:** pentagonal model in save; author confirmed working with dynamic selection | TOR-261 ✓ |
| Generic encounter NPC list | Chronicle content incl. Memoriams | TOR-207 |
| ST improv stats reference | Pool spreads; lock stats when used in play | TOR-208 |
| Famulus seat lights | Player seat lights for famulus models | TOR-211 |
| Famulus Brown/Red hand zone | Figurines + lights rotate with hand zone (like Pink Tarot) | TOR-212 |
| Roll light intensity boost | Remove player light intensity increase during roll sequence | TOR-213 |
| Scene Constructor (Google Sheets) | Import/export workflow — author to define approach first | TOR-113 |
| NPC figurine back images | ~~Re-upload per-character figurine backs~~ **Done 2026-06-21:** generic transparent back applied in save via console pass | TOR-235 ✓ |
