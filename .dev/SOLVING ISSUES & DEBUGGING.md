# SOLVING ISSUES & DEBUGGING CHECKLIST

## Agent Routing

Read this when:
- debugging a runtime issue
- a previous fix attempt is looping or adding workarounds
- deciding what evidence to collect before changing code

Source of truth:
- current symptom artifacts from the user/TTS/logs
- `.cursor/rules/toronto-rising-author-session.mdc`
- `docs/solutions/lua-local-function-order.md`
- affected subsystem code

Verification:
- reproduce the symptom or cite the blocking missing artifact
- run the relevant test/playbook from `.dev/TESTING.md`

Status: current debugging process checklist; system-specific entries must still be checked against code.

Use this checklist when a debugging exchange is stalling, looping, or accumulating workarounds.

Quick chat commands: `/dbcheck` (compact) and `/dbfullcheck` (full).

## A) Before proposing any fix

- [ ] Restate the symptom in one sentence (what is wrong, where, and when).
- [ ] Identify the expected behavior in one sentence.
- [ ] Collect one concrete artifact (log line, state row, screenshot, reproduction step).
- [ ] Confirm exact reproduction steps and whether issue is deterministic or intermittent.
- [ ] Confirm current runtime context (player color, role, scene, load vs runtime, host vs client).
- [ ] **Ask the author** for any fact you cannot derive from code/logs (Save & Play after last change, manual vs automated repro, live object GUIDs, what they saw in-game). **Do not speculate** ("maybe you didn't Save & Play", "perhaps you clicked manually") — see `.cursor/rules/toronto-rising-author-session.mdc`.

## B) Root-cause discipline (anti-workaround)

- [ ] **`attempt to call a nil value` in TTS console?** Check **Lua local function order** first (most common): was `local function helper` defined **below** the `Global.*` / `HUD_*` / `local function` caller in the **same file**? Fix: move helper up or forward-declare (`local foo` then `foo = function`). See [`docs/solutions/lua-local-function-order.md`](../docs/solutions/lua-local-function-order.md). Build does not catch this.
- [ ] Name the likely root cause category before coding (ordering/race, state mismatch, writer conflict, ID resolution, missing object, **lua local order**, etc.).
- [ ] Identify all writers for the affected subsystem; list any competing writers explicitly.
- [ ] Verify single-authority ownership. If two paths can write the same thing, stop and consolidate.
- [ ] If adding retries/timeouts, explain why root cause is still unknown and what evidence is missing.
- [ ] Reject patch stacking if each patch only helps "sometimes."
- [ ] Push back early if the requested approach is unsound, over-complex, or architecture-inconsistent.

## C) State vs world checks

- [ ] Is source-of-truth state correct?
- [ ] Is derived desired state correct?
- [ ] Is reconciler applying desired state to live world?
- [ ] Is another path overwriting the live result afterward?
- [ ] Are load-time restore paths re-stamping stale values?
- [ ] For missing state records, is default behavior explicit and safe (never implicit)?

### Rotational seat layout (`postCorrections`)

- **`C.TableSourceObjects.postCorrections`** — per-GUID overrides after layout; only seats in the current filtered layout pass (`computed.byColor`) run (empty NPC slots are skipped). `rotationDelta` uses `anchor` (PC hand-zone GUID) or `anchorSeatKey` (PC live hand zone / NPC virtual hand zone from layout).
- **`C.TableSourceObjects.postCorrectionsBySeatRole`** — per-seat/role overrides after layout (including `SEAT_FIGURE` Y for PC workshop figurines and pooled NPC cutouts); only seats in the current filtered layout pass run.
- Seated NPC figurines: tag `NPCnObject` + GM Notes `SEAT_FIGURE_NPCn` + `NPCS.isPooledFigurineObject`; layout moves them as `SEAT_FIGURE`; unseat clears seat tags, restores `npcInstance:` GM Notes, returns to preload.

### Storyteller Scenes vs lighting preset

- **Seat spotlight refs** (`playerLight…`, `npcLight…`): `C.LightModes.*.spotlights` may list them, but `U.applyLightingPreset` only **stores** them on `gameState.sessionScene.lightingSeatSpotlightPreset`; **`L.reconcileForPlayer`** applies them **after** rolling / absent seat / conditions / hunger overrides. Use `U.lightRefIsPlayerSeat` / `U.lightRefIsSeatSpotlight`; never use `string.sub(ref, 1, 10)` against `"playerLight"` (prefix is **11** chars; a too-short sub never matched and let presets stamp `STANDARD` over `HUNGRY`).
- **`gameState.currentScene`** — lighting preset key for `Scenes.reconcileFromState` (admin dark/standard/bright and any legacy named scene ids).
- **`gameState.sessionScene`** — narrative/session bundle: table selection mirror, optional `seatPresent` map (absent seats → seat spotlights `OFF` via `L.reconcileForPlayer`), district/site keys for soundscape context, clock fields, roll-default overlays (`RO.seedActiveRoll`), and stub NPC scene notes. The Storyteller toolbar **Light** tab was removed; use **Scenes → Lighting presets**.

## D) Pipeline integrity checks

### Sync: incremental vs force (Toronto Rising)

- **`Sync.full()`** (no options or `force` omitted/false): reconciles **scene** and **soundscape** only when persisted **fingerprints** changed; runs seat lights + overlays once; **`UpdateUIDisplays`** uses a **narrow delta** (overlays omitted — `HO.syncAll` already ran).
- **`Sync.full({ force = true })`**: Storyteller **repair** path from **Sync All (force)** — bypasses fingerprints, runs **full** UI refresh (includes overlays / legacy breadth).
- **`Sync.full({ force = true })`** via **Sync All (force)** debug button: full reconciliation when incremental fingerprints may have drifted.
- **Escape hatches** if the world drifted but state did not: `Scenes.invalidateReconcileCache()`, `Soundscape.invalidateReconcileCache()`, then `Sync.full({ force = true })`.

- [ ] Do setters mutate state only (no hidden world side effects)?
- [ ] Do reconcilers own all world writes for this subsystem?
- [ ] Do debug-panel actions follow the same pipeline (no bypass writers)?
- [ ] Are scene/admin shortcuts mutating state then syncing, rather than writing world directly?

## E) Identity, gating, and permissions

- [ ] Color -> player ID resolution is deterministic and stable during load.
- [ ] No logic is accidentally keyed to wrong seat/player.
- [ ] No hard-coded Steam IDs block the current user.
- [ ] User is seated in the required color/role for this test path.
- [ ] Host-only vs player-visible behavior is explicitly validated.

## F) TTS/load-order and timing checks

- [ ] Differentiate object exists vs component ready (especially lights/components).
- [ ] Validate that deferred passes re-run reconciliation, not just initialization.
- [ ] Confirm final post-load pass order (state settled -> reconcile -> reveal UI).
- [ ] Avoid blind delays unless they are intentional UX delays (not correctness delays).

## Global UI `InputField` — typed text (official contract)

Tabletop Simulator documents that **typed text in an `InputField` cannot be read from Lua outside** the callback arguments to **`onValueChanged`** or **`onEndEdit`**. See the **Note** under **InputField** in [Input Elements](https://api.tabletopsimulator.com/ui/inputelements/) (vendored: [`.dev/tts-api/UI API/Input Elements.md`](tts-api/UI%20API/Input%20Elements.md)).

**Do not treat as authoritative for `InputField` content:**

- `UI.getValue(elementId)` and `UI.getAttribute(elementId, "text")` — may appear to work in some builds or elements; they are **not** the documented way to read live `InputField` text and have failed in-repo (e.g. debug light GUID flow, roll options modal).

**Recommended patterns:**

1. **Callback + stash** — Wire `onValueChanged="HUD_..."` or `onEndEdit="HUD_..."` and copy the **`value`** argument into module-private state (same idea as the API doc’s `enteredValue = value`). **Confirm** buttons read the stash, not `UI.getValue`.
2. **Reference implementation** — ST roll difficulty: [`ui/shared/roll_panels.xml`](../ui/shared/roll_panels.xml) (`rollDash_difficulty_<Color>`, `onValueChanged="HUD_rollSetDifficulty"`) and [`core/global_script.ttslua`](../core/global_script.ttslua) `HUD_rollSetDifficulty(player, value, id)`.
3. **Script-driven prefill** when the field may be inactive — Use **`UI.setAttribute(id, "text", ...)`** (see `uiSetInputField` in [`core/roll_ui.ttslua`](../core/roll_ui.ttslua)); `UI.setValue` on `InputField` can be dropped in some states.

When opening a modal, set the panel **`active`**, then set **`text`** and initialize the stash so **Confirm** works even if the Host never focuses the field.

## G) Error visibility and observability

- [ ] No `pcall`/catch/fallback hides actionable failures in production path.
- [ ] Add targeted logs at decision points (desired mode, current mode, skipped reason).
- [ ] Log why a path exits early (missing object, missing mode, gate not met, etc.).
- [ ] Warn GM when configuration is invalid (e.g., missing required light mode).

## H) Simplicity and reuse

- [ ] Reuse existing utilities before writing low-level helpers from scratch.
- [ ] Check `.dev/AVAILABLE_FUNCTIONS.md`, `lib/util.ttslua`, and related docs first.
- [ ] Prefer deleting obsolete paths over adding compatibility shims.
- [ ] Ask "is this an X/Y problem?" and propose simpler alternatives when applicable.

## I) Definition of done (for bugfixes)

- [ ] Repro fails before fix and passes after fix using same steps.
- [ ] No manual "extra click" required for correctness unless explicitly intended.
- [ ] Relevant debug outputs match visible world behavior.
- [ ] Docs updated where behavior/API/workflow changed.
- [ ] Final note includes root cause, fix, and why this prevents recurrence.

## J) Stuck trigger (mandatory escalation)

If any of the below is true, pause implementation and run a root-cause pass:

- [ ] 3+ attempted fixes without stable resolution.
- [ ] New workaround added without explaining the previous one.
- [ ] Behavior improves only after manual admin/debug action.
- [ ] Fix depends on "eventually it settles" instead of deterministic ownership/order.
