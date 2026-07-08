# Unity (C#) vs Tabletop Simulator (Lua) — who controls audio, and when?

## Agent Routing

Read this when:
- reasoning about startup races between Unity C# bootstrap code, TTS object scripts, and Global Lua
- debugging soundscape hot-starts, emitter GUID availability, or early mute timing

Source of truth:
- `core/global_script.ttslua`
- `core/soundscape.ttslua`
- `core/soundscape_emitter_object.ttslua`
- `.dev/Soundscape & Audio/TTSAssetBundle Unity Scripts/TorontoRisingSoundscapeEmitterBoot.cs`
- Unity prefab behavior in the TTS AssetBundle project

Verification:
- TTS Save & Play with `[SoundscapeEarly]` logs enabled
- Unity Play Mode startup check for silence

This describes **two runtimes** touching the **same Unity objects** (`AudioSource`, `AssetBundle` behavior) inside a workshop **Custom AssetBundle** object. Order matters for “hot start” and for fades.

---

## Two layers

| Layer | Where code runs | Typical APIs |
|--------|-------------------|--------------|
| **Unity / C#** | Inside the Unity Player build that Tabletop Simulator hosts | `MonoBehaviour` (`Awake`, `OnEnable`, `LateUpdate`, …), `AudioSource.volume`, `GetComponentsInChildren<AudioSource>`, etc. |
| **TTS / Lua** | Inside TTS’s Lua VM, talking to Unity through **bindings** | `getObjectFromGUID`, `obj.AssetBundle.playLoopingEffect`, `source.set("volume", …)`, `Wait.time`, … |

Toronto Rising uses **both**: optional **`TorontoRisingSoundscapeEmitterBoot`** (C# on the prefab) and **`core/soundscape*.ttslua`** + emitter object scripts (Lua).

---

## Rough lifecycle when a table loads (conceptual)

Exact frame order can vary by TTS version and table complexity; treat this as **causal ordering**, not a guaranteed micro-schedule.

1. **Native load / Unity deserialize**
   TTS loads the save. Unity (inside TTS) instantiates objects, restores transforms, and may restore **serialized component state** on `AudioSource` and whatever the **TTS Asset Bundle Effects** runtime wires up. **Audio can become audible here** if the bundle or save left sources unmuted / playing — **no Lua has run yet** for this session.

2. **Unity script lifecycle on the bundle object**
   When the emitter GameObject becomes active, Unity runs **C#** on that object: **`Awake` → `OnEnable` → …** and later **`Start`**, **`LateUpdate`**, etc., according to Unity rules and **`DefaultExecutionOrder`**.
   **`TorontoRisingSoundscapeEmitterBoot`** runs here: it can only affect **`AudioSource` instances that already exist under that hierarchy** (or appear later during its **bootstrap polling window**).

3. **Global Lua script — top-level chunk**
   TTS loads the **Global** Lua file and runs it **top to bottom** (`require` chain). This is **not** `onLoad` yet. Emitters may **still** be missing from `getObjectFromGUID` (your logs showed **0/9** here), or **`Wait`** may not exist yet — so **Lua cannot always mute first**.

4. **`function onLoad(saved_data)` (Global)**
   After the chunk finishes, TTS calls **Global `onLoad`**. Toronto Rising runs **`Soundscape.bootstrapSilenceStrayEmitterLoops`**, deferred **`[SoundscapeEarly]`** passes, **`Sync.full`**, etc. By then **`Wait.time` is usually available** and **GUID lookups often succeed**.

5. **Object Lua scripts (emitters, dice bags, …)**
   Each object’s script runs when TTS loads that object’s Lua. **`onLoad` order between Global and objects is not documented** as strict “objects first” or “Global first”; assume **either** can run relative to the other until you measure. The **`require("core.soundscape_emitter_object")`** pattern registers **global `onLoad`** in the module; TTS still invokes **`onLoad` per object** with the correct **`self`**.

6. **Ongoing control**
   After load, **Lua** drives the soundscape: **`playLoopingEffect`**, **`fadeEmitterVolume`**, **`setEmitterVolume`**, etc. **C#** on the prefab uses a **finite** bootstrap window (default **~30s** unscaled: **one-time clamp per new `AudioSource` + `LateUpdate` polling**), then **stops** so Lua can run fades without the boot script fighting every frame.

---

## Responsivity (“who wins on a given frame?”)

- **Unity `LateUpdate`** runs in the **Unity player loop** for that frame, independent of when TTS schedules Lua coroutines / `Wait.time` callbacks.
- **Lua** runs when TTS’s bridge executes it — often **same frame** as some Unity updates, but **not guaranteed** to be before or after your `LateUpdate` without measuring.
- **Rule of thumb:** During the first **~0–500 ms** of a load, assume **Unity deserialize + C# `Awake`** can race **ahead of** useful Lua. After **Global `onLoad` + a few `Wait.time` ticks**, assume **Lua is authoritative** for emitter gain and effect selection.

---

## What each side can and cannot do

| Capability | Unity C# on prefab | TTS Lua |
|------------|-------------------|---------|
| Mute / volume on **existing** `AudioSource` under the prefab | Yes (`AudioSource` API) | Yes (`getComponentsInChildren` + `source.set`) |
| Call **`playLoopingEffect`** / switch named TTS effects | Only if you duplicate TTS’s internal protocol (not recommended from random C#) | Yes (`obj.AssetBundle.playLoopingEffect`) |
| Run **before** Global Lua `onLoad` | Often **yes** (`Awake` / deserialize) | **No** for `onLoad`; chunk can run before/after object registration |
| Run **before** objects exist for `getObjectFromGUID` | N/A — C# uses **Unity references** on the same prefab | Early chunk: **often no** |
| Know **`gameState.soundscape`** | No (unless you add IPC, not typical) | Yes (`S.getStateVal`, reconcile) |

---

## Practical takeaway for Toronto Rising

1. **C# bootstrap** (`TorontoRisingSoundscapeEmitterBoot`): best for **“any `AudioSource` under this prefab in the first N seconds”**, without `require` or GUIDs.
2. **Lua early GUID pass + `Soundscape.bootstrapSilenceStrayEmitterLoops` + emitter `require`**: best for **`playLoopingEffect("silent")`** and alignment with **saved game state**.
3. **Design the AssetBundle** so idle defaults are not loud (see **`SOUNDSCAPE_ASSETBUNDLE_AUDIO_INIT.md`**) — that reduces damage **before** either script runs.

---

## Can Unity C# and TTS Lua share a flag or signal?

**Not through a documented shared memory channel** for normal workshop / modding workflows.

| Mechanism | What it connects |
|-----------|------------------|
| **`obj.getVar` / `obj.setVar`**, **`Global.getVar` / `Global.setVar`**, **`getTable` / `setTable`** | **Lua ↔ Lua** variables on that entity’s **Lua script** (Object or Global). See [Object API — Global Function](https://api.tabletopsimulator.com/object/). |
| **`obj.call` / `Global.call`** | **Lua → Lua** function calls across entities. |
| **`obj.AssetBundle.*`, `AudioSource.set`, …** | **Lua → Unity** (TTS bindings into the hosted Unity player). |

Your **`TorontoRisingSoundscapeEmitterBoot`** C# runs as **ordinary Unity `MonoBehaviour`** code on the bundle. Tabletop Simulator does **not** document a way for that C# to **write** into `getVar`/`setVar` storage or to **invoke** Lua. Likewise Lua cannot **read** private C# fields or subscribe to C# events on your script.

**Practical coordination** (what Toronto Rising already does):

- **Time- and convention-based**: finite C# bootstrap window, then Lua owns gain and `playLoopingEffect`.
- **Lua-only flags** (e.g. `gameState`, or `self.setVar` on an object that has a **Lua** tab): useful **between Lua scripts**, not for Unity to trip.
- **Avoid hacks** (e.g. inferring state from transform/physics): fragile and hard to reason about.

If Berserk or TTS ever exposed an official **C# → Lua** hook for custom bundles, it would be version-specific; until then, treat the two layers as **loosely coupled by timing and API calls from Lua into Unity**, not a shared flag store.

### `Global.setVar` handoff (Lua only) — **not** an earlier mute

**Lua cannot run before TTS runs Lua.** If Unity / save restore already has **audible** `AudioSource` output in the first frames, **no amount of Lua polling** (or `Global.setVar` signaling) will beat that race — the same limitation you hit with “too early (0 GUIDs)” vs “too late (already loud for 20–30s).”

A **`Global.setVar` + emitter Lua** pattern is only useful for **coordination after** both sides exist: e.g. **when to stop** an *optional* Lua-side mute loop so it does not fight intentional fades — **not** as a substitute for **Unity-side** mitigation (prefab defaults, `TorontoRisingSoundscapeEmitterBoot`, quiet clips) for the **initial** burst.

**Caveat:** `Global.setVar` values must be **JSON-serializable** per TTS rules (booleans are fine). Clear the flag on `onSave`/`onLoad` if you need strict reset semantics between sessions.

---

## Related files

- Lua: `core/global_script.ttslua` (`[load+…s]` timestamp prefix on `[SoundscapeEarly]` / `Startup step:` / key `onLoad` lines — `os.clock()` since first early soundscape pass; `[SoundscapeEarly]`, `SS.bootstrapSilenceStrayEmitterLoops`), `core/soundscape.ttslua`, `core/soundscape_emitter_object.ttslua`
- Unity (reference in repo): `.dev/Soundscape & Audio/TTSAssetBundle Unity Scripts/TorontoRisingSoundscapeEmitterBoot.cs`
