# Game-Night Performance Recovery

## Agent Routing

Read this when:
- changing Storyteller Dashboard stage submission, scene transitions, Spotlight transitions, NPC scene preload, or transition-audio recovery
- investigating a game-night delay in one of those paths

Source of truth:
- `core/npc_stage_apply.ttslua`, `core/npcs.ttslua`, `core/npc_preload_pool.ttslua`
- `core/hud_blindfold.ttslua`, `core/phases.ttslua`, `core/spotlight.ttslua`
- `core/soundscape.ttslua`, `core/join_cold_pools.ttslua`
- `.dev/storyteller-dashboard/src/client/scenesPanel/`

Verification:
- policy tests named below
- `npm run build`
- a fresh Storyteller Dashboard server plus `npm run test:dnd`
- Save & Play checks in `.dev/PENDING AUTHOR VERIFICATION.md`

Status: current implementation and audit (2026-11-08).

## Performance contract

Normal play must not pay a recurring debug or preload cost. The scene preload pool starts disabled, never polls, and does no work until the Storyteller clicks **Preload** on a library scene. Soundscape and preload health reports are one-shot onboarding or explicit debug operations. Ordinary reconciler paths remain bounded by current state, changed character keys, fingerprints, or known GUIDs.

## 1. Dashboard NPC stage submission

### Previous work and delay

`StageApply.applyStageChanges` built the next placement map, then considered every NPC in that map for prewarming. A single move could therefore wait for an unrelated parked figurine image, with a maximum wait of 15 seconds. The eventual `Sync.npcs` also ran the broad NPC-condition reconciliation even when the edit changed only the position or light mode of an already-live stage NPC.

### Current path

- An ordinary edit prewarms only characters introduced or replaced by that edit. An already-live NPC move proceeds immediately.
- A clear or full base replacement still examines the complete resulting stage because membership may have changed.
- Position/light-only edits reconcile Step Five for the changed character keys and skip the unrelated NPC-condition pass.
- Membership changes retain the full NPC pass, homeland-seat reconciliation, and ordinary spawn fallback.

This removes the accidental ten-to-fifteen-second wait without weakening the state-first reconciliation contract.

## 2. Scene transitions

### Work and deliberate waits

A normal scene transition still owns the global cover, destination-card animation, ambient fade-out, connection checkpoint, table/seat/skybox/location mutation, full incremental synchronization, ambient fade-in, and post-work settle. The standard destination-card gate intentionally starts heavy work only after the site card has finished animating (about 5.75 seconds from cover start). The default cover settle remains 10 seconds for ordinary scene transitions.

The variable cost is NPC creation and custom-image loading. Previously that work could begin only after Apply, which made a large scene compete with table, UI, lighting, skybox, and audio work under the cover.

### Opt-in preload

Each library scene now has a **Preload** button. It reserves and creates only the NPC pairs named by that scene, two pairs per batch with a 0.15-second gap, and waits up to 15 seconds for figurine images. Completed pairs park through `O.hideObject` in a fixed 32×32 grid below the table; figurines and lights retain their normal scale and stay three world units apart by slot. When the scene is applied, existing pairs are reused instead of spawned during the transition.

The pool is deliberately cold until the button is clicked. A bad reservation or failed preload sequence disables pool reuse for the session, tells the Storyteller that ordinary spawning remains available, and leaves the normal on-demand path intact. Full NPC-world reset also disables it. `DEBUG.inspectNpcPreloadPool()` prints a one-shot record of reserved, parked, complete, and image-ready pairs.

Preload, a covered scene transition, and a Scatter player group change each print one `[SceneLoad]` timing block when they finish. `DEBUG.sceneLoadReport()` reprints the recent blocks and writes `.dev/.debug/scene-load-report.txt`. The block separates the cover's scheduled holds from world work, and it lists NPC figurines that were created during the action, already live before an application, still loading, or sent through an image reload. A player group change does not pose NPC figurines; its block should show player seat objects only.

### TOR-769 stall isolation

A five-client Council Chamber → Elysium transition exposed a more severe failure: the nominal
two-second fade-in hold resumed about 100 seconds later and all five joined clients disconnected.
The earlier theory that unlocked Scatter teleports caused the related player-group freeze was tested
and failed.

The timing report now compares host elapsed time with `Time.time`. A large difference is scheduler
drift: Lua returned, but TTS did not advance the game-time wait or run the next callback. NPC rows
say **created this action** and **already live before a call** instead of merging those observations
under the ambiguous spawned/reused labels. Loading flags are refreshed when the report closes.

`DEBUG.sceneStallProbe(action, spec)` re-applies one current-state production slice and prints a
return line followed by zero-delay and 0.25-second heartbeats. The TEST BED dispatcher and
plain-English order are in [Scene-Stall-Isolation.md](../E2E%20Playbooks/Scene-Stall-Isolation.md).
The probes are explicit diagnostics and do no recurring work.

The first live isolation pass found the common boundary: the `dashboard` action returned in 1 ms,
then its 0.25-second heartbeat resumed 37.3 seconds later. The Scatter figurine, hand, remaining
seat objects, camera, combined player move, and HUD actions did not reproduce that freeze. Follow-up
actions split the dashboard path into `seats` and `scene`, then into snapshot build, JSON encode, and
`sendExternalMessage`. Production pushes also print one `[DashPushSlow]` line when any of those
stages takes at least 250 ms. This narrows the next change without assuming that the bridge send,
payload encoding, or a particular snapshot builder is responsible.

Scatter entry now has one physical layout owner. `ScatterMode.enter` prepares Scatter state and
chrome, then `Sync.npcs` reaches reconciler Step Five once. Step Three defers its Scatter table
layout when Step Five is enabled, so the old enter + seat commit + Step Five triple application is
gone. This is confirmed waste removal, not yet proof that the client-disconnect incident is fixed.

## 3. Spotlight transitions

### Previous work and delay

Play → Spotlight inherited the ordinary location-card gate even though its destination cards are clear, plus the ordinary 10-second settle. Spotlight also forced a full synchronization and then repeated carousel, playfield-toy, and overlay work already owned by that sync. Spotlight → End inherited similar cover timing despite having no audio fade or location card to present.

### Current path

- Play → Spotlight uses a two-second cover lead, one-second fade-out, no location-card gate, 1.5-second fade-in, and a 2.5-second total settle budget. Its scheduled cover duration is about 5.5 seconds, plus synchronous world work.
- Spotlight → End uses a two-second cover lead, no audio fades or card gate, and a one-second settle. Its scheduled cover duration is about three seconds, plus synchronous world work.
- Spotlight entry uses an incremental `Sync.full` and lets that pass own carousel, toys, and overlay reconciliation once.
- Failure still lifts the cover and now runs the same transition recovery described below.

## 4. Transition audio and emitter health

`HUDBF.runStagedTransition` now always gives its caller the fade-in/finalization opportunity, including when world work reports failure. `Soundscape.recoverAfterTransition` closes the temporary fade window; after a failed transition it also force-reconciles the persisted soundscape intent so a half-faded scene cannot leave game night silent.

`Soundscape.validateEmitterHealth()` inspects the twelve configured channels by known GUID and reports object/tag identity, AudioSources, effects, volume control, Unity boot-component visibility, and the distinct bundle URLs. Missing boot-component metadata or an unexpected bundle count is a warning; a missing/unusable configured channel is a failure. Cold onboarding runs this once after emitter warm-up, prints the report, and shows a non-blocking Dashboard notice if incomplete. The Storyteller debug **Inspect soundscape** action and `DEBUG.inspectSoundscapeAudio()` expose the same report on demand.

## Verification commands

```powershell
npx fengari .tools/complications/run.lua .dev/scripts/npc_stage_apply_policy.test.lua
npx fengari .tools/complications/run.lua .dev/scripts/npc_preload_pool.test.lua
npx fengari .tools/complications/run.lua .dev/scripts/scene_load_trace.test.lua
node .dev/scripts/npc_preload_integration_policy.test.mjs
node .dev/scripts/scatter_pc_move_policy.test.mjs
node .dev/scripts/spotlight_transition_policy.test.mjs
node --test .dev/scripts/soundscape_contract.test.js
npm run check:pcall-gate
npm run check:lua-local-limit-gate
npm run build
```

For Dashboard changes, start a fresh server from `.dev/storyteller-dashboard`, exercise the scene library at 1920×1080, and run `npm run test:dnd`.
