# Agent Verification Harness

## Agent Routing

Read this when:
- validating an item in `PENDING AUTHOR VERIFICATION.md`
- adding a deterministic PAV check or a short live-action capture
- collecting bounded UI, state, object, or soundscape evidence from Tabletop Simulator
- checking whether the verification tooling can affect game-night performance

Source of truth:
- `core/pav_verification.ttslua` — check registry, assertions, capture interpretation, and probes
- `lib/sync_trace.ttslua` — temporary wrappers and the bounded event ledger
- `core/debug.ttslua` — `DEBUG.verifyPav*` and `DEBUG.pavProbe` entry points
- `.tools/tts-bridge/scripts/verify-pav.mjs` — command-line runner

Verification:
- `npm run verify:pav:test`
- `npm run build`
- after a fresh Save & Play, run at least one instant check and one start/finish capture through the gateway

Status: current; TOR-759.

## Performance contract

The harness is **off unless an agent explicitly calls it**. While it is off:

- there is no timer, polling loop, event listener, table scan, coroutine, UI refresh, or per-frame callback;
- reconciliation functions retain their original references; and
- no capture ledger exists.

The only production-path hook added for the initial checks is one `Trace.report` call when a complete Global UI remount already happens. A full remount is a rare, deliberately expensive debug/startup action; the dormant report performs no logging and installs no wrappers.

A live capture is deliberately temporary:

1. `verifyPavStart` creates an in-memory capture and installs wrappers around the existing bounded Sync Trace target list.
2. The agent performs one named action.
3. `verifyPavFinish` takes the snapshot, restores every original function, clears timing totals, and discards the live ledger.

The ledger keeps at most **200 events**. Extra events are counted as dropped rather than growing memory. Capture state is not written to `gameState`, so **Save & Play also clears it**. If a run is abandoned, `verifyPavStop` performs the same wrapper cleanup without producing a report.

The external Node runner also has no resident process: it starts only for the command and closes its bridge before exiting.

## Commands

After a build and fresh Save & Play:

```powershell
npm run verify:pav -- list
npm run verify:pav -- TOR-758
npm run verify:pav -- run TOR-756
```

For a live action:

```powershell
npm run verify:pav -- start TOR-755
# Perform the one action printed by the command.
npm run verify:pav -- finish
```

Emergency cleanup:

```powershell
npm run verify:pav -- stop
```

The runner binds the External Editor inbound port directly. If the TTS gateway or another editor owns port 39998, use the ordinary gateway `tts_execute_lua` route instead, or deliberately release the port before running the command. Do not kill or displace another bridge implicitly.

Equivalent gateway Lua:

```lua
local result = DEBUG.verifyPav("TOR-758")
return JSON.encode(result)
```

For capture windows, call `DEBUG.verifyPavStart("TOR-755")`, perform the action, then call `DEBUG.verifyPavFinish()`. Always call `DEBUG.verifyPavStop()` before leaving a failed or interrupted verification session.

## Initial registered checks

| Item | Instant contract | Live capture | Remaining human check |
| --- | --- | --- | --- |
| TOR-755 | Existing stage edits select the narrow path; membership changes refuse it | Proves no broad NPC reconcile and exactly one staged-NPC move | Optional glance that the visible table stayed composed correctly |
| TOR-756 | Proves the no-portrait template branch omits the marker and image id | — | Brief Page 3 layout check |
| TOR-757 | — | Proves a full Global UI remount event and that loading settled | Connected-client panel/overlay appearance |
| TOR-758 | Proves Hunger boundaries and Rouse-family independence/exclusivity | — | None for the policy itself |

`DEBUG.verifyPavList()` is authoritative; keep this table aligned when adding a check.

## Bounded probes

`DEBUG.pavProbe(kind, spec)` supports:

- `ui`: up to 50 explicit element ids and 10 requested attributes per element; full XML is not returned, only optional length;
- `state`: up to 50 explicit `gameState` paths;
- `objects`: up to 50 explicit GUIDs, returning name, position, rotation, and lock state; and
- `soundscape`: the existing configured-emitter inspection (known emitters only, not a broad table scan).

The soundscape inspection re-applies each emitter's current recorded volume while testing volume control and refreshes availability metadata. Treat it as a diagnostic probe, not a byte-for-byte read-only operation.

Do not add an unbounded fallback such as `getAllObjects`, `getObjects`, a physics cast, or full component traversal. If a check needs objects, resolve their known GUIDs or role identities before probing.

## Adding a check

Prefer an instant pure contract when that fully answers the question. Use a capture only when the behavior depends on a real TTS action. A capture assertion should name the expected bounded calls and the broad work that must *not* occur.

Every new check must:

- be inert until called;
- have a hard evidence bound;
- restore temporary wrappers/state on finish and stop;
- say plainly what human uncertainty remains; and
- include a headless contract test where practical plus a fresh live Save & Play exercise.

The PAV assessment circle reflects the combined evidence. Structured evidence can promote a row to 🟢 or 🔵, but actual listening, subjective appearance, and genuine multi-client behavior remain 🟡 when those are essential.

## Disable or remove

No persistent switch needs to be disabled for game night: simply do not call the harness. To clean up a capture that is currently active, run `npm run verify:pav -- stop` or Save & Play.

The feature is isolated enough to remove by deleting `core/pav_verification.ttslua`, the runner and its two tests, then removing the `DEBUG.verifyPav*` / `DEBUG.pavProbe` block, the two package scripts, this document's routing links, and the single `GlobalUI.fullRemount` report hook. The existing saved Sync Trace feature remains independent.
