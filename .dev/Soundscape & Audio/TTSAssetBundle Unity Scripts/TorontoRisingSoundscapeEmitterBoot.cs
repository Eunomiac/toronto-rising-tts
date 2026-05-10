using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Optional companion to <c>TTSAssetBundleEffects</c>: Berserk’s scripts only serialize effect lists;
/// TTS may create <see cref="AudioSource"/> components after <c>Awake</c>. This component applies a
/// one-time “safe default” clamp per source (mute + volume 0 + stop) during a short bootstrap window,
/// then stops so Tabletop Simulator / Lua can raise levels without being overwritten every frame.
/// </summary>
[DefaultExecutionOrder(-5000)]
public sealed class TorontoRisingSoundscapeEmitterBoot : MonoBehaviour
{
    [SerializeField]
    [Tooltip("Also run when the object becomes active again (restarts bootstrap window).")]
    private bool m_runOnEnable = true;

    [SerializeField]
    [Tooltip("How long after spawn to keep scanning for newly created AudioSources (unscaled seconds). Match Toronto Rising loading overlay (~20s) + margin.")]
    private float m_bootstrapScanSeconds = 30f;

    [SerializeField]
    [Tooltip("If off, only Awake/OnEnable one-shot scan runs (no polling).")]
    private bool m_pollForLateAudioSources = true;

    private float m_bootstrapStartedUnscaled;
    private readonly HashSet<int> m_bootstrappedSourceInstanceIds = new HashSet<int>();

    private void Awake()
    {
        RestartBootstrapWindow();
        ScanNewAudioSourcesOnly();
    }

    private void OnEnable()
    {
        if (m_runOnEnable)
        {
            RestartBootstrapWindow();
            ScanNewAudioSourcesOnly();
        }
    }

    private void RestartBootstrapWindow()
    {
        m_bootstrapStartedUnscaled = Time.unscaledTime;
    }

    private bool IsWithinBootstrapWindow()
    {
        return Time.unscaledTime - m_bootstrapStartedUnscaled < m_bootstrapScanSeconds;
    }

    private void LateUpdate()
    {
        if (!m_pollForLateAudioSources || !IsWithinBootstrapWindow())
        {
            return;
        }

        ScanNewAudioSourcesOnly();
    }

    private void OnTransformChildrenChanged()
    {
        if (!m_pollForLateAudioSources || !IsWithinBootstrapWindow())
        {
            return;
        }

        ScanNewAudioSourcesOnly();
    }

    private void ScanNewAudioSourcesOnly()
    {
        var root = transform;
        if (root == null)
        {
            return;
        }

        var sources = root.GetComponentsInChildren<AudioSource>(true);
        if (sources == null || sources.Length == 0)
        {
            return;
        }

        for (var i = 0; i < sources.Length; i++)
        {
            var src = sources[i];
            if (src == null)
            {
                continue;
            }

            var id = src.GetInstanceID();
            if (m_bootstrappedSourceInstanceIds.Contains(id))
            {
                continue;
            }

            ApplySafeAudioDefaultsOnce(src);
            m_bootstrappedSourceInstanceIds.Add(id);
        }
    }

    private static void ApplySafeAudioDefaultsOnce(AudioSource src)
    {
        src.playOnAwake = false;
        src.volume = 0f;
        src.mute = true;
        src.spatialBlend = 0f;
        src.Stop();
    }
}
