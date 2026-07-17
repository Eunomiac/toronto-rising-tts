# TTS API Heavy-Workload Catalog

## Agent Routing

Read this when:
- auditing Tabletop Simulator API calls for synchronous or broad fan-out cost
- preparing TOR-390 codebase grep/inventory work
- deciding whether a TTS API call is safe in event handlers, reconcilers, timers, or UI refresh paths

Source of truth:
- `.dev/tts-api/`
- `TTS-Scripting-Guide.htm` for legacy naming only
- https://api.tabletopsimulator.com/ for spot checks when vendored docs are thin
- `.dev/Sychronizing Game Functionality/Event Listener Policy.md`
- `docs/solutions/lua-ui-full-xml-policy.md`

Verification:
- every catalog row keeps a grep-friendly symbol name
- tiers describe bounded-call baseline cost, not per-frame or spammed call-site risk
- every HEAVY row has doc evidence, guard guidance, and a cheaper alternative or cold-path note
- phase 2 must grep code call sites separately; this catalog does not inventory usage frequency

Status: TOR-329 phase 1 catalog; tiers were recalibrated on 2026-07-16 to separate bounded-call API cost from TOR-390 call-site frequency risk; keep agent-first and update when TTS API docs or repo policies change.

## Classification Rubric

| Column | Values / notes |
| --- | --- |
| Symbol | Exact Lua name as called, such as `getObjectsWithTag`, `Physics.cast`, `UI.setXml`, `object.getBounds` |
| Host | `Global`, `Object`, `UI`, `self.UI`, `Physics`, `JSON`, `Lighting`, `WebRequest`, `Player`, `other` |
| Tier | `HEAVY`, `MODERATE`, `LIGHT`, `CONTEXT` |
| Cost driver | `table-scan`, `tag-index`, `physics-cast`, `spawn-io`, `mesh-bounds`, `ui-full-refresh`, `serialize`, `component-lookup`, `network`, `per-frame`, `timer-fanout`, `asset-load`, `state-sweep` |
| Doc evidence | Short paraphrase or short quote with `.dev/tts-api/` path; cite official docs when used for a gap check |
| Typical lag | bounded-call baseline: `spike`, `stutter`, `cumulative`, `rare`, or `context-dependent` |
| Hot-path rule | Extra restriction for `onObjectDrop`, `onObjectRandomize`, `onUpdate`, `onFixedUpdate`, timer chains, and reconciler loops |
| Guard pattern | O(1) tag/GUID/type check first, cache, bounds precheck, fingerprint, or narrow delta |
| Cheaper alternative | Known-object reference, cached index, bounds check, `setAttribute`, cold-path isolation, or `none - isolate to cold path` |
| TR policy link | Local policy/doc when relevant |

Tier guidance:
- `HEAVY`: high per-call blast radius or explicit performance warning even outside per-frame loops: full world scans, spawn/reload/custom asset load, physics casts, full UI document replacement, scene/table/background swaps, per-frame callback entry points, or bulk object movement.
- `MODERATE`: bounded but nontrivial work: tag/index query, single-object bounds/component/container enumeration, JSON/WebRequest payload work, object/UI table mutation, modal/client fan-out, or global state mutation.
- `LIGHT`: scalar or small bounded work that is likely okay outside high-frequency paths: known-object transforms, simple vector math, one-id UI reads/writes, simple chat/player/list reads, and setup-only scalar config writes.
- `CONTEXT`: use sparingly, only when the same symbol has sharply different cost modes based on arguments or opaque engine-side target; every `CONTEXT` row must name both safe and costly circumstances.

## Known Toronto Rising Examples

| Example | API shape | Lesson | Source |
| --- | --- | --- | --- |
| Control-board token surface check | `getObjectsWithTag` replaced by board-local bounds checks for hot pick-up/drag/drop eligibility | Avoid full/tag scans inside common object event paths; do one O(1)-ish known-object bounds check after an initial tag/GUID guard | `core/npc_gameboard.ttslua`, `Event Listener Policy.md` |
| Runtime full XmlUI refresh policy | `UI.setXml`, `UI.setXmlTable`, `self.UI.setXml` | Full-document replacement is allowed only for the approved CSHEET object-page exception; prefer predeclared XML plus attribute/value deltas | `docs/solutions/lua-ui-full-xml-policy.md` |
| Event listener guard rule | `onObjectDrop`, `onObjectRandomize`, `onObjectEnterZone`, `onFixedUpdate`-style callbacks | Reject unrelated events before `require`, scans, state iteration, timers, or `Sync.*`; hot handlers must start with cheap object/player/type gates | `Event Listener Policy.md` |
| Control-board hot event replacement | `getObjectsWithTag` replaced by known-board local bounds checks | A tag query can still be too broad in pick-up/drag/drop style paths; use a cached/known object plus coordinate math when the event already provides the object | `core/npc_gameboard.ttslua`, `Performance Audit.md` |
| Periodic clock/UI fan-out | timer chain to `UpdateUIDisplays({ playerHud = true })` | Timer-driven paths can be as costly as direct event paths when they refresh broad UI repeatedly; use narrow deltas and fingerprints | TOR-329 Linear comment 2026-07-13 |
| Post-`Sync.full` duplicate refreshes | `StorytellerScenesPanel.refresh`, all-HUD `UpdateUIDisplays`, top-fog reconcile, all-color CSHEET refresh | Do not add broad refresh immediately after full/player/domain sync when the reconciler already emits incremental deltas; add or fix the missing delta instead | `Performance Audit.md` |

## Official API Spot Checks

The vendored `.dev/tts-api/` pages match the official docs for the explicit cost warnings checked during TOR-329:

- `Physics.cast`: official docs warn that physics casts are expensive and that running 30+ can stutter or crash.
- `UI.setXml` / `UI.setXmlTable`: official docs confirm full UI replacement and stale reads until `UI.loading == false`.
- `onFixedUpdate`: official docs confirm 90 physics ticks per second and require very simple/fast implementations.
- `registerCollisions(stay)`: official docs warn that stay events may negatively affect performance.
- `spawnObjectJSON`: official docs prefer `spawnObjectData` unless JSON already exists because it is less resource intensive.

## Domain A - Global Object Enumeration

| Symbol | Host | Tier | Cost driver | Doc evidence | Typical lag | Hot-path rule | Guard pattern | Cheaper alternative | TR policy link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getAllObjects` | `Global` | HEAVY | `table-scan` | `.dev/tts-api/Scripting API/Base.md`: deprecated; returns all objects except hand zones. | cumulative | Never add new use; do not call from frame/update/drop paths. | Replace with indexed GUID/tag lookup; cache only at explicit rebuild boundaries. | `getObjectFromGUID`, cached index, narrower tag query | Event Listener Policy |
| `getObjects` | `Global` | HEAVY | `table-scan` | `Base.md`: returns a table of all objects; examples loop over it to identify objects. | cumulative | One scan per explicit rebuild boundary, never live polling. | Cache GUID/type/tag indexes and invalidate after controlled spawn/destroy. | `getObjectFromGUID`, `getObjectsWithTag`, cached index | Event Listener Policy |
| `getObjectsWithTag` | `Global` | MODERATE | `tag-index` | `Base.md`: returns all objects with one tag. | cumulative | Prefer over `getObjects` filtering, but still avoid hot paths. | Maintain tag indexes for common domains; combine with O(1) object checks before scans. | known GUID/reference, cached tag index, bounds precheck | Event Listener Policy |
| `getObjectsWithAnyTags` | `Global` | MODERATE | `tag-index` | `Base.md`: returns objects with at least one requested tag. | cumulative | Avoid broad multi-tag scans in handlers/timers. | Precompute tag sets; debounce refresh after spawn/destroy batches. | narrower `getObjectsWithTag`, cached tag index | Event Listener Policy |
| `getObjectsWithAllTags` | `Global` | MODERATE | `tag-index` | `Base.md`: returns objects matching every requested tag. | cumulative | Use for coarse rebuilds only. | Cache composite matches and refresh after controlled mutations. | cached composite tag index | Event Listener Policy |
| `copy` | `Global` | MODERATE | `state-sweep` | `Base.md`: copies an object list, equivalent to highlighting and copying objects. | cumulative | Bounded explicit copies only; never copy large selections during interactive callbacks. | Validate bounded `object_list`; defer after state settles. | saved object data, prebuilt spawn templates | Reconciler Contract |
| `paste` | `Global` | HEAVY | `spawn-io` | `Base.md`: pastes clipboard objects into the world. | spike | Avoid large paste bursts or paste loops without yielding. | Batch, cap count, and reconcile after spawn settles. | object pooling, `spawnObjectData` for explicit subset | Reconciler Contract |
| `spawnObject` | `Global` | HEAVY | `spawn-io` | `Base.md`: objects take a moment to spawn; callback runs after spawning finishes. | spike | Never assume returned object is fully ready; avoid burst spawning in hot paths. | Use `callback_function`; chunk batches across frames. | pooled objects, fewer/simple built-ins | Reconciler Contract |
| `spawnObjectData` | `Global` | HEAVY | `spawn-io` | `Base.md`: spawns from full persistent object data; objects take a moment to spawn. | spike | Avoid large data spawns in one frame. | Use callback; validate data before spawn; chunk batches. | `spawnObject` for simple built-ins, object pool | Reconciler Contract |
| `spawnObjectJSON` | `Global` | HEAVY | `spawn-io` / `serialize` | `Base.md`: `spawnObjectData` is preferred unless JSON already exists because it is less resource intensive. | spike | Do not generate/parse JSON to spawn during hot paths. | Prefer data tables; fail loudly on bad JSON; chunk batches. | `spawnObjectData` | Reconciler Contract |
| `destroyObject` | `Global` | MODERATE | `state-sweep` | `Base.md`: deletes an object from the instance. | rare | Do not destroy while iterating uncached live query results. | Stage GUIDs first; nil-check refs; sync after mutation. | hide/reuse pooled object where appropriate | Reconciler Contract |
| `group` | `Global` | MODERATE | `state-sweep` / `physics-cast` | `Base.md`: groups objects like the `G` key and returns new deck/stack refs. | spike | Avoid grouping large sets in hot paths. | Validate groupable objects; run after movement settles; refresh refs from return table. | prebuilt deck/stack data | Reconciler Contract |
| `log` | `Global` | MODERATE | `serialize` | `Base.md`: tables display keys/values and nested tables to configured depth. | cumulative | Do not log object/world tables in hot paths. | Debug gate; log counts/GUIDs instead of full tables. | concise counters | DEBUG_FILE_LOGGING |
| `logString` | `Global` | MODERATE | `serialize` | `Base.md`: stringifies values similarly to `log`; examples include `getObjects()`. | cumulative | Avoid stringifying large tables repeatedly. | Debug gate; reduce payload before formatting. | small explicit fields | DEBUG_FILE_LOGGING |
| `broadcastToAll` | `Global` | MODERATE | `network` / `ui-full-refresh` | `Base.md`: prints on-screen and to chat for all players. | cumulative | Rate-limit broadcast bursts. | Coalesce repeated notices; gate debug chatter. | `broadcastToColor`, one summary message | Event Listener Policy |
| `printToAll` | `Global` | MODERATE | `network` | `Base.md`: prints to all connected players' chat. | cumulative | No chat spam loops. | Debug gate and debounce repeated output. | `printToColor`, host-only `print` | Event Listener Policy |
| `sendExternalMessage` | `Global` | MODERATE | `serialize` / `network` | `Base.md`: sends arbitrary table data to an external editor. | cumulative | Keep out of production hot paths and large payload instrumentation. | Editor/debug gate; send minimal payloads. | structured `TR_AGENT_V1` print for local tooling | TTS_MCP |

## Domain B - Object Transforms, Components, and Containers

| Symbol | Host | Tier | Cost driver | Doc evidence | Typical lag | Hot-path rule | Guard pattern | Cheaper alternative | TR policy link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getBounds` | `Object` | MODERATE | `mesh-bounds` | `.dev/tts-api/Scripting API/Object.md`: returns Unity Bounds table with center/size/offset. | cumulative | Do not poll every frame or across many objects. | Check `spawning`/destroyed state; cache until transform/model changes. | cached dimensions, `getScale` for simple relative checks | Performance Audit |
| `getBoundsNormalized` | `Object` | MODERATE | `mesh-bounds` | `Object.md`: returns merged collider bounds as if rotation were `{0,0,0}`. | cumulative | Avoid layout scans that repeatedly recompute normalized bounds. | Wait for spawned/custom object readiness; cache by GUID+scale. | cached bounds metadata | Performance Audit |
| `getVisualBoundsNormalized` | `Object` | MODERATE | `mesh-bounds` | `Object.md`: returns merged renderer bounds as if rotation were `{0,0,0}`. | cumulative | Avoid hot-path visual-fit loops. | Guard `loading_custom`/`spawning`; cache after visual asset load. | collider bounds or cached render metadata | Performance Audit |
| `positionToLocal` | `Object` | LIGHT | `state-sweep` | `Object.md`: converts world vector to object-local and accounts for scale. | rare | Safe for bounded known-object coordinate conversion; avoid repeated coordinate churn inside broad layout loops. | Snapshot transform once per operation. | precomputed local offsets | Reconciler Contract |
| `positionToWorld` | `Object` | LIGHT | `state-sweep` | `Object.md`: converts local vector to world using the object as reference and scale context. | rare | Safe for bounded anchor conversion; cache repeated conversions in one reconcile pass. | Snapshot transform and invalidate on move/scale. | stored world anchors | Reconciler Contract |
| `setPositionSmooth` | `Object` | MODERATE | `physics-cast` | `Object.md`: smooth move; `collide` controls collision while moving. | stutter | Avoid mass smooth moves or repeated target resets. | Batch/stagger; choose `collide=false` when safe; wait for rest before dependent physics. | `setPosition` for controlled instant placement | Reconciler Contract |
| `setRotationSmooth` | `Object` | MODERATE | `physics-cast` | `Object.md`: smooth rotation with optional collision. | stutter | Avoid loops that keep changing smooth targets. | One target per reconciliation; wait for settle if later reads depend on rotation. | `setRotation` for controlled instant placement | Reconciler Contract |
| `setRotationValue` | `Object` | MODERATE | `physics-cast` | `Object.md`: elevates, smoothly rotates, then releases object. | stutter | Do not use for bulk dice/card correction loops. | Wait for rest before dependent reads. | `setRotation` when physical roll semantics are unnecessary | Reconciler Contract |
| `getData` | `Object` | MODERATE | `serialize` | `Object.md`: returns full object data suitable for `spawnObjectData`. | spike | Do not call during frequent sync/reconcile. | Call on demand; guard destroyed refs; snapshot outside interaction frames. | narrow getters such as `getGUID`, `getName`, `getQuantity` | Performance Audit |
| `getJSON` | `Object` | MODERATE | `serialize` | `Object.md`: returns full JSON representation suitable for `spawnObjectJSON`; indentation defaults true. | spike | Avoid in hot paths and live UI callbacks. | Use unindented only when needed; snapshot outside interaction frames. | `getData`, narrow getters | Performance Audit |
| `getCustomObject` | `Object` | MODERATE | `asset-load` | `Object.md`: returns custom object info; some types include extra asset-dependent fields. | cumulative | Do not poll for asset identity. | Cache at spawn/load; check type and `loading_custom`. | state-owned custom metadata | Reconciler Contract |
| `setCustomObject` | `Object` | MODERATE | `asset-load` | `Object.md`: existing custom-object changes require `reload` to display. | spike | Never call repeatedly on live hot paths. | Build full parameter table once; reload once when unavoidable. | spawn correctly configured object up front | Performance Audit |
| `reload` | `Object` | HEAVY | `spawn-io` / `asset-load` | `Object.md`: deletes and respawns the object; old reference becomes invalid. | spike | Do not reload inside interaction loops or broad reconciliation. | Reassign returned object; wait for `spawning == false`. | avoid reload by setting custom data before spawn | Performance Audit |
| `getObjects` | `Object` | MODERATE | `table-scan` | `Object.md`: containers return contained-object metadata; zones return occupying objects. | cumulative | Avoid polling zones/decks every frame. | Prefer event-driven cache; pass `ignore_tags` deliberately. | `getQuantity`, cached container/zone index | Event Listener Policy |
| `getAttachments` | `Object` | MODERATE | `table-scan` | `Object.md`: returns attachment list in the same format as container `getObjects`. | cumulative | Avoid repeated attachment scans. | Cache after attach/detach actions. | known attachment refs | Event Listener Policy |
| `takeObject` | `Object` | HEAVY | `spawn-io` | `Object.md`: taken objects take one or more frames to spawn; callbacks fire after spawn. | spike | Never assume returned object is physics-ready immediately. | Use callback; wait one extra frame for physics if needed; check `remainder`. | cached index and delayed callback; `getQuantity` when only count needed | Reconciler Contract |
| `putObject` | `Object` | MODERATE | `state-sweep` / `physics-cast` | `Object.md`: puts object into container or combines into deck/stack; return may be a new container. | spike | Avoid bulk put loops without staging. | Use returned reference; verify source object validity. | prebuilt deck/container data | Reconciler Contract |
| `split` | `Object` | HEAVY | `spawn-io` | `Object.md`: new decks take a frame to be created; immediate actions fail. | spike | Do not act on returned decks immediately. | Add coroutine/timer delay; cap pile count. | `takeObject` for targeted extraction | Reconciler Contract |
| `spread` | `Object` | HEAVY | `spawn-io` | `Object.md`: spread cards take a frame to be created. | spike | Do not spread large decks in hot paths. | Delay before acting; limit deck size. | `takeObject` for targeted extraction | Reconciler Contract |
| `registerCollisions` | `Object` | CONTEXT | `per-frame` | `Object.md`: `stay=true` registers stay events and may negatively impact performance. | stutter | Safe only for narrow `stay=false` enter/exit registration; costly with `stay=true`, many objects, or long-lived registrations. | Register narrowly and unregister promptly. | enter/exit events, explicit zone checks | Event Listener Policy |
| `getComponentInChildren` | `Object` | MODERATE | `component-lookup` | Object Components docs: recursively searches object and children depth-first. | cumulative | Do not call repeatedly during interaction frames. | Resolve once at setup/load; cache by GUID+component name. | `getComponent` when top-level is enough | Performance Audit |
| `getComponentsInChildren` | `Object` | MODERATE | `component-lookup` | Object Components docs: recursively enumerates components through children. | cumulative | Avoid broad scans except setup/debug. | Cache component list; filter by name when possible. | `getComponents(name)` | Performance Audit |
| `getComponents` | `Object` | MODERATE | `component-lookup` | Object Components docs: returns component list; optional name filters. | cumulative | Prefer named lookup and cache. | Pass `name` when known; guard empty results. | `getComponent(name)` | Performance Audit |
| `getChildren` | `Object` | MODERATE | `component-lookup` | GameObject docs: returns child GameObjects. | cumulative | Avoid repeated hierarchy walks. | Cache child handles after load. | `getChild(name)` | Performance Audit |
| `GameObject.getComponentInChildren` | `GameObject` | MODERATE | `component-lookup` | Object Components docs: recursive depth-first search from a GameObject. | cumulative | Do not call repeatedly in live interactions. | Cache resolved component and nil-check before mutation. | `GameObject.getComponent(name)` | Performance Audit |
| `GameObject.getComponentsInChildren` | `GameObject` | MODERATE | `component-lookup` | Object Components docs: recursive component enumeration. | cumulative | Avoid per-frame/setup-repeat scans. | Cache results; filter by name. | `GameObject.getComponents(name)` | Performance Audit |
| `GameObject.getMaterialsInChildren` | `GameObject` | MODERATE | `component-lookup` | Material docs: recursively searches child renderers/materials. | cumulative | Avoid per-frame material scans. | Cache material refs at setup. | `GameObject.getMaterials()` | Performance Audit |
| `Component.getVars` | `Component` | MODERATE | `component-lookup` | Component docs: returns all Var names/types for a component. | rare | Use for setup/debug, not runtime polling. | Cache allowed vars and fail loudly on missing var. | `Component.get(name)` for known vars | Event Listener Policy |
| `Component.set` | `Component` | CONTEXT | `component-lookup` | Component docs: sets a Unity Component Var. | context-dependent | Safe only for one cached component and known cheap var; costly when the var drives renderer/physics/asset side effects or fan-out across objects. | Check component/var exists; isolate behind reconciler-owned function. | native Object API when available | Reconciler Contract |
| `Material.getVars` | `Material` | MODERATE | `component-lookup` | Material docs: returns shader/material Var names/types. | rare | Debug/setup only. | Cache shader vars; fail loudly on missing var. | direct `Material.get(name)` | Event Listener Policy |
| `Material.set` | `Material` | CONTEXT | `component-lookup` | Material docs: sets a Material Var. | context-dependent | Safe only for one cached material and scalar var; costly for texture/render-affecting vars or many materials. | Batch changes and cache Material refs. | Object tint APIs when sufficient | Reconciler Contract |
| `Container.search` | `Object.Container` | CONTEXT | `ui-full-refresh` / `table-scan` | Container behavior docs: opens search UI; `max_cards` limits top deck cards. | context-dependent | Safe only as an explicit player action with a bounded `max_cards`; costly when automated, repeated, or unbounded on large decks. | Require explicit player action; pass `max_cards` where possible. | script-side cached lookup | Event Listener Policy |
| `LayoutZone.layout` | `Object.LayoutZone` | HEAVY | `state-sweep` / `physics-cast` | LayoutZone docs: relayout can move, sort, combine, split, randomize contents. | spike | Avoid automatic relayout storms. | Set `manual_only`, debounce, and disable `instant_refill` unless needed. | deterministic targeted placement | Reconciler Contract |
| `LayoutZone.setOptions` | `Object.LayoutZone` | LIGHT | `state-sweep` | LayoutZone docs: changes future automatic layout behavior. | rare | Do not churn options before each layout. | Apply once during setup; keep state intent separate. | static zone configuration | Reconciler Contract |
| `AssetBundle.getLoopingEffects` | `Object.AssetBundle` | MODERATE | `asset-load` | AssetBundle docs: returns index/name table for looping effects. | rare | Cache effect indexes by name. | Guard missing AssetBundle and cache after load. | stored effect constants | Performance Audit |
| `AssetBundle.playLoopingEffect` | `Object.AssetBundle` | MODERATE | `asset-load` | AssetBundle docs: starts a looping effect by index. | cumulative | Avoid rapid restart loops. | Validate index and track current effect. | skip if already active | Performance Audit |
| `AssetBundle.playTriggerEffect` | `Object.AssetBundle` | MODERATE | `asset-load` | AssetBundle docs: triggers an effect by index. | cumulative | Rate-limit repeated triggers. | Debounce event source; validate cached index. | coalesced effect request | Performance Audit |
| `Browser.url` | `Object.Browser` | HEAVY | `network` / `asset-load` | Browser docs: `url` is the current target displayed by Tablet. | spike | Do not churn URL during gameplay loops. | Set only from explicit action and validate URL. | static/cached tablet content | Event Listener Policy |
| `Browser.pixel_width` | `Object.Browser` | MODERATE | `asset-load` | Browser docs: virtual browser render pixel width. | spike | Avoid high-width changes in hot paths. | Configure once; choose conservative resolution. | lower pixel width | Event Listener Policy |
| `TextTool.setValue` | `Object.TextTool` | LIGHT | `ui-full-refresh` | TextTool docs: sets current 3D text value. | rare | Avoid per-keystroke world text churn. | Dirty-check and update only committed state. | tooltip/name for simple labels | Reconciler Contract |
| `TextTool.setFontSize` | `Object.TextTool` | MODERATE | `ui-full-refresh` | TextTool docs: sets rendered font size. | cumulative | Avoid repeated resizing loops. | Clamp and write once per committed state. | preconfigured text objects | Reconciler Contract |
| `Book.setPage` | `Object.Book` | MODERATE | `asset-load` | Book docs: sets current PDF page. | spike | Avoid automated page-flipping loops. | Validate page bounds and change only on player action. | stored intended page | Event Listener Policy |

## Domain C - Physics and Spatial Queries

| Symbol | Host | Tier | Cost driver | Doc evidence | Typical lag | Hot-path rule | Guard pattern | Cheaper alternative | TR policy link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Physics.cast` | `Physics` | HEAVY | `physics-cast` | `.dev/tts-api/Scripting API/Physics.md`: docs warn physics casts are expensive; 30+ at once can stutter or crash. | stutter | Never run unbounded/bulk casts in per-frame, drop, collision, or timer loops. | Cap count, cast shape, distance, and returned-hit processing; keep `debug=false` outside diagnostics. | cached object positions, known zone membership, event-driven state, bounds precheck | Event Listener Policy |
| `Physics.getGravity` | `Physics` | LIGHT | `state-sweep` | `Physics.md`: returns gravity direction vector. | rare | Safe as a scalar read; avoid polling when state already knows intended gravity. | Cache if used repeatedly in one operation. | local gravity intent | Reconciler Contract |
| `Physics.setGravity` | `Physics` | MODERATE | `physics-cast` | `Physics.md`: sets gravity direction. | spike | Do not animate or spam global gravity from hot paths. | Change only through explicit state transition. | one setup/admin transition | Reconciler Contract |
| `Hands.getHands` | `Hands` | LIGHT | `table-scan` | `.dev/tts-api/Scripting API/Hands.md`: returns all Hand Zone objects. | rare | Do not use as spatial polling. | Cache hand-zone refs; refresh after seating/zone lifecycle changes. | TR-owned hand-zone registry | Event Listener Policy |
| `Hands.enable` | `Hands` | LIGHT | `state-sweep` | `Hands.md`: controls whether hand zones hold objects. | rare | Do not toggle from object scripts or hot paths. | Gate behind authoritative table/rules transition. | gameState intent plus one explicit sync | Reconciler Contract |
| `Hands.disable_unused` | `Hands` | LIGHT | `state-sweep` | `Hands.md`: disables hand zones for colors without seated players. | rare | Avoid repeated writes during seating workflows. | Set during setup/seating reconciliation only. | effective-presence state | Reconciler Contract |
| `Hands.hiding` | `Hands` | LIGHT | `state-sweep` | `Hands.md`: global privacy policy for hand contents. | rare | Do not change inside object-local helpers. | Change only through explicit table/privacy mode transition. | per-mode state and one sync | Reconciler Contract |
| `Grid.type` | `Grid` | LIGHT | `state-sweep` | `.dev/tts-api/Scripting API/Grid.md`: global grid topology. | rare | Do not use as a per-action spatial helper. | Set during setup/map mode transitions only. | explicit board coordinate transforms | Reconciler Contract |
| `Grid.snapping` | `Grid` | LIGHT | `state-sweep` | `Grid.md`: global object snapping mode. | rare | Avoid toggling around movement hot paths. | Use scoped placement routines. | direct coordinates | Reconciler Contract |
| `Grid.offsetX` | `Grid` | LIGHT | `state-sweep` | `Grid.md`: global grid origin X offset. | rare | Do not mutate for temporary math. | Treat as setup-only. | local coordinate conversion | Reconciler Contract |
| `Grid.offsetY` | `Grid` | LIGHT | `state-sweep` | `Grid.md`: global grid origin Y offset. | rare | Do not mutate for temporary math. | Treat as setup-only. | local coordinate conversion | Reconciler Contract |
| `Grid.sizeX` | `Grid` | LIGHT | `state-sweep` | `Grid.md`: global grid cell width. | rare | Do not resize grid as part of repeated spatial queries. | Set once per board/map configuration. | board scale constants | Reconciler Contract |
| `Grid.sizeY` | `Grid` | LIGHT | `state-sweep` | `Grid.md`: global grid cell height. | rare | Do not resize grid as part of repeated spatial queries. | Set once per board/map configuration. | board scale constants | Reconciler Contract |

## Domain D - UI and XmlUI

| Symbol | Host | Tier | Cost driver | Doc evidence | Typical lag | Hot-path rule | Guard pattern | Cheaper alternative | TR policy link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UI.setXml` | `UI` | HEAVY | `ui-full-refresh` | `.dev/tts-api/Scripting API/UI.md`: replaces Global UI; reads are stale until `UI.loading == false`. | spike | Never call from rapid callbacks, timers, or routine reconciliation. | Build once, diff intent, debounce/coalesce, gate follow-up reads on `UI.loading`. | `UI.setAttribute`, `UI.setAttributes`, `UI.setValue`, `UI.show`, `UI.hide` | lua-ui-full-xml-policy |
| `self.UI.setXml` | `self.UI` | HEAVY | `ui-full-refresh` | `UI.md`: same replacement API applies to Object UI via `object.UI.*`. | spike | Avoid repeated object event use or multi-object fan-out. | Coalesce per object; keep XML small; read after `self.UI.loading == false`. | `self.UI.setAttribute`, `self.UI.setAttributes`, `self.UI.setValue`, show/hide | lua-ui-full-xml-policy |
| `UI.setXmlTable` | `UI` | HEAVY | `ui-full-refresh` | `UI.md`: replaces UI from nested table; reads stale until loading false. | spike | Treat as full refresh, not patch primitive. | Precompute off hot path; one replacement per logical screen transition. | targeted attributes/value/class updates | lua-ui-full-xml-policy |
| `self.UI.setXmlTable` | `self.UI` | HEAVY | `ui-full-refresh` | `UI.md`: Object UI supports same nested-table replacement API. | spike | Do not broadcast full object UI tables during live interactions. | Batch per object and skip unchanged state. | targeted `self.UI.*` updates | lua-ui-full-xml-policy |
| `UI.getXml` | `UI` | HEAVY | `serialize` | `UI.md`: returns current UI as XML. | cumulative | Diagnostics only after `UI.loading == false`; never poll/diff in gameplay. | Keep explicit UI model state; inspect only for diagnostics after loading settles. | targeted getters, source state | lua-ui-full-xml-policy |
| `self.UI.getXml` | `self.UI` | LIGHT | `serialize` | `UI.md`: Object UI supports full XML retrieval. | cumulative | Safe only for one-object diagnostics; costly in object callbacks and multi-object scans. | Keep object UI state in Lua data. | targeted getters | lua-ui-full-xml-policy |
| `UI.getXmlTable` | `UI` | HEAVY | `serialize` | `UI.md`: returns full UI as nested table with children. | cumulative | Debug/setup only; never call to discover state during gameplay loops. | Track source state separately. | targeted getters/callback values | lua-ui-full-xml-policy |
| `self.UI.getXmlTable` | `self.UI` | MODERATE | `serialize` | `UI.md`: Object UI supports full table retrieval. | cumulative | Never fan out across many objects on a hot path. | Inspect one object at a time for debugging only. | targeted getters/callback values | lua-ui-full-xml-policy |
| `UI.setCustomAssets` | `UI` | HEAVY | `asset-load` | `UI.md`: replaces custom assets; warning notes it overwrites existing assets. | spike | Do not use for incremental image swaps. | Maintain one canonical asset table; replace on bootstrap/screen boundary only. | preload assets; swap `image` attribute | lua-ui-full-xml-policy |
| `self.UI.setCustomAssets` | `self.UI` | HEAVY | `asset-load` | `UI.md`: Object UI supports same custom asset replacement. | spike | Avoid per-object asset replacement during live updates. | Share stable asset names; update element attributes. | `self.UI.setAttribute(id, "image", name)` | lua-ui-full-xml-policy |
| `UI.setAttributes` | `UI` | MODERATE | `ui-full-refresh` | `UI.md`: updates supplied attributes; `Attributes.md` includes layout/text/image/animation effects. | cumulative | Do not spray across whole panels every callback. | Diff before write; coalesce same-id attributes into one call. | defaults/classes, `setValue` for text body | lua-ui-full-xml-policy |
| `self.UI.setAttributes` | `self.UI` | MODERATE | `ui-full-refresh` | `UI.md`: Object UI supports same multi-attribute mutation. | cumulative | Avoid broad object sweeps. | Dirty-check per object/id; debounce. | class/value/single attribute updates | lua-ui-full-xml-policy |
| `UI.setAttribute` | `UI` | LIGHT | `ui-full-refresh` | `UI.md`: overrides runtime value for all players. | rare | One-id scalar writes are light; layout/image/active writes or repeated callbacks should be treated as moderate. | Cache last value; debounce rapid inputs. | `UI.setAttributes` for grouped writes | lua-ui-full-xml-policy |
| `self.UI.setAttribute` | `self.UI` | LIGHT | `ui-full-refresh` | `UI.md`: Object UI supports same single-attribute mutation. | rare | One object/id/attribute write is light; multi-object fan-out escalates. | Dirty-check per object/id/attribute. | `self.UI.setAttributes` | lua-ui-full-xml-policy |
| `UI.setValue` | `UI` | LIGHT | `ui-full-refresh` | `UI.md`: updates value between element tags. | rare | One-id value writes are light; avoid per-keystroke echo or broad label loops. | Cache displayed value; throttle display updates. | input callback value stash | lua-ui-full-xml-policy |
| `self.UI.setValue` | `self.UI` | LIGHT | `ui-full-refresh` | `UI.md`: Object UI supports same value mutation. | rare | One object UI value write is light; group repeated label updates across many object UIs. | Dirty-check text; group after state mutation. | `self.UI.setAttribute(id, "text", value)` where appropriate | lua-ui-full-xml-policy |
| `UI.show` | `UI` | MODERATE | `ui-full-refresh` | `UI.md`: unlike `active`, show triggers animations. | cumulative | Do not loop-show large UI regions one child at a time. | Show parent containers; skip if already visible. | `UI.setAttribute(id, "active", true)` when animation is unnecessary | lua-ui-full-xml-policy |
| `UI.hide` | `UI` | MODERATE | `ui-full-refresh` | `UI.md`: unlike `active`, hide triggers animations. | cumulative | Do not loop-hide many children when parent can hide. | Hide parent containers; skip if already hidden. | `UI.setAttribute(id, "active", false)` when animation is unnecessary | lua-ui-full-xml-policy |
| `UI.setClass` | `UI` | MODERATE | `ui-full-refresh` | `UI.md`: replaces all classes; defaults/classes cascade through UI attributes. | cumulative | Use for coarse state/style changes, not rapid toggles. | Diff class string before replacing. | direct `UI.setAttribute` for one-off value | lua-ui-full-xml-policy |
| `UI.getValue` | `UI` | LIGHT | `serialize` | `UI.md` and `Input Elements.md`: live InputField text should come from callback values, not polling. | rare | Scalar read for non-InputField values only; do not poll or treat as InputField source of truth. | Stash `onValueChanged`/`onEndEdit` values by player/id. | callback `value` | SOLVING ISSUES & DEBUGGING |
| `UI.getAttributes` | `UI` | MODERATE | `serialize` | `UI.md`: returns all user-set attributes for an element. | cumulative | Avoid state-discovery loops over UI trees. | Know the one attribute needed; cache intended UI state. | `UI.getAttribute(id, attr)` or source state | lua-ui-full-xml-policy |
| `onValueChanged` | UI callback | MODERATE | `per-frame` / `ui-full-refresh` | `Input Elements.md`: InputField changes fire on text change; Slider fires rapidly while moved. | cumulative | Never do XML replacement/retrieval or broad UI mutation inside raw callback. | Stash value, debounce work, commit on `onEndEdit` or Confirm. | callback stash plus targeted dirty update | SOLVING ISSUES & DEBUGGING |
| `onDrag` | UI callback | HEAVY | `per-frame` | `Attributes.md`: called every frame if dragged and moved that frame. | stutter | No XML replacement/retrieval or bulk mutation from `onDrag`. | Throttle; record intent; apply on `onEndDrag`. | `onEndDrag` commit | Event Listener Policy |

## Domain E - World and Async-Adjacent Sync

| Symbol | Host | Tier | Cost driver | Doc evidence | Typical lag | Hot-path rule | Guard pattern | Cheaper alternative | TR policy link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `onUpdate` | `Global` / `Object` | HEAVY | `per-frame` | `.dev/tts-api/Scripting API/Events.md`: called every frame and must be simple/fast. | stutter | No scans, JSON, UI, web, object mutation, logging, or allocation-heavy work. | Dirty flags, throttling, tiny queued chunks. | event-driven handlers, explicit timers | Event Listener Policy |
| `onFixedUpdate` | `Global` / `Object` | HEAVY | `per-frame` | `Events.md`: called every physics tick, 90 times per second, and must be simple/fast. | stutter | Only constant-time physics bookkeeping. | Count ticks; early return; move real work elsewhere. | event-driven handlers, throttled `onUpdate` | Event Listener Policy |
| `onCollisionStay` | `Object` | HEAVY | `per-frame` | `Events.md`: called every frame while colliding and warns implementations must be simple/fast. | stutter | Do not inspect broad state or mutate world here. | Check one GUID/type then return; debounce collision state. | `onCollisionEnter`, `onCollisionExit` | Event Listener Policy |
| `onObjectCollisionStay` | `Global` / `Object` | HEAVY | `per-frame` | `Events.md`: called every frame while a registered object collides. | stutter | Keep O(1); no logging/JSON/scans. | Register only needed objects; debounce by GUID. | `onObjectCollisionEnter`, `onObjectCollisionExit` | Event Listener Policy |
| `onSave` | `Global` / `Object` | MODERATE | `serialize` | `Events.md`: runs on manual save, autosave, and rewind checkpoint; examples encode state. | spike | Never rebuild full world state from live objects. | Maintain cached serializable state; encode compact snapshots. | incremental state cache | Reconciler Contract |
| `onLoad` | `Global` / `Object` | MODERATE | `serialize` / `state-sweep` | `Events.md`: loads previous script state; examples decode JSON and resolve GUIDs. | spike | Decode/validate only; do not reconcile entire world synchronously unless required. | Validate schema; split deferred reconciliation. | compact save format, GUID-indexed restore queue | Reconciler Contract |
| `onPlayerAction` | `Global` / `Object` | MODERATE | `state-sweep` | `Events.md`: intercepts player actions with target lists. | cumulative | Avoid deep iteration over target sets. | Filter by action first; cap target work; return quickly. | specific object/zone events | Event Listener Policy |
| `tryObjectEnterContainer` | `Global` | MODERATE | `state-sweep` | `Events.md`: synchronous gate before container entry. | cumulative | Validate only; no scans or side effects. | Early allow/deny; defer side effects to post event. | `onObjectEnterContainer` | Event Listener Policy |
| `tryObjectRandomize` | `Global` | MODERATE | `state-sweep` | `Events.md`: synchronous gate before randomize/shuffle. | cumulative | No deck scans or state rebuilds. | Check permissions/state flags only. | `onObjectRandomize` | Event Listener Policy |
| `tryObjectRotate` | `Global` | MODERATE | `state-sweep` | `Events.md`: synchronous gate before rotation. | cumulative | Keep constant-time. | Compare player/action state only. | `onObjectRotate` | Event Listener Policy |
| `tryObjectStateChange` | `Global` | MODERATE | `state-sweep` | `Events.md`: synchronous gate before object state change. | spike | Do not create/destroy/reconcile in gate. | Validate transition and queue follow-up. | `onObjectStateChange` | Event Listener Policy |
| `tryObjectEnter` | `Object` | MODERATE | `state-sweep` | `Events.md`: object-hosted synchronous container gate. | cumulative | Avoid broad `core.*` logic in object scripts. | Delegate policy to `Global.call`; return quickly. | Global gate or post-entry event | Object-script bundling |
| `tryRandomize` | `Object` | MODERATE | `state-sweep` | `Events.md`: object-hosted randomize gate. | cumulative | No heavy object-hosted graph access. | Local permission check or `Global.call` policy. | `onRandomize` | Object-script bundling |
| `tryRotate` | `Object` | MODERATE | `state-sweep` | `Events.md`: object-hosted rotation gate. | cumulative | Keep pure and O(1). | Check simple flags; delegate complex rules. | `onRotate` | Object-script bundling |
| `tryStateChange` | `Object` | MODERATE | `state-sweep` | `Events.md`: object-hosted state-change gate. | spike | No reconciliation in gate. | Validate only; queue follow-up. | `onStateChange` | Object-script bundling |
| `onZoneGroupSort` | `Global` | MODERATE | `state-sweep` | `Events.md`: synchronous sorting hook; examples use `table.sort`. | cumulative | Comparators must be cheap and pure. | Precompute sort keys; return nil for default order where possible. | default layout-zone ordering | Reconciler Contract |
| `onGroupSort` | `Object` | MODERATE | `state-sweep` | `Events.md`: object-hosted layout-zone sorting hook. | cumulative | No object mutation or expensive getters in comparator. | Cache values before sort. | default layout-zone ordering | Object-script bundling |
| `JSON.encode` | `JSON` | MODERATE | `serialize` | `.dev/tts-api/Scripting API/JSON.md`: encodes table/string/number; object refs do not work. | cumulative | Never encode large tables in per-frame or try handlers. | Encode cached compact DTOs only. | GUID/primitive deltas | Reconciler Contract |
| `JSON.decode` | `JSON` | MODERATE | `serialize` | `JSON.md`: parses JSON string into table/value. | spike | Never decode unbounded response/state in hot handlers. | Validate size/content; decode once and cache. | smaller schema/payload | Reconciler Contract |
| `JSON.encode_pretty` | `JSON` | MODERATE | `serialize` | `JSON.md`: prettier but less efficient than `encode`. | cumulative | Debug/export only. | Restrict to tooling. | `JSON.encode` | DEBUG_FILE_LOGGING |
| `WebRequest.get` | `WebRequest` | MODERATE | `network` | Web Request docs: host-only HTTP with callback. | cumulative | Do not call from hot loops or per-player spam. | Deduplicate URL; cache response; guard stale callbacks. | cached data/manual refresh | Reconciler Contract |
| `WebRequest.post` | `WebRequest` | MODERATE | `network` / `serialize` | Web Request docs: POST form/body plus callback. | cumulative | No unbounded payloads or repeated retries in hot path. | Queue; cap payload; retry with backoff. | batched sync outside live interaction | Reconciler Contract |
| `WebRequest.custom` | `WebRequest` | MODERATE | `network` / `serialize` | Web Request docs: custom method, headers, body, callback. | cumulative | Never depend on immediate result. | Timeout/abort path; check `is_error`; validate status/content type. | local cached data | Reconciler Contract |
| `WebRequestInstance.text` | `WebRequest` | MODERATE | `serialize` | Web Request Instance docs: exposes response body as text. | spike | Do not log/broadcast raw bodies. | Check size/content before decode/use. | compact JSON fields | Reconciler Contract |
| `Timer.create` | `Timer` | MODERATE | `timer-fanout` | `.dev/tts-api/Scripting API/Timer.md`: deprecated; delay 0 is next frame; repetitions 0 is infinite. | cumulative | Never create unbounded/infinite timers without lifecycle stop. | Unique IDs; central registry; destroy on lifecycle end. | finite Wait-style scheduler or explicit event dispatch | Event Listener Policy |
| `Timer.destroy` | `Timer` | LIGHT | `timer-fanout` | `Timer.md`: destroys timer by id. | rare | Stop repeaters before object/state teardown. | Track IDs; do not silently leak timers. | finite auto-delete timers | Event Listener Policy |
| `Backgrounds.setBackground` | `Backgrounds` | MODERATE | `asset-load` | `.dev/tts-api/Scripting API/Backgrounds.md`: replaces current background by name. | spike | Never call from hot handlers or repeated timers. | Debounce; change only on explicit scene transition. | preselected/static background | Reconciler Contract |
| `Backgrounds.setCustomURL` | `Backgrounds` | HEAVY | `network` / `asset-load` | `Backgrounds.md`: replaces background with URL-loaded custom image. | spike | No reactive spam. | Validate URL; show pending state; debounce. | built-in named background | Reconciler Contract |
| `Tables.setTable` | `Tables` | HEAVY | `asset-load` / `state-sweep` | `.dev/tts-api/Scripting API/Tables.md`: replaces current table. | spike | Never call during gameplay hot path. | Admin/setup gate; reconcile after table change. | keep table; move objects instead | Reconciler Contract |
| `Tables.setCustomURL` | `Tables` | HEAVY | `network` / `asset-load` | `Tables.md`: sets custom table image URL. | spike | Do not update repeatedly. | Only call on real URL change. | preconfigured custom table asset | Reconciler Contract |
| `Lighting.apply` | `Lighting` | MODERATE | `state-sweep` | `.dev/tts-api/Scripting API/Lighting.md`: applies pending Lighting changes. | spike | Batch lighting edits; never pair with every small setter in a hot loop. | Dirty flag lighting config; apply once per transition. | predefined preset / delayed apply | Performance Audit |
| `Lighting.setLightColor` | `Lighting` | LIGHT | `state-sweep` | `Lighting.md`: setter example requires `Lighting.apply`. | cumulative | Pending setter is light; repeated paired `apply` calls are the expensive boundary. | Batch with other lighting values. | static preset | Performance Audit |
| `MusicPlayer.setCurrentAudioclip` | `MusicPlayer` | MODERATE | `asset-load` / `network` | `.dev/tts-api/Scripting API/Music Player.md`: `loaded` indicates whether all players loaded current clip. | spike | Do not call repeatedly from events/timers. | Check current clip/status; debounce scene music changes. | prebuilt playlist/skip unchanged | Performance Audit |
| `MusicPlayer.setPlaylist` | `MusicPlayer` | MODERATE | `asset-load` | `Music Player.md`: replaces playlist table of audioclip URLs. | cumulative | Avoid rebuilding playlist in hot paths. | Compare before set; build once. | `setCurrentAudioclip` for single change | Performance Audit |
| `MusicPlayer.play` | `MusicPlayer` | MODERATE | `network` | `Music Player.md`: scene-wide playback state change. | cumulative | No repeated play calls in timers. | Check `player_status` before call. | let playlist continue | Performance Audit |
| `MusicPlayer.skipForward` | `MusicPlayer` | MODERATE | `asset-load` | `Music Player.md`: may load next clip. | spike | No hot-path skipping. | Debounce user command. | set specific clip once | Performance Audit |
| `Notes.getNotebookTabs` | `Notes` | MODERATE | `state-sweep` | `.dev/tts-api/Scripting API/Notes.md`: returns all notebook tabs. | cumulative | Do not poll. | Cache after known edits. | owned notes state | Reconciler Contract |
| `Notes.setNotes` | `Notes` | MODERATE | `ui-full-refresh` | `Notes.md`: replaces on-screen notes text. | cumulative | Do not rewrite every frame. | Compare old/new and debounce. | targeted notebook tab update | Reconciler Contract |
| `Notes.addNotebookTab` | `Notes` | MODERATE | `ui-full-refresh` | `Notes.md`: adds notebook tab with body text. | cumulative | No batch creation in hot path. | Create during setup; cap body size. | reuse/edit existing tab | Reconciler Contract |
| `Player.getPlayers` | `Player` | LIGHT | `state-sweep` | `.dev/tts-api/Scripting API/Player/Manager.md`: returns all Player instances; examples loop all players. | cumulative | Bounded player-list read; do not call-and-loop every frame. | Cache player colors on connect/disconnect. | direct `Player[color]` | Event Listener Policy |
| `Player.getSpectators` | `Player` | LIGHT | `state-sweep` | Player Manager docs: returns spectator Player instances. | rare | Bounded spectator-list read; do not poll. | Refresh on connect/disconnect. | lazy spectator list | Event Listener Policy |
| `Player.broadcast` | `Player` | MODERATE | `network` / `ui-full-refresh` | Player Instance docs: prints on player screen and chat. | cumulative | Never broadcast from per-frame/collision callbacks. | Rate-limit and coalesce. | targeted UI state / one summary | Event Listener Policy |
| `Player.print` | `Player` | LIGHT | `network` | Player Instance docs: prints to player chat. | rare | No logging loops in hot paths. | Debug gate and rate-limit. | silent state update + summary | Event Listener Policy |
| `Player.showConfirmDialog` | `Player` | MODERATE | `ui-full-refresh` | Player Instance docs: modal dialog with callback. | cumulative | Do not assume immediate answer. | Capture request token and validate state in callback. | non-modal scripted button/state command | Reconciler Contract |
| `Player.showInputDialog` | `Player` | MODERATE | `ui-full-refresh` | Player Instance docs: input dialog with callback. | cumulative | Do not mutate stale objects from callback. | Revalidate GUID/state; sanitize text. | existing XmlUI input with explicit submit | Reconciler Contract |
| `Player.showMemoDialog` | `Player` | MODERATE | `ui-full-refresh` / `serialize` | Player Instance docs: memo input dialog with callback. | spike | Do not JSON/decode/process large memo in callback. | Cap length and defer processing. | smaller/staged input | Reconciler Contract |
| `Player.showOptionsDialog` | `Player` | MODERATE | `ui-full-refresh` | Player Instance docs: options modal with table. | cumulative | Keep options small; no hot-path display. | Tokenize request and validate selected index. | scripted buttons for fixed choices | Reconciler Contract |
| `Player.copy` | `Player` | MODERATE | `state-sweep` | Player Instance docs: makes player copy specified object list. | cumulative | Avoid large object arrays in hot path. | Cap object count; explicit user command only. | stored GUID list / controlled clone | Reconciler Contract |
| `Player.paste` | `Player` | HEAVY | `spawn-io` | Player Instance docs: makes player paste at position. | spike | No repeated paste loops. | Debounce; paste small sets; reconcile after. | controlled spawn pipeline | Reconciler Contract |
| `Player.drawHandStash` | `Player` | MODERATE | `state-sweep` | Player Instance docs: draws all stashed cards into hand. | spike | Do not call from hot handlers. | Limit stash size; explicit action only. | draw specific cards incrementally | Reconciler Contract |
| `Player.getHandObjects` | `Player` | MODERATE | `table-scan` | Player Instance docs: returns objects in hand zone. | cumulative | Do not poll per frame. | Cache on hand-changing events where possible. | gameState intent | Event Listener Policy |
| `Player.getSelectedObjects` | `Player` | MODERATE | `table-scan` | Player Instance docs: returns selected objects. | cumulative | Use only on explicit command. | Read once and snapshot. | event target list | Event Listener Policy |
| `Player.getHoldingObjects` | `Player` | MODERATE | `table-scan` | Player Instance docs: returns held objects. | cumulative | Do not poll per frame. | Read on interaction boundary. | `onObjectPickUp`, `onObjectDrop` | Event Listener Policy |
| `Player.setHandTransform` | `Player` | LIGHT | `state-sweep` | Player Instance docs: mutates hand-zone transform. | rare | Do not animate via repeated calls. | Apply once during setup/seat change. | static hand-zone configuration | Reconciler Contract |
| `Player.attachCameraToObject` | `Player` | MODERATE | `network` | Player Instance docs: camera follows an object. | cumulative | Do not call from reactive loops. | Explicit mode transition; clear ownership. | `lookAt` one-shot camera move | Reconciler Contract |
| `Player.lookAt` | `Player` | LIGHT | `network` | Player Instance docs: moves camera and forces third-person mode. | rare | Do not spam. | Debounce per player; respect active prompts. | ping/highlight instead of forced camera | Reconciler Contract |
| `Player.changeColor` | `Player` | MODERATE | `state-sweep` | Player Instance docs: changes player to another color seat. | spike | Never call from implicit hot state update. | Explicit admin/user action; validate target color. | prompt player to choose seat | Reconciler Contract |
| `Turns.getTurnOrder` | `Turns` | LIGHT | `state-sweep` | `.dev/tts-api/Scripting API/Turns.md`: returns current turn order table. | cumulative | Bounded turn-list read; do not poll in frame handlers. | Cache when turn settings change. | `onPlayerTurn` event | Event Listener Policy |
| `Vector.rotateTowards` | `Vector` | LIGHT | `per-frame` | `.dev/tts-api/Scripting API/Vector.md`: `rotateTowardsUnit` is less expensive. | cumulative | Avoid in per-frame/broad object loops unless bounded. | Normalize once and reuse vectors. | `Vector.rotateTowardsUnit` when precondition holds | Event Listener Policy |
| `Vector.rotateTowardsUnit` | `Vector` | LIGHT | `per-frame` | `Vector.md`: less expensive but target must be normalized. | rare | Use only when precondition is guaranteed. | Assert/cache normalized target. | `Vector.rotateTowards` when correctness matters more | Event Listener Policy |
| `Vector.magnitude` | `Vector` | LIGHT | `per-frame` | `Vector.md`: docs also provide squared magnitude. | cumulative | Local sqrt math is light per call; avoid repeated distance checks in scans. | Compare squared values where possible. | `Vector.sqrMagnitude` | Event Listener Policy |
| `Vector.distance` | `Vector` | LIGHT | `per-frame` | `Vector.md`: docs also provide squared distance. | cumulative | Local distance math is light per call; avoid broad per-frame scans. | Compare squared threshold. | `Vector.sqrDistance` | Event Listener Policy |
| `Vector.normalized` | `Vector` | LIGHT | `per-frame` | `Vector.md`: returns a new normalized vector. | cumulative | Local vector normalization is light per call; avoid repeated allocations in hot loops. | Reuse scratch vectors where safe. | `Vector.normalize` on scratch vector | Event Listener Policy |

## APIs Explicitly Cheap

Keep this allow list short. These calls are safe only when used on a known object/player/id and not wrapped in a scan or high-frequency broad fan-out.

| Symbol | Host | Why allowed | Boundary |
| --- | --- | --- | --- |
| `getObjectFromGUID` | `Global` | Direct GUID lookup is the preferred alternative to world scans. | Still returns nil for missing GUID; do not call repeatedly when a cached live ref is valid. |
| `hasTag` | `Object` | O(1)-style known-object tag guard is appropriate at the top of hot handlers. | Cheap only after the handler already has the object; do not pair with a preceding world scan. |
| `getGUID` | `Object` | Scalar read useful for O(1) identity checks and caches. | Cache inside a pass if called repeatedly in a loop. |
| `getName` | `Object` | Scalar metadata read is acceptable for bounded UI/debug paths. | Avoid broad name-filter scans; prefer GUID/tag indexes. |
| `getQuantity` | `Object` | Container/deck count is cheaper than enumerating `getObjects`. | Use only when count is enough; do not follow with enumeration unless needed. |
| `UI.getAttribute` | `UI` | Targeted one-id read is cheaper than full XML/table reads. | Do not poll; prefer source-of-truth Lua state. |
| `UI.setAttribute` | `UI` | Targeted one-id write is the preferred replacement for `UI.setXml`. | Dirty-check and debounce; heavy when sprayed across many ids or animated layouts. |
| `Vector.sqrMagnitude` | `Vector` | Avoids square-root distance work in threshold comparisons. | Only correct when squared thresholds are used. |
| `Vector.sqrDistance` | `Vector` | Avoids square-root distance work between two vectors. | Only correct when squared thresholds are used. |

## Completeness Checklist

### Domain A - Global Object Enumeration

- [x] `.dev/tts-api/Scripting API/Base.md`
- [x] `.dev/tts-api/Scripting API/Color.md`
- [x] `.dev/tts-api/Scripting API/Spawnable Objects/Built-in.md`
- [x] `.dev/tts-api/Scripting API/Spawnable Objects/Custom.md`

### Domain B - Object Transforms, Components, and Containers

- [x] `.dev/tts-api/Scripting API/Object.md`
- [x] `.dev/tts-api/Scripting API/Object Behaviors/AssetBundle.md`
- [x] `.dev/tts-api/Scripting API/Object Behaviors/Book.md`
- [x] `.dev/tts-api/Scripting API/Object Behaviors/Browser.md`
- [x] `.dev/tts-api/Scripting API/Object Behaviors/Clock.md`
- [x] `.dev/tts-api/Scripting API/Object Behaviors/Container.md`
- [x] `.dev/tts-api/Scripting API/Object Behaviors/Counter.md`
- [x] `.dev/tts-api/Scripting API/Object Behaviors/LayoutZone.md`
- [x] `.dev/tts-api/Scripting API/Object Behaviors/TextTool.md`
- [x] `.dev/tts-api/Scripting API/Object Components/Component.md`
- [x] `.dev/tts-api/Scripting API/Object Components/Examples.md`
- [x] `.dev/tts-api/Scripting API/Object Components/GameObject.md`
- [x] `.dev/tts-api/Scripting API/Object Components/Introduction.md`
- [x] `.dev/tts-api/Scripting API/Object Components/Material.md`

### Domain C - Physics and Spatial Queries

- [x] `.dev/tts-api/Scripting API/Physics.md`
- [x] `.dev/tts-api/Scripting API/Grid.md`
- [x] `.dev/tts-api/Scripting API/Hands.md`

### Domain D - UI and XmlUI

- [x] `.dev/tts-api/Scripting API/UI.md`
- [x] `.dev/tts-api/UI API/Attributes.md`
- [x] `.dev/tts-api/UI API/Basic Elements.md`
- [x] `.dev/tts-api/UI API/Defaults.md`
- [x] `.dev/tts-api/UI API/Input Elements.md`
- [x] `.dev/tts-api/UI API/Introduction.md`
- [x] `.dev/tts-api/UI API/Layout_Grouping.md`

### Domain E - World and Async-Adjacent Sync

- [x] `.dev/tts-api/Scripting API/Backgrounds.md`
- [x] `.dev/tts-api/Scripting API/Events.md`
- [x] `.dev/tts-api/Scripting API/Info.md`
- [x] `.dev/tts-api/Scripting API/Introduction.md`
- [x] `.dev/tts-api/Scripting API/JSON.md`
- [x] `.dev/tts-api/Scripting API/Lighting.md`
- [x] `.dev/tts-api/Scripting API/Music Player.md`
- [x] `.dev/tts-api/Scripting API/Notes.md`
- [x] `.dev/tts-api/Scripting API/Player/Colors.md`
- [x] `.dev/tts-api/Scripting API/Player/Instance.md`
- [x] `.dev/tts-api/Scripting API/Player/Manager.md`
- [x] `.dev/tts-api/Scripting API/Tables.md`
- [x] `.dev/tts-api/Scripting API/Time.md`
- [x] `.dev/tts-api/Scripting API/Timer.md`
- [x] `.dev/tts-api/Scripting API/Turns.md`
- [x] `.dev/tts-api/Scripting API/Types.md`
- [x] `.dev/tts-api/Scripting API/Vector.md`
- [x] `.dev/tts-api/Scripting API/Web Request/Instance.md`
- [x] `.dev/tts-api/Scripting API/Web Request/Manager.md`

### Supporting Docs

These files are not expected to contain heavy runtime APIs, but phase 1 checked them for context and completeness.

- [x] `.dev/tts-api/Getting Started/External Editor API.md`
- [x] `.dev/tts-api/Getting Started/Introduction.md`
- [x] `.dev/tts-api/Getting Started/Lua in Tabletop Simulator.md`
- [x] `.dev/tts-api/Getting Started/Overview.md`
- [x] `.dev/tts-api/Getting Started/System Console.md`
- [x] `.dev/tts-api/Getting Started/Virtual Reality.md`

## TOR-390 Handoff Notes

Phase 2 should grep every cataloged symbol, then classify call sites by handler/timer/reconciler context. Prioritize `HEAVY`, `MODERATE`, and the four remaining `CONTEXT` symbols (`registerCollisions`, `Component.set`, `Material.set`, `Container.search`), but still flag `LIGHT` symbols when they appear in per-frame, high-frequency callback, timer fan-out, or broad-loop paths. Do not treat this phase 1 catalog as a usage inventory.
