#!/usr/bin/env python3
"""Rank soundtrack passages for quiet, texturally stable tabletop background music.

Dependencies:
    Python 3.10+, FFmpeg and ffprobe on PATH
    py -m pip install numpy scipy
    Optional AI: py -m pip install transformers torch

Examples:
    py soundtrack_screener.py "D:\\OST" --window 120 --step 60
    py soundtrack_screener.py "D:\\OST" --window 120 --step 60 --ai --ai-top 40
    py soundtrack_screener.py "D:\\OST\\long_soundtrack.mp4" --window 90 --step 45

The plain analysis scores loudness and spectral-texture stability, NOT musical
composition or emotion. AI confidence columns are RELATIVE text/audio similarity
scores, NOT calibrated probabilities of an instrument being present.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.signal import welch

AUDIO_EXTENSIONS = {
    ".wav", ".mp3", ".flac", ".m4a", ".mp4", ".aac", ".ogg",
    ".opus", ".wma", ".webm", ".aif", ".aiff", ".mkv",
}
SR = 16000
CHUNK_SECONDS = 10
FRAME_SECONDS = 2
AI_SR = 48000
AI_EXCERPT_SECONDS = 10

# Full natural-language descriptions, used with hypothesis_template="{}".
INSTRUMENT_PROMPTS = {
    "strings": "An orchestral soundtrack with sustained violin, viola, and cello strings.",
    "cello": "A slow instrumental passage led by a solo cello.",
    "piano": "An instrumental piano melody with soft accompaniment.",
    "synth": "Ambient electronic music dominated by synthesizer pads.",
    "woodwinds": "Orchestral music led by woodwind instruments.",
    "brass": "Orchestral music featuring prominent brass and trumpets.",
    "guitar": "Instrumental music featuring an acoustic or electric guitar.",
    "drums": "A dramatic percussion-heavy instrumental passage with loud drums.",
}
VOICE_PROMPTS = {
    "singing": "Music with a person singing lyrics.",
    "choir": "Music featuring a choir singing without words.",
    "speech": "Music with audible spoken words or narration.",
    "instrumental": "Instrumental music without any human singing or speaking.",
}
# Suitability prompts: relative ranking for tabletop underscore vs scene-stealing drama.
BED_PROMPTS = {
    "underscore": (
        "Quiet, restrained atmospheric underscore that can loop under spoken dialogue "
        "without drawing attention: sustained strings, soft pads, steady mood."
    ),
    "dramatic": (
        "Dramatic cinematic action or tension cue with strong melodic statements, "
        "crescendos, or percussion that would compete with tabletop roleplay dialogue."
    ),
}
ALL_PROMPTS = (
    list(INSTRUMENT_PROMPTS.values())
    + list(VOICE_PROMPTS.values())
    + list(BED_PROMPTS.values())
)
SILENCE_DB = -65.0


@dataclass
class Block:
    start: float
    end: float
    dbs: list[float]
    spectrum: np.ndarray | None


def ffprobe_duration(path: Path) -> float:
    command = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "json", str(path),
    ]
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return float(json.loads(result.stdout)["format"]["duration"])


def dbfs(samples: np.ndarray) -> float:
    if not samples.size:
        return -100.0
    # Convert in float64 to avoid overflow, but sample values remain in [-1, 1].
    return float(20 * np.log10(np.sqrt(np.mean(samples.astype(np.float64) ** 2)) + 1e-10))


def spectral_profile(samples: np.ndarray) -> np.ndarray | None:
    if len(samples) < 2048 or dbfs(samples) < SILENCE_DB:
        return None
    freqs, psd = welch(samples, fs=SR, nperseg=2048, noverlap=1024)
    edges = np.geomspace(55, SR / 2, 49)
    bands = np.histogram(freqs, bins=edges, weights=psd)[0].astype(np.float64)
    total = bands.sum()
    if total <= 1e-20:
        return None
    return bands / total


def hellinger(p: np.ndarray, q: np.ndarray) -> float:
    """0 = same normalized spectrum, 1 = disjoint. Proxy for timbre changes."""
    return float(np.linalg.norm(np.sqrt(p) - np.sqrt(q)) / math.sqrt(2))


def analyze_file(path: Path) -> tuple[list[Block], float]:
    expected = ffprobe_duration(path)
    command = [
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
        "-i", str(path), "-vn", "-ac", "1", "-ar", str(SR),
        "-f", "f32le", "-acodec", "pcm_f32le", "pipe:1",
    ]
    proc = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    blocks: list[Block] = []
    total_samples = 0
    nbytes = SR * CHUNK_SECONDS * 4
    try:
        assert proc.stdout is not None
        while True:
            raw = proc.stdout.read(nbytes)
            if not raw:
                break
            samples = np.frombuffer(raw, dtype="<f4")
            if not samples.size:
                break
            start = total_samples / SR
            total_samples += samples.size
            end = total_samples / SR
            sublen = SR * FRAME_SECONDS
            dbs = [dbfs(samples[i:i + sublen]) for i in range(0, samples.size, sublen)]
            blocks.append(Block(start, end, dbs, spectral_profile(samples)))
    finally:
        if proc.stdout:
            proc.stdout.close()
        code = proc.wait()
    if code:
        raise RuntimeError(f"FFmpeg could not decode: {path}")
    if not blocks:
        raise RuntimeError(f"No decoded audio: {path}")
    return blocks, min(expected, total_samples / SR)


def ts(seconds: float) -> str:
    total = max(0, int(round(seconds)))
    return f"{total // 3600:02d}:{total // 60 % 60:02d}:{total % 60:02d}"


def passages(path: Path, blocks: list[Block], duration: float, window: int, step: int):
    if duration <= window:
        starts = [0.0]
    else:
        starts = list(np.arange(0, duration - window + 0.001, step, dtype=float))
        tail = duration - window
        if not starts or tail - starts[-1] > step * 0.5:
            starts.append(tail)
    for start in starts:
        end = min(duration, start + window)
        matched = [b for b in blocks if b.start >= start - 0.001 and b.end <= end + 0.001]
        # Allow one partial block near a file tail / off-grid window edge.
        if not matched:
            matched = [b for b in blocks if b.end > start and b.start < end]
        if not matched:
            continue
        levels = np.array([db for b in matched for db in b.dbs], dtype=float)
        # Ignore near-digital silence for range/spike/jump so album fades and
        # quiet intros do not flatten otherwise usable underscore passages.
        audible = levels[levels > SILENCE_DB]
        if not len(audible):
            continue
        span = float(np.percentile(audible, 90) - np.percentile(audible, 10))
        spike = float(np.percentile(audible, 98) - np.median(audible))
        audible_jumps = [
            abs(b - a)
            for a, b in zip(levels, levels[1:])
            if a > SILENCE_DB and b > SILENCE_DB
        ]
        jump = float(np.percentile(audible_jumps, 95)) if audible_jumps else 0.0
        profiles = [b.spectrum for b in matched if b.spectrum is not None]
        shifts = [hellinger(a, b) for a, b in zip(profiles, profiles[1:])]
        # Median shift is less harsh on slow thematic development than p90.
        texture = float(np.median(shifts)) if shifts else 0.0
        # Heuristic ranking only. Tuned against pre-approved Plague Tale Main beds:
        # silence-aware jumps + softer texture penalty so evolving but usable
        # underscore is not crushed the same way combat spikes are.
        score = float(np.clip(
            100 - 4.5 * max(0, span - 7)
                - 3.0 * max(0, spike - 5)
                - 2.5 * max(0, jump - 8)
                - 70 * max(0, texture - 0.22),
            0, 100,
        ))
        yield {
            "file": str(path), "start": ts(start), "end": ts(end),
            "start_seconds": round(start, 1), "end_seconds": round(end, 1),
            "stability_score": round(score, 1),
            "dynamic_range_db": round(span, 1),
            "loudness_spike_db": round(spike, 1),
            "largest_2s_jump_db": round(jump, 1),
            "texture_shift": round(texture, 3),
            "strings_match": "", "voice_risk": "", "bed_match": "",
            "likely_instruments": "", "voice_type": "", "ai_scanned": "no",
        }


def decode_excerpt(path: Path, begin: float, duration: float = AI_EXCERPT_SECONDS) -> np.ndarray:
    command = [
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
        "-ss", f"{begin:.3f}", "-i", str(path), "-t", str(duration),
        "-vn", "-ar", str(AI_SR), "-ac", "1", "-f", "f32le",
        "-acodec", "pcm_f32le", "pipe:1",
    ]
    result = subprocess.run(command, check=True, capture_output=True)
    return np.frombuffer(result.stdout, dtype="<f4").copy()


def select_ai_candidates(rows: list[dict], top_n: int, min_stability: float) -> list[dict]:
    """Prefer passages at/above min_stability; fill remaining slots from the ranked list."""
    above = [row for row in rows if float(row["stability_score"]) >= min_stability]
    if len(above) >= top_n:
        return above[:top_n]
    chosen = list(above)
    seen = {id(row) for row in chosen}
    for row in rows:
        if id(row) in seen:
            continue
        chosen.append(row)
        if len(chosen) >= top_n:
            break
    return chosen


def compute_overall_rank(row: dict) -> float:
    """Combine DSP stability with CLAP bed/strings/voice signals.

    bed_match scales stability so loudness-stable combat/tension cues with a
    low underscore match cannot sit beside true beds at the top of the list.
    """
    voice_types = {
        part.strip()
        for part in str(row.get("voice_type") or "").split(";")
        if part.strip()
    }
    vocal_labels = {"singing", "choir", "speech"}
    if voice_types & vocal_labels and "instrumental" not in voice_types:
        voice_coef = 28.0
    elif voice_types & vocal_labels:
        voice_coef = 18.0
    else:
        voice_coef = 10.0
    bed = float(row["bed_match"])
    stability = float(row["stability_score"])
    # 0.35 floor keeps weak-bed rows visible for audition; 0.65 weight rewards beds.
    return float(np.clip(
        stability * (0.35 + 0.65 * bed)
        + 16 * float(row["strings_match"])
        - voice_coef * float(row["voice_risk"]),
        0, 100,
    ))


def enrich_with_ai(
    rows: list[dict],
    top_n: int,
    samples_per_passage: int,
    model_name: str,
    min_stability: float,
):
    try:
        from transformers import pipeline
    except ImportError as exc:
        raise RuntimeError("For --ai, install: py -m pip install transformers torch") from exc
    candidates = select_ai_candidates(rows, top_n, min_stability)
    print(
        f"Loading model {model_name} (first run downloads model weights)...",
        flush=True,
    )
    print(
        f"AI will score {len(candidates)} passages "
        f"(top {top_n}, preferring stability >= {min_stability}).",
        flush=True,
    )
    # Device -1 = CPU; set device=0 here if you've set up a CUDA-enabled PyTorch.
    classifier = pipeline("zero-shot-audio-classification", model=model_name, device=-1)
    for index, row in enumerate(candidates, 1):
        path = Path(row["file"])
        start, end = row["start_seconds"], row["end_seconds"]
        span = end - start
        if span < 10:
            continue
        positions = np.linspace(0.15, 0.85, max(1, samples_per_passage))
        string_scores: list[float] = []
        voice_scores: list[float] = []
        bed_scores: list[float] = []
        instrument_tags: list[str] = []
        voice_tags: list[str] = []
        print(
            f"  AI {index}/{len(candidates)}: {path.name} {row['start']}–{row['end']}",
            flush=True,
        )
        for pos in positions:
            begin = max(
                start,
                min(end - AI_EXCERPT_SECONDS, start + pos * span - AI_EXCERPT_SECONDS / 2),
            )
            sample = decode_excerpt(path, begin)
            if sample.size < AI_SR * 2:
                continue
            # Scores returned by CLAP are relative to THIS list of descriptions.
            output = classifier(sample, candidate_labels=ALL_PROMPTS, hypothesis_template="{}")
            scores = {item["label"]: float(item["score"]) for item in output}
            inst = {name: scores[caption] for name, caption in INSTRUMENT_PROMPTS.items()}
            voc = {name: scores[caption] for name, caption in VOICE_PROMPTS.items()}
            bed = {name: scores[caption] for name, caption in BED_PROMPTS.items()}
            inst_sum, voc_sum, bed_sum = sum(inst.values()), sum(voc.values()), sum(bed.values())
            string_scores.append((inst["strings"] + inst["cello"]) / max(inst_sum, 1e-9))
            voice_scores.append(
                (voc["singing"] + voc["choir"] + voc["speech"]) / max(voc_sum, 1e-9)
            )
            bed_scores.append(bed["underscore"] / max(bed_sum, 1e-9))
            instrument_tags.append(max(inst, key=inst.get))
            voice_tags.append(max(voc, key=voc.get))
        if string_scores:
            row["strings_match"] = round(float(np.mean(string_scores)), 3)
            row["voice_risk"] = round(float(max(voice_scores)), 3)
            row["bed_match"] = round(float(np.mean(bed_scores)), 3)
            row["likely_instruments"] = "; ".join(sorted(set(instrument_tags)))
            row["voice_type"] = "; ".join(sorted(set(voice_tags)))
            row["ai_scanned"] = "yes"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("path", type=Path, help="One audio/video file or a directory containing soundtracks")
    parser.add_argument("--window", type=int, default=120, help="Passage length in seconds (default: 120)")
    parser.add_argument("--step", type=int, default=60, help="Seconds between passage starts (default: 60)")
    parser.add_argument("--out", type=Path, help="Output CSV (default: soundtrack_screening.csv in input folder)")
    parser.add_argument("--ai", action="store_true", help="Also run optional CLAP music/voice classification")
    parser.add_argument(
        "--ai-top",
        type=int,
        default=40,
        help="Analyze up to N passages with AI (default: 40; prefers high-stability first)",
    )
    parser.add_argument(
        "--ai-min-stability",
        type=float,
        default=45.0,
        help="Prefer AI on passages at/above this DSP stability score (default: 45)",
    )
    parser.add_argument("--ai-samples", type=int, default=3, help="AI excerpts per chosen passage (default: 3)")
    parser.add_argument("--ai-model", default="laion/larger_clap_music_and_speech")
    args = parser.parse_args()
    if args.window < CHUNK_SECONDS * 2 or args.step < 1 or args.ai_samples < 1 or args.ai_top < 1:
        parser.error("--window must be >= 20; --step, --ai-samples and --ai-top must be >= 1")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        parser.error("ffmpeg and ffprobe must both be on PATH")
    if not args.path.exists():
        parser.error(f"Not found: {args.path}")
    files = (
        sorted(p for p in args.path.rglob("*") if p.suffix.lower() in AUDIO_EXTENSIONS)
        if args.path.is_dir() else [args.path]
    )
    if not files:
        parser.error("No supported audio/video files found")
    rows = []
    for i, path in enumerate(files, 1):
        print(f"[{i}/{len(files)}] Scanning: {path.name}", flush=True)
        try:
            blocks, duration = analyze_file(path)
            found = list(passages(path, blocks, duration, args.window, args.step))
            rows.extend(found)
            print(f"  {ts(duration)} -> {len(found)} candidate passages", flush=True)
        except (RuntimeError, subprocess.CalledProcessError, KeyError, ValueError) as exc:
            print(f"  SKIPPED: {exc}", file=sys.stderr, flush=True)
    if not rows:
        print("Nothing to write: no valid passages.", file=sys.stderr)
        return 1
    rows.sort(key=lambda row: row["stability_score"], reverse=True)
    if args.ai:
        enrich_with_ai(
            rows,
            args.ai_top,
            args.ai_samples,
            args.ai_model,
            args.ai_min_stability,
        )
        # Favor stable underscore-like beds; soft-penalize noisy voice tags.
        for row in rows:
            if row["ai_scanned"] == "yes":
                row["overall_rank"] = round(compute_overall_rank(row), 1)
            else:
                row["overall_rank"] = ""
        rows.sort(
            key=lambda row: (
                row["ai_scanned"] == "yes",
                float(row["overall_rank"] or 0),
                row["stability_score"],
            ),
            reverse=True,
        )
    else:
        for row in rows:
            row["overall_rank"] = ""
    output_path = args.out or ((args.path if args.path.is_dir() else args.path.parent) / "soundtrack_screening.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "file", "start", "end", "stability_score", "dynamic_range_db",
        "loudness_spike_db", "largest_2s_jump_db", "texture_shift",
        "strings_match", "voice_risk", "bed_match", "likely_instruments",
        "voice_type", "overall_rank", "ai_scanned", "start_seconds", "end_seconds",
    ]
    with output_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"\nWrote {len(rows)} passages to {output_path}", flush=True)
    print("Scores are HEURISTIC RANKINGS; audition results before using them in your game.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
