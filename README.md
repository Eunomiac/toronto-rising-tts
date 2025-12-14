# Toronto Rising - Tabletop Simulator Mod

A LUA modding project for Tabletop Simulator.

## Project Structure

```
toronto-rising-tts/
├── Scripts/           # LUA scripts for your mod
│   ├── example.lua
│   └── custom-ui-example.lua
├── UI/                # Custom HTML/CSS/JS for HUD
│   ├── index.html     # Main HTML file
│   ├── styles.scss    # SCSS source file
│   ├── styles.css     # Compiled CSS (auto-generated)
│   ├── script.js      # Compiled JavaScript bundle (auto-generated)
│   └── src/           # TypeScript source files
│       └── script.ts  # TypeScript source with GSAP animations
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

## Custom UI/HUD Development

This project includes support for creating custom HTML-based user interfaces (HUDs) with:
- **SCSS** for styling (compiled to CSS)
- **TypeScript** for type-safe JavaScript (compiled and bundled with esbuild)
- **GSAP** for high-performance animations (bundled automatically)

### Building Assets

#### CSS from SCSS
1. **One-time build**: Run `npm run build:css` to compile SCSS to CSS
2. **Watch mode**: Run `npm run build:css:watch` to automatically recompile on SCSS changes

#### JavaScript from TypeScript
1. **One-time build**: Run `npm run build:js` to compile and bundle TypeScript (includes GSAP)
2. **Watch mode**: Run `npm run build:js:watch` to automatically recompile on TypeScript changes

#### Build Everything
1. **One-time build**: Run `npm run build` to compile both CSS and JavaScript
2. **Watch mode**: Run `npm run build:watch` to watch both SCSS and TypeScript files

### UI File Structure

- `UI/index.html` - Main HTML structure for your custom UI
- `UI/styles.scss` - SCSS source file with variables, mixins, and styles
- `UI/styles.css` - Compiled CSS (auto-generated, do not edit directly)
- `UI/src/script.ts` - TypeScript source file (edit this)
- `UI/script.js` - Compiled JavaScript bundle with GSAP (auto-generated, do not edit directly)

### Using Custom UI in TTS

1. **Include UI files in your mod**: When creating your TTS mod, include the `UI/` folder
2. **Reference in LUA**: Use `Scripts/custom-ui-example.lua` as a reference for integrating the UI
3. **Host the files**: TTS requires UI files to be accessible via URL. Options:
   - Upload to a web server
   - Use TTS's custom asset system
   - Embed HTML directly in LUA (for simple UIs)

### SCSS Features

The SCSS setup includes:
- **Variables**: Color scheme, spacing, border radius, etc.
- **Mixins**: Reusable style patterns (buttons, panels, flex centering)
- **Modern color functions**: Uses `color.adjust()` instead of deprecated `darken()`
- **Responsive design**: Media queries for different screen sizes
- **Animations**: Fade-in and slide-in animations

### TypeScript & GSAP Features

The TypeScript setup includes:
- **Full type safety** - Catch errors at compile time
- **GSAP animations** - High-performance animations library (bundled automatically)
- **Modern ES2020** - Latest JavaScript features
- **Strict mode** - Enhanced type checking for better code quality

#### GSAP Animation Examples

The code includes several GSAP animation examples:
- **Initial page load** - Fade-in and slide animations
- **Button interactions** - Pulse, shake, and rotate effects
- **Text updates** - Smooth transitions when updating player info
- **Custom animations** - Request animations from TTS via messages

#### Using GSAP in Your Code

```typescript
import { gsap } from "gsap";

// Simple fade in
gsap.to(element, { opacity: 1, duration: 0.5 });

// Staggered animations
gsap.from(panels, {
    duration: 0.5,
    x: -30,
    opacity: 0,
    stagger: 0.15
});

// Complex timeline
const tl = gsap.timeline();
tl.to(element1, { x: 100 })
  .to(element2, { y: 50 }, "-=0.5");
```

### Customizing the UI

1. **Edit SCSS variables** in `UI/styles.scss` to change colors, spacing, etc.
2. **Modify HTML structure** in `UI/index.html` to add/remove UI elements
3. **Update TypeScript** in `UI/src/script.ts` to handle new interactions and animations
4. **Rebuild assets** using `npm run build` or watch mode

### Example Workflow

```bash
# Start watching for both SCSS and TypeScript changes
npm run build:watch

# In your editor, edit:
# - UI/styles.scss (for styling)
# - UI/src/script.ts (for functionality and animations)

# Assets automatically recompile on save

# In TTS, reload your mod to see changes
```

### TypeScript Development Tips

1. **Type Safety** - The TypeScript compiler will catch errors before runtime
2. **IntelliSense** - Get autocomplete and type hints in your editor
3. **GSAP Types** - GSAP types are automatically included, so you get full autocomplete
4. **Watch Mode** - Keep `npm run build:js:watch` running for instant compilation
5. **Bundling** - GSAP is automatically bundled, so no need to include it separately in HTML

## Development Tips

1. **Use print() for debugging** - Output appears in TTS's scripting log
2. **Test incrementally** - Make small changes and test frequently
3. **Use the scripting zone** - Great for testing object interactions
4. **Check the log** - TTS shows errors in the scripting log window
5. **UI Development** - Use browser dev tools (F12) when testing HTML UI locally
6. **Watch Mode** - Keep `npm run build:watch` running during development for auto-compilation
7. **TypeScript Errors** - Check terminal output for type errors when building
8. **GSAP Documentation** - See [GSAP Docs](https://greensock.com/docs/) for animation examples

## License

MIT
