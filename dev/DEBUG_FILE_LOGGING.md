# Debug File Logging

The debug module includes file logging functionality that uses the TTS Tools extension's `sendExternalMessage` API to write debug information directly to files in the workspace.

## How It Works

When you call file logging functions from the TTS console, they use `sendExternalMessage` to write files to the `debug_logs/` directory in the workspace root. These files can then be read directly without needing to copy/paste console output.

## Available Functions

### Basic Logging

```lua
-- Log a message with a level
lua logToFile("INFO", "This is an info message")
lua logToFile("WARN", "This is a warning", "custom_log")
lua logToFile("ERROR", "Something went wrong")
lua logToFile("DEBUG", "Debug information")
```

### State Logging

```lua
-- Log current game state as JSON
lua logStateToFile()
lua logStateToFile("my_state_dump")  -- Custom filename
```

### Scene Logging

```lua
-- Log current scene information
lua logSceneToFile()
lua logSceneToFile("current_scene")  -- Custom filename
```

### Zone Logging

```lua
-- Log zone information
lua logZonesToFile()
lua logZonesToFile("zones_dump")  -- Custom filename
```

### Test Result Logging

```lua
-- Log a test result
lua logTestToFile("State Test", true, "All checks passed")
lua logTestToFile("Scene Test", false, "Scene not found", "my_tests")
```

### Comprehensive Logging

```lua
-- Log everything at once (state, scene, zones, and a summary)
lua logAllToFiles()
```

## File Locations

All log files are written to the `debug_logs/` directory in the workspace root:

```
workspace/
└── debug_logs/
    ├── debug_log.txt
    ├── game_state.txt
    ├── scene_info.txt
    ├── zone_info.txt
    └── test_results.txt
```

## File Format

### General Logs (`debug_log.txt`)

```
[1234567890] [INFO] This is an info message
[1234567891] [WARN] This is a warning
```

### State Dumps (`game_state.txt`)

```
Game State Dump - 1234567890
{
  "currentPhase": "play",
  "players": {
    "Red": {
      "hunger": 2,
      "willpower": 5
    }
  }
}
```

### Test Results (`test_results.txt`)

```
[1234567890] PASS: State Test
  Details: All checks passed

[1234567891] FAIL: Scene Test
  Details: Scene not found
```

## Requirements

- **TTS Tools Extension**: The file logging feature requires the TTS Tools extension to be installed and connected
- **Custom Messages Enabled**: The `ttsEditor.enableMessages` setting must be `true` (default)

## Usage Tips

1. **During Development**: Add logging calls in your code to track execution flow:
   ```lua
   DEBUG.logToFile("DEBUG", "Entering onLoad function")
   ```

2. **After Tests**: Use `logAllToFiles()` to capture a complete snapshot of the game state after running tests

3. **Error Tracking**: Use `logToFile("ERROR", ...)` to log errors that occur during gameplay

4. **State Inspection**: Use `logStateToFile()` to inspect the game state at any point without cluttering the console

## Example Workflow

```lua
-- In TTS console:
lua testState()              -- Run tests
lua logAllToFiles()          -- Capture all debug info
-- Now check debug_logs/ directory for the files
```

## Notes

- Files are written to the workspace directory, so they're accessible immediately
- The `debug_logs/` directory is gitignored (see `.gitignore`)
- JSON files are automatically pretty-printed by the extension
- Each call creates/overwrites the file (not append mode currently)
