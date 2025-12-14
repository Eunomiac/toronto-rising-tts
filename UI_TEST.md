# UI Loading Troubleshooting Guide

## URL Format

TTS can be picky about URL formats. Try both:

1. **With `index.html`** (current):
   ```xml
   <url>https://eunomiac.github.io/toronto-rising-tts/index.html</url>
   ```

2. **Without `index.html`** (GitHub Pages default):
   ```xml
   <url>https://eunomiac.github.io/toronto-rising-tts/</url>
   ```

## Verification Steps

### 1. Check TTS Console
After loading the game, check the TTS console for:
- `[DEBUG] Global: UI object is available` ✅
- `[ERROR] Global: UI object is NOT available` ❌

### 2. Check Browser Console (in TTS)
TTS uses an embedded browser. To see console logs:
- The JavaScript console logs should appear in TTS's output
- Look for: `"Toronto Rising HUD initialized"`
- Look for: `"Test container found and made visible"`

### 3. Visual Test
You should see a test container in the top-right corner with:
- "UI Test Container - If you can see this, the UI is working!"
- "Status: UI initialized and ready - TTS connected!"

### 4. Test Function
You can manually test the UI from Lua:
```lua
-- In TTS console, run:
Global.call("sendNotificationToUI", {
    title = "Test",
    message = "If you see this, the UI is working!",
    type = "success"
})
```

## Common Issues

### Issue: UI not loading at all
**Symptoms:** No test container visible, no console logs
**Solutions:**
1. Verify GitHub Pages is enabled and deployed
2. Check URL is exactly correct (case-sensitive)
3. Try without `index.html` in the URL
4. Check TTS console for errors

### Issue: UI loads but test container not visible
**Symptoms:** Console shows UI loaded, but nothing visible
**Solutions:**
1. Check z-index - might be behind game elements
2. Try rolling dice to trigger dice results overlay
3. Check if `script.js` is loading (check Network tab in browser dev tools)

### Issue: Script errors
**Symptoms:** Console shows JavaScript errors
**Solutions:**
1. Make sure `script.js` is built: `npm run build`
2. Verify `script.js` is deployed to GitHub Pages
3. Check that GSAP is bundled correctly

## Testing Checklist

- [ ] GitHub Pages is enabled
- [ ] Site is deployed (can view in browser)
- [ ] URL in Global.xml matches GitHub Pages URL exactly
- [ ] `script.js` exists and is deployed
- [ ] `styles.css` exists and is deployed
- [ ] TTS console shows UI object available
- [ ] Test container is visible in-game
- [ ] Dice roll triggers animation
