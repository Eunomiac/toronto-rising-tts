# TOR-392 [Agent] TTS API heavy-workload — agent/docs guardrails (phase 4)

Phase 4 of 4 — TTS API performance audit chain. **blockedBy phase 3 remediation issue.**

## Agent task

After remediation ships, review project documentation and agent system instructions (`.cursor/rules/`, `AGENTS.md`, `.dev/DOCS_INDEX.md`, Event Listener Policy, tr-start skill, Performance Audit) and update them so generated code:

- avoids introducing new hot-path uses of cataloged heavy-work APIs without O(1) guards;
- points agents to the catalog + inventory before adding scans/casts/full UI refresh;
- documents approved alternatives (e.g. bounds check vs `getObjectsWithTag`).

## Deliverable

Doc/rule updates in the same change as any final remediation tail; living-doc note in Performance Audit.

## Agent handoff guidance

TOR-392 is the documentation / agent-guardrail follow-up to the completed TTS API heavy-workload sequence:

- **TOR-329** produced the catalog of synchronous/heavy Tabletop Simulator API surfaces.
- **TOR-390** produced the source inventory of current Toronto Rising call sites and risk classifications.
- **TOR-391** remediated the most obvious hot-path duplicates without changing the `gameState` / reconciler contract.

Primary repo references:

- `.dev/Sychronizing Game Functionality/TTS-API-Heavy-Workload-Catalog.md`
- `.dev/Sychronizing Game Functionality/TTS-API-Heavy-Workload-Usage-Inventory.md`
- `.dev/Sychronizing Game Functionality/Performance Audit.md`
- `.dev/Sychronizing Game Functionality/Event Listener Policy.md`
- `.cursor/rules/toronto-rising-linear.mdc`
- `AGENTS.md`

## TOR-391 context to preserve

TOR-391 completed a targeted hot-path remediation pass. The guardrails in TOR-392 should preserve these lessons so future agents do not reintroduce similar performance mistakes:

- Scene apply, table switch, seat-presence, location apply, and clock apply paths should not call broad `StorytellerScenesPanel.refresh()` immediately after `Sync.full` when the same refresh is already covered by incremental sync deltas.
- Seat-presence changes should not follow `Sync.full` with a second broad `UpdateUIDisplays({ playerHud = true })` unless a concrete missing-refresh case proves it is necessary.
- `Sync.full` owns top-fog reconciliation during its explicit scene phase; do not re-add duplicate top-fog reconciliation in nested seat-presentation paths.
- Hosted-condition reconciliation now reports changed seat colors so post-sync CSHEET refreshes can target changed colors with `PCST.refreshCharacterSheetsForColor` instead of scanning every player color.
- Control-board mirror paths should skip expensive snap/object/UI work when the mirror fingerprint is unchanged.
- Admin-light scene button refreshes should be coalesced when `adminLighting` and `scenesPanel` are requested together.

## TOR-392 scope

Update agent-facing docs/rules so future agents avoid adding new hot-path misuse of heavy/moderate TTS APIs.

Recommended target surfaces:

- `AGENTS.md` if the rule is repo-wide and non-negotiable.
- `.cursor/rules/` if Cursor agents should always apply the guidance.
- `.dev/Sychronizing Game Functionality/Performance Audit.md` if adding Toronto Rising-specific performance policy.
- `.dev/Sychronizing Game Functionality/TTS-API-Heavy-Workload-Catalog.md` if adding/clarifying API classification or guard-pattern notes.
- `.dev/Sychronizing Game Functionality/TTS-API-Heavy-Workload-Usage-Inventory.md` only if refreshing current call-site inventory or adding a “how to rescan” note.
- `.dev/DOCS_INDEX.md` if routing should point agents to the new guardrails.

Do not create broad user-facing manuals. This should be agent-first guidance: routing, source-of-truth clarity, checklist-style guardrails, and verification steps.

## Guardrail principles to document

Preserve the synchronization contract:

- `gameState` is the source of truth for game intent.
- Handlers mutate state first.
- Explicit reconcilers / sync entry points apply live TTS world, UI, audio, and object state.
- Do not hide live-world side effects in state setters.
- Do not “optimize” by bypassing reconcilers and directly writing lights, UI, spawned objects, AssetBundle audio, or object visibility from arbitrary handlers.

For high-frequency paths, require O(1) / bounded guards before heavy work:

- `onValueChanged`
- object event handlers
- physical object listeners
- timers / delayed fan-out
- repeated reconcilers
- scene/table/seat/location apply paths
- UI refresh fan-out
- object scan / spawn / reload / component-update paths

Heavy or moderate TTS API usage should usually have at least one of:

- a GUID / identity / seat / color / tag bound before scanning;
- a dirty-check or fingerprint that skips unchanged work;
- a narrowed sync delta instead of a broad refresh;
- a cold/setup/debug-only justification;
- chunking/defer behavior for unavoidable heavy work;
- profiling/logging hooks when static risk is unclear.

## Checklist for future agents

Add a compact checklist agents can apply before merging any Lua/XML change that touches TTS API calls:

- Is this call in a hot callback, timer, repeated reconciler, or user-drag/type path?
- Is this call bounded by color, seat, GUID, tag, or known object identity before expensive work starts?
- Is unchanged work skipped by a fingerprint, cache, dirty check, or previous-value comparison?
- Is a broad refresh being duplicated immediately after `Sync.full`, `Sync.player`, or another reconciler?
- Would a narrower delta (`playerHud`, `scenesPanel`, changed seat colors, etc.) replace a broad refresh?
- Does this path scan all objects or tag groups repeatedly when a GUID/cache/index would work?
- Does this path call component setters every refresh even when values did not change?
- Does this path spawn, reload, set XML, set custom objects, or touch AssetBundle/audio APIs in a hot path?
- Is the call acceptable only because it is debug/setup/cold-path? If so, is that explicit in comments/docs?
- Does `npm run build` pass after production Lua/XML edits?
- If behavior depends on live TTS state, is there a manual Save & Play / live-table smoke note?

## Specific API families to call out

Use the TOR-329 catalog and TOR-390 inventory as the source map, but make sure the agent guidance explicitly calls out these recurring risky families:

- global or broad object scans:
  - `getObjects`
  - `getAllObjects`
  - `getObjectsWithTag`
  - `getObjectsWithAllTags`
- object/container/zone enumeration:
  - `.getObjects()`
  - deck/container scans
- spawn / reload / custom object work:
  - `spawnObjectData`
  - `spawnObjectJSON`
  - `takeObject`
  - `setCustomObject`
  - `reload`
- UI rebuild / fan-out:
  - `UI.setXml`
  - `self.UI.setXml`
  - repeated `UI.setAttribute(s)`
  - broad HUD or scenes-panel refreshes
- component traversal / writes:
  - `getComponentInChildren`
  - `getComponentsInChildren`
  - `getChildren`
  - `Component.set` / aliases such as `comp.set` and `source.set`
- timers / high-frequency callbacks:
  - `Timer.create`
  - `onValueChanged`
  - any future `onUpdate`, `onFixedUpdate`, `onDrag`, collision-stay, or similar frame/physics callback
- scene/world/audio APIs:
  - `Backgrounds.setCustomURL`
  - `MusicPlayer.play`
  - AssetBundle / soundscape component updates

## Verification expectations

Minimum verification for TOR-392:

- Run a docs/routing check after edits:
  - verify all linked files exist;
  - verify any line/path claims against current source;
  - ensure `.dev/DOCS_INDEX.md` points to the new/updated guidance if appropriate.
- Run `npm run build` only if production Lua/XML files are changed.
- No Save & Play is required for docs-only changes.
- If TOR-392 includes production code cleanup while editing docs, then also add an appropriate TTS smoke note.

Known TOR-391 verification caveat to preserve:

- `npm run build` passed after TOR-391 code changes.
- `npm run tts:smoke` was attempted but could not connect to the local TTS bridge (`ECONNREFUSED 127.0.0.1:39999`).
- Manual live-table smoke remains recommended for:
  - scene apply;
  - table switch;
  - location apply;
  - clock apply;
  - seat-presence toggle;
  - gameboard Apply / Clear / Load / token drop;
  - storyteller panel switching.

## Suggested acceptance criteria

- Agent-facing guardrails exist for heavy/moderate TTS API use in hot paths.
- The guidance routes agents to the TOR-329 catalog, TOR-390 inventory, Performance Audit, and Event Listener Policy.
- The guidance includes a short pre-merge checklist for Lua/XML changes touching TTS API calls.
- The guidance reinforces the `gameState` → mutation → explicit sync/reconciler contract.
- The guidance explicitly warns against duplicate broad refreshes after `Sync.full` and similar sync entry points.
- The guidance documents when broad scans/spawns/reloads/setXml/component writes are acceptable: cold/setup/debug-only, bounded, dirty-checked, chunked, or otherwise justified.
- Repo docs remain link-valid after the update.