# TTS Asset Bundle Unity Scripts (reference copy)

Files here are **reference copies** for Toronto Rising documentation and optional **Unity-side** helpers.

- **`TTSAssetBundleEffects.cs`** / **`TTSAssetBundleSounds.cs`** — Match the Berserk Games [Tabletop-Simulator-Modding](https://github.com/Berserk-Games/Tabletop-Simulator-Modding) **Inspector schema** (`LoopingEffects`, `TriggerEffects`, etc.). They define **data only**; **no playback code**. Tabletop Simulator’s **closed-source** runtime reads this data when the bundle loads and drives `AudioSource` / effects APIs.

- **`TorontoRisingSoundscapeEmitterBoot.cs`** — **Optional** component you can add **alongside** `TTS Asset Bundle Effects` on `TR_Soundscape_Bundle`. It clamps each `AudioSource` **once** (mute, volume 0, `Stop`) the first time it appears, and for **`m_bootstrapScanSeconds`** (default **30s** unscaled, aligned with loading overlay timing) it **polls** in `LateUpdate` plus **`OnTransformChildrenChanged`** so late-created sources are caught. Polling then stops so Lua can drive volume without being overwritten every frame. Tune or disable polling via the Inspector fields.

For clip import / `silent` loop authoring, see **`../SOUNDSCAPE_ASSETBUNDLE_AUDIO_INIT.md`**.

## Adding `TorontoRisingSoundscapeEmitterBoot` in Unity

1. Copy **`TorontoRisingSoundscapeEmitterBoot.cs`** into your TTS modding Unity project (same assembly as your other scripts, e.g. under `Assets/Scripts/` or your preferred folder).
2. Select the **emitter root** GameObject (e.g. `TR_Soundscape_Bundle`) that already has **TTS Asset Bundle Effects**.
3. **Add Component →** search **Toronto Rising Soundscape Emitter Boot** (class name `TorontoRisingSoundscapeEmitterBoot`).
4. **No extra wiring** — no references to drag; optional Inspector tweaks only:
   - **`m_bootstrapScanSeconds`** — polling duration (default 30).
   - **`m_pollForLateAudioSources`** — turn off to keep only `Awake`/`OnEnable` one-shot.
   - **`m_runOnEnable`** — re-run bootstrap when the object is re-enabled.
5. **Rebuild the AssetBundle** and update the workshop / Save & Play as you already do for bundle changes.

**Official Berserk scripts:** Leave **`TTSAssetBundleEffects`** / **`TTSAssetBundleSounds`** in your Unity project **identical to Berserk’s originals** if you prefer. The copies in **this repo** only add short **header comments** at the top — they are not required for the boot component. The boot script is **separate** and does not modify Berserk types.
