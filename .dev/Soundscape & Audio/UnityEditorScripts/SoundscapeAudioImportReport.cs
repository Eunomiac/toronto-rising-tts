// Copy into your TTS modding Unity project under an `Editor/` folder (e.g. `Assets/Editor/`).
// Unity 6000.x + assembly references to UnityEditor.
//
// Menu: Tools → Toronto Rising → Soundscape Audio Import Report
// Scans `Assets/Soundscape/Audio` for `.wav` (and `t:AudioClip` there), reads import settings,
// writes `Soundscape_Audio_Import_Report.csv` next to the `Assets` folder and logs a fixed-width table.

#if UNITY_EDITOR

using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using UnityEditor;
using UnityEngine;

/// <summary>Editor-only report for AudioClip import settings under Assets/Soundscape/Audio.</summary>
public static class SoundscapeAudioImportReport
{
    private const string AudioFolder = "Assets/Soundscape/Audio";

    [MenuItem("Tools/Toronto Rising/Soundscape Audio Import Report")]
    private static void Run()
    {
        if (!AssetDatabase.IsValidFolder(AudioFolder))
        {
            Debug.LogError("[SoundscapeAudioImportReport] Folder not found: " + AudioFolder);
            return;
        }

        var guids = AssetDatabase.FindAssets("t:AudioClip", new[] { AudioFolder });
        var rows = new List<Row>(guids.Length);
        foreach (var guid in guids)
        {
            var path = AssetDatabase.GUIDToAssetPath(guid);
            if (string.IsNullOrEmpty(path))
            {
                continue;
            }

            if (!path.EndsWith(".wav", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var importer = AssetImporter.GetAtPath(path) as AudioImporter;
            if (importer == null)
            {
                continue;
            }

            var settings = importer.defaultSampleSettings;
            long originalBytes = 0;
            try
            {
                var full = Path.GetFullPath(path);
                if (File.Exists(full))
                {
                    originalBytes = new FileInfo(full).Length;
                }
            }
            catch
            {
                // leave 0
            }

            var main = AssetDatabase.LoadMainAssetAtPath(path);
            ulong importedBytes = TryGetAssetStorageBytes(main);

            double ratioPercent = originalBytes > 0 && importedBytes > 0
                ? 100.0 * importedBytes / originalBytes
                : double.NaN;

            rows.Add(new Row
            {
                RelativePath = path.Replace("\\", "/"),
                FileName = Path.GetFileName(path),
                LoadType = settings.loadType.ToString(),
                CompressionFormat = settings.compressionFormat.ToString(),
                Quality = settings.quality,
                OriginalBytes = originalBytes,
                ImportedBytes = importedBytes,
                RatioPercent = ratioPercent,
            });
        }

        rows.Sort((a, b) => string.Compare(a.RelativePath, b.RelativePath, StringComparison.OrdinalIgnoreCase));

        var csvPath = Path.Combine(Application.dataPath, "..", "Soundscape_Audio_Import_Report.csv");
        WriteCsv(csvPath, rows);

        var table = BuildConsoleTable(rows);
        Debug.Log("[SoundscapeAudioImportReport] Wrote " + csvPath + "\n" + table);
    }

    private sealed class Row
    {
        public string RelativePath;
        public string FileName;
        public string LoadType;
        public string CompressionFormat;
        public float Quality;
        public long OriginalBytes;
        public ulong ImportedBytes;
        public double RatioPercent;
    }

    private static ulong TryGetAssetStorageBytes(UnityEngine.Object mainAsset)
    {
        if (mainAsset == null)
        {
            return 0;
        }

        // Unity 2022.2+ / 6.x: AssetDatabase.GetAssetSize(Object) → ulong (storage in Library for this asset).
        var db = typeof(AssetDatabase);
        var m = db.GetMethod(
            "GetAssetSize",
            BindingFlags.Public | BindingFlags.Static,
            null,
            new[] { typeof(UnityEngine.Object) },
            null);
        if (m == null)
        {
            return 0;
        }

        try
        {
            var r = m.Invoke(null, new object[] { mainAsset });
            if (r is ulong u)
            {
                return u;
            }

            if (r is long l && l > 0)
            {
                return (ulong)l;
            }
        }
        catch
        {
            return 0;
        }

        return 0;
    }

    private static void WriteCsv(string csvPath, List<Row> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine(CsvLine("File", "Path", "LoadType", "CompressionFormat", "Quality", "OriginalBytes", "ImportedBytes", "RatioPercent"));
        ulong sumOrig = 0;
        ulong sumImp = 0;
        foreach (var r in rows)
        {
            sumOrig += (ulong)Math.Max(0, r.OriginalBytes);
            sumImp += r.ImportedBytes;
            var ratioStr = double.IsNaN(r.RatioPercent) ? "" : r.RatioPercent.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);
            sb.AppendLine(CsvLine(
                r.FileName,
                r.RelativePath,
                r.LoadType,
                r.CompressionFormat,
                r.Quality.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture),
                r.OriginalBytes.ToString(System.Globalization.CultureInfo.InvariantCulture),
                r.ImportedBytes.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ratioStr));
        }

        var totalRatio = sumOrig > 0 && sumImp > 0 ? 100.0 * sumImp / sumOrig : double.NaN;
        sb.AppendLine(CsvLine(
            "__TOTAL__",
            "",
            "",
            "",
            "",
            sumOrig.ToString(System.Globalization.CultureInfo.InvariantCulture),
            sumImp.ToString(System.Globalization.CultureInfo.InvariantCulture),
            double.IsNaN(totalRatio) ? "" : totalRatio.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)));

        File.WriteAllText(csvPath, sb.ToString(), new UTF8Encoding(false));
    }

    private static string CsvLine(params string[] fields)
    {
        var parts = new string[fields.Length];
        for (var i = 0; i < fields.Length; i++)
        {
            var f = fields[i] ?? "";
            if (f.IndexOfAny(new[] { '"', ',', '\n', '\r' }) >= 0)
            {
                f = "\"" + f.Replace("\"", "\"\"") + "\"";
            }

            parts[i] = f;
        }

        return string.Join(",", parts);
    }

    private static string BuildConsoleTable(List<Row> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Format(
            "{0,-28} {1,-18} {2,-16} {3,7} {4,12} {5,12} {6,8}",
            "File",
            "LoadType",
            "Compression",
            "Qual%",
            "Orig MB",
            "Imp MB",
            "Ratio%"));
        sb.AppendLine(new string('-', 115));
        foreach (var r in rows)
        {
            var ratioStr = double.IsNaN(r.RatioPercent) ? "n/a" : r.RatioPercent.ToString("0.0");
            sb.AppendLine(string.Format(
                "{0,-28} {1,-18} {2,-16} {3,7:0.#} {4,12:0.###} {5,12:0.###} {6,8}",
                Truncate(r.FileName, 28),
                Truncate(r.LoadType, 18),
                Truncate(r.CompressionFormat, 16),
                r.Quality,
                r.OriginalBytes / (1024.0 * 1024.0),
                r.ImportedBytes / (1024.0 * 1024.0),
                ratioStr));
        }

        return sb.ToString();
    }

    private static string Truncate(string s, int max)
    {
        if (string.IsNullOrEmpty(s) || s.Length <= max)
        {
            return s;
        }

        return s.Substring(0, max - 1) + "…";
    }
}

#endif
