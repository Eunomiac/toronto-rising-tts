"""
Export a Main-playlist music manifest from Audition .wav folders (ffprobe durations).

Use this before or alongside the Unity Editor menu
Tools → Toronto Rising → Sync Main Music Into Prefabs.

Example:
    py ".dev/Soundscape & Audio/export_main_music_manifest.py" ^
      "D:\\Unity\\Tabletop-Simulator-Modding\\Assets\\Soundscape\\Audio\\MusicMainA" ^
      "D:\\Unity\\Tabletop-Simulator-Modding\\Assets\\Soundscape\\Audio\\MusicMainB" ^
      --out ".dev/Soundscape & Audio/Soundscape_Main_Music_Manifest.csv"

The Unity sync also writes its own manifest from AudioClip.length after import.
This script is useful when you want durations / effect names before opening Unity,
or to draft Lua catalog rows.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
from pathlib import Path

WAV_SUFFIXES = {".wav"}


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(json.loads(result.stdout)["format"]["duration"])


def try_parse_plague_tale_code(stem: str) -> str | None:
    match = re.match(
        r"^PT[_\-\s]?(?P<num>\d+)(?P<suffix>[A-Za-z])?(?:[_\-\s].*)?$",
        stem,
        flags=re.IGNORECASE,
    )
    if match:
        return f"pt{match.group('num')}{match.group('suffix') or ''}"
    match = re.match(r"^pt(?P<num>\d+)(?P<suffix>[A-Za-z])?$", stem, flags=re.IGNORECASE)
    if match:
        return f"pt{match.group('num')}{match.group('suffix') or ''}"
    return None


def sanitize_stem(stem: str) -> str:
    cleaned = re.sub(r"^\d+\s*[-_.]\s*", "", stem)
    cleaned = cleaned.replace("&", " And ")
    parts = [p for p in re.split(r"[^A-Za-z0-9]+", cleaned) if p]
    if not parts:
        raise ValueError(f"Cannot derive effect name from {stem!r}")
    out = parts[0][:1].lower() + parts[0][1:]
    for part in parts[1:]:
        out += part[:1].upper() + part[1:]
    if out and out[0].isdigit():
        out = "m" + out
    return out


def derive_effect_name(stem: str) -> str:
    return try_parse_plague_tale_code(stem) or sanitize_stem(stem)


def format_mmss(seconds: float) -> str:
    total = max(0, int(round(seconds)))
    return f"{total // 60}:{total % 60:02d}"


def collect_rows(folders: list[Path]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    seen: dict[str, Path] = {}
    for folder_index, folder in enumerate(folders):
        if not folder.is_dir():
            raise SystemExit(f"Not a folder: {folder}")
        files = sorted(
            p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in WAV_SUFFIXES
        )
        for path in files:
            effect_name = derive_effect_name(path.stem)
            if effect_name in seen:
                raise SystemExit(
                    f"Duplicate effect name {effect_name!r}:\n  {seen[effect_name]}\n  {path}"
                )
            seen[effect_name] = path
            duration = ffprobe_duration(path)
            rows.append(
                {
                    "effect_name": effect_name,
                    "file": path.name,
                    "asset_path": str(path),
                    "folder_index": folder_index,
                    "audio_folder": str(folder),
                    "prefab_path": "",
                    "duration_seconds": round(duration, 3),
                    "duration_mmss": format_mmss(duration),
                    "playlist": "main",
                    "effect_list": "trigger",
                }
            )
    rows.sort(key=lambda r: (int(r["folder_index"]), str(r["effect_name"]).lower()))
    return rows


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    fieldnames = [
        "effect_name",
        "file",
        "asset_path",
        "folder_index",
        "audio_folder",
        "prefab_path",
        "duration_seconds",
        "duration_mmss",
        "playlist",
        "effect_list",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_lua_draft(path: Path, rows: list[dict[str, object]]) -> None:
    lines = [
        "-- Draft Main playlist rows for lib/soundscape_catalog.ttslua",
        "-- Review effect names before pasting. volume matches current Main defaults.",
        "",
    ]
    for row in rows:
        key = row["effect_name"]
        duration = int(round(float(row["duration_seconds"])))
        lines.append(f"  {key} = {{")
        lines.append(f'    key = "{key}",')
        lines.append('    type = "backgroundMusic",')
        lines.append('    subType = "main",')
        lines.append("    isLooping = false,")
        lines.append(f"    duration = {duration},")
        lines.append("    volume = 0.2,")
        lines.append("  },")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "folders",
        nargs="+",
        type=Path,
        help="One or two folders of Audition-exported Main playlist .wav files",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent / "Soundscape_Main_Music_Manifest.csv",
        help="Output CSV path",
    )
    parser.add_argument(
        "--lua-draft",
        type=Path,
        help="Optional draft Lua TRACKS snippet path",
    )
    args = parser.parse_args()
    if len(args.folders) > 2:
        print("Warning: more than two folders; Steam Cloud split usually uses two.", file=sys.stderr)

    rows = collect_rows(args.folders)
    write_csv(args.out, rows)
    print(f"Wrote {len(rows)} Main tracks → {args.out}")
    if args.lua_draft:
        write_lua_draft(args.lua_draft, rows)
        print(f"Wrote Lua draft → {args.lua_draft}")
    for row in rows[:12]:
        print(
            f"  {row['effect_name']:24}  {row['duration_mmss']:>5}  "
            f"folder={row['folder_index']}  {row['file']}"
        )
    if len(rows) > 12:
        print(f"  … {len(rows) - 12} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
