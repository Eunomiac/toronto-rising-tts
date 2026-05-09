# Soundscape AssetBundle — quiet initialization (Unity)

Tabletop Simulator restores workshop objects from the save **before** Global Lua can mute emitters. Anything “hot” in the prefab (Play On Awake, loud default volume, autoplay in `Start`) can produce **full-volume audio for a frame or longer**. This note complements Lua-side bootstrapping (`core/global_script.ttslua`, `core/soundscape_emitter_object.ttslua`): fix the **prefab defaults** so Unity never starts loud.

Use the same Unity version as `SOUNDSCAPE_UNITY_SETUP.md` (currently Unity `6000.0.62f1` per that doc).

---

## 1. Per `AudioSource` (Inspector)

For **every** `AudioSource` under the soundscape prefab (including children):

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

---

## 4. Align with the `"silent"` looping effect

Lua expects a **Looping Effect** named **`silent`** (see `lib/soundscape_catalog.ttslua` / `Catalog.SILENT_EFFECT`). That clip should be **actually silent** (or effectively silent), so when TTS calls `playLoopingEffect` for `silent`, players hear nothing until real tracks fade in.

---

## 5. AudioMixer (only if you use one)

If sources route through an **Audio Mixer**:

- Prefer a **default snapshot** where soundscape groups are at **−80 dB** or routed to a **muted** group, until gameplay raises them.
- Avoid a snapshot that applies **on load** of the mixer unless it matches “all silent”.

---

## 6. Verify

1. **Unity:** Enter Play Mode with the prefab instantiated — you should hear **nothing** until you manually test playback.
2. **TTS:** Save & Play — audio should stay down until reconcile / intentional playback; combine with console lines prefixed **`[SoundscapeEarly]`** to confirm Lua timing vs Unity.

If burst persists **before any Lua log**, the clip or mixer is still auto-playing at the Unity layer — revisit sections 1–5.
