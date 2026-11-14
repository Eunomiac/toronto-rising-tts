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
import os
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
# Mood prompts for Vampire: the Masquerade / Toronto Rising beds.
# Prefer ominous/sinister/haunting atmosphere — not sorrowful/tearful melancholy.
MOOD_PROMPTS = {
    # Key name stays "dark" in CSV; playlist labels map it to "ominous".
    "dark": (
        "Ominous, sinister, haunting, gothic underscore with a nocturnal, "
        "predatory, quietly threatening atmosphere — dread and danger, not tears."
    ),
    "bright": (
        "Bright, cheerful, optimistic, hopeful music with a warm, major-key, "
        "uplifting or playful emotional tone."
    ),
    "melancholy": (
        "Sorrowful, mournful, tearful, grieving music that feels sad and emotional "
        "rather than dangerous, ominous, or sinister."
    ),
    "tense": (
        "Uneasy, suspenseful, haunting underscore with quiet dread, paranoia, and "
        "held breath rather than open melody or open hope."
    ),
}
ALL_PROMPTS = (
    list(INSTRUMENT_PROMPTS.values())
    + list(VOICE_PROMPTS.values())
    + list(BED_PROMPTS.values())
    + list(MOOD_PROMPTS.values())
)
SILENCE_DB = -65.0
WEIGHTS_PATH = Path(__file__).resolve().with_name("calibration_weights.json")
CENTROIDS_PATH = Path(__file__).resolve().with_name("calibration_centroids.npz")
_CALIBRATION_WEIGHTS: dict | None = None
_CALIBRATION_CENTROIDS: dict[str, np.ndarray] | None = None


def load_calibration_weights() -> dict | None:
    global _CALIBRATION_WEIGHTS
    if _CALIBRATION_WEIGHTS is not None:
        return _CALIBRATION_WEIGHTS
    if not WEIGHTS_PATH.exists():
        return None
    import json

    _CALIBRATION_WEIGHTS = json.loads(WEIGHTS_PATH.read_text(encoding="utf-8"))
    return _CALIBRATION_WEIGHTS


def load_calibration_centroids() -> dict[str, np.ndarray] | None:
    global _CALIBRATION_CENTROIDS
    if _CALIBRATION_CENTROIDS is not None:
        return _CALIBRATION_CENTROIDS
    if not CENTROIDS_PATH.exists():
        return None
    data = np.load(CENTROIDS_PATH)
    _CALIBRATION_CENTROIDS = {
        "approved_mean": data["approved_mean"],
        "reject_mean": data["reject_mean"],
    }
    return _CALIBRATION_CENTROIDS


def is_calibration_path(path: Path) -> bool:
    return "calibration" in {part.lower() for part in path.parts}


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
            "strings_match": "", "piano_risk": "", "voice_risk": "", "bed_match": "",
            "mood_match": "", "likely_mood": "", "approved_similarity": "",
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
    """Combine calibration similarity with hard aesthetic guards.

    Calibration is trusted for "sounds like my perfect/approved beds"
    (approved_similarity) plus helpful bed/strings cues. Voice and mood are
    NOT left to unconstrained logistic weights: the fit on Plague Tale labels
    sometimes rewarded high voice_risk / low ominous mood because CLAP tags
    string beds as choir/melancholy. Those must stay hand-guarded.
    """
    if row.get("bed_match") in (None, ""):
        return 0.0

    sim = (
        float(row["approved_similarity"])
        if row.get("approved_similarity") not in (None, "")
        else 0.5
    )
    bed = float(row.get("bed_match") or 0)
    # mood_match = share of dark/tense (ominous) vs bright/melancholy prompts.
    ominous = float(row.get("mood_match") or 0)
    strings = float(row.get("strings_match") or 0)
    piano = float(row.get("piano_risk") or 0)
    voice = float(row.get("voice_risk") or 0)
    stability = float(row.get("stability_score") or 0) / 100.0

    mood_tags = {
        part.strip().lower()
        for part in str(row.get("likely_mood") or "").split(";")
        if part.strip()
    }
    voice_tags = {
        part.strip().lower()
        for part in str(row.get("voice_type") or "").split(";")
        if part.strip()
    }
    vocal_labels = {"singing", "choir", "speech"}

    # Similarity is the main calibration channel; guards enforce TR aesthetics.
    score = (
        100.0 * (0.50 * sim + 0.15 * bed + 0.20 * ominous + 0.15 * strings)
        + 8.0 * stability
        - 25.0 * piano
        - 55.0 * voice
    )

    # Near-certain vocal detections must not sit in the top of the shortlist.
    if voice >= 0.95:
        score *= 0.25
    elif voice >= 0.80:
        score *= 0.40
    elif voice >= 0.60:
        score *= 0.65

    if voice_tags & vocal_labels and "instrumental" not in voice_tags:
        score *= 0.55
    elif voice_tags & vocal_labels:
        score *= 0.75

    # Prefer ominous/haunting; demote sorrowful or bright-dominant tags.
    if mood_tags & {"melancholy", "bright"} and not (mood_tags & {"dark", "tense"}):
        score *= 0.55
    elif "melancholy" in mood_tags and "dark" not in mood_tags:
        score *= 0.75
    if ominous < 0.25:
        score *= 0.70
    elif ominous >= 0.55:
        score += 6.0

    return float(np.clip(score, 0, 100))


def apply_top20_strings_floor(
    rows: list[dict],
    top_n: int = 20,
    refine_passes: int = 2,
) -> tuple[list[dict], float | None, int]:
    """Hard-filter AI rows below the mean strings_match of the current top N.

    1. Sort by overall_rank
    2. Average strings_match on the top N AI-scored rows
    3. Clear overall_rank on any AI row below that average (drops them from
       audition shortlists / --ai-only playlists)
    4. Repeat once by default so a polluted first top-20 cannot keep the floor
       artificially low

    Returns (rows, final_threshold_or_None, total_removed_count).
    """
    total_removed = 0
    threshold: float | None = None
    for _ in range(max(1, refine_passes)):
        ai_ranked = [
            row for row in rows
            if row.get("ai_scanned") == "yes"
            and row.get("overall_rank") not in (None, "")
            and row.get("strings_match") not in (None, "")
        ]
        ai_ranked.sort(key=lambda row: float(row["overall_rank"]), reverse=True)
        if not ai_ranked:
            break
        probe = ai_ranked[: min(top_n, len(ai_ranked))]
        threshold = float(np.mean([float(row["strings_match"]) for row in probe]))
        removed = 0
        for row in rows:
            if row.get("ai_scanned") != "yes" or row.get("overall_rank") in (None, ""):
                continue
            if row.get("strings_match") in (None, ""):
                row["overall_rank"] = ""
                removed += 1
                continue
            if float(row["strings_match"]) < threshold:
                row["overall_rank"] = ""
                removed += 1
        total_removed += removed
        rows.sort(
            key=lambda row: (
                row.get("ai_scanned") == "yes",
                float(row["overall_rank"] or 0),
                float(row.get("stability_score") or 0),
            ),
            reverse=True,
        )
        if removed == 0:
            break
    return rows, threshold, total_removed


def approved_similarity_from_embedding(embedding: np.ndarray) -> float | None:
    centroids = load_calibration_centroids()
    if centroids is None:
        return None
    emb = embedding / (np.linalg.norm(embedding) + 1e-9)
    cos_a = float(np.dot(emb, centroids["approved_mean"]))
    cos_r = float(np.dot(emb, centroids["reject_mean"]))
    return float(np.clip(0.5 + 0.5 * (cos_a - cos_r), 0, 1))


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
    clap_model = None
    clap_processor = None
    if load_calibration_centroids() is not None:
        import torch
        from transformers import AutoProcessor, ClapModel

        clap_model = ClapModel.from_pretrained(model_name)
        clap_processor = AutoProcessor.from_pretrained(model_name)
        clap_model.eval()
    for index, row in enumerate(candidates, 1):
        path = Path(row["file"])
        start, end = row["start_seconds"], row["end_seconds"]
        span = end - start
        if span < 10:
            continue
        positions = np.linspace(0.15, 0.85, max(1, samples_per_passage))
        string_scores: list[float] = []
        piano_scores: list[float] = []
        voice_scores: list[float] = []
        bed_scores: list[float] = []
        mood_scores: list[float] = []
        embeddings: list[np.ndarray] = []
        instrument_tags: list[str] = []
        voice_tags: list[str] = []
        mood_tags: list[str] = []
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
            mood = {name: scores[caption] for name, caption in MOOD_PROMPTS.items()}
            inst_sum = sum(inst.values())
            voc_sum = sum(voc.values())
            bed_sum = sum(bed.values())
            mood_sum = sum(mood.values())
            string_scores.append((inst["strings"] + inst["cello"]) / max(inst_sum, 1e-9))
            piano_scores.append(inst["piano"] / max(inst_sum, 1e-9))
            voice_scores.append(
                (voc["singing"] + voc["choir"] + voc["speech"]) / max(voc_sum, 1e-9)
            )
            bed_scores.append(bed["underscore"] / max(bed_sum, 1e-9))
            # Prefer ominous/tense Masquerade beds; demote bright and sorrowful cues.
            mood_scores.append(
                (mood["dark"] + mood["tense"]) / max(mood_sum, 1e-9)
            )
            instrument_tags.append(max(inst, key=inst.get))
            voice_tags.append(max(voc, key=voc.get))
            mood_tags.append(max(mood, key=mood.get))
            if clap_model is not None and clap_processor is not None:
                import torch

                inputs = clap_processor(
                    audio=[sample.astype(np.float64)],
                    sampling_rate=AI_SR,
                    return_tensors="pt",
                )
                with torch.no_grad():
                    emb = clap_model.get_audio_features(**inputs)
                    if hasattr(emb, "pooler_output"):
                        emb = emb.pooler_output
                    emb = emb / emb.norm(dim=-1, keepdim=True)
                    embeddings.append(emb.squeeze(0).cpu().numpy())
        if string_scores:
            row["strings_match"] = round(float(np.mean(string_scores)), 3)
            row["piano_risk"] = round(float(np.mean(piano_scores)), 3)
            # Use peak voice risk across excerpts so a brief choir/speech hit still counts.
            row["voice_risk"] = round(float(max(voice_scores)), 3)
            row["bed_match"] = round(float(np.mean(bed_scores)), 3)
            row["mood_match"] = round(float(np.mean(mood_scores)), 3)
            row["likely_mood"] = "; ".join(sorted(set(mood_tags)))
            row["likely_instruments"] = "; ".join(sorted(set(instrument_tags)))
            row["voice_type"] = "; ".join(sorted(set(voice_tags)))
            if embeddings:
                mean_emb = np.mean(np.stack(embeddings), axis=0)
                sim = approved_similarity_from_embedding(mean_emb)
                if sim is not None:
                    row["approved_similarity"] = round(sim, 3)
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
    parser.add_argument(
        "--ai-threads",
        type=int,
        default=0,
        help="Limit PyTorch/CPU math threads for --ai (0 = library default; try 2 to leave headroom for other work)",
    )
    parser.add_argument("--ai-model", default="laion/larger_clap_music_and_speech")
    args = parser.parse_args()
    if args.window < CHUNK_SECONDS * 2 or args.step < 1 or args.ai_samples < 1 or args.ai_top < 1:
        parser.error("--window must be >= 20; --step, --ai-samples and --ai-top must be >= 1")
    if args.ai_threads < 0:
        parser.error("--ai-threads must be >= 0")
    if args.ai and args.ai_threads > 0:
        os.environ["OMP_NUM_THREADS"] = str(args.ai_threads)
        os.environ["MKL_NUM_THREADS"] = str(args.ai_threads)
        os.environ["OPENBLAS_NUM_THREADS"] = str(args.ai_threads)
        os.environ["TORCH_NUM_THREADS"] = str(args.ai_threads)
        try:
            import torch

            torch.set_num_threads(args.ai_threads)
            if hasattr(torch, "set_num_interop_threads"):
                torch.set_num_interop_threads(max(1, min(2, args.ai_threads)))
        except ImportError:
            pass
        print(f"AI CPU threads limited to {args.ai_threads}", flush=True)
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        parser.error("ffmpeg and ffprobe must both be on PATH")
    if not args.path.exists():
        parser.error(f"Not found: {args.path}")
    files = (
        sorted(
            p for p in args.path.rglob("*")
            if p.suffix.lower() in AUDIO_EXTENSIONS and not is_calibration_path(p)
        )
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
        rows, strings_floor, removed = apply_top20_strings_floor(rows)
        if strings_floor is not None:
            print(
                f"Strings floor: top-20 mean strings_match={strings_floor:.3f}; "
                f"cleared overall_rank on {removed} passages below that.",
                flush=True,
            )
    else:
        for row in rows:
            row["overall_rank"] = ""
    output_path = args.out or ((args.path if args.path.is_dir() else args.path.parent) / "soundtrack_screening.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "file", "start", "end", "stability_score", "dynamic_range_db",
        "loudness_spike_db", "largest_2s_jump_db", "texture_shift",
        "strings_match", "piano_risk", "voice_risk", "bed_match", "mood_match",
        "likely_mood", "approved_similarity", "likely_instruments", "voice_type",
        "overall_rank", "ai_scanned", "start_seconds", "end_seconds",
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
