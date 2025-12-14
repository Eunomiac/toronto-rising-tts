# Custom UI/HUD Guide

This folder contains the custom HTML/CSS/JavaScript interface for your Tabletop Simulator mod.

## Files

- **index.html** - Main HTML structure for the custom UI
- **styles.scss** - SCSS source file (edit this, not styles.css)
- **styles.css** - Compiled CSS (auto-generated)
- **script.js** - JavaScript for UI interactions

## Quick Start

### 1. Edit Your Styles

Edit `styles.scss` to customize the appearance:

```scss
// Change colors
$primary-color: #2c3e50;
$secondary-color: #3498db;
$accent-color: #e74c3c;

// Change spacing
$spacing-unit: 16px;
$border-radius: 8px;
```

### 2. Compile SCSS to CSS

```bash
# One-time build
npm run build:css

# Watch mode (auto-recompile on save)
npm run build:css:watch
```

### 3. Use in TTS

Reference `Scripts/custom-ui-example.lua` for integration examples.

## SCSS Features

- **Variables**: Centralized color and spacing values
- **Mixins**: Reusable style patterns
- **Modern Functions**: Uses `color.adjust()` for color manipulation
- **Responsive**: Media queries for different screen sizes
- **Animations**: Built-in fade and slide animations

## Customization Tips

1. **Colors**: Modify the SCSS variables at the top of `styles.scss`
2. **Layout**: Edit the HTML structure in `index.html`
3. **Interactions**: Add event handlers in `script.js`
4. **Styling**: Use the existing mixins or create new ones

## TTS Integration

The UI communicates with TTS through:
- `window.parent.postMessage()` - Send data to TTS
- `window.receiveMessage()` - Receive data from TTS

See `Scripts/custom-ui-example.lua` for the LUA side implementation.

