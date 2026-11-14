#!/usr/bin/env python3
"""Convert soundtrack_screening.csv into a Media Player Classic playlist (.mpcpl).

Passage rows that cover only part of a source file are extracted with FFmpeg into
a clips/ folder; the playlist points at those clip files. Whole-track passages
keep linking to the original file.

Example:
    py csv_to_mpcpl.py
    py csv_to_mpcpl.py --ai-only --top 50
    py csv_to_mpcpl.py soundtrack_screening.csv --out audition.mpcpl
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_CSV = HERE / "soundtrack_screening.csv"
DEFAULT_OUT = HERE / "soundtrack_screening.mpcpl"
DEFAULT_CLIPS = HERE / "clips"

INVALID_WIN = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def ffprobe_duration(path: Path) -> float:
    command = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "json", str(path),
    ]
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return float(json.loads(result.stdout)["format"]["duration"])


def safe_stem(name: str) -> str:
    cleaned = INVALID_WIN.sub("_", name).strip(" .")
    return cleaned or "clip"


def clip_path_for(row: dict, clips_dir: Path) -> Path:
    src = Path(row["file"])
    start = float(row["start_seconds"])
    end = float(row["end_seconds"])
    label = f"{safe_stem(src.stem)}__{int(round(start)):06d}-{int(round(end)):06d}{src.suffix.lower()}"
    # Keep ost folder so identically named tracks from different OSTs do not collide.
    ost = safe_stem(src.parent.name)
    return clips_dir / ost / label


def covers_whole_file(row: dict, duration: float, slack: float = 0.75) -> bool:
    start = float(row["start_seconds"])
    end = float(row["end_seconds"])
    return start <= slack and end >= max(0.0, duration - slack)


def extract_clip(src: Path, dest: Path, start: float, end: float) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    duration = max(0.05, end - start)
    # Re-encode for clean cut points on MP3 (stream-copy is blocky).
    command = [
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
        "-ss", f"{start:.3f}", "-i", str(src), "-t", f"{duration:.3f}",
        "-vn", "-codec:a", "libmp3lame", "-q:a", "2",
        str(dest),
    ]
    subprocess.run(command, check=True)


def sort_key(row: dict) -> tuple:
    has_rank = row.get("overall_rank") not in (None, "")
    rank = float(row["overall_rank"]) if has_rank else -1.0
    stability = float(row.get("stability_score") or 0)
    return (has_rank, rank, stability)


def build_label(row: dict, media_path: Path, split: bool) -> str:
    rank = row.get("overall_rank") or "—"
    bed = row.get("bed_match") or "—"
    marker = "clip" if split else "full"
    return (
        f"{rank} | {media_path.stem} | {row['start']}-{row['end']} | "
        f"bed={bed} | {marker}"
    )


def write_mpcpl(entries: list[tuple[Path, str]], out_path: Path) -> None:
    lines = ["MPCPLAYLIST", ""]
    for index, (path, label) in enumerate(entries, 1):
        lines.append(f"{index},type,0")
        lines.append(f"{index},filename,{path}")
        lines.append(f"{index},label,{label}")
        lines.append("")
    out_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("csv", nargs="?", type=Path, default=DEFAULT_CSV, help="Input CSV (default: soundtrack_screening.csv)")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output .mpcpl path")
    parser.add_argument("--clips-dir", type=Path, default=DEFAULT_CLIPS, help="Folder for extracted passage clips")
    parser.add_argument("--ai-only", action="store_true", help="Only include rows with overall_rank from the AI pass")
    parser.add_argument("--top", type=int, default=0, help="Keep only the top N rows after sorting (0 = all)")
    parser.add_argument("--force", action="store_true", help="Re-extract clips even if the target file already exists")
    args = parser.parse_args()

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        print("ffmpeg and ffprobe must both be on PATH", file=sys.stderr)
        return 1
    if not args.csv.exists():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1

    rows = list(csv.DictReader(args.csv.open(encoding="utf-8-sig")))
    if args.ai_only:
        rows = [r for r in rows if r.get("ai_scanned") == "yes" and r.get("overall_rank") not in (None, "")]
    rows.sort(key=sort_key, reverse=True)
    if args.top and args.top > 0:
        rows = rows[: args.top]
    if not rows:
        print("No rows to write.", file=sys.stderr)
        return 1

    duration_cache: dict[Path, float] = {}
    entries: list[tuple[Path, str]] = []
    extracted = 0
    reused = 0
    linked_full = 0

    for i, row in enumerate(rows, 1):
        src = Path(row["file"])
        if not src.exists():
            print(f"  SKIP missing source: {src}", file=sys.stderr)
            continue
        if src not in duration_cache:
            duration_cache[src] = ffprobe_duration(src)
        duration = duration_cache[src]
        start = float(row["start_seconds"])
        end = float(row["end_seconds"])
        if covers_whole_file(row, duration):
            media = src
            split = False
            linked_full += 1
        else:
            media = clip_path_for(row, args.clips_dir)
            split = True
            if args.force or not media.exists():
                print(f"[{i}/{len(rows)}] Extracting {media.name}", flush=True)
                extract_clip(src, media, start, end)
                extracted += 1
            else:
                reused += 1
        entries.append((media.resolve(), build_label(row, src, split)))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_mpcpl(entries, args.out)
    print(
        f"Wrote {len(entries)} entries to {args.out}\n"
        f"  full-track links: {linked_full}\n"
        f"  clips extracted:  {extracted}\n"
        f"  clips reused:     {reused}\n"
        f"  clips folder:     {args.clips_dir}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
