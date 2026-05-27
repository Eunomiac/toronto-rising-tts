# Lua local function order (Toronto Rising TTS)

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

function cancelPendingRollCleanup(color)
    -- ...
end
```

### C) Keep logic in a `require()` module

For large subsystems, put helpers in `core/*.ttslua` or `lib/*.ttslua` and expose a small table API. The Global file only forwards — avoids a long ordered local block in `global_script.ttslua`.

## Do not

- Add a `local function` at the bottom of `global_script.ttslua` and call it from a `Global.*` function defined ~500 lines earlier.
- Assume “it works in other modules” — bundled **library** files are separate chunks; **one file = one scope order**.

## Real incident

`GlobalCancelPendingRollCleanup` called `cancelPendingRollCleanup` defined later → `rollCancel` → `RC.cancelRoll` → `Global.call` failed until the local was moved above the Global entry (TOR-141 dice E2E / cancel cleanup).

## Related docs

- [`core/global_script.ttslua`](../../core/global_script.ttslua) — largest single-chunk file; highest risk
- [`.cursorrules`](../../.cursorrules) § Lua local function order
- [`/tr-start`](../../.cursor/commands/tr-start.md) — mandatory read before game logic
