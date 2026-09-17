---
name: testbed
description: Use when the author invokes /testbed or asks for Lua written into .dev/testbed/TEST BED.ttslua for TTS Execute Code.
disable-model-invocation: true
---

# `/testbed`

Write the requested Lua into [`.dev/testbed/TEST BED.ttslua`](../../../.dev/testbed/TEST%20BED.ttslua). That file is gitignored — write it anyway, and do not stage it.

The rest of the request after `/testbed` is the functionality to add.

## Rules

1. Code added to TEST BED has to be entirely self-contained, as it will be selected and run via the Execute Code command in Lua.
2. Code cannot use `require`.
3. Code _can_ and _should_ use globally-exposed libraries (which is most of them), especially the `DEBUG` library which contains many useful functions meant specifically for TEST BED code.
4. Running code from TEST BED is done from the TEST BED file directly: Instructions to "run the code from the console" or to prefix it with "`lua`" are inaccurate and unnecessary.
5. After writing the necessary code, several examples of calling the entry function(s) should be added at the end in commented-out lines.
6. All top-level variables and functions should be global, so they persist between separate uses of the Execute Code command.
7. Everything should be contained within a single function that, when called, performs the described task (this is for organization purposes mostly, as it's sometimes difficult to know how much code I'm meant to select and run at once -- by having everything be delineated into functions, it simplifies this greatly). So helper functions, configuration variables, etc, should all be internal to the top-level global function

## How to add the code

Append a new `#region` at the **end** of `TEST BED.ttslua`. One top-level global function per task. Helpers, config, and other locals live **inside** that function.

```lua
-- #region short-name
function DoTheThing(color)
  local CONFIG = { label = "player" }

  local function helper(x)
    return x
  end

  DEBUG.printTable(helper(S.getPlayerVal(color)), CONFIG.label)
end

-- DoTheThing("Red")
-- DoTheThing("Black")
-- #endregion
```

- Do **not** leave a live (uncommented) call that would run as soon as the function is executed.
- Do **not** use `local` for the top-level entry function or for top-level variables in the region.
- Locals defined elsewhere in the file are **not** in scope when this region is selected. Put what you need inside the global function.
- Nested `local function` helpers must still appear **above** their callers inside that global function.

## Globals

Global already loaded most libraries. Use them directly. Prefer `DEBUG.*` for dumps, file writes, rolls, soundscape, gameboard, and other test helpers (`DEBUG.help()`, `core/debug.ttslua`).

| Global | Typical use |
| --- | --- |
| `DEBUG` | Test helpers, file dumps, `printTable`, rolls, soundscape |
| `U` | Timing (`U.chain` / `U.stagger` / `U.await`), tables, cameras |
| `C` | Constants |
| `G` | GUIDs (`G.GUIDS.*`) |
| `S` | `gameState` (`S.getStateVal` / `S.setStateVal` / `S.getPlayerVal`) |
| `O` | Hide / restore / objects |
| `Sync` | `Sync.player` / `Sync.full` |
| `L` | Lighting |
| `M` | Main / camera |
| `Scenes` / `SS` | Scenes / soundscape |
| `NPCS` | NPCs |
| `R` | Seat layout |

If a name is missing, check `core/global_script.ttslua` for `Foo = require(...)`.

## After writing

Tell the author to select the new global function in `TEST BED.ttslua` and run **Execute Code** (that registers it), then select one of the commented call examples, uncomment it, and Execute Code again. Do not tell them to paste into the Host console, and do not prefix examples with `lua`.
