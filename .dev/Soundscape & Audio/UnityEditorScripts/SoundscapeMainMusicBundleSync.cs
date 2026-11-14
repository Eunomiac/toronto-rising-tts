// Copy into your TTS modding Unity project under an `Editor/` folder
// (e.g. Assets/Editor/TorontoRising/SoundscapeMainMusicBundleSync.cs).
// Unity 6000.x + UnityEditor.
//
// Menu: Tools → Toronto Rising → Sync Main Music Into Prefabs
//
// Expects Audition-exported .wav files (sound-matched / faded). Applies Main
// playlist import defaults, measures duration from each AudioClip, and upserts
// Trigger Effects on the paired prefabs (non-managed effects are preserved).

#if UNITY_EDITOR

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEngine;

/// <summary>
/// Sync Audition-exported Main playlist WAVs into TTS Asset Bundle Effects prefabs.
/// </summary>
public static class SoundscapeMainMusicBundleSync
{
    // -------------------------------------------------------------------------
    // Configuration — edit these paths for your Unity project layout.
    // Pair folders and prefabs by index (folder[0] → prefab[0], etc.).
    // Use two folder/prefab pairs to stay under Steam Cloud's ~300 MB upload limit.
    // -------------------------------------------------------------------------
    private static class Config
    {
        /// <summary>
        /// Project-relative folders that contain Main playlist .wav files.
        /// Example split: MusicMainA on one AssetBundle, MusicMainB on another.
        /// </summary>
        public static readonly string[] AudioFolders =
        {
            "Assets/Soundscape/Audio/Music/Main 1",
            "Assets/Soundscape/Audio/Music/Main 2",
        };

        /// <summary>
        /// Prefab asset paths aligned with <see cref="AudioFolders"/> (same index).
        /// Each prefab must already have a TTSAssetBundleEffects component.
        /// </summary>
        public static readonly string[] PrefabPaths =
        {
            "Assets/Soundscape/Prefabs/TR Soundscape Music A.prefab",
            "Assets/Soundscape/Prefabs/TR Soundscape Music B.prefab",
        };

        /// <summary>
        /// How to derive the TTS effect Name (and future Lua catalog key) from the file name.
        /// PlagueTalePtCode: PT_12_Title.wav / PT_5A_….wav → pt12 / pt5A
        /// FileStemSanitized: strip extension, collapse odd characters → lowerCamel-ish token
        /// </summary>
        public static readonly EffectNameMode NameMode = EffectNameMode.PlagueTalePtCodeThenStem;

        /// <summary>Background Main music: Streaming, no preload (see Audio Tracks.md).</summary>
        public static readonly AudioClipLoadType LoadType = AudioClipLoadType.Streaming;

        /// <summary>Leave Unity default compression (usually Vorbis for standalone).</summary>
        public static readonly bool ForceCompressionFormat = false;

        public static readonly AudioCompressionFormat CompressionFormat = AudioCompressionFormat.Vorbis;

        /// <summary>Only used when ForceCompressionFormat is true (0–1).</summary>
        public static readonly float CompressionQuality = 0.7f;

        public static readonly bool Positional3D = false;

        /// <summary>
        /// When true, Trigger Effects whose names appear in this sync are replaced;
        /// other Trigger Effects (session starters, featured, etc.) are kept.
        /// When false, the Trigger Effects list is rebuilt entirely from the folder.
        /// </summary>
        public static readonly bool PreserveUnmanagedTriggerEffects = true;

        /// <summary>
        /// Optional CSV written next to the Assets folder for Lua / Audio Tracks.md.
        /// Columns: effect_name, file, folder_index, duration_seconds, duration_mmss, playlist
        /// </summary>
        public static readonly string ManifestCsvRelativeToProject =
            "Soundscape_Main_Music_Manifest.csv";
    }

    public enum EffectNameMode
    {
        PlagueTalePtCodeThenStem,
        FileStemSanitized,
    }

    private const string ComponentTypeName = "TTSAssetBundleEffects";
    private static readonly string[] AudioExtensions = { ".wav" };

    [MenuItem("Tools/Toronto Rising/Sync Main Music Into Prefabs")]
    private static void SyncFromConfig()
    {
        if (Config.AudioFolders == null || Config.AudioFolders.Length == 0)
        {
            Debug.LogError("[SoundscapeMainMusicBundleSync] Config.AudioFolders is empty.");
            return;
        }

        if (Config.PrefabPaths == null || Config.PrefabPaths.Length != Config.AudioFolders.Length)
        {
            Debug.LogError(
                "[SoundscapeMainMusicBundleSync] Config.PrefabPaths must have the same length as Config.AudioFolders.");
            return;
        }

        var allRows = new List<ManifestRow>();
        var errors = 0;

        for (var i = 0; i < Config.AudioFolders.Length; i++)
        {
            var folder = NormalizeAssetPath(Config.AudioFolders[i]);
            var prefabPath = NormalizeAssetPath(Config.PrefabPaths[i]);
            try
            {
                var rows = SyncOneBundle(folder, prefabPath, i);
                allRows.AddRange(rows);
            }
            catch (Exception ex)
            {
                errors++;
                Debug.LogError(
                    "[SoundscapeMainMusicBundleSync] Failed folder index " + i + " (" + folder + " → " + prefabPath +
                    "): " + ex.Message + "\n" + ex);
            }
        }

        WriteManifest(allRows);
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();

        Debug.Log(
            "[SoundscapeMainMusicBundleSync] Done. Tracks=" + allRows.Count +
            " errors=" + errors +
            " manifest=" + Config.ManifestCsvRelativeToProject +
            "\nAll entries are Trigger Effects for the Main background playlist." +
            " Durations came from AudioClip.length (Audition .wav exports).");
    }

    [MenuItem("Tools/Toronto Rising/Apply Main Music Import Settings Only")]
    private static void ApplyImportSettingsOnly()
    {
        if (Config.AudioFolders == null || Config.AudioFolders.Length == 0)
        {
            Debug.LogError("[SoundscapeMainMusicBundleSync] Config.AudioFolders is empty.");
            return;
        }

        var changed = 0;
        foreach (var folder in Config.AudioFolders)
        {
            var normalized = NormalizeAssetPath(folder);
            if (!AssetDatabase.IsValidFolder(normalized))
            {
                Debug.LogWarning("[SoundscapeMainMusicBundleSync] Missing folder: " + normalized);
                continue;
            }

            foreach (var path in FindWavAssetPaths(normalized))
            {
                if (ApplyMusicImportSettings(path))
                {
                    changed++;
                }
            }
        }

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("[SoundscapeMainMusicBundleSync] Import settings applied to " + changed + " .wav file(s).");
    }

    private static List<ManifestRow> SyncOneBundle(string audioFolder, string prefabPath, int folderIndex)
    {
        if (!AssetDatabase.IsValidFolder(audioFolder))
        {
            throw new InvalidOperationException("Audio folder not found: " + audioFolder);
        }

        var prefabRoot = PrefabUtility.LoadPrefabContents(prefabPath);
        if (prefabRoot == null)
        {
            throw new InvalidOperationException("Could not load prefab: " + prefabPath);
        }

        try
        {
            var effectsType = FindComponentType();
            if (effectsType == null)
            {
                throw new InvalidOperationException(
                    "Could not find type " + ComponentTypeName +
                    ". Is the Berserk TTSAssetBundleEffects script in this project?");
            }

            var effects = prefabRoot.GetComponent(effectsType) as Component;
            if (effects == null)
            {
                effects = prefabRoot.GetComponentInChildren(effectsType, true) as Component;
            }

            if (effects == null)
            {
                throw new InvalidOperationException(
                    "Prefab is missing " + ComponentTypeName + ": " + prefabPath);
            }

            var clips = new List<(string path, AudioClip clip, string effectName)>();
            foreach (var path in FindWavAssetPaths(audioFolder))
            {
                ApplyMusicImportSettings(path);
                var clip = AssetDatabase.LoadAssetAtPath<AudioClip>(path);
                if (clip == null)
                {
                    Debug.LogWarning("[SoundscapeMainMusicBundleSync] Skipping (not an AudioClip): " + path);
                    continue;
                }

                var effectName = DeriveEffectName(Path.GetFileNameWithoutExtension(path));
                if (string.IsNullOrEmpty(effectName))
                {
                    Debug.LogWarning("[SoundscapeMainMusicBundleSync] Could not derive effect name for: " + path);
                    continue;
                }

                clips.Add((path, clip, effectName));
            }

            clips = clips
                .OrderBy(c => c.effectName, StringComparer.OrdinalIgnoreCase)
                .ToList();

            // Detect duplicate effect names within this folder.
            var dupes = clips.GroupBy(c => c.effectName, StringComparer.Ordinal)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();
            if (dupes.Count > 0)
            {
                throw new InvalidOperationException(
                    "Duplicate effect names in " + audioFolder + ": " + string.Join(", ", dupes));
            }

            ApplyTriggerEffects(effects, clips);

            PrefabUtility.SaveAsPrefabAsset(prefabRoot, prefabPath);

            var rows = new List<ManifestRow>(clips.Count);
            foreach (var entry in clips)
            {
                var seconds = entry.clip.length;
                rows.Add(new ManifestRow
                {
                    EffectName = entry.effectName,
                    File = Path.GetFileName(entry.path),
                    AssetPath = entry.path,
                    FolderIndex = folderIndex,
                    AudioFolder = audioFolder,
                    PrefabPath = prefabPath,
                    DurationSeconds = seconds,
                    Playlist = "main",
                    EffectList = "trigger",
                });
            }

            Debug.Log(
                "[SoundscapeMainMusicBundleSync] Synced " + clips.Count +
                " Main Trigger Effects → " + prefabPath +
                " from " + audioFolder);
            return rows;
        }
        finally
        {
            PrefabUtility.UnloadPrefabContents(prefabRoot);
        }
    }

    private static void ApplyTriggerEffects(
        Component effectsComponent,
        List<(string path, AudioClip clip, string effectName)> clips)
    {
        var so = new SerializedObject(effectsComponent);
        var triggerProp = so.FindProperty("TriggerEffects");
        if (triggerProp == null || !triggerProp.isArray)
        {
            throw new InvalidOperationException(
                "Could not find TriggerEffects array on " + effectsComponent.GetType().Name);
        }

        var managedNames = new HashSet<string>(
            clips.Select(c => c.effectName),
            StringComparer.Ordinal);

        var kept = new List<SerializedPropertySnapshot>();
        if (Config.PreserveUnmanagedTriggerEffects)
        {
            for (var i = 0; i < triggerProp.arraySize; i++)
            {
                var element = triggerProp.GetArrayElementAtIndex(i);
                var nameProp = element.FindPropertyRelative("Name");
                var name = nameProp != null ? nameProp.stringValue : null;
                if (string.IsNullOrEmpty(name) || managedNames.Contains(name))
                {
                    continue;
                }

                kept.Add(SerializedPropertySnapshot.From(element));
            }
        }

        triggerProp.ClearArray();

        var writeIndex = 0;
        foreach (var snapshot in kept)
        {
            triggerProp.InsertArrayElementAtIndex(writeIndex);
            snapshot.WriteTo(triggerProp.GetArrayElementAtIndex(writeIndex));
            writeIndex++;
        }

        foreach (var entry in clips)
        {
            triggerProp.InsertArrayElementAtIndex(writeIndex);
            var element = triggerProp.GetArrayElementAtIndex(writeIndex);
            ClearNestedLists(element);

            var nameProp = element.FindPropertyRelative("Name");
            if (nameProp != null)
            {
                nameProp.stringValue = entry.effectName;
            }

            var durationProp = element.FindPropertyRelative("Duration");
            if (durationProp != null)
            {
                durationProp.floatValue = Mathf.Max(0.01f, entry.clip.length);
            }

            var soundProp = element.FindPropertyRelative("Sound");
            if (soundProp != null)
            {
                var audioProp = soundProp.FindPropertyRelative("Audio");
                if (audioProp != null)
                {
                    audioProp.objectReferenceValue = entry.clip;
                }

                var positionalProp = soundProp.FindPropertyRelative("Positional3D");
                if (positionalProp != null)
                {
                    positionalProp.boolValue = Config.Positional3D;
                }
            }

            writeIndex++;
        }

        so.ApplyModifiedPropertiesWithoutUndo();
        EditorUtility.SetDirty(effectsComponent);
    }

    private static void ClearNestedLists(SerializedProperty element)
    {
        foreach (var listName in new[] { "GameObjects", "Particles" })
        {
            var list = element.FindPropertyRelative(listName);
            if (list != null && list.isArray)
            {
                list.ClearArray();
            }
        }
    }

    private static bool ApplyMusicImportSettings(string assetPath)
    {
        var importer = AssetImporter.GetAtPath(assetPath) as AudioImporter;
        if (importer == null)
        {
            return false;
        }

        var settings = importer.defaultSampleSettings;
        var dirty = false;

        if (settings.loadType != Config.LoadType)
        {
            settings.loadType = Config.LoadType;
            dirty = true;
        }

        if (Config.ForceCompressionFormat && settings.compressionFormat != Config.CompressionFormat)
        {
            settings.compressionFormat = Config.CompressionFormat;
            dirty = true;
        }

        if (Config.ForceCompressionFormat &&
            !Mathf.Approximately(settings.quality, Config.CompressionQuality))
        {
            settings.quality = Config.CompressionQuality;
            dirty = true;
        }

        // Streaming Main tracks must not preload the whole playlist into memory.
        try
        {
            var preloadProp = typeof(AudioImporter).GetProperty("preloadAudioData");
            if (preloadProp != null && preloadProp.CanRead && preloadProp.CanWrite)
            {
                var current = (bool)preloadProp.GetValue(importer, null);
                if (current)
                {
                    preloadProp.SetValue(importer, false, null);
                    dirty = true;
                }
            }
        }
        catch
        {
            // Unity version without writable preloadAudioData — Streaming load type is enough.
        }

        if (!dirty)
        {
            return false;
        }

        importer.defaultSampleSettings = settings;
        importer.SaveAndReimport();
        return true;
    }

    private static List<string> FindWavAssetPaths(string folder)
    {
        var guids = AssetDatabase.FindAssets("t:AudioClip", new[] { folder });
        var paths = new List<string>(guids.Length);
        foreach (var guid in guids)
        {
            var path = AssetDatabase.GUIDToAssetPath(guid);
            if (string.IsNullOrEmpty(path))
            {
                continue;
            }

            var ext = Path.GetExtension(path);
            if (!AudioExtensions.Any(e => e.Equals(ext, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            paths.Add(path.Replace("\\", "/"));
        }

        paths.Sort(StringComparer.OrdinalIgnoreCase);
        return paths;
    }

    private static string DeriveEffectName(string fileStem)
    {
        if (string.IsNullOrWhiteSpace(fileStem))
        {
            return null;
        }

        if (Config.NameMode == EffectNameMode.PlagueTalePtCodeThenStem)
        {
            var pt = TryParsePlagueTaleCode(fileStem);
            if (!string.IsNullOrEmpty(pt))
            {
                return pt;
            }
        }

        return SanitizeStem(fileStem);
    }

    private static string TryParsePlagueTaleCode(string fileStem)
    {
        // PT_12_Title, PT_5A_Title, pt12, PT12A
        var m = Regex.Match(
            fileStem,
            @"^PT[_\-\s]?(?<num>\d+)(?<suffix>[A-Za-z])?(?:[_\-\s].*)?$",
            RegexOptions.IgnoreCase);
        if (m.Success)
        {
            return "pt" + m.Groups["num"].Value + m.Groups["suffix"].Value;
        }

        m = Regex.Match(
            fileStem,
            @"^pt(?<num>\d+)(?<suffix>[A-Za-z])?$",
            RegexOptions.IgnoreCase);
        if (m.Success)
        {
            return "pt" + m.Groups["num"].Value + m.Groups["suffix"].Value;
        }

        return null;
    }

    private static string SanitizeStem(string fileStem)
    {
        // "61 - A Night at Home (album v.)" → "aNightAtHomeAlbumV"
        var cleaned = Regex.Replace(fileStem, @"^\d+\s*[-_.]\s*", "");
        cleaned = cleaned.Replace("&", " And ");
        var parts = Regex.Split(cleaned, @"[^A-Za-z0-9]+")
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();
        if (parts.Count == 0)
        {
            return null;
        }

        var sb = new StringBuilder();
        for (var i = 0; i < parts.Count; i++)
        {
            var part = parts[i];
            if (i == 0)
            {
                sb.Append(char.ToLowerInvariant(part[0]));
                if (part.Length > 1)
                {
                    sb.Append(part.Substring(1));
                }
            }
            else
            {
                sb.Append(char.ToUpperInvariant(part[0]));
                if (part.Length > 1)
                {
                    sb.Append(part.Substring(1));
                }
            }
        }

        var result = sb.ToString();
        if (result.Length > 0 && char.IsDigit(result[0]))
        {
            result = "m" + result;
        }

        return result;
    }

    private static void WriteManifest(List<ManifestRow> rows)
    {
        var path = Path.Combine(Application.dataPath, "..", Config.ManifestCsvRelativeToProject);
        var sb = new StringBuilder();
        sb.AppendLine(
            "effect_name,file,asset_path,folder_index,audio_folder,prefab_path,duration_seconds,duration_mmss,playlist,effect_list");
        foreach (var row in rows.OrderBy(r => r.FolderIndex).ThenBy(r => r.EffectName, StringComparer.OrdinalIgnoreCase))
        {
            sb.AppendLine(string.Join(",",
                Csv(row.EffectName),
                Csv(row.File),
                Csv(row.AssetPath),
                row.FolderIndex.ToString(System.Globalization.CultureInfo.InvariantCulture),
                Csv(row.AudioFolder),
                Csv(row.PrefabPath),
                row.DurationSeconds.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture),
                Csv(FormatMmSs(row.DurationSeconds)),
                Csv(row.Playlist),
                Csv(row.EffectList)));
        }

        File.WriteAllText(path, sb.ToString(), new UTF8Encoding(false));
    }

    private static string FormatMmSs(float seconds)
    {
        var total = Mathf.Max(0, Mathf.RoundToInt(seconds));
        var m = total / 60;
        var s = total % 60;
        return m.ToString(System.Globalization.CultureInfo.InvariantCulture) + ":" +
               s.ToString("00", System.Globalization.CultureInfo.InvariantCulture);
    }

    private static string Csv(string value)
    {
        var f = value ?? "";
        if (f.IndexOfAny(new[] { '"', ',', '\n', '\r' }) >= 0)
        {
            f = "\"" + f.Replace("\"", "\"\"") + "\"";
        }

        return f;
    }

    private static string NormalizeAssetPath(string path)
    {
        return (path ?? "").Replace("\\", "/").TrimEnd('/');
    }

    private static Type FindComponentType()
    {
        foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
        {
            Type type = null;
            try
            {
                type = assembly.GetType(ComponentTypeName, false);
            }
            catch
            {
                // ignore broken assemblies
            }

            if (type != null)
            {
                return type;
            }
        }

        return null;
    }

    private sealed class ManifestRow
    {
        public string EffectName;
        public string File;
        public string AssetPath;
        public int FolderIndex;
        public string AudioFolder;
        public string PrefabPath;
        public float DurationSeconds;
        public string Playlist;
        public string EffectList;
    }

    /// <summary>
    /// Minimal copy of a Trigger Effect element so unmanaged rows survive a rebuild.
    /// </summary>
    private sealed class SerializedPropertySnapshot
    {
        public string Name;
        public float Duration;
        public AudioClip Audio;
        public bool Positional3D;
        public bool HasDuration;
        public bool HasSound;

        public static SerializedPropertySnapshot From(SerializedProperty element)
        {
            var snap = new SerializedPropertySnapshot();
            var nameProp = element.FindPropertyRelative("Name");
            snap.Name = nameProp != null ? nameProp.stringValue : "";

            var durationProp = element.FindPropertyRelative("Duration");
            if (durationProp != null)
            {
                snap.HasDuration = true;
                snap.Duration = durationProp.floatValue;
            }

            var soundProp = element.FindPropertyRelative("Sound");
            if (soundProp != null)
            {
                snap.HasSound = true;
                var audioProp = soundProp.FindPropertyRelative("Audio");
                snap.Audio = audioProp != null ? audioProp.objectReferenceValue as AudioClip : null;
                var positionalProp = soundProp.FindPropertyRelative("Positional3D");
                snap.Positional3D = positionalProp != null && positionalProp.boolValue;
            }

            return snap;
        }

        public void WriteTo(SerializedProperty element)
        {
            var nameProp = element.FindPropertyRelative("Name");
            if (nameProp != null)
            {
                nameProp.stringValue = Name ?? "";
            }

            if (HasDuration)
            {
                var durationProp = element.FindPropertyRelative("Duration");
                if (durationProp != null)
                {
                    durationProp.floatValue = Duration;
                }
            }

            if (!HasSound)
            {
                return;
            }

            var soundProp = element.FindPropertyRelative("Sound");
            if (soundProp == null)
            {
                return;
            }

            var audioProp = soundProp.FindPropertyRelative("Audio");
            if (audioProp != null)
            {
                audioProp.objectReferenceValue = Audio;
            }

            var positionalProp = soundProp.FindPropertyRelative("Positional3D");
            if (positionalProp != null)
            {
                positionalProp.boolValue = Positional3D;
            }
        }
    }
}

#endif
