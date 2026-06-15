# Running Tasklist for Toronto Rising Development

This file is continuously updated with issues and plans for feature development. Merged from `.dev/Draft Tasklist.md` on 2026-05-17.

**Linear is primary project tracking.** Every bullet must have a matching Linear issue and `_(TOR-XX)_` id. Agents: follow [`.cursor/rules/toronto-rising-linear.mdc`](../.cursor/rules/toronto-rising-linear.mdc) — create/update Linear issues when adding or completing items; never leave this file and Linear out of sync. Audit trail: [`.dev/plans/linear-alignment-log.md`](plans/linear-alignment-log.md).

**Quick capture before items are shaped:** [INBOX.md](INBOX.md) — one-line notes only; say **“process the inbox”** to triage (agent promotes to Linear + this file when ready).

**What to work next:** skim **Focus** below, then say **“what’s next”** or pick the top unchecked Focus item. Re-stack Focus when priorities shift (after inbox triage, before a play session, or weekly).

---

## Focus

_Stack rank for the current cycle (2026-06-06, inbox perf + dice bugs). **Precedence** (Focus + Linear `blockedBy`) — not Linear priority. **TOR-141 (E2E playbooks)** is a living doc (In Progress, not Focus stack). Deferred items may still be Medium/High importance in Linear._

| # | Issue | Why now |
| --- | --- | --- |
| 1 | **TOR-173** — Lerp stage moves on Apply | Polish stage figurine motion when placement changes on Apply |
| 2 | **TOR-179** — Workshop SEAT_FIGURE anchor ID | Workshop GUID/tag for layout anchors |
| 3 | **TOR-181** — Retire Storyteller NPC toolbar panel | Unblocked by TOR-174 Done; control board covers seats + dice-bag rolls |

**Also in cycle (below top stack):** **TOR-169** (Storyteller NPC gameboard umbrella), **TOR-173** (lerp stage moves on Apply), **TOR-179** (SEAT_FIGURE anchor ID), **TOR-181** (retire NPC toolbar panel).

**Done this cycle:** **TOR-174** (NPC token on ST dice bag → roll — restore home from state + `STR.initiateFromBagLabel`; bag proximity 3″, ST color early gate, local-order fix; author confirmed 2026-06-15). **TOR-178** (seat ↔ stage figurine transfer — homeland retained on stage, Clear re-seats, leaves visible + homeland spotlights OFF when stage-bound, pooled spotlight defer/park fixes; author confirmed 2026-06-15). TOR-202 (duplicate CONTROL_BOARD table model — inactive markers stashed at Y=-200 on table switch; author confirmed 2026-06-15). TOR-210 (Apply seat snap seats NPC at table — `commitNpcSeatLayout` forces `RSL.SyncTable`; author confirmed 2026-06-15). TOR-154 (C.LockedObjects interactable lock — nil-hole `DICE_DRAWER_STORYTELLER` + startup-gate apply; author confirmed 70/70). TOR-200 (seat snap Y-rotation — board-local Y=180° offsets CONTROL_BOARD world Y=180°; author confirmed). TOR-199 (seat-row token scale 0.7 on seat snaps, 0.2 polar; drop-handler scale revert). TOR-198 (Rouse check Roll doubles staged dice — `spawnMissingPoolDiceForColor`, author confirmed resolved). TOR-197 (event listener O(1) gates + Event Listener Policy). TOR-201 (Clear/token-drop lag — listener audit fix; reopen if lag persists). TOR-180 (control-board seat-assignment snap row — assign/presence/Clear homelands). TOR-172 (palette-drop ring `defaultLightMode` flip + stage light preview). TOR-175 (anchor family spread center-out alternating). TOR-155 (roll panel pool dots color coding). TOR-164 (Dice-E2E harness + doc). TOR-138 (silence-for-save no longer wipes soundscape state; load branch → TOR-152). TOR-141 baseline shipped (`.dev/E2E Playbooks/`); issue stays **In Progress** as living doc (`living-doc` label). TOR-159 (frenzy at hunger 5 threshold). TOR-158 (Blood Surge + conditions). **TOR-169 session:** circular-require load fix, Z-axis token flip, placements-only reconcile + byArea migration (`a0271ac`). **TOR-170/171:** load token mirror + master-origin figurine yaw (`5c3d37b`). **TOR-176/177:** Host-only control-board XmlUI + hide workshop seat-figure anchors (`b58e2fb`).

**Ongoing (not Focus stack):** TOR-141 — maintain E2E playbooks when dice/scenes/debug testing changes.

**Resurfaced this cycle:** **TOR-96** (Tarot hide returns drawn cards) — back-burner gate lifted after TOR-180 Done; no `blockedBy` (pick up on Pink table playtest or table-objects slice).

**Deferred this cycle:** **2026-06-06 inbox (author-approved):** TOR-203 (Hunger 5 voluntary rouse lockout), TOR-204 (Compulsions deck), TOR-205 (discipline grimoire), TOR-206 (resonance hunting), TOR-209 (roll panel conditions) — **TOR-198 gate closed** (unblocked 2026-06-14). **NPC gameboard follow-ups:** TOR-181 (retire Storyteller toolbar NPC panel — unblocked TOR-174 Done; resurfaced Focus #3). **Dice E2E (resume after gameboard):** TOR-161 (normal bag right-click undo), TOR-162 (ST Opts stick), TOR-163 (no-difficulty broadcast). TOR-139 (scenes panel trim + 3-column library grid), TOR-140 (sound panel text + larger font), TOR-142 (four scene Apply clock buttons), TOR-143 (phase system + session lifecycle), TOR-146 (delete active scene ends live first), TOR-147 (blindfold soundscape fade + weather), TOR-148 (RT clock too fast), TOR-149 (ST dice tray lights), TOR-150 (thunder indoor ducking), TOR-151 (default no-scene environment), TOR-152 (Play load scene restore), TOR-73 (Take Half redesign + H2 rouse auto-parse), TOR-153 (map pins unmappable), TOR-156 (roll broadcast trim), TOR-157 (pre-Apply seat modal), TOR-165 (WP reroll wave partial settle), TOR-137 (Sites unicode minus), TOR-81 (light modes cleanup). **Workshop-only (no agent impl):** TOR-207 (generic encounter NPC list), TOR-208 (ST improv stats reference). **Canceled:** TOR-215 (seated NPC scale reset — `postCorrectionsBySeatRole` scale correction unnecessary; Y-only correction retained 2026-06-15). TOR-166 (widen far NPC angles), TOR-167 (mid/far center NPC areas) — superseded by TOR-169 gameboard. Other open bullets unchanged.

**How deferred work resurfaces:** Unchecked tasklist bullets stay in domain sections; Linear **`blockedBy`** gates sequencing; when a **Focus** or **Deferred** gate issue is marked **Done**, agents run the **deferred resurfacing** survey (unblock dependents, propose 1–3 labeled candidates in Done comment or chat — see `.cursor/rules/toronto-rising-linear.mdc` and `DEVELOPMENT_WORKFLOW.md` § Deferred resurfacing). Also: **`/tr-inbox`**, **“what’s next”**, and **`/tr-start`** re-read this line. No push notifier — resurfacing is intentional at gate-close, session start, or Focus refresh.

---

## Dice Roller

- [x] Roll conditions set on rolls via the Storyteller control panel are not persisted and do not apply to rolls. _(Addressed: `roll_ui.ttslua` `uiToggleGet` normalizes Toggle `isOn` from string/boolean/number so Apply writes correct booleans.)_ _(TOR-54)_
- [x] Automatic camera repositioning during the roll sequence is inconsistent. Should be modeled off of how the camera controls are applied in the Admin Debug panel (since they work flawlessly). _(Addressed: `main.ttslua` `M.setCamera` now applies `lookAt(intermediateCameraData)` before the final preset.)_ _(TOR-57)_
- [ ] **Roll baton-pass camera (remaining):** Too many camera applications during the rolling handoff, including some that reapply the current angle; cuts are jumpier than Admin Debug Camera or Camera PC controls. Audit the roll pipeline and route roll-time switches through the same code path as those controls. _(TOR-72)_
- [x] **Take Half redesign:** Available on any roll without difficulty. Synthetic result = half the pool size in **normal successes (rounded down)**, remainder **blank**, all treated as normal dice (Hunger dice count toward pool size but do not use Hunger faces). Example: pool 13 → 6 successes, 7 blanks. **Broadcast:** show full-pool dice images as normal dice — half with one success face, rest blank (no numeric roll text). **Dice-E2E H2:** rouse dice must await player throw after Take Half — not auto-parse on settle. _(TOR-73)_
- [x] **Roll panel pool dots color coding:** Restore kind colors (normal white, hunger red, rouse dark red offset left, obliv-rouse purple, werewolf yellow-green, rage orange). One dot group per pool kind (`pool.rouse` = single rouse check). _(TOR-155)_
- [x] **Dice bag clicks + Blood Surge rouse isolation:** Hunger no-op without roll; surge on + Hunger L adds `bloodSurgeRouse`; Hunger R removes one surge rouse then full undo; manual rouse coexists; bag enable/disable (Hunger default off; Rouse/Obliv mutual). _(TOR-161)_
- [ ] **ST per-roll Opts persistence:** `crits`, `bestialNull`, etc. stick in Opts modal and apply to `active.rollOptions` before classify. _(TOR-162)_
- [x] **Roll broadcast without difficulty:** Unset difficulty → default 1 for display; show dice images + successes; omit margin. _(TOR-163)_
- [ ] **Roll result broadcast trim:** Remove die roll numbers and duplicated type/result language; offset rouse result strips from main pool and from each other. _(TOR-156)_
- [ ] **WP reroll wave partial settle:** Count randomized dice; lock each die after settle; **Confirm** during WP **ROLLING** wave; wave must end at cap or early confirm. Found Dice-E2E I1. _(TOR-165)_
- [x] **Blood Surge + conditions:** Blood Surge uses `EffectiveStats.forSeat` → `bloodPotencyDerived` for surge dice count; fresh `rollPolicy()` at activation for `bloodSurgeDiceMultiplier`. _(TOR-158; facade in TOR-160)_
- [x] **Effective stats facade:** Unified read-time API (`lib/effective_stats.ttslua`); derive alignment; migrated roll/damage/HUD/sheet consumers. _(TOR-160)_
- [x] **Frenzy hunger threshold:** Queue frenzy only when hunger is already at 5 and would increase further — not on first transition to 5. `maybeQueueFrenzyOnHungerCap` gates on `hungerBefore >= C.MAX_HUNGER`. _(TOR-159)_
- [ ] **Extended Tests:** An "extended test" is a series of rolls, with each roll contributing to a Running Total until a Target (defined by the Storyteller) is met, or the Storyteller stops the test early for any reason. There are four types of extended tests -- Standard, Series, Hard and Cascade -- which define what the Running Total and Target count, and how each roll adds to the Running Total. When the process stops, the final result is a Win if the Running Total equals or exceeds the Target, or a Failure otherwise. _(TOR-74)_
  - **Standard:** The Target represents a total number of successes that the player's Running Total must meet. Each roll contributes its successes to the Running Total. Each roll is made against a Difficulty of zero (i.e. each roll contributes all of its successes to the Running Total).
  - **Series:** The Storyteller defines a Difficulty that applies to each roll the player makes. The Target represents the number of successful rolls the player must make (i.e. rolls where successes equal or exceed the Difficulty). Successes are not counted, only Wins.
  - **Hard:** A combination of Standard and Series: The Target represents a total number of successes, but a Difficulty _is_ applied to each roll, and only the margin on each roll contributes to the Running Total. Failures (i.e. negative margins) do not subtract from the Running Total.
  - **Cascade:** As Standard, with two changes. First, the number of successes on each roll becomes a positive modifier to the dice pool of the next roll. Second, if any roll fails, the test ends immediately in failure.
- [x] **Oblivion rouse checks:** Finish end-to-end (`C.RollType.ROUSE_OBLIVION` — UI, validation, result handling). _(Shipped in dice pt.2: TOR-51, TOR-131; in-game verification recommended.)_ _(TOR-75)_
- [x] **Rouse check Roll doubles pool:** Clicking Roll after PRE_ROLL staging spawns duplicate Rouse/Obliv-Rouse dice (pool doubles). _(TOR-198 — `spawnMissingPoolDiceForColor`; author confirmed resolved 2026-06-14.)_
- [ ] **Oblivion Rouse copy:** Prompt `Hunger or Stain?`; post-choice broadcast `Hunger Roused` / `Stained` (not stuck on choose prompt). _(TOR-214)_
- [ ] **Hunger 5 voluntary rouse lockout:** At Hunger 5, lock Blood Surge + Obliv-Rouse bags; allow forced standard Rouse checks; failed rouse → frenzy resist D4. _(TOR-203)_

## Camera

- [ ] Nudge the **Red** player **`sheet`** preset slightly farther back on **Z** (away from table center) so the center-top game-state overlay does not block the top of the character sheet. _(TOR-78)_

## NPC Spawning

See also [NPC Object Overview](NPC%20Object%20Spawning%20%26%20Spotlighting/NPC%20Object%20Overview.md).

- [x] **Preload pool:** Spawn all NPC figurines off-table (preload grid, small scale) so cutout images are loaded before activation. _( `npcs_data` preload at y = -200; `NPCS.ensureAllNpcsPreloaded`.)_ _(TOR-60)_
- [x] **Seat spawn:** Pooled figurine uses seat `*Object` tag + `SEAT_FIGURE` rotational layout; `postCorrectionsBySeatRole`; area spotlight hidden at seat; workshop `SEAT_LIGHT_*_NPC*` only. _(TOR-64)_
- [x] **Seat tags:** `npc_figurine` ↔ `NPCnObject` on seat/unseat; layout matches pooled figurine by tag + `Figurine_Custom` (`NPCS.isPooledFigurineObject`). _(TOR-65)_
- [ ] **Group spawn exclusion:** When spawning an NPC group into a stage area, do not pull members who are already seated (e.g. `fiveKeys` spawn must leave `myleneHamelin` in her table seat). _(TOR-76)_
- [ ] **Storyteller NPC gameboard (Phase A):** `STAGE_BOARD` + `CONTROL_BOARD`, tokens, markers, configurable `CONTROL_BOARD_SNAP` grid (~160 snaps), Apply/Clear wired; `placements` v3 + `Sync.npcs`. Phase B: Read/Lock/Load, spotlight. Phase C: retire panel `byArea`. _(TOR-169)_ — workshop objects + GUIDs in TTS save required; Save & Play to confirm snap geometry/rotation
- [x] **Control board tokens on load:** Mirror on-stage NPCs from `sessionScene.npcWorld.placements` (exact u,v + Z flip); pull from palette via tag scan; palette onLoad no longer parks all tokens. _(TOR-170)_
- [x] **Figurine yaw from master origin:** `Gameboard.placementBoardRelYawDeg` uses top-level `CONTROL_BOARD_SNAP.origin`; stage figurines + Apply scan ignore token Y; Z flip only for light mode. _(TOR-171)_
- [x] **`snapGroups.defaultLightMode`:** Optional per-ring default; apply Z flip only when token drops from palette onto that ring (not ring-to-ring or state sync). _(TOR-172)_
- [ ] **Lerp stage placement moves (Apply only):** Stage→stage and same-snap light toggles involving `STANDARD` animate via single orchestrator on Apply; `sineInOut` position/yaw; light G/H timing; area batching center-out. Not load/blindfold/preload/seat/Clear/`Sync.full`. Tunables `D.STAGE_PLACEMENT_LERP`. _(TOR-173)_ — **implemented; author Save & Play playtest pending**
- [x] **Anchor family spread order:** On anchor drop, sibling tokens fill family snaps center-out by group slot index, alternating sides. _(TOR-175)_
- [x] **Control board seat-assignment row:** Nine snaps (NPC4…NPC3); present/absent flip on NPC seats; assign/unassign via Apply; Clear keeps seated tokens / homelands stage→seat. _(TOR-180)_
- [x] **Seat ↔ stage figurine transfer:** Same figurine table↔stage; retain `occupiedNPCSlots` on Apply; Clear returns to seat; `scale` / `seatedScale` on cutout. Stage-bound: homeland chair + table leaves visible; homeland seat spotlights OFF; pooled spotlight defer (stage Y) + park to preload on re-seat. _(TOR-178)_
- [ ] **Retire Storyteller NPC toolbar panel:** Remove panel when control board covers seats + rolls. _(TOR-181)_
- [x] **Control board XmlUI Host-only:** Apply/Clear toolbar `visibility="Black|Host"` on `gb_root`. _(TOR-176)_
- [x] **Duplicate SEAT_FIGURE on scene activate:** Step Four hides workshop `SEAT_FIGURE_*` anchors; only pooled figurine gets presence visibility. _(TOR-177)_
- [ ] **Workshop SEAT_FIGURE anchor ID:** Detect layout anchors without `SEAT_FIGURE_*` name/nickname so pooled figurines can use full name for tooltips (GUID/GM notes/tag). _(TOR-179)_
- [x] **Widen Far Left / Far Right NPC angles:** Canceled — superseded by TOR-169 gameboard. _(TOR-166)_
- [x] **Mid-Center + Far-Center NPC areas:** Canceled — superseded by TOR-169. _(TOR-167)_
- [x] **NPC area cutouts on scene apply:** Mis-nested `npcWorld` at import root (spreadsheet JSON) left `sessionScene.npcWorld.byArea` empty — scene apply/reconcile was fine when data was nested correctly. Fixed spreadsheet; import validator now rejects unexpected root keys (no hoisting). _(TOR-135)_
- [ ] _New feature:_ Storyteller rolls dice for NPCs from the dice control panel — spawn/show dice tray, appropriate camera angle, roll-controller wiring for NPC/non-player identity. _(TOR-79)_
- [x] **NPC token on ST dice bag:** Drop control token on dice bag → roll for that NPC with bag type; token returns to committed home (placement, homeland seat row, or palette). _(TOR-174 — author confirmed 2026-06-15.)_
- [x] **Seated snap row token scale:** Seat snaps `{0.7,1,0.7}`; polar/palette/off-board `{0.2,1,0.2}` on pick-up, drop, and mirror. _(TOR-199 — author confirmed 2026-06-15.)_
- [x] **Seat snap Y-rotation:** Board-local **Y=180°** (`snapYawOffsetDeg`) on nine seat-row snaps offsets CONTROL_BOARD world Y=180°. _(TOR-200 — author confirmed 2026-06-15.)_
- [x] **Apply seat/table snap doesn't seat NPC:** `commitNpcSeatLayout` → `RSL.SyncTable({ force = true })`; layout fingerprint no longer skips in-area occupants on Apply. _(TOR-210 — author confirmed 2026-06-15.)_
- [x] **Seated NPC scale reset on refresh:** Canceled — scale `postCorrectionsBySeatRole` not needed; Y correction only in `C.TableSourceObjects`. _(TOR-215 — descoped 2026-06-15.)_
- [x] **Clear / token-drop lag:** O(1) listener gates + figurine GUID cache (TOR-197); reopen if lag persists in play. _(TOR-201)_
- [x] **Duplicate table model on board:** Inactive `gameboard_table` markers stashed at `MARKER_STASH_WORLD_Y` when `tableKey ~= currentTableKey`. _(TOR-202 — author confirmed 2026-06-15.)_

## Soundscape

- [x] On load, emitters automatically play tracks from the last save. _(Mitigation: **Silence for save** on Sound panel → `Soundscape.prepareEmittersForSave()`; fold into End Session sequence when defined.)_ _(TOR-71)_
- [ ] **Background music policy:** In any phase **other than Session Start**, background music should always play. When the active site or scene specifies no music, default to the **`Main`** playlist (`lib/soundscape_catalog.ttslua`). _(TOR-77)_
- [ ] **Site weather ducking:** Site (not only indoors/outdoors) sets the weather audio ducking multiplier in soundscape. _(TOR-80)_
- [ ] **Thunder indoor ducking:** Thunder one-shots should use the same indoor/site weather ducking multiplier as rain/wind (`playCatalogEntry` skips `weatherThunder`). _(TOR-150)_
- [x] **Weather audio burst on scene switch:** Silent stub + zero gain before looping clip swap; one-frame deferred volume arm; rain/wind hold same effect without restart; library Apply defers `markReconciledToCurrentState` after weather apply. Author verified on scene switch. _(TOR-136)_
- [x] **Soundscape resync after load:** **Silence for save** no longer wipes `gameState.soundscape` via `stopAll`; load reconcile applies preserved scene audio until **TOR-152** adds explicit active-scene vs Main-only load branch. _(TOR-138)_
- [ ] **Soundscape fade on blindfold down:** During library Apply, fade BGM + location + weather when blindfolds come down; weather: full fade-out on track change, duck to lower volume on same-track volume mismatch (see Linear). _(TOR-147)_

## Lighting

- [x] Reconciler lighting updates lerped (default 2s). _( `core/lighting.ttslua` `L.DEFAULT_RECONCILE_LERP_SECONDS`.)_ _(TOR-59)_
- [x] Test-bed helpers to apply seat-light settings from Red to all active seats. _( `TestBed_applyPlayerSeatLightsFromRed`.)_ _(TOR-61)_
- [ ] **Storyteller dice tray lights:** Keep `storytellerDiceLight1`–`3` OFF in steady state; only ON during live ST roll in matching drawer (`LIGHTMODES_REGISTRY_KEYS_ORDERED` currently forces STANDARD). _(TOR-149)_
- [ ] **Centralize light modes (`C.LightModes`):** Remove legacy keys (`BRIGHT`, `DIM`, `TENSION`, `STANDARD`, `AdminDark`, `AdminStandard`, `AdminBright`, `AdminDebug`); update `DEBUG`/`DARK`; Scenes panel dynamic 5-wide preset grid (all keys; active = green bg / white text). **`L.LIGHTMODES` unchanged.** _(TOR-81)_
- [ ] **Scenes/locations** drive global/seat light mode via state → `Scenes.reconcileFromState` / lighting reconciler (no dual apply). _(TOR-84)_
- [x] **Site skybox:** `sessionScene.siteKey` → `Scenes.reconcileSkyboxFromState` (`C.Sites[*].skyboxURL` or random `C.GenericSkyboxes` via `Backgrounds.setCustomURL`). _(TOR-58)_

## Scenes Panel & Scene State

- [x] Dark panel backgrounds, site modal layout, scene location as text, scene time controls, real-time clock toggle, chronicle weather removed, game-state overlay. _(See completed UI Panels items below.)_ _(TOR-63)_
- [ ] **District/site labels:** Keep Scenes panel display fields in sync with `gameState.sessionScene` after modal picks and library Apply. _(TOR-82)_
- [ ] **Site modal overlap:** Fix overlapping site buttons so district-specific rows are fully clickable (not covered by generic site bucket). _(TOR-83)_
- [ ] **Sites import — unicode minus in offsetXY:** Build script normalizes Google Sheet `−` (U+2212) → ASCII `-` in all `C.Sites` `offsetXY` values. _(TOR-137)_
- [ ] **Scenes panel UI trim + 3-column library:** Remove instructional copy; scene buttons show name + status only; three-column grid. _(TOR-139)_
- [ ] **Apply active scene — four clock buttons:** Replace single switch button with Apply (scene clock), Apply x5 until present, Apply = PRESENT, Apply (Present); all apply full scene. _(TOR-142)_
- [ ] **Default no-scene environment:** When no live library scene — Table B1, five PC seats, empty NPC world, OutdoorDim, Main BGM, cleared location/weather on table (do not write cleared location to library or PC pins); overlay blanks date/time + hides weather (do **not** mutate scene-library `clock` or present-day clock — display only); random generic skybox. _(TOR-151)_
- [ ] **Restore scene on Play load / Start→Play:** Resync active library scene when entering Play with one set; otherwise apply default no-scene (**TOR-151**). Includes **load soundscape branch**: active scene (`lastAppliedKey`) → site + narrative + chronicle weather like Apply; no scene → Main BGM only. _(TOR-152)_
- [x] **End scene library sync:** `detachLiveTableFromLibraryMirror()` before clearing live location — stops mirroring, clears `lastAppliedKey` + `activeKey`, UI hides mirroring when no on-table scene; prevents live→library writeback of cleared keys. _(TOR-145)_
- [ ] **Delete active scene:** End live scene first when deleting the row that is still on the table. _(TOR-146)_
- [ ] **Pre-Apply seat presence modal:** Before blindfold scene transition, ST modal with per-seat present/absent toggles so PCs can be left behind at prior location. _(TOR-157)_
- [ ] **Real-time clock too fast (intermittent):** Narrative clock ~6–12× expected rate; investigate duplicate tickers, uncleared `U.delay` intervals on scene Apply/load, or compounded `realTimeSpeed`. _(TOR-148)_
- [x] **Site fog:** Site controls whether the fog object is enabled/disabled (`C.Sites.isTopFogActive` or indoor/outdoor default → `sessionScene.isTopFogActive` → `Scenes.reconcileTopFogFromState`). _(TOR-56)_
- [ ] **Site & district modifiers:** Apply to rolls (and possibly stats) only for characters marked **present** in the active scene/seat layout. _(TOR-85)_
- [ ] **Resonance after hunting rolls:** Odds function (location + desired resonance + hunt result); presentation + random pick; optional victim deck. _(TOR-206)_

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
- [ ] **Map pins — unmappable locations:** Hide pin at unmappable PC site until mappable travel; do not resurrect stale offset when PC absent from scene; at unmappable **scene** site hide only **active** PCs' pins (absent PCs with mappable locations stay visible). _(TOR-153)_
- [ ] **Phase system redesign:** Four primary phases (`Start`, `Play`, `Spotlight`, `End`); Play sub-phases (`Scene`, `Downtime`, `Memoriam`); trim PHASES panel copy; **Begin Session** / **End Session** buttons; `sessionNum` in gameState + spaced roman overlay; theme playlist on Start/End; silent Spotlight. _(TOR-143)_ _(Supersedes canceled TOR-90.)_
- [ ] **Scrolling viewbox:** Author experimenting in TTS on scroll-container height — no implementation until after tinkering. _(TOR-91)_
- [ ] **Sound panel UI trim + larger text:** Remove excess instructional copy; increase Text element font size. _(TOR-140)_
- [ ] **Roll panel active conditions:** Show readable condition names on roll panel; registry display-name field. _(TOR-209)_

## Character Sheets

_Blocked: author must define data binding approach before substantial implementation._

- [ ] **Page 4:** PC relationships; Blood Bonds. _(Partial: `lib/json/PC_Relationships.json`, `lib/pcs_data.ttslua`.)_ _(TOR-93)_
- [ ] **Page 5:** Projects; Equipment; Boons. _(TOR-99)_
- [ ] **Page 6:** Character history; scrolling XP log. _(TOR-92)_
- [ ] **Discipline card grimoire:** Drop zone + page navigation near sheet for stored power/ritual/ceremony cards. _(TOR-205)_
- [x] **Decals:** Sheet object decals update from Blood Potency (state → UI reconcile). _(TOR-70)_

## Players & Connection

- [ ] **Auto seat/color on connect** from Steam ID (chronicle mapping). _(TOR-94)_
- [ ] **Play as NPC:** PC at table uses NPC sheet/figurine; `sessionScene.npcRoleOverride` / `seatSlots`; lighting exception per Scene Constructor spec ([Scene Constructor Overview](Scene%20Constructor/Scene%20Constructor%20Overview.md)). _(TOR-95)_

## Table Objects

- [x] **C.LockedObjects interactable lock:** Startup-gate apply + `pairs()` iteration; fixed nil `DICE_DRAWER_STORYTELLER` hole; audit script. _(TOR-154 — author confirmed 2026-06-15.)_
- [ ] **Tarot hide:** `G.GUIDS.TAROT_BUTTON_PINK` / [`ui/ui_tarot_button.ttslua`](../ui/ui_tarot_button.ttslua) — when hiding the deck, return all drawn tarot cards to the deck first, then hide (no orphans on table). _(TOR-96)_
- [ ] **Compulsions deck:** Indistinct deck; face on draw per player; drop → lerp lock by sheet on Bestial Failure. _(TOR-204)_

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
- [ ] **Multiplayer E2E playbook:** Pre-invite solo-suite checklist + multi-client test plan (sub-issue of TOR-141). _(TOR-144)_
- [x] Agent prompt: **performance** hotspots (`Sync.full`, spawn pools, lighting lerps, UI refresh). → [Performance Audit](Sychronizing%20Game%20Functionality/Performance%20Audit.md); Prompt 4 in [Agent Reviews/AGENT_REVIEW_PROMPTS.md](Agent%20Reviews/AGENT_REVIEW_PROMPTS.md) _(TOR-50)_
- [ ] **Sync.full call-site audit:** Inventory every `Sync.full(` in production Lua; classify Keep full vs narrow (`Sync.player`, `Sync.soundscape`, `NPCS.reconcileAllFromState`, planned `Sync.npcs`); update Performance Audit with findings. _(TOR-168)_
- [x] **Event listener early-return audit + policy:** O(1) guards on all active physical Global listeners; `.dev/Sychronizing Game Functionality/Event Listener Policy.md`. _(TOR-197)_

## Out of Scope for Cursor

_Workshop save, external art, or design TBD outside the repo. Each row has an open **Backlog** Linear issue under epic **TOR-43** (`workshop-only` — agents do not implement; author-owned)._

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
| Generic encounter NPC list | Chronicle content incl. Memoriams | TOR-207 |
| ST improv stats reference | Pool spreads; lock stats when used in play | TOR-208 |
| Famulus seat lights | Player seat lights for famulus models | TOR-211 |
| Famulus Brown/Red hand zone | Figurines + lights rotate with hand zone (like Pink Tarot) | TOR-212 |
| Roll light intensity boost | Remove player light intensity increase during roll sequence | TOR-213 |
| Scene Constructor (Google Sheets) | Import/export workflow — author to define approach first | TOR-113 |
