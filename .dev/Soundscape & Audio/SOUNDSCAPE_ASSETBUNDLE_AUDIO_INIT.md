# Soundscape AssetBundle — quiet initialization (Unity)

## Agent Routing

Read this when:
- debugging audio that plays before Lua can mute or reconcile the soundscape
- changing Unity prefab defaults, `silent` loop setup, import loudness, or the optional Unity boot component

Source of truth:
- Unity prefab and AssetBundle settings for `TR_Soundscape_Bundle`
- `.dev/Soundscape & Audio/TTSAssetBundle Unity Scripts/TorontoRisingSoundscapeEmitterBoot.cs`
- `core/global_script.ttslua`
- `core/soundscape.ttslua`
- `core/soundscape_emitter_object.ttslua`

Verification:
- Unity Play Mode should start silent
- TTS Save & Play should remain silent until Lua intentionally starts playback
- inspect `[SoundscapeEarly]` logs for Lua timing

Tabletop Simulator restores workshop objects from the save **before** Global Lua can mute emitters. Anything “hot” in the prefab (Play On Awake, loud default volume, autoplay in `Start`) can produce **full-volume audio for a frame or longer**. This note complements Lua-side bootstrapping (`core/global_script.ttslua`, `core/soundscape_emitter_object.ttslua`): fix the **prefab defaults** so Unity never starts loud.

Use the same Unity version as `SOUNDSCAPE_UNITY_SETUP.md` (currently Unity `6000.0.62f1` per that doc).

For **how Unity C# vs TTS Lua share control, load order, and races**, see **`UNITY_VS_TTS_AUDIO_LIFECYCLE.md`** in this folder.

---

## 0. “I only see **TTS Asset Bundle Effects** — no `AudioSource`”

That is normal for the **Berserk Games Tabletop Simulator Modding** workflow.

- Audio is **authored as effect entries** on **`TTS Asset Bundle Effects` (`TTSAssetBundleEffects`)**: **Looping Effects** and **Trigger Effects** lists. Each entry has a **Sound** block (Audio clip, **Positional 3D**, duration, etc.). There is often **no separate `AudioSource` component** on the root in the Inspector — TTS / the bundle runtime typically **creates or wires internal `AudioSource`s** when the object runs in-game. Toronto Rising Lua still finds those at runtime with `getComponentsInChildren("AudioSource")` in many builds, but **you do not tune them as standalone components** in this template UI.

**What to do in Unity anyway:**

1. **Hierarchy depth** — Expand the prefab’s **children** (if any). If a child has a plain **`AudioSource`**, apply [§1](#1-per-audiosource-inspector) there too.
2. **Authoring surface** — You are editing **effect rows**, not raw sources. Keep **non-positional** soundscape layers: **Positional 3D** off (matches Lua `spatialBlend = 0`).
3. **Default / first loop** — Ensure your **`silent`** looping effect (see [§4](#4-align-with-the-silent-looping-effect)) is a **truly silent clip** and is the loop TTS should sit on when idle. If the template or save restores “last played” loop before Lua runs, the **wrong** looping row will blast until Lua swaps to `silent`.
4. **Template limits** — If the Inspector only shows **Audio** + **Positional 3D** and no per-effect volume, **per-clip loudness** is the main knob in-editor (normalize / attenuate in your DAW, or use quieter imports). For anything else (auto-play on enable, default effect index), read **`TTSAssetBundleEffects`** in the modding project:
   [Tabletop-Simulator-Modding](https://github.com/Berserk-Games/Tabletop-Simulator-Modding) — search the repo for `TTSAssetBundleEffects` / `TTS Asset Bundle Effects` and inspect the script fields and runtime behavior.

Effect authoring steps (names, looping vs trigger) stay aligned with **`SOUNDSCAPE_UNITY_SETUP.md`** §6–7.

---

## 1. Per `AudioSource` (Inspector)

For **every** `AudioSource` you can find under the soundscape prefab (including children). **Skip** if the hierarchy truly has none and you are 100% on the TTS template-only path ([§0](#0-i-only-see-tts-asset-bundle-effects--no-audiosource)) — then lean on **silent loop + clip levels** and the optional boot script ([§3](#3-optional-small-bootstrap-script-belt-and-suspenders)).

| Setting | Recommended |
|--------|-------------|
| **Play On Awake** | **Off** |
| **Volume** | **0** |
| **Mute** | Optional **On** for extra safety (see note below) |
| **Spatial Blend** | **0** (full 2D), matching non-positional soundscape Lua |
| **Loop** | Set per clip role (looping ambience vs one-shots) |

**Mute vs volume:** Toronto Rising Lua eventually calls TTS `AudioSource.set("mute", false)` when applying non-zero gain (`core/soundscape.ttslua`). Starting **muted** is fine if you always expect Lua to drive levels; if you prefer “unmuted but volume 0”, leave **Mute** off and rely on **Volume = 0**.

Do **not** rely on “we’ll fix it in Lua only” — TTS can deserialize saved component state; stable **prefab defaults** reduce surprises after save/load.

---

## 2. Avoid implicit playback

- Do **not** call `Play()`, `PlayOneShot()`, or mixer snapshots that unmute in **`Awake` / `Start` / `OnEnable`** unless you intend idle playback.
- If you use **Timeline**, **Animator**, or third-party scripts that trigger audio on enable, disable those paths until TTS selects an effect, or gate them behind a flag that stays false until an explicit event from your bundle API (if any).

---

## 3. Optional: small bootstrap script (belt and suspenders)

If anything in the hierarchy might flip sources at runtime during instantiate, add a root `MonoBehaviour` that forces safe defaults **once** when the object wakes:

```csharp
using UnityEngine;

public sealed class TtsSoundscapeAudioBoot : MonoBehaviour
{
    private void Awake()
    {
        foreach (var src in GetComponentsInChildren<AudioSource>(true))
        {
            src.playOnAwake = false;
            src.volume = 0f;
            src.spatialBlend = 0f;
            src.Stop();
            // Optional: src.mute = true;
        }
    }
}
```

Attach this to the **root** of the AssetBundle prefab TTS spawns. Keep it minimal — no gameplay logic, only deterministic silence at boot.

**Repo copy:** `TTSAssetBundle Unity Scripts/TorontoRisingSoundscapeEmitterBoot.cs` — `[DefaultExecutionOrder(-5000)]`, one-time safe defaults per **new** `AudioSource` under the prefab root, plus a **polling window** (`m_bootstrapScanSeconds`, default **30s** unscaled) in `LateUpdate` and `OnTransformChildrenChanged` so sources TTS creates **after** `Awake` still get clamped once. Polling then stops so Lua is not fought on every frame. Add **Add Component → Toronto Rising Soundscape Emitter Boot** on `TR_Soundscape_Bundle` alongside `TTS Asset Bundle Effects`.

---

## 4. Align with the `"silent"` looping effect

Lua expects a **Looping Effect** named **`silent`** (see `lib/soundscape_catalog.ttslua` / `Catalog.SILENT_EFFECT`). That clip should be **actually silent** (or effectively silent), so when TTS calls `playLoopingEffect` for `silent`, players hear nothing until real tracks fade in.

Keep **`silent`** as **Looping Effects → Element 0** if the template’s default / first loop is ever index **0** on a cold instance. Your setup already matches that pattern (`silent` + `Silence` clip).

---

## 5. What you can still do with **only** clip Import Settings + `TTS Asset Bundle Effects` + Hierarchy

This matches the three surfaces you have (no per-effect volume in the TTS component).

### A. Audio clip **Import Settings** (select the `.wav` / clip in the **Project** window)

These do **not** replace Lua’s `silent` swap, but they reduce surprises:

| Control | Why it can help |
|--------|------------------|
| **Perceived loudness** | There is no volume slider on each effect row — **loud “hot start” is often just a loud clip**. Normalize / limit in a **DAW**, re-export, or use **Force To Mono** + **Normalize** in Unity import where applicable so no single ambience track jumps above the pack. |
| **`Silence` clip** | Re-import a **true digital silence** file (or a few ms of silence with a tiny fade-in) so the `silent` loop never clicks or spikes from DC / file edge. |
| **Load Type** | **Streaming** (as in your screenshot) is fine for long music; if you ever hear a **decode / buffer pop** on first play, try **Decompress On Load** or **Compressed In Memory** for *that* clip and compare in TTS (trade-off: memory). |
| **Preload Audio Data** | Off avoids loading the whole decode at import time; it does **not** stop TTS from **playing** a saved loop. Turning it **On** can sometimes smooth first playback after load — **worth an A/B test**, not a guaranteed fix for “wrong loop at full level”. |

The **AssetBundle** dropdown on the clip (often **None** while authoring) only controls which bundle packs the asset at build time — it does not by itself fix resume-before-Lua.

### B. **`TTS Asset Bundle Effects`** (root `TR_Soundscape_Bundle`)

- **Positional 3D** — Keep **off** for every soundscape row (you already do); avoids extra spatial gain quirks.
- **Trigger vs looping** — One-shots only in **Trigger Effects**; long beds in **Looping Effects** so TTS never treats a 3‑minute bed like a fire-and-forget trigger.
- **No volume field** — Treat **clip RMS** and **silence** quality as the main authoring levers until you read `TTSAssetBundleEffects` for any hidden gain (see [§0](#0-i-only-see-tts-asset-bundle-effects--no-audiosource)).

### C. **Hierarchy** (`TR_Soundscape_Bundle` → `DebugMarker`, root `Spot Light`)

- Select **`DebugMarker`**: confirm it has **no** `AudioSource`, `AudioListener`, or stray script that plays audio.
- **`Spot Light`** at scene root: harmless for audio unless you attached something odd.

### D. Honest ceiling

If Tabletop Simulator **deserializes and resumes the last looping effect** from a save **before** Lua runs, **Unity import tweaks alone cannot force “always silent first”** — you need either the **`silent`** swap from Lua (already in the mod) or a change inside **`TTSAssetBundleEffects`** / Unity prefab startup if Berserk’s script exposes a “default loop index” or similar. The steps above **mitigate** (quieter clips, clean silence, no extra components) rather than guarantee order.

---

## 6. AudioMixer (only if you use one)

If sources route through an **Audio Mixer**:

- Prefer a **default snapshot** where soundscape groups are at **−80 dB** or routed to a **muted** group, until gameplay raises them.
- Avoid a snapshot that applies **on load** of the mixer unless it matches “all silent”.

---

## 7. Verify

1. **Unity:** Enter Play Mode with the prefab instantiated — you should hear **nothing** until you manually test playback.
2. **TTS:** Save & Play — audio should stay down until reconcile / intentional playback; combine with console lines prefixed **`[SoundscapeEarly]`** to confirm Lua timing vs Unity.

If burst persists **before any Lua log**, the clip or mixer is still auto-playing at the Unity layer — revisit sections 1–6 and the ceiling note in [§5](#5-what-you-can-still-do-with-only-clip-import-settings--tts-asset-bundle-effects--hierarchy).
