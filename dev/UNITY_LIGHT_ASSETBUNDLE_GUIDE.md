# Unity AssetBundle Light Creation Guide

**Purpose:** Step-by-step guide for creating a custom point-source light AssetBundle for Tabletop Simulator.

**Requirements:**
- Unity installed (version 2019.4 LTS or newer recommended for TTS compatibility)
- Basic Unity knowledge (GameObjects, Components, Materials)

---

## Table of Contents

1. [Unity Project Setup](#unity-project-setup)
2. [Creating the Cone Model](#creating-the-cone-model)
3. [Setting Up Light Components](#setting-up-light-components)
4. [Configuring Materials and Rendering](#configuring-materials-and-rendering)
5. [Removing Collision](#removing-collision)
6. [Setting Default Size](#setting-default-size)
7. [Building the AssetBundle](#building-the-assetbundle)
8. [Testing in TTS](#testing-in-tts)
9. [Integration with Your Code](#integration-with-your-code)

---

## Unity Project Setup

### Step 1: Create New Unity Project

1. Open Unity Hub
2. Click **New Project**
3. Select **3D** template
4. Name: `TTS_Light_AssetBundle`
5. Location: Choose your preferred directory
6. Click **Create**

### Step 2: Configure Project Settings for TTS

1. **Edit → Project Settings → Player**
2. Under **Other Settings**:
   - **API Compatibility Level**: `.NET Standard 2.0` or `.NET Framework`
   - **Scripting Backend**: `Mono` (not IL2CPP - TTS doesn't support IL2CPP)
3. **File → Build Settings**
   - Platform: **PC, Mac & Linux Standalone**
   - Target Platform: **Windows** (or your platform)
   - Architecture: **x86_64**

**Note:** TTS uses Unity 2019.4 internally, so using 2019.4 LTS ensures maximum compatibility.

---

## Creating the Cone Model

### Step 3: Create Cone GameObject

1. **GameObject → 3D Object → Cone**
   - This creates a cone with the tip pointing up (Y+)
2. Rename it to `LightCone`
3. Position: `(0, 0, 0)`
4. Rotation: `(0, 0, 0)`
5. Scale: `(1, 1, 1)` (we'll adjust size later)

### Step 4: Rotate Cone to Face Light Direction

The cone should point in the direction the light shines. In Unity, lights typically point down (Y-), so:

1. Select `LightCone`
2. **Rotation**: `(180, 0, 0)` or `(-90, 0, 0)` depending on desired orientation
   - **180° on X**: Flips cone upside down (tip points down)
   - **-90° on X**: Rotates cone 90° (tip points forward/backward)

**For TTS lights pointing downward:**
- Set Rotation to `(180, 0, 0)` so the open end faces down

### Step 5: Scale Cone to Small Size

TTS uses Unity units where 1 unit ≈ 1 inch. For a small light indicator:

1. Select `LightCone`
2. **Scale**: `(0.2, 0.3, 0.2)` or smaller
   - X/Z: Width of cone base (0.2 = ~2 inches wide)
   - Y: Height of cone (0.3 = ~3 inches tall)
   - Adjust to taste - smaller is better for subtle indicators

**Recommended starting size:**
- Scale: `(0.15, 0.25, 0.15)` for a subtle indicator
- Scale: `(0.3, 0.5, 0.3)` for a more visible indicator

---

## Setting Up Light Components

### Step 6: Create Parent GameObject for Organization

1. **GameObject → Create Empty**
2. Rename to `TTS_Light`
3. Position: `(0, 0, 0)`
4. Make `LightCone` a child of `TTS_Light`:
   - Drag `LightCone` onto `TTS_Light` in Hierarchy

**Structure:**
```
TTS_Light (root GameObject)
└── LightCone (visual mesh)
```

### Step 7: Add Point Light Component

1. Select `TTS_Light` (the parent, not the cone)
2. **Component → Rendering → Light**
3. In Light component:
   - **Type**: `Point`
   - **Range**: `40` (default - you'll control this via script)
   - **Color**: `White` (default - you'll control this via script)
   - **Intensity**: `10` (default - you'll control this via script)
   - **Shadows**: `No Shadows` (recommended for performance)

### Step 8: Add Spot Light Component (Optional)

If you want spot light capability:

1. Select `TTS_Light`
2. **Component → Rendering → Light** (add another Light component)
3. Configure:
   - **Type**: `Spot`
   - **Range**: `40`
   - **Spot Angle**: `90` (degrees)
   - **Color**: `White`
   - **Intensity**: `10`
   - **Shadows**: `No Shadows`
4. **Disable this component** (uncheck the checkbox) - enable via script when needed

**Note:** Unity allows multiple Light components on one GameObject, but only one can be active at a time. You'll switch between them via script.

### Step 9: Add Directional Light Component (Optional)

For directional light support:

1. Select `TTS_Light`
2. **Component → Rendering → Light**
3. Configure:
   - **Type**: `Directional`
   - **Color**: `White`
   - **Intensity**: `1`
   - **Shadows**: `No Shadows`
4. **Disable this component**

### Step 10: Organize Light Components

**Recommended Setup:**
- **Point Light**: Enabled by default (for point-source lighting)
- **Spot Light**: Disabled (enable via script when needed)
- **Directional Light**: Disabled (enable via script when needed)

**Component Order Matters:**
Unity processes components in order. For easier script access:
1. Point Light (enabled)
2. Spot Light (disabled)
3. Directional Light (disabled)

---

## Configuring Materials and Rendering

### Step 11: Create Tintable Material

1. **Assets → Create → Material**
2. Name: `LightConeMaterial`
3. Select the material in Project window
4. In Inspector:
   - **Shader**: `Standard` or `Unlit/Color` (for simple tinting)
   - **Albedo**: White `(1, 1, 1, 1)` - this allows color tinting
   - **Metallic**: `0`
   - **Smoothness**: `0.5` (or `0` for matte)

**For Unlit Material (better for simple indicators):**
1. **Shader**: `Unlit/Color`
2. **Color**: White `(1, 1, 1, 1)`
3. This makes the cone respond directly to `setColorTint()` in TTS

### Step 12: Apply Material to Cone

1. Select `LightCone` GameObject
2. In Inspector, find **Mesh Renderer** component
3. **Materials → Element 0**: Drag `LightConeMaterial` here

### Step 13: Make Material Tintable

For the material to respond to TTS `setColorTint()`:

1. Select `LightConeMaterial`
2. **Shader**: `Standard` (supports tinting)
3. **Rendering Mode**: `Transparent` or `Fade` (optional - for semi-transparent)
4. **Albedo**: White `(1, 1, 1, 1)`

**Alternative:** Use `Unlit/Color` shader for simple color control.

---

## Removing Collision

### Step 14: Remove Collider Components

1. Select `LightCone` GameObject
2. In Inspector, find **Mesh Collider** component
3. Click the **three dots (⋮)** → **Remove Component**
4. If there's a **Box Collider** or other collider, remove it too

**Important:** The root `TTS_Light` GameObject should have NO colliders. This ensures:
- Lights don't interfere with object physics
- Lights can't be picked up accidentally
- Lights don't block other objects

### Step 15: Verify No Collision

1. Select `TTS_Light` (root)
2. Check Inspector - should have:
   - ✅ Transform
   - ✅ Light component(s)
   - ❌ NO Collider components

3. Select `LightCone` (child)
4. Check Inspector - should have:
   - ✅ Transform
   - ✅ Mesh Filter
   - ✅ Mesh Renderer
   - ❌ NO Collider components

---

## Setting Default Size

### Step 16: Finalize Default Size

The default size is set by the Transform scale. For TTS:

**Recommended Sizes:**

**Small Indicator (subtle):**
- `LightCone` Scale: `(0.1, 0.2, 0.1)`
- Barely visible, just shows light position

**Medium Indicator (visible):**
- `LightCone` Scale: `(0.2, 0.3, 0.2)`
- Clearly visible but not intrusive

**Large Indicator (prominent):**
- `LightCone` Scale: `(0.3, 0.5, 0.3)`
- Very visible, good for testing

**Note:** You can scale the spawned object in TTS via `spawnObject({scale = {x, y, z}})` if needed.

### Step 17: Set Root GameObject Scale

1. Select `TTS_Light` (root)
2. **Scale**: `(1, 1, 1)` - keep root at unit scale
3. All scaling should be on `LightCone` child

**Why:** Keeping root at (1,1,1) makes it easier to scale the entire light object in TTS if needed.

---

## Building the AssetBundle

### Step 18: Install AssetBundle Browser (Optional but Recommended)

1. **Window → Package Manager**
2. Click **+** → **Add package from git URL**
3. Enter: `com.unity.assetbundlebrowser`
4. Click **Add**

This provides a GUI for building AssetBundles.

### Step 19: Create AssetBundle Tag

1. Select `TTS_Light` GameObject in Hierarchy
2. In Inspector, at the bottom:
   - **AssetBundle**: Click dropdown → **New...**
   - Name: `ttslight` (lowercase, no spaces)
   - Click **Create**

**Important:** AssetBundle names must be lowercase with no spaces for TTS compatibility.

### Step 20: Build AssetBundle (Method 1: AssetBundle Browser)

1. **Window → AssetBundle Browser**
2. Click **Build** tab
3. **Output Path**: Choose a folder (e.g., `Assets/AssetBundles`)
4. **Build Target**: `StandaloneWindows64` (or your platform)
5. **Compression**: `No Compression` (recommended for TTS)
6. Click **Build**

**Output:** `AssetBundles/ttslight` (no extension)

### Step 21: Build AssetBundle (Method 2: Script)

Create a build script:

1. **Assets → Create → C# Script**
2. Name: `BuildAssetBundle`
3. Replace contents:

```csharp
using UnityEditor;
using UnityEngine;

public class BuildAssetBundle
{
    [MenuItem("Assets/Build AssetBundle")]
    static void BuildAllAssetBundles()
    {
        string assetBundleDirectory = "Assets/AssetBundles";

        if (!System.IO.Directory.Exists(assetBundleDirectory))
        {
            System.IO.Directory.CreateDirectory(assetBundleDirectory);
        }

        BuildPipeline.BuildAssetBundles(
            assetBundleDirectory,
            BuildAssetBundleOptions.UncompressedAssetBundle,
            BuildTarget.StandaloneWindows64
        );

        Debug.Log("AssetBundle built successfully!");
    }
}
```

3. **Assets → Build AssetBundle** (menu item appears)

**Output:** `Assets/AssetBundles/ttslight` (no extension)

### Step 22: Locate Built AssetBundle

The built AssetBundle will be in:
- `Assets/AssetBundles/ttslight` (no file extension)

**File Properties:**
- Name: `ttslight` (no extension)
- Type: Binary file
- Size: Usually 50-200 KB depending on complexity

---

## Testing in TTS

### Step 23: Host AssetBundle

You have several options:

**Option A: Steam Workshop (Recommended)**
1. Upload AssetBundle to Steam Workshop as a mod
2. Get Workshop URL or ID
3. Use in TTS: `spawnObject({type = "AssetBundle", url = "workshop://..."})`

**Option B: Web Server**
1. Upload `ttslight` file to web server
2. Use direct URL: `spawnObject({type = "AssetBundle", url = "http://yourserver.com/ttslight"})`

**Option C: Local Testing (Development Only)**
1. Place `ttslight` in TTS mod folder
2. Use file path (if TTS supports it)

### Step 24: Test Spawn in TTS

In TTS console or script:

```lua
-- Spawn the light
local light = spawnObject({
    type = "AssetBundle",
    url = "http://yourserver.com/ttslight", -- or Workshop URL
    position = {0, 5, 0},
    rotation = {0, 0, 0},
    callback_function = function(obj)
        print("Light spawned! GUID: " .. obj.getGUID())

        -- Test accessing Light component
        local lightComp = obj.getComponentInChildren("Light")
        if lightComp then
            print("Light component found!")
            print("Range:", lightComp.get("range"))
            print("Intensity:", lightComp.get("intensity"))
            print("Color:", lightComp.get("color"))
        else
            print("ERROR: Light component not found")
        end
    end
})
```

### Step 25: Test Light Control

```lua
-- Get spawned light
local light = getObjectFromGUID("your-light-guid")

-- Access Light component
local lightComp = light.getComponentInChildren("Light")

-- Control light properties
lightComp.set("enabled", true)
lightComp.set("range", 50)
lightComp.set("intensity", 15)
lightComp.set("color", Color({r=1, g=0.5, b=0.5})) -- Reddish tint

-- Test tinting the cone material
light.setColorTint(Color({r=1, g=0.8, b=0.8})) -- Light red tint
```

---

## Integration with Your Code

### Step 26: Create Light Spawner Function

Add to `core/lighting.ttslua` or create `lib/light_spawner.ttslua`:

```lua
--[[
    Light Spawner Module
    Creates custom point-source lights via AssetBundle
]]

local LightSpawner = {}
local U = require("lib.util")

-- AssetBundle URL (update with your hosted URL or Workshop ID)
local LIGHT_ASSETBUNDLE_URL = "http://yourserver.com/ttslight" -- or Workshop URL

--- Spawns a custom point-source light
-- @param position Vector Position to spawn light
-- @param rotation Vector Rotation of light
-- @param config table Light configuration {
--     enabled = boolean,
--     range = number,
--     intensity = number,
--     color = Color or {r, g, b},
--     angle = number (for spot lights),
--     lightType = string ("Point", "Spot", "Directional")
-- }
-- @return Object|nil The spawned light object
function LightSpawner.spawnLight(position, rotation, config)
    config = config or {}
    position = position or Vector(0, 5, 0)
    rotation = rotation or Vector(0, 0, 0)

    local light = spawnObject({
        type = "AssetBundle",
        url = LIGHT_ASSETBUNDLE_URL,
        position = position,
        rotation = rotation,
        callback_function = function(obj)
            -- Configure light after spawn
            local lightComp = obj.getComponentInChildren("Light")
            if lightComp then
                -- Set properties
                if config.enabled ~= nil then
                    lightComp.set("enabled", config.enabled)
                end

                if config.range then
                    lightComp.set("range", config.range)
                end

                if config.intensity then
                    lightComp.set("intensity", config.intensity)
                end

                if config.color then
                    lightComp.set("color", Color(config.color))
                    -- Also tint the cone material
                    obj.setColorTint(Color(config.color))
                end

                if config.angle and config.lightType == "Spot" then
                    lightComp.set("spotAngle", config.angle)
                end

                -- Switch light type if needed
                if config.lightType then
                    -- Note: You may need to enable/disable different Light components
                    -- This depends on your AssetBundle setup
                end
            end
        end
    })

    return light
end

return LightSpawner
```

### Step 27: Update Lighting Module

Integrate with existing `core/lighting.ttslua`:

```lua
-- Add to top of file
local LightSpawner = require("lib.light_spawner")

-- Add function to create lights dynamically
function L.CreateLight(lightName, position, rotation, config)
    local light = LightSpawner.spawnLight(position, rotation, config)

    -- Store GUID in light mode definition for later access
    if L.LIGHTMODES[lightName] then
        -- Save GUID for future reference
        -- You'll need to get GUID after spawn completes
    end

    return light
end
```

---

## Troubleshooting

### Light Component Not Found

**Problem:** `getComponentInChildren("Light")` returns `nil`

**Solutions:**
1. Check that Light component is on the root GameObject (not just child)
2. Try `getComponent("Light")` instead
3. Check component name - should be exactly `"Light"` (case-sensitive)
4. Verify AssetBundle built correctly

### Cone Not Visible

**Problem:** Cone mesh doesn't appear in TTS

**Solutions:**
1. Check material is applied to Mesh Renderer
2. Verify cone scale isn't too small
3. Check cone rotation - might be facing wrong direction
4. Ensure Mesh Renderer is enabled

### Light Not Working

**Problem:** Light component exists but doesn't illuminate

**Solutions:**
1. Check `enabled` property: `lightComp.set("enabled", true)`
2. Verify intensity > 0: `lightComp.set("intensity", 10)`
3. Check range: `lightComp.set("range", 40)`
4. Verify light type matches usage (Point vs Spot vs Directional)

### AssetBundle Won't Load

**Problem:** `spawnObject` fails or object doesn't appear

**Solutions:**
1. Verify URL is accessible (test in browser)
2. Check AssetBundle name matches (case-sensitive)
3. Ensure build target matches TTS platform (Windows 64-bit)
4. Try uncompressed build (`UncompressedAssetBundle` option)

---

## Advanced Configuration

### Multiple Light Types on One Object

If you added multiple Light components (Point, Spot, Directional):

```lua
-- Get all Light components
local lightComps = light.getComponents("Light")

-- Enable Point light, disable others
for i, comp in ipairs(lightComps) do
    if comp.get("type") == 0 then -- Point light (type 0)
        comp.set("enabled", true)
    else
        comp.set("enabled", false)
    end
end
```

**Light Type Values:**
- `0` = Point
- `1` = Spot
- `2` = Directional
- `3` = Area (not commonly used in TTS)

### Custom Shader for Better Tinting

For more control over cone appearance:

1. Create custom shader in Unity
2. Use `_Color` property for tinting
3. Apply to material
4. Control via `setColorTint()` in TTS

---

## Summary Checklist

- [ ] Unity project created and configured
- [ ] Cone GameObject created and rotated correctly
- [ ] Light component(s) added to root GameObject
- [ ] Material created and applied (tintable)
- [ ] All colliders removed
- [ ] Default size set appropriately
- [ ] AssetBundle built successfully
- [ ] AssetBundle hosted (Workshop or web server)
- [ ] Test spawn in TTS successful
- [ ] Light component accessible via script
- [ ] Light properties controllable via script
- [ ] Integration with lighting module complete

---

## Next Steps

1. **Test thoroughly** in TTS with various configurations
2. **Create variants** if needed (different sizes, materials)
3. **Document GUIDs** of spawned lights for state management
4. **Update lighting module** to support both old and new lights
5. **Migrate existing lights** to new system if desired

---

## References

- [TTS AssetBundle Documentation](https://kb.tabletopsimulator.com/custom-content/custom-assetbundle/)
- [TTS Component API](https://api.tabletopsimulator.com/object/#component-functions)
- [Unity Light Component](https://docs.unity3d.com/Manual/class-Light.html)
- [Unity AssetBundle Guide](https://docs.unity3d.com/Manual/AssetBundlesIntro.html)

---

**Last Updated:** 2026-01-01
**Author:** AI Assistant
**Project:** Toronto Rising TTS Module

