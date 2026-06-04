# Lua local function order (Toronto Rising TTS)

## Severity

**Top recurring production bug class in this project.** A large share of in-game `attempt to call a nil value` errors are **not** missing modules or bad GUIDs — they are **`local function` declared below their first caller** in the same file.

Agents: treat this as a **mandatory pre-flight check** on every Lua change. `npm run build` does **not** catch it; only Save & Play (or exercising the handler) does.

Always-on rule: [`.cursor/rules/toronto-rising-lua-local-function-order.mdc`](../../.cursor/rules/toronto-rising-lua-local-function-order.mdc).

## Goal

Avoid **“attempt to call a nil value”** when a `Global.*` handler, `Global.call` entry, or TTS callback invokes a helper that was declared as a **`local function` later in the same file**.

Lua 5.1 resolves names in `function GlobalFoo()` bodies at **compile time** for that chunk: a reference to `local function bar` that appears **below** `GlobalFoo` in the source is treated as a **global** lookup (`_G.bar`), which is usually **nil**.

## Rule (mandatory)

1. Declare **`local function helperName(...)`** (or `local helperName` + assignment) **above** every caller in the same file — including:
   - `function GlobalSomething(...)` entry points
   - `function HUD_*` / `onObject*` handlers
   - Other `local function` bodies in the same chunk
2. When a helper must be used from both early and late code, put it **immediately after** the locals/tables it depends on (e.g. module-level state tables), not at the bottom of the file.
3. **`Global.call("GlobalX", params)`** from `require()` modules does **not** change this: `GlobalX` still runs in the Global chunk and must see locals defined **earlier in `core/global_script.ttslua`**.
4. **`require("core.npc_gameboard")` inside Global** does not fix order inside `npc_gameboard.ttslua` — each bundled module is its own chunk with its own order rules.

## Agent pre-flight checklist (every Lua PR)

- [ ] Grep the edited file for **`local function`** and **`= function`** assignments to locals declared at the top.
- [ ] For each helper name, every call site in **that file** is on a **lower line number** than the definition (or name is forward-declared at top).
- [ ] No new helper was appended after the last `function Global*` / `HUD_*` / `onObject*` in that file without checking callers above.
- [ ] If the change is in `core/global_script.ttslua`, scan **all** `Global.*` handlers for calls to new locals.
- [ ] Planned in-game smoke for the touched path (Apply, roll, scene load, etc.).

## Preferred patterns

### A) Define locals first (default)

```lua
local pendingRollCleanupTimerIds = {}

local function cancelPendingRollCleanup(color)
    -- ...
end

function GlobalCancelPendingRollCleanup(params)
    cancelPendingRollCleanup(params.color)
end
```

### B) Forward declaration (when order is awkward)

```lua
local cancelPendingRollCleanup

function GlobalCancelPendingRollCleanup(params)
    cancelPendingRollCleanup(params.color)
end

cancelPendingRollCleanup = function(color)
    -- ...
end
```

For mutually dependent locals, declare all names at the top, then assign:

```lua
local resolveTokenSnapCatalogEntry
local isNpcSeatRowColumn

-- ... callers ...

isNpcSeatRowColumn = function(col)
    return type(col) == "table" and col.kind == "npc"
end
```

### C) Keep logic in a `require()` module

For large subsystems, put helpers in `core/*.ttslua` or `lib/*.ttslua` and expose a small table API. The Global file only forwards — avoids a long ordered local block in `global_script.ttslua`. **Still** keep correct order inside that module file.

## Do not

- Add a `local function` at the bottom of `global_script.ttslua` and call it from a `Global.*` function defined ~500 lines earlier.
- Assume “it works in other modules” — bundled **library** files are separate chunks; **one file = one scope order**.
- Assume the linter or `npm run build` will catch nil locals — they will not.
- Use `local function foo` at line 3000 when `function GlobalBar` at line 400 calls `foo()` — use pattern B instead.

## Highest-risk files

| File | Why |
| --- | --- |
| [`core/global_script.ttslua`](../../core/global_script.ttslua) | Largest chunk; many `Global.*` handlers |
| [`core/npc_gameboard.ttslua`](../../core/npc_gameboard.ttslua) | Seat row / Apply / snap catalog locals |
| [`core/npcs.ttslua`](../../core/npcs.ttslua) | Late `resolveNpcPlacementIntent = function` style |
| [`core/lighting.ttslua`](../../core/lighting.ttslua), [`core/scenes.ttslua`](../../core/scenes.ttslua) | Long reconciler sections |

## Real incidents

| Area | Symptom | Cause |
| --- | --- | --- |
| Dice / TOR-141 | `rollCancel` → `Global.call` nil | `cancelPendingRollCleanup` below `GlobalCancelPendingRollCleanup` |
| NPC gameboard / TOR-180 | `GlobalGameboardApply` → `scanSeatRowTokensBySeatKey` nil | `isNpcSeatRowColumn` defined ~1200 lines below first caller |
| (pattern) | Any `Global.call` from core | Helper in Global chunk defined after `function Global*` |

## Debugging “attempt to call a nil value”

1. Read the stack: `(local)` at the failing name → almost always **local order**, not a missing `require`.
2. Open the file; find the **caller** function (e.g. `GlobalGameboardApply` → `applySeatRowFromControlBoard`).
3. Find the **callee** name; if `local function callee` is **below** the caller, move up or forward-declare.
4. Save & Play and retry.

See also [`.dev/SOLVING ISSUES & DEBUGGING.md`](../../.dev/SOLVING%20ISSUES%20&%20DEBUGGING.md) § Root-cause discipline.

## Related docs

- [`core/global_script.ttslua`](../../core/global_script.ttslua) — file header points here first
- [`.cursorrules`](../../.cursorrules) § Lua local function order
- [`.cursor/commands/tr-start.md`](../../.cursor/commands/tr-start.md) — mandatory read before game logic
- [`.dev/DEVELOPMENT_WORKFLOW.md`](../../.dev/DEVELOPMENT_WORKFLOW.md) § Lua local function order
- [`.dev/TTS_BUNDLING_SETUP.md`](../../.dev/TTS_BUNDLING_SETUP.md) § Global script source of truth
