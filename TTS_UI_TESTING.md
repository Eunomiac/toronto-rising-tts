# TTS UI Testing Guide

## Test 1: Simple Red Box (test.html)

1. Deploy `test.html` to GitHub Pages
2. Update `Global.xml` to:
   ```xml
   <url>https://eunomiac.github.io/toronto-rising-tts/test.html</url>
   ```
3. Reload game in TTS
4. **Expected**: Bright red box with yellow border in center of screen

## Test 2: Full Red Screen (test-simple.html)

If test.html doesn't work, try the even simpler version:

1. Deploy `test-simple.html` to GitHub Pages
2. Update `Global.xml` to:
   ```xml
   <url>https://eunomiac.github.io/toronto-rising-tts/test-simple.html</url>
   ```
3. Reload game in TTS
4. **Expected**: Full red screen with yellow border

## Troubleshooting

### If you see NOTHING:

1. **Check TTS Console**:
   - Look for errors about loading the URL
   - Check if UI object is available (should see `[DEBUG] Global: UI object is available`)

2. **Check Network**:
   - TTS might be blocked from accessing external URLs
   - Check firewall/antivirus settings
   - Try accessing the URL in a regular browser first

3. **Check URL Format**:
   - Must be HTTPS (not HTTP)
   - Must include full path: `https://username.github.io/repo/test.html`
   - Try with and without `index.html` if using default page

4. **Check GitHub Pages**:
   - Verify the page loads in a regular browser
   - Check that GitHub Pages is enabled in repo settings
   - Wait a few minutes after deployment

### If you see the test but not the real UI:

- The UI might be loading but hidden
- Check z-index issues
- Check if elements are positioned off-screen
- Check CSS visibility/display properties

### Alternative: Use TTS's built-in UI system

If external URLs don't work, TTS also supports:
- XML-based UI (no external files needed)
- Embedded HTML in Lua using `UI.setXml()`

## Known TTS Limitations

- External URLs must be HTTPS
- Some browsers/security settings may block external content
- UI loads in an iframe, so some features may be restricted
- CORS policies apply
