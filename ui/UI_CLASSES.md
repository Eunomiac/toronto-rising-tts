# UI Class Reference

All TTS XML UI classes defined in this project, organized by scope. Use this reference when building new UI components to reuse existing styles rather than writing inline attributes.

> **Naming conventions** (see `ui/README.md`):
>
> - **General** (no prefix): Reusable across any component. Defined in `defaults_classes.xml`.
> - **Area-specific** (`area_` prefix): Scoped to a specific HUD area. Defined in `hud_*_defaults.xml`.
> - **Component-specific** (`componentName_elementRole`): Scoped to a single panel. Defined in `panel_*_defaults.xml` or inline.

---

## Tag-Based Defaults (`defaults_tags.xml`)

These apply to **every element of that tag type** unless overridden by a class. They are not classes -- they set baseline behavior for bare elements.

| Tag | Attributes | Purpose |
| ----- | ---------- | -------- |
| `Image` | `preserveAspect="true"` `raycastTarget="false"` | Images preserve aspect ratio and don't block clicks by default |
| `VerticalLayout` | `raycastTarget="false"` | Layouts don't block clicks by default |
| `HorizontalLayout` | `raycastTarget="false"` | Layouts don't block clicks by default |
| `Button` | 150x30, `fontSize="16"`, `fontStyle="Bold"`, grey | Standard button size and appearance |

---

## General Classes (`defaults_classes.xml`)

### Spacers

Invisible `Text` elements used to add vertical gaps between elements inside a `VerticalLayout`.

| Class | Font Size | Approx Height | Usage |
| ------- | ---------- | --------------- | ------- |
| `spacer_5` | 4 | ~5px | Tight spacing |
| `spacer_10` | 8 | ~10px | Small gap |
| `spacer_15` | 16 | ~15px | Standard section gap |
| `spacer_20` | 32 | ~20px | Large section gap |

```xml
<Text class="spacer_15"></Text>
```

### Panel Backgrounds

| Class | Element | Appearance | Usage |
| ------- | ---------- | ----------- | ------- |
| `panel-base` | `Panel` | 70% opaque black, 10px padding | General-purpose dark background |
| `panel-dark` | `Panel` | 85% opaque black, 10px padding | Higher-contrast dark background |

```xml
<Panel class="panel-base">
  <Text>Content on dark background</Text>
</Panel>
```

### Button Sizes

| Class | Element | Size | Usage |
| ------- | ---------- | ------ | ------- |
| `smallButton` | `Button` | 100x30 (overrides default 150x30) | Utility/secondary buttons that should be narrower than primary buttons |

```xml
<Button class="smallButton" onClick="HUD_someAction" color="#00BBBB">Action</Button>
```

### Debug Styles

| Class | Element | Appearance | Usage |
| ------- | ---------- | ----------- | ------- |
| `debugPanel` | `Panel` | 75% black, 350x400, 0.75 scale, MiddleLeft+250 offset | Overlay panel for debug info readouts |
| `debugText` | `Text` | White, 200px wide, UpperLeft, black outline | Text inside a `debugPanel` |

```xml
<Panel id="myDebugPanel" active="false" class="debugPanel">
  <Text id="myDebugOutput" class="debugText"></Text>
</Panel>
```

### Reminder/Alert Styles

| Class | Element | Appearance | Usage |
| ------- | ---------- | ----------- | ------- |
| `reminderPanel` | `Panel` | Black background, 0.75 scale, red outline | Alert/reminder popup container |
| `reminderHeading` | `Text` | Yellow, 18px bold, dark yellow outline | Section heading inside reminder |
| `reminderAction` | `Text` | Red, 24px bold, dark red outline | Action/warning text inside reminder |

Multiple classes can be combined. A combined `reminderHeading reminderAction` default also exists for shared base properties (white, MiddleLeft, black outline).

```xml
<Panel class="reminderPanel">
  <Text class="reminderHeading">Step 1</Text>
  <Text class="reminderAction">Do this now</Text>
</Panel>
```

### Image Button Layers

A two-layer pattern for image-based buttons with hover highlights. Place two identical `Image` elements stacked: one with `imageButtonBase` (visible, grey-tinted, clickable) and one with `imageButtonOverlay` (transparent, turns white on hover via Lua).

| Class | Element | Appearance | Usage |
| ------- | ---------- | ----------- | ------- |
| `imageButtonBase` | `Image` | Grey tint, `raycastTarget="true"` | Bottom layer: visible image, receives clicks |
| `imageButtonOverlay` | `Image` | `color="clear"` (transparent) | Top layer: set to `#FFFFFF` by hover handler |
| `imageBorder` | `Image` | `rectAlignment="MiddleLeft"` | Decorative section border between button groups |

```xml
<!-- Base layer -->
<Image id="myButtonBase" class="myClickHandler imageButtonBase" image="my-icon" />
<!-- Overlay layer (same image, stacked on top) -->
<Image id="myButtonBaseOverlay" class="myClickHandler imageButtonOverlay" image="my-icon" />
```

The hover handler sets `UI.setAttribute(id .. "Overlay", "color", "#FFFFFF")` on enter and resets to `"clear"` on exit.

### Popup Image Styles

Pattern for fullscreen reference image popups that are hidden by default and shown/hidden by Lua handlers.

| Class | Element | Appearance | Usage |
| ------- | ---------- | ----------- | ------- |
| `popupImage` | `Image` | `active="false"` | Hidden popup image; shown via `UI.show(id)` |
| `popupImageNarrow` | `Image` | `width="60%"` | Narrower popup variant (combine with `popupImage`) |
| `popupImageContainer` | `Panel` | No forced expand | Wrapper panel for popup images |

```xml
<Panel class="popupImageContainer">
  <Image id="RefSomething" class="popupImage" image="ref-something" height="80%" />
  <Image id="RefNarrowThing" class="popupImage popupImageNarrow" image="ref-narrow" />
</Panel>
```

### Status Display

| Class | Element | Appearance | Usage |
| ------- | ---------- | ----------- | ------- |
| `statusText` | `Text` | White, 14px, MiddleLeft, black outline | Value display (e.g. "Playing") |
| `statusLabel` | `Text` | Grey (#CCC), 14px, MiddleLeft, black outline | Label for a value (e.g. "Status:") |

```xml
<Text class="statusLabel">Current Phase:</Text>
<Text class="statusText" id="phaseDisplay">Playing</Text>
```

### Player Stat Display

| Class | Element | Appearance | Usage |
| ------- | ---------- | ----------- | ------- |
| `statDisplay` | `HorizontalLayout` | 10px spacing, MiddleLeft | Row container for a label + value pair |
| `statLabel` | `Text` | Grey (#CCC), 16px, 100px wide | Stat name (e.g. "Hunger") |
| `statValue` | `Text` | White, 18px bold, 50px wide, centered | Stat number (e.g. "3") |
| `playerHudPanel` | `Panel` | 250x150, 70% black, UpperRight | Per-player HUD container |
| `playerStats` | `VerticalLayout` | 8px spacing, UpperLeft | Stack of stat rows |

```xml
<Panel class="playerHudPanel" visibility="Red">
  <VerticalLayout class="playerStats">
    <HorizontalLayout class="statDisplay">
      <Text class="statLabel">Hunger</Text>
      <Text class="statValue" id="hungerVal_Red">0</Text>
    </HorizontalLayout>
  </VerticalLayout>
</Panel>
```

---

## Storyteller Area Classes (`hud_storyteller_defaults.xml`)

These classes are scoped to the storyteller/GM HUD (`visibility="Black"`). They use the `storyteller_` prefix to avoid collisions with player or shared UI.

### Admin Panel Layout

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `storyteller_buttonControls` | `VerticalLayout` | 160px wide, 0.5 scale, MiddleLeft, offset 0/-90 | Left-side game phase button column |
| `storyteller_subButtonControls` | `HorizontalLayout` | 200x500, MiddleLeft, offset 75/50 | Debug sub-panel (horizontal row of button columns) |

These position the storyteller admin controls at half-scale on the left side of the screen.

### Debug Traits

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `storyteller_debugTraits` | `Panel` | 900x800, UpperRight, offset -400/-100 | Large overlay for per-player trait data |
| `storyteller_debugTraitsRed` | `Text` | offset 0/0 | Column position for Red player traits |
| `storyteller_debugTraitsYellow` | `Text` | offset 200/0 | Column position for Yellow player traits |
| `storyteller_debugTraitsBlue` | `Text` | offset 400/0 | Column position for Blue player traits |
| `storyteller_debugStickers` | `Text` | offset 600/0 | Column position for sticker data |

Combine with the generic `debugPanel` and `debugText` classes:

```xml
<Panel class="debugPanel storyteller_debugTraits">
  <Text class="debugText storyteller_debugTraitsRed" id="debugTraitsRed"></Text>
</Panel>
```

### Sidebar (Reference Image Toggles)

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `storyteller_sidebar` | `Panel` | 125x740, LowerRight, offset 0/100 | Right-edge sidebar container |
| `storyteller_sidebarLayout` | `VerticalLayout` | 100% fill, LowerLeft aligned | Inner layout stacking toggle buttons bottom-up |
| `storyteller_refButton` | `Image` | `HUD_show`/`HUD_hide`/`HUD_highlight`/`HUD_dim` handlers | Interactive toggle button wired to sidebar Lua logic |

`storyteller_refButton` is combined with the generic `imageButtonBase` or `imageButtonOverlay` for the two-layer pattern:

```xml
<Image id="hudRefSomething" class="storyteller_refButton imageButtonBase" image="my-toggle-icon" />
<Image id="hudRefSomethingOverlay" class="storyteller_refButton imageButtonOverlay" image="my-toggle-icon" />
```

### Camera Controls

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `storyteller_factionIconContainer` | `HorizontalLayout` | 800x150, LowerRight, 0.7 scale | Container row for faction icons above camera bar |
| `storyteller_cameraControls` | `HorizontalLayout` | 800x28, LowerRight, 0.7 scale | Bottom-right camera zoom button bar |
| `storyteller_cameraButton` | `Image` | `HUD_cameraSet`/`HUD_highlight`/`HUD_dim` handlers | Interactive camera zoom button |

```xml
<HorizontalLayout class="storyteller_cameraControls">
  <Image id="cameraZoomPlayerOne" class="storyteller_cameraButton" image="camera-zoom-player-one" />
</HorizontalLayout>
```

---

## King's Dilemma Area Classes (`hud_kd_defaults.xml`)

These classes are scoped to the King's Dilemma reference HUD panels. They use the `kd_` prefix. See `dev/KD_HUD_REFERENCE.md` for full panel documentation.

### Text Styles

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `kd_header` | `Text` | Title font, 60px, UpperCenter | Section headings (e.g. "Where Does Your House Rule?") |
| `kd_bold` | `Text` | `fontStyle="Bold"` | Bold text modifier |
| `kd_smallcaps` | `Text` | FrizSC font | Small caps text modifier |

### Button Styles

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `kd_button` | `Button` | 100x25, FrizB font, `onClick="KD_Click"` | Standard KD button with grey colorblock |
| `kd_buttonPanelToggle` | `Button` | 25px wide, offset 50/-15 | Expandable panel toggle (`►`/`▼`) |

### KD Admin Panel Layout

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `kd_adminContainer` | `VerticalLayout` | 800px wide, UpperLeft, offset 40/-10 | Admin panel wrapper |
| `kd_gameStatusDisplay` (HL) | `HorizontalLayout` | MiddleLeft, 25px height, 10px spacing | Game status row container |
| `kd_gameStatusDisplay` (Text) | `Text` | Yellow, 14px FrizB, centered | Status value text |
| `kd_buttonPanel` | `HorizontalLayout` | No padding/spacing | Collapsible button group wrapper |
| `kd_buttonBar` | `VerticalLayout` | 3px spacing, UpperLeft | Button stack inside a collapsible group |

### Debug Panel

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `kd_debugDisplayPanel` | `HorizontalLayout` | UpperRight, 250x1500 | State display panel wrapper |
| `kd_debugButtonPanel` | `HorizontalLayout` | offset 0/-350 | Debug button panel positioning |
| `kd_codeDisplayPanel` | `Panel` | 50% black, 250x1500, 5px padding | Dark background for state text |
| `kd_codeDisplay` | `Text` | 8px, UpperLeft | Monospace-style state dump text |

### Turn HUD

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `kd_turnContainer` | `Panel` | 2000x250, LowerCenter, fade animations | Outer voting bar container |
| `kd_turnPanel` | `Panel` | 300x60, no animations | Individual vote option wrapper |
| `kd_turnBorderTop` | `Image` | 2000x270, UpperCenter, `splash-border-above` | Decorative top border |
| `kd_turnLayout` | `VerticalLayout` | 2000x400, centered, fade animations | Inner layout for vote row |
| `kd_turnRow` | `HorizontalLayout` | 60px height, centered | Horizontal row of vote buttons |
| `kd_turnButton` | `Image` | 300x60, gold tint, `button-bg`, clickable | Vote button background |
| `kd_turnButtonAye` | `Image` | Cyan tint override | Aye-specific color |
| `kd_turnButtonNay` | `Image` | Red tint override | Nay-specific color |
| `kd_turnIcon` | `Image` | 250x250 scaled to 0.16, gold, offset right | Power/moderator icon |
| `kd_turnModeratorIcon` | `Image` | Scale 0.25 | Larger icon for moderator variant |
| `kd_turnButtonText` | `Text` | CinzelBB 25px, centered | Button label text |
| `kd_turnTextWithIcon` | `Text` | UpperCenter, offset -15/5 | Text shifted left for icon space |
| `kd_turnSmallText` | `Text` | FrizI 18px, LowerCenter | Sub-label text |
| `kd_turnText` | `Text` | Friz 60px, white 50% alpha, shadow | Base turn text styling |

### Splash Screen

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `kd_splashPanel` | `Panel` | Fade animations, centered | Root splash container |
| `kd_splashRoot` | `VerticalLayout` | 650px wide, padded for borders | Inner content wrapper |
| `kd_splashContent` | `VerticalLayout` | 650px wide, UpperCenter | Text content area |
| `kd_splashImageContainer` | `VerticalLayout` | Absolute, centered, 100% fill | Background image stack |
| `kd_splashBorderTop` | `Image` | 650x65, `splash-border-above` | Top decorative border |
| `kd_splashBorderBottom` | `Image` | 650x65, `splash-border-under` | Bottom decorative border |
| `kd_splashBg` | `Image` | 1000px wide, no aspect preserve, `splash-bg` | Background texture fill |
| `kd_splashText` | `Text` | Friz 50px, white, overflow, shadow-free | General splash text |
| `kd_splashScreen` | `Panel` | 95% black, 1.75x scale, offset 0/100 | Title screen overlay |
| `kd_splashIntro` | `Text` | FrizSC 87px, scaled 0.57 | Title screen heading |
| `kd_splashIntroSub` | `Text` | 30px, scaled 0.57 | Title screen subtitle |
| `kd_splashHud` | `Panel` | offset 0/325 | Message panels positioning |

### Splash Query

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `kd_splashQuery` | `Panel` | offset -400/350, 0.6x scale | Query panel positioning |
| `kd_splashQueryRow` | `HorizontalLayout` | 110px height, 20px spacing, centered | Options row |
| `kd_splashOption` | `Panel` | 400x80 | Option button wrapper |
| `kd_splashOptionImage` | `Image` | 400x80, dim gold, `button-bg`, clickable | Option button background |
| `kd_playerPrompt` | `Text` | CinzelBB 70px, white, black shadow | Player role prompt |
| `kd_splashOptionText` | `Text` | CinzelBB 25px, 27% white | Option label text |
| `kd_splashQueryPrompt` | `Text` | 40px | Query question text |

### House Selection Grid

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `kd_houseSelectionContainer` | `Panel` | 1s fade animations | Full-screen grid wrapper |
| `kd_houseSelectionGrid` | `GridLayout` | 1260x580, 4 columns, 300x180 cells, 20px gaps | House flag grid |
| `kd_houseSelectionHeader` | `Text` | offset 0/-100 | "Where Does Your House Rule?" positioning |
| `kd_houseFlag` | `Image` | Grey tint, 50px outline | House flag image |
| `kd_houseHover` | `Image` | Transparent, clickable, hover handlers | Hover overlay for grid cells |
| `kd_houseInfo` | `Panel` | LowerCenter, 750x250, offset 0/25 | House info popup container |
| `kd_houseInfoImage` | `Image` | `active="false"`, fade animations | Individual house info image |

### Content Fetcher

| Class | Element | Key Attributes | Usage |
| ------- | ---------- | --------------- | ------- |
| `kd_fetcherQuery` | `Panel` | 100% fill, LowerCenter, fade, offset 0/100 | Fetcher panel wrapper |
| `kd_fetcherLayout` | `VerticalLayout` | UpperCenter aligned | Inner content layout |
| `kd_fetcherBorderTop` | `Image` | 100px height, `splash-border-above` | Top border |
| `kd_fetcherBorderBottom` | `Image` | Absolute, LowerCenter, `splash-border-under` | Bottom border |
| `kd_fetcherBg` | `Image` | Absolute, 150% wide, `splash-bg` | Background fill |
| `kd_fetcherText` | `Text` | Friz 40px, white, shadow | Instruction text |
| `kd_fetcherInput` | `InputField` | FrizB 70px, 5 char limit, alphanumeric | Text input field |
| `kd_fetcherSticker` | `InputField` | `onEndEdit="KD_Fetcher_Sticker"` | Sticker-specific submit handler |
| `kd_fetcherEnvelope` | `InputField` | `onEndEdit="KD_Fetcher_Envelope"` | Envelope-specific submit handler |
| `kd_fetcherInputDecor` | `Image` | Absolute, LowerCenter, 125x200 | Input decoration positioning |
| `kd_fetcherStickerBg/Border/Icon` | `Image` | `fetch-sticker-*` assets | Sticker input decoration layers |
| `kd_fetcherEnvelopeBg/Border/Icon` | `Image` | `fetch-envelope-*` assets | Envelope input decoration layers |

---

## Combining Classes

TTS XML supports multiple space-separated classes. Defaults are merged; later classes in the bundled XML override earlier ones. Common combinations:

| Combination | Purpose |
| ------------- | ------- |
| `debugPanel storyteller_debugTraits` | Generic debug overlay + storyteller-specific sizing/position |
| `debugText storyteller_debugTraitsRed` | Generic debug text + storyteller-specific column offset |
| `storyteller_refButton imageButtonBase` | Storyteller mouse handlers + generic grey-tinted clickable image |
| `storyteller_refButton imageButtonOverlay` | Storyteller mouse handlers + generic transparent hover layer |
| `popupImage popupImageNarrow` | Hidden popup + narrower 60% width variant |
| `smallButton` (standalone) | Override default 150px button width to 100px |
| `reminderHeading reminderAction` | Shared base style for reminder text (white, outlined) |
| `kd_turnButton kd_turnButtonAye` | Gold turn button + cyan aye override |
| `kd_turnText kd_turnButtonText kd_turnTextWithIcon` | Turn text + button label + icon offset |
| `kd_splashText kd_splashIntro` | Splash text + title heading style |
| `kd_splashPanel kd_splashScreen` | Splash container + dark fullscreen overlay |
| `kd_splashPanel kd_splashQuery` | Splash container + query positioning |
| `kd_fetcherInputDecor kd_fetcherStickerBg` | Input decoration position + sticker background asset |
| `kd_button kd_buttonPanelToggle` | KD button + toggle sizing/position |
