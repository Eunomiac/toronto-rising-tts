# Toronto Rising - Tabletop Simulator Mod

A LUA modding project for Tabletop Simulator.

## Project Structure

```
toronto-rising-tts/
├── Scripts/           # LUA scripts for your mod
├── Objects/           # Custom object definitions (optional)
└── README.md          # This file
```

## Prerequisites

1. **Tabletop Simulator** - Available on Steam
2. **TTS Modding Extension** - VS Code extension for live editing (see setup below)

## Setup Instructions

### 1. Install TTS Modding Extension (Real-Time Editing)

The TTS Modding Extension allows you to edit LUA scripts in real-time while Tabletop Simulator is running. Here's how to set it up:

#### Step 1: Install the Extension
1. Open VS Code (or Cursor)
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "**Tabletop Simulator Modding**" by **rockerBOO**
4. Click Install

#### Step 2: Configure the Extension
1. Open VS Code Settings (Ctrl+,)
2. Search for "Tabletop Simulator"
3. Configure the following settings:
   - **TTS Modding: Lua Path**: Set to your Scripts folder path
     - Example: `D:\Projects\.CODING\toronto-rising-tts\Scripts`
   - **TTS Modding: Auto Upload**: Enable for automatic upload on save
   - **TTS Modding: Port**: Default is 39998 (usually doesn't need changing)

#### Step 3: Enable Modding in Tabletop Simulator
1. Launch Tabletop Simulator
2. Create or load a game
3. The modding extension will automatically connect when you save a LUA file
4. You should see connection status in the VS Code status bar

### 2. Development Workflow

1. **Edit Scripts**: Make changes to `.lua` files in the `Scripts/` folder
2. **Auto-Upload**: With auto-upload enabled, changes are sent to TTS automatically on save
3. **Manual Upload**: Use the command palette (Ctrl+Shift+P) → "TTS: Upload Script"
4. **Test**: Changes take effect immediately in your running TTS session

### 3. LUA Language Support

For enhanced LUA development experience, install the **Lua** extension:
1. Open Extensions (Ctrl+Shift+X)
2. Search for "**Lua**" by **sumneko**
3. Click Install

This provides:
- Syntax highlighting
- IntelliSense/autocomplete
- Error detection
- Code navigation

The language server should automatically activate when you open `.lua` files.

## Script Structure

TTS scripts typically follow this pattern:

```lua
-- Global variables
local myVariable = "value"

-- Called when the script loads
function onLoad()
    print("Script loaded!")
end

-- Called when an object is clicked
function onObjectEnterScriptingZone(zone, object)
    -- Your code here
end
```

## Useful TTS API Resources

- [Official TTS API Documentation](https://api.tabletopsimulator.com/)
- [TTS Modding Community](https://steamcommunity.com/app/286160/workshop/)

## Development Tips

1. **Use print() for debugging** - Output appears in TTS's scripting log
2. **Test incrementally** - Make small changes and test frequently
3. **Use the scripting zone** - Great for testing object interactions
4. **Check the log** - TTS shows errors in the scripting log window

## License

MIT

