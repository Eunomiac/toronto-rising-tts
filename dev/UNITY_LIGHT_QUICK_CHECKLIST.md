# Unity Light AssetBundle - Quick Checklist

**Quick reference for creating TTS light AssetBundle in Unity**

---

## Setup (One-Time)

- [ ] Unity 2019.4 LTS installed
- [ ] New 3D project created
- [ ] Project Settings → Player → API Compatibility: `.NET Standard 2.0`
- [ ] Build Settings → Platform: `PC, Mac & Linux Standalone` → `Windows x86_64`

---

## Create Light Object

- [ ] **GameObject → 3D Object → Cone**
  - Rename: `LightCone`
  - Rotation: `(180, 0, 0)` (open end faces down)
  - Scale: `(0.2, 0.3, 0.2)` (small indicator size)

- [ ] **GameObject → Create Empty**
  - Rename: `TTS_Light`
  - Position: `(0, 0, 0)`
  - Make `LightCone` a child of `TTS_Light`

---

## Add Light Components

- [ ] Select `TTS_Light` (root, not cone)
- [ ] **Component → Rendering → Light**
  - Type: `Point`
  - Range: `40`
  - Intensity: `10`
  - Color: `White`
  - Shadows: `No Shadows`
  - ✅ **Enabled**

- [ ] **Component → Rendering → Light** (optional - for Spot)
  - Type: `Spot`
  - Spot Angle: `90`
  - ❌ **Disabled** (enable via script)

- [ ] **Component → Rendering → Light** (optional - for Directional)
  - Type: `Directional`
  - ❌ **Disabled** (enable via script)

---

## Material & Visual

- [ ] **Assets → Create → Material**
  - Name: `LightConeMaterial`
  - Shader: `Standard` or `Unlit/Color`
  - Albedo/Color: `White (1, 1, 1, 1)`

- [ ] Select `LightCone` → Mesh Renderer → Materials → Drag `LightConeMaterial`

---

## Remove Collision

- [ ] Select `LightCone` → Remove **Mesh Collider** (if present)
- [ ] Select `TTS_Light` → Verify NO colliders present

---

## Build AssetBundle

- [ ] Select `TTS_Light` in Hierarchy
- [ ] Inspector bottom → AssetBundle: `New...` → Name: `ttslight` (lowercase)

- [ ] **Window → AssetBundle Browser** (or use build script)
  - Output: `Assets/AssetBundles`
  - Build Target: `StandaloneWindows64`
  - Compression: `No Compression`
  - Click **Build**

- [ ] Locate file: `Assets/AssetBundles/ttslight` (no extension)

---

## Test in TTS

```lua
-- Spawn test
local light = spawnObject({
    type = "AssetBundle",
    url = "http://yourserver.com/ttslight", -- or Workshop URL
    position = {0, 5, 0},
    callback_function = function(obj)
        local comp = obj.getComponentInChildren("Light")
        if comp then
            print("SUCCESS! Range:", comp.get("range"))
        end
    end
})
```

---

## Size Reference

**TTS Units:** 1 Unity unit ≈ 1 inch

**Recommended Scales:**
- Small: `(0.1, 0.2, 0.1)` - Subtle indicator
- Medium: `(0.2, 0.3, 0.2)` - Visible but not intrusive
- Large: `(0.3, 0.5, 0.3)` - Prominent, good for testing

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Light component not found | Check it's on root GameObject, try `getComponent("Light")` |
| Cone not visible | Check material applied, verify scale, check rotation |
| Light doesn't work | Set `enabled=true`, check `intensity > 0`, verify `range` |
| AssetBundle won't load | Verify URL accessible, check build target, try uncompressed |

---

**See `dev/UNITY_LIGHT_ASSETBUNDLE_GUIDE.md` for detailed instructions.**

