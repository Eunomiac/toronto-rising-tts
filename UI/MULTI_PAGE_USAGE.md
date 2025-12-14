# Preloaded UI System Usage Guide

This project uses a **single HTML page** (`index.html`) with **preloaded overlays** for different types of animated messages. All overlays are loaded when the UI first initializes, ensuring instant display with zero loading delays.

## Available Overlays

### 1. Dice Results Overlay
Displays animated dice roll results with GSAP animations.

**Usage from Lua:**
```lua
Global.call("sendDiceResultsToUI", {
    playerName = "Player Name",
    diceValues = "6, 8, 10, 3, 5",
    resultMessage = "2 Successes • Critical!",
    totalSuccesses = 2,
    hasMessyCritical = false,
    isTotalFailure = false,
    hasBestialFailure = false
})
```

### 2. Notification Overlay
Displays notifications (info, success, warning, error) in the top-center of the screen.

**Usage from Lua:**
```lua
-- Success notification
Global.call("sendNotificationToUI", {
    title = "Action Complete",
    message = "Your action was successful!",
    type = "success"  -- "info", "success", "warning", or "error"
})

-- Error notification
Global.call("sendNotificationToUI", {
    title = "Error",
    message = "Something went wrong!",
    type = "error"
})
```

### 3. Message Overlay
Displays full-screen messages with header, body, and footer.

**Usage from Lua:**
```lua
Global.call("sendMessageToUI", {
    header = "Important Message",
    body = "This is the main message content that will be displayed prominently.",
    footer = "Additional information or instructions",
    style = "default"  -- "default", "alert", "confirm", or "prompt"
})
```

## Configuration

### Initial UI Page

The UI is loaded from `Global.xml`:
```xml
<ui>
    <url>https://yourusername.github.io/toronto-rising-tts/index.html</url>
</ui>
```

All overlays are preloaded in `index.html`, so there's no need to switch pages. Just call the appropriate function and the overlay will display instantly!

## How It Works

1. **Preloading**: All overlays (dice results, notifications, messages) are preloaded in `index.html` when the UI first loads. This means zero loading time when switching between message types.

2. **Data Transmission**: When you call a function like `sendDiceResultsToUI`, the data is immediately sent to the appropriate hidden input field. No page switching needed!

3. **Animation Trigger**: The JavaScript watches for changes to the hidden input fields and instantly triggers GSAP animations when data is received.

4. **Auto-Hide**: Each overlay automatically hides after a set duration (dice results: 5s, notifications: 4s, messages: 6s).

**Performance Benefits:**
- ✅ Instant display - no page loading delays
- ✅ All animations ready immediately
- ✅ Smooth transitions between message types
- ✅ Single page load on initial UI setup

## Customization

### Adding New Pages

1. Create a new HTML file (e.g., `custom.html`) in the `UI/` folder
2. Add a hidden input field: `<input type="hidden" id="custom-data" value="" />`
3. Add a watcher function in `script.ts`: `setupCustomWatcher()`
4. Add a display function: `showCustom(data)`
5. Add CSS styles for your custom overlay
6. Add a function in `Global.lua` to send data to your custom page

### Styling

Each page has its own CSS classes:
- `.dice-results-overlay`, `.dice-results-container` - Dice results
- `.notification-overlay`, `.notification-container` - Notifications
- `.message-overlay`, `.message-container` - Messages

Modify `styles.css` to customize the appearance.

## Examples

### Example 1: Dice Roll
```lua
-- In your dice roller script
Global.call("sendDiceResultsToUI", {
    playerName = Player[color].steam_name,
    diceValues = "6, 8, 10, 3, 5",
    resultMessage = "2 Successes • Critical!",
    totalSuccesses = 2,
    hasMessyCritical = false,
    isTotalFailure = false
})
```

### Example 2: Game Event Notification
```lua
-- When a player joins
Global.call("sendNotificationToUI", {
    title = "Player Joined",
    message = Player[color].steam_name .. " has joined the game",
    type = "success"
})
```

### Example 3: Important Announcement
```lua
-- Display an important message
Global.call("sendMessageToUI", {
    header = "Game Paused",
    body = "The game has been paused. Please wait for the host to resume.",
    footer = "You can continue chatting while paused.",
    style = "alert"
})
```

## Troubleshooting

- **Page not switching**: Check that `UI_BASE_URL` is set correctly in `Global.lua`
- **Data not displaying**: Ensure the hidden input field ID matches between HTML and Lua
- **Animations not working**: Check browser console for JavaScript errors
- **Page not loading**: Verify GitHub Pages is enabled and the URL is correct
