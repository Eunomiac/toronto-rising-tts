# Shared Scripts with require()

The TTS Lua extension supports bundling shared Lua files using `require()`. This allows you to create a single "master" script that all instance objects can reference, eliminating code duplication.

## How It Works

1. **Create a shared script** (e.g., `dice-roller-shared.lua`) with common functions
2. **Use `require()`** in instance scripts to include it
3. **Extension bundles automatically** - When you "Save and Play", the extension bundles the required files into each instance script

## Configuration

The extension settings are configured in `.vscode/settings.json`:

```json
{
  "TTSLua.includeOtherFiles": true,
  "TTSLua.bundleSearchPattern": ["Scripts"],
  "TTSLua.includeOtherFilesPaths": []
}
```

## Example Usage

### Shared Script (`dice-roller-shared.lua`)
```lua
function displayDiceResults(color, spawnedDice, setting)
    -- Shared code here
end

return {
    displayDiceResults = displayDiceResults
}
```

### Instance Script (`Normal Dice.XXXXXX.lua`)
```lua
--Require shared code
local diceRoller = require("dice-roller-shared")

function displayResults(color)
    addAllSpawnedDice(color)
    diceRoller.displayDiceResults(color, spawnedDice, setting)
end
```

## Benefits

- ✅ **No code duplication** - Write once, use everywhere
- ✅ **Easy updates** - Change shared code in one place
- ✅ **Automatic bundling** - Extension handles it when saving to TTS
- ✅ **Works with all instances** - Each instance gets its own bundled copy

## Important Notes

- The extension bundles files when you use "Save and Play"
- `require()` paths are relative to the `bundleSearchPattern` directories
- Files are bundled at save time, so changes to shared files require re-saving to TTS
- The bundled code is included directly in each instance script in TTS
