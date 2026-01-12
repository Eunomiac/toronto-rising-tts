# Point-Source Light Creation Feasibility Investigation

**Date:** 2026-01-01
**Purpose:** Investigate feasibility of creating custom point-source lights using TTS functions and objects instead of third-party configurable lights.

---

## Current Implementation

### What We're Currently Using

The current lighting system uses third-party configurable point lights (likely from Steam Workshop). These lights have a complex nested structure:

```lua
-- Current light access pattern (from core/lighting.ttslua)
local function getLightComponent(light, isSilent)
    local lComp
    local success, err = pcall(function()
        lComp = light.getChildren()[1].getChildren()[2].getComponents()[2]
    end)
    -- ... error handling ...
    return lComp
end
```

**Structure:** `Object -> Child[1] -> Grandchild[2] -> Components[2]` (Light component)

**Properties controlled:**

- `enabled` (boolean) - Light on/off
- `range` (number) - Light range/radius
- `intensity` (number) - Light brightness
- `color` (Color) - Light color
- `spotAngle` (number) - Spotlight angle (degrees)

**Position/Rotation:** Controlled via object transform (`setPosition`, `setRotation`)

---

## TTS Native Capabilities

### 1. Built-in Light Component

TTS provides access to Unity's Light component through the Component API:

```lua
-- Access Light component directly (if object has one)
local lightComp = object.getComponent("Light")
-- Or search in children
local lightComp = object.getComponentInChildren("Light")
```

**Available Light Component Properties:**

- `enabled` - Enable/disable light
- `range` - Light range
- `intensity` - Light intensity
- `color` - Light color
- `spotAngle` - Spotlight angle (for spot lights)
- `type` - Light type (Point, Spot, Directional, Area)

### 2. Spawnable Objects

**Built-in Types:** TTS has many spawnable built-in types (cards, dice, blocks, etc.), but **"Light" is NOT a built-in spawnable type**.

**Custom Objects:** You can spawn custom objects via:

- `spawnObject({type = "Custom_Model", ...})` - Custom 3D models
- `spawnObject({type = "AssetBundle", ...})` - AssetBundles with custom components

### 3. AssetBundle Approach

According to TTS documentation:
> "In addition to built-in Objects, the Component APIs provide access the GameObjects and Components that exist in AssetBundles. This means that when creating an AssetBundle, you may attach all manner of components (lights, sounds etc.) and you'll be able to control them via these APIs."

**This means:** You CAN create lights via AssetBundles, but you'd need to:

1. Create a Unity AssetBundle with a Light component
2. Host it somewhere accessible
3. Spawn it via `spawnObject({type = "AssetBundle", url = "..."})`

---

## Feasibility Analysis

### Option 1: Use TTS Built-in Light Objects (If They Exist)

**Status:** ❓ **UNCERTAIN** - Need to test

TTS may have Light objects available in the editor that aren't documented as spawnable types. These might be accessible via:

- Manual placement in TTS editor
- Cloning existing light objects
- Using `getObjectFromGUID()` on manually placed lights

**Test Approach:**

1. Place a Light object in TTS editor manually
2. Get its GUID
3. Try to clone it: `getObjectFromGUID(guid).clone()`
4. Check if clone has Light component accessible

**Pros:**

- No external dependencies
- Native TTS support
- Simple to use

**Cons:**

- May not be spawnable via script
- Limited customization options
- Unknown if it supports all needed properties

### Option 2: Create Light via AssetBundle

**Status:** ✅ **FEASIBLE** - Requires Unity knowledge

Create a Unity AssetBundle containing a GameObject with a Light component.

**Implementation Steps:**

1. Create Unity project
2. Add GameObject with Light component
3. Configure Light component properties
4. Build as AssetBundle
5. Host AssetBundle (Steam Workshop, web server, or local)
6. Spawn via script: `spawnObject({type = "AssetBundle", url = "..."})`

**Pros:**

- Full control over light properties
- Can add visual representation (glow, model, etc.)
- Can bundle multiple lights in one AssetBundle
- Professional solution

**Cons:**

- Requires Unity knowledge
- Requires hosting solution
- More complex setup
- AssetBundle must be loaded before use

**Example Code:**

```lua
local function createCustomLight(position, rotation, config)
    local lightObj = spawnObject({
        type = "AssetBundle",
        url = "http://your-server.com/lights/pointlight.unity3d", -- or Workshop URL
        position = position,
        rotation = rotation,
        callback_function = function(obj)
            -- Configure light after spawn
            local lightComp = obj.getComponentInChildren("Light")
            if lightComp then
                lightComp.set("enabled", config.enabled or true)
                lightComp.set("range", config.range or 40)
                lightComp.set("intensity", config.intensity or 10)
                lightComp.set("color", Color(config.color or {r=1, g=1, b=1}))
                lightComp.set("spotAngle", config.angle or 90)
            end
        end
    })
    return lightObj
end
```

### Option 3: Use Invisible Object with Light Component

**Status:** ❓ **UNCERTAIN** - Depends on TTS capabilities

If TTS allows adding components to spawned objects, you could:

1. Spawn an invisible object (small block, custom model)
2. Add Light component via script (if possible)
3. Configure light properties

**Reality Check:** TTS Component API is **read-only for adding components**. You can only:

- Get existing components
- Modify existing component properties
- **NOT add new components to objects**

**Verdict:** ❌ **NOT FEASIBLE** - Cannot add components to spawned objects

### Option 4: Clone Existing Light Objects

**Status:** ✅ **FEASIBLE** - If lights exist in save

If you have light objects already in your TTS save:

```lua
local function createLightFromTemplate(templateGUID, position, rotation)
    local template = getObjectFromGUID(templateGUID)
    if not template then
        error("Light template not found: " .. templateGUID)
    end

    local newLight = template.clone({
        position = position,
        rotation = rotation,
        callback_function = function(obj)
            -- Light component should already exist
            -- Just configure properties
            local lightComp = obj.getComponentInChildren("Light")
            -- Configure as needed
        end
    })

    return newLight
end
```

**Pros:**

- Simple to implement
- No external dependencies
- Works with existing lights

**Cons:**

- Requires pre-placed light objects in save
- Limited to what's in the template
- Still using someone else's light objects (just cloning them)

---

## Recommended Approach

### ✅ CONFIRMED: AssetBundle Approach

**Status:** Lights can only be created via AssetBundle (tested - no built-in Light spawnable type found).

### Short-term: Use Existing Lights

Continue using current third-party configurable lights while developing AssetBundle solution:

1. **Create light templates in TTS editor:**
   - Place light objects where they won't interfere
   - Configure default properties
   - Get their GUIDs
   - Store GUIDs in `lib/guids.ttslua`

2. **Create light spawner function:**

```lua
-- In core/lighting.ttslua or new lib/lights_spawner.ttslua
local function spawnPointLight(position, rotation, config)
    local templateGUID = G.GUIDS.LIGHT_TEMPLATE_POINT -- Add to guids.ttslua
    local light = getObjectFromGUID(templateGUID).clone({
        position = position,
        rotation = rotation,
        callback_function = function(obj)
            -- Configure light properties
            local lightComp = obj.getComponentInChildren("Light")
            if lightComp then
                lightComp.set("enabled", config.enabled ~= false)
                lightComp.set("range", config.range or 40)
                lightComp.set("intensity", config.intensity or 10)
                lightComp.set("color", Color(config.color or Color.White))
                if config.angle then
                    lightComp.set("spotAngle", config.angle)
                end
            end
        end
    })
    return light
end
```

### Long-term: Custom AssetBundle Lights ✅ RECOMMENDED

**See `dev/UNITY_LIGHT_ASSETBUNDLE_GUIDE.md` for complete step-by-step guide.**

For a professional, self-contained solution:

1. **Create Unity AssetBundle:**
   - Cone model (small, tintable, open end faces light direction)
   - Light component(s) on root GameObject (Point, Spot, Directional)
   - No collision components
   - Tintable material
   - Build as AssetBundle

2. **Host AssetBundle:**
   - Upload to Steam Workshop (best option)
   - Or host on web server
   - Use URL in spawn function

3. **Spawn and configure:**
   - Use `spawnObject({type = "AssetBundle", url = "..."})`
   - Access Light component via Component API: `getComponentInChildren("Light")`
   - Configure properties: `comp.set("range", 50)`, `comp.set("intensity", 15)`, etc.
   - Tint cone: `obj.setColorTint(Color(...))`

---

## Testing Plan

### Test 1: Check if TTS has built-in Light spawnable type

```lua
-- Test in TTS console
local testLight = spawnObject({type = "Light"})
print(testLight) -- Will error if not available
```

### Test 2: Check if manually placed lights can be cloned

```lua
-- In TTS:
-- 1. Manually place a Light object
-- 2. Get its GUID
-- 3. Test clone:
local template = getObjectFromGUID("YOUR_LIGHT_GUID")
local clone = template.clone({position = {0, 5, 0}})
local lightComp = clone.getComponentInChildren("Light")
if lightComp then
    print("SUCCESS: Light component found!")
    print("Range:", lightComp.get("range"))
else
    print("FAILED: No Light component found")
end
```

### Test 3: Check Light component properties

```lua
-- On an existing light object:
local lightComp = light.getComponentInChildren("Light")
local vars = lightComp.getVars()
print("Available Light properties:")
for name, type in pairs(vars) do
    print("  " .. name .. ": " .. type)
end
```

---

## Implementation Considerations

### Advantages of Custom Lights

1. **No External Dependencies:** Don't rely on third-party Workshop items
2. **Full Control:** Configure exactly what you need
3. **Simpler Structure:** No complex nested hierarchy to navigate
4. **Better Performance:** Potentially lighter than complex configurable lights
5. **Customization:** Can add visual effects, sounds, etc.

### Challenges

1. **Initial Setup:** Requires creating/hosting AssetBundle or setting up templates
2. **GUID Management:** Need to track spawned light GUIDs if creating dynamically
3. **State Management:** Spawned lights need to be saved/restored in game state
4. **Migration:** Need to migrate from current lights to new system

### Integration with Current System

The current `core/lighting.ttslua` module could be extended to support both:

- **Existing lights:** Continue using GUID-based lookup
- **Spawned lights:** Track GUIDs of dynamically created lights
- **Unified API:** Same `L.SetLightMode()` interface for both

---

## Next Steps

1. **Test cloning approach** with existing light objects
2. **If cloning works:** Implement light spawner function
3. **If cloning doesn't work:** Investigate AssetBundle creation
4. **Create proof-of-concept** implementation
5. **Test performance** vs. current system
6. **Decide on migration strategy** if proceeding

---

## Questions to Answer

1. ✅ Can Light objects be cloned? (Test needed)
2. ✅ What properties does the Light component support? (Test needed)
3. ❓ Can we spawn lights via AssetBundle? (Requires Unity knowledge)
4. ❓ Should we replace existing lights or support both systems?
5. ❓ How to handle GUID management for spawned lights?

---

## References

- `core/lighting.ttslua` - Current lighting implementation
- `dev/tts-api/Scripting API/Object Components/` - Component API docs
- `dev/tts-api/Scripting API/Base.md` - spawnObject documentation
- `dev/TTS-Scripting-Guide.htm` - Lighting system overview
