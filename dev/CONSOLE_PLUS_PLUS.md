# Console++ Integration Guide

## Overview

Console++ is a powerful command system for Tabletop Simulator that extends the base console with advanced features like path navigation, variable watching, and external command support.

## Installation

Console++ has been integrated into this project and is automatically loaded when the module loads.

### Files Location

- **Base Console**: `lib/Console/console.lua`
- **Console++ Extension**: `lib/Console/console++.lua`
- **Integration Wrapper**: `lib/console.lua`
- **Global Integration**: `global.ttslua` (automatically requires `lib.console`)

### How It Works

1. When `global.ttslua` loads, it requires `lib.console`
2. `lib/console.lua` requires `lib.Console.console++`
3. `lib/Console/console++.lua` requires `lib.Console.console` (base console)
4. The base console sets up the `onChat` handler
5. The integration wrapper sets up the `onExternalMessage` handler for external tools

## Usage

### Method 1: In-Game Chat (Primary Method)

**This is the main way to use Console++:**

1. Open Tabletop Simulator and load your game/mod
2. Open the chat window (press `Enter` or click the chat icon)
3. Type commands prefixed with `>`:

```
>help              -- Show available commands
>ls                -- List variables in current table
>cd /gameState     -- Navigate to gameState table
>call testState()  -- Call a function
```

### Method 2: TTS System Console

You can also use the TTS system console (press `` ` `` backtick key):

1. Press `` ` `` to open the system console
2. Type `lua` followed by your command:
   ```
   lua testState()
   lua showState()
   lua debugHelp()
   ```

   This works because your debug functions are exposed globally (see `core/debug.ttslua`)

### Method 3: External Command Support (Advanced)

Console++ supports external commands via the `onExternalMessage` callback. This allows external tools (like VSCode/Cursor extensions) to send commands to the game.

**How it works:**
- External tools send JSON messages with `messageID: 2` and `customMessage: {command: ">help"}`
- The `onExternalMessage` handler in `lib/console.lua` processes these commands
- Commands are executed as if typed in chat

**Note**: The newer TTS extension doesn't have a built-in Console++ installation command. The integration is handled manually by:

1. Placing Console++ files in `lib/Console/`
2. Requiring them in `global.ttslua` via `require("lib.console")`
3. The bundler automatically includes them in the bundled output

### Key Features

- **Path Navigation**: Navigate through Lua tables using `/` separator (e.g., `/gameState/players/Red/hunger`)
- **Variable Watching**: Watch variables/objects for changes
- **Command Mode**: Enter command mode for easier command entry
- **Function Calling**: Call functions directly from the console
- **External Integration**: Support for external tools via `onExternalMessage`

### Common Commands

- `>help` - Show all available commands
- `>ls` - List variables in current table
- `>cd <path>` - Change current table
- `>call <function>` - Call a function
- `>set <variable> <value>` - Set a variable
- `>watch <variable>` - Watch a variable for changes
- `>cmd` - Enter command mode (all input treated as commands)

## Configuration

Console++ settings can be modified in `lib/Console/console++.lua`:

- `console.seperator` - Path separator (default: `/`)
- `console.command_char` - Command prefix (default: `>`)
- `console.builtin_path` - Path for hidden globals (default: `sys`)

## Troubleshooting

### Console++ Not Working

1. **Check that files are bundled**: Look in `.tts/bundled/Global.lua` for Console++ code
2. **Check require paths**: Ensure `require("lib.console")` is in `global.ttslua`
3. **Check for errors**: Look for Lua errors in TTS console

### External Commands Not Working

1. **Check `onExternalMessage`**: Ensure the function is defined globally (it's set up in `lib/console.lua`)
2. **Check external tool**: Ensure your external tool is sending commands in the correct format:
   ```lua
   {command = ">help"}  -- or
   {input = "some input"}
   ```

## References

- Original Console++ documentation (if available)
- TTS Lua API documentation for `onChat` and `onExternalMessage`
