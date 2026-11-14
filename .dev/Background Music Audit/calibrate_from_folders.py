#!/usr/bin/env python3
"""Learn ranking weights from background-music/calibration/{approved,rejects}.

Runs the same CLAP feature extraction used by soundtrack_screener.py, fits a
logistic model that separates approved beds from rejects, and stores:
  - calibration_weights.json  (feature weights for overall_rank)
  - calibration_centroids.npz (mean audio embeddings for similarity scoring)

Example:
    py calibrate_from_folders.py
    py calibrate_from_folders.py --samples 5 --apply-csv
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

import numpy as np
from scipy.optimize import minimize

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
DEFAULT_CALIBRATION = REPO / "background-music" / "calibration"
WEIGHTS_PATH = HERE / "calibration_weights.json"
CENTROIDS_PATH = HERE / "calibration_centroids.npz"
CSV_PATH = HERE / "soundtrack_screening.csv"

AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus"}

# Import shared helpers from the screener module without running main().
import importlib.util


def load_screener():
    path = HERE / "soundtrack_screener.py"
    spec = importlib.util.spec_from_file_location("soundtrack_screener", path)
    module = importlib.util.module_from_spec(spec)
    # Register before exec so dataclasses can resolve cls.__module__.
    sys.modules[spec.name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


FEATURE_KEYS = [
    "stability_score",
    "bed_match",
    "mood_match",
    "strings_match",
    "piano_risk",
    "voice_risk",
    "approved_similarity",
]


def list_audio(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS
    )


def score_track(screener, classifier, model, processor, path: Path, samples: int) -> dict:
    import torch

    blocks, duration = screener.analyze_file(path)
    # Treat the whole calibration clip as one passage (author already split A/B parts).
    row = next(screener.passages(path, blocks, duration, max(20, int(duration)), max(1, int(duration))))
    start, end = float(row["start_seconds"]), float(row["end_seconds"])
    span = max(0.1, end - start)
    positions = np.linspace(0.15, 0.85, max(1, samples))

    string_scores: list[float] = []
    piano_scores: list[float] = []
    voice_scores: list[float] = []
    bed_scores: list[float] = []
    mood_scores: list[float] = []
    embeddings: list[np.ndarray] = []

    for pos in positions:
        begin = max(
            start,
            min(
                end - screener.AI_EXCERPT_SECONDS,
                start + pos * span - screener.AI_EXCERPT_SECONDS / 2,
            ),
        )
        begin = max(0.0, begin)
        sample = screener.decode_excerpt(path, begin)
        if sample.size < screener.AI_SR * 2:
            continue

        output = classifier(
            sample,
            candidate_labels=screener.ALL_PROMPTS,
            hypothesis_template="{}",
        )
        scores = {item["label"]: float(item["score"]) for item in output}
        inst = {n: scores[c] for n, c in screener.INSTRUMENT_PROMPTS.items()}
        voc = {n: scores[c] for n, c in screener.VOICE_PROMPTS.items()}
        bed = {n: scores[c] for n, c in screener.BED_PROMPTS.items()}
        mood = {n: scores[c] for n, c in screener.MOOD_PROMPTS.items()}
        inst_sum = sum(inst.values()) or 1e-9
        voc_sum = sum(voc.values()) or 1e-9
        bed_sum = sum(bed.values()) or 1e-9
        mood_sum = sum(mood.values()) or 1e-9
        string_scores.append((inst["strings"] + inst["cello"]) / inst_sum)
        piano_scores.append(inst["piano"] / inst_sum)
        voice_scores.append((voc["singing"] + voc["choir"] + voc["speech"]) / voc_sum)
        bed_scores.append(bed["underscore"] / bed_sum)
        mood_scores.append((mood["dark"] + mood["tense"]) / mood_sum)

        inputs = processor(
            audio=[sample.astype(np.float64)],
            sampling_rate=screener.AI_SR,
            return_tensors="pt",
        )
        with torch.no_grad():
            emb = model.get_audio_features(**inputs)
            if hasattr(emb, "pooler_output"):
                emb = emb.pooler_output
            emb = emb / emb.norm(dim=-1, keepdim=True)
            embeddings.append(emb.squeeze(0).cpu().numpy())

    if not string_scores or not embeddings:
        raise RuntimeError(f"No usable audio excerpts: {path}")

    mean_emb = np.mean(np.stack(embeddings), axis=0)
    mean_emb = mean_emb / (np.linalg.norm(mean_emb) + 1e-9)
    return {
        "file": str(path),
        "stability_score": float(row["stability_score"]) / 100.0,
        "bed_match": float(np.mean(bed_scores)),
        "mood_match": float(np.mean(mood_scores)),
        "strings_match": float(np.mean(string_scores)),
        "piano_risk": float(np.mean(piano_scores)),
        "voice_risk": float(max(voice_scores)),
        "embedding": mean_emb,
    }


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def fit_logistic(
    X: np.ndarray,
    y: np.ndarray,
    sample_weight: np.ndarray | None = None,
    feature_keys: list[str] | None = None,
) -> np.ndarray:
    """Return weight vector [intercept, ...features] with light L2 regularization.

    Aesthetic sign constraints keep future fits from rewarding vocals or
    non-ominous mood just because CLAP mis-tags string beds.
    """
    if sample_weight is None:
        sample_weight = np.ones(len(y), dtype=float)
    sample_weight = sample_weight / (np.mean(sample_weight) + 1e-9)
    feature_keys = feature_keys or []

    # bounds: intercept free; voice/piano <= 0; mood/strings/bed/sim >= 0
    bounds: list[tuple[float | None, float | None]] = [(None, None)]
    for key in feature_keys:
        if key in {"voice_risk", "piano_risk"}:
            bounds.append((None, 0.0))
        elif key in {"mood_match", "strings_match", "bed_match", "approved_similarity"}:
            bounds.append((0.0, None))
        else:
            bounds.append((None, None))

    def nll(w: np.ndarray) -> float:
        z = X @ w
        z = np.clip(z, -30, 30)
        p = 1.0 / (1.0 + np.exp(-z))
        ll = y * np.log(p + 1e-9) + (1 - y) * np.log(1 - p + 1e-9)
        return float(-np.mean(sample_weight * ll) + 0.05 * np.sum(w[1:] ** 2))

    w0 = np.zeros(X.shape[1], dtype=float)
    result = minimize(nll, w0, method="L-BFGS-B", bounds=bounds)
    if not result.success:
        print(f"WARNING: optimizer reported {result.message}", file=sys.stderr)
    return result.x


def confusion(scores: np.ndarray, y: np.ndarray, threshold: float = 0.5) -> dict:
    pred = (scores >= threshold).astype(float)
    tp = int(np.sum((pred == 1) & (y == 1)))
    tn = int(np.sum((pred == 0) & (y == 0)))
    fp = int(np.sum((pred == 1) & (y == 0)))
    fn = int(np.sum((pred == 0) & (y == 1)))
    return {
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "accuracy": (tp + tn) / max(1, len(y)),
        "approved_recall": tp / max(1, int(np.sum(y == 1))),
        "reject_precision": tn / max(1, tn + fp) if (tn + fp) else 0.0,
    }


def apply_weights_to_csv(weights: dict) -> None:
    """Recompute overall_rank for AI rows using learned weights (needs approved_similarity if present)."""
    if not CSV_PATH.exists():
        print("No soundtrack_screening.csv yet; skip --apply-csv")
        return
    screener = load_screener()
    # Monkeypatch compute via writing weights file first (already saved).
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8-sig")))
    fieldnames = list(rows[0].keys()) if rows else []
    if "approved_similarity" not in fieldnames:
        fieldnames.insert(fieldnames.index("overall_rank"), "approved_similarity")
    for row in rows:
        if row.get("ai_scanned") != "yes":
            row["overall_rank"] = ""
            row.setdefault("approved_similarity", "")
            continue
        # Without embedding pass, similarity may be blank — treat as neutral 0.5.
        if row.get("approved_similarity") in (None, ""):
            row["approved_similarity"] = "0.5"
        row["overall_rank"] = round(screener.compute_overall_rank(row), 1)
    rows.sort(
        key=lambda r: (
            r.get("ai_scanned") == "yes",
            float(r["overall_rank"] or 0),
            float(r.get("stability_score") or 0),
        ),
        reverse=True,
    )
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Re-ranked AI rows in {CSV_PATH} with learned weights")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--calibration-root",
        type=Path,
        default=DEFAULT_CALIBRATION,
        help="Folder containing approved/, rejects/, and optional perfect/",
    )
    parser.add_argument("--samples", type=int, default=4, help="CLAP excerpts per calibration track (default: 4)")
    parser.add_argument("--model", default="laion/larger_clap_music_and_speech")
    parser.add_argument(
        "--perfect-weight",
        type=float,
        default=2.0,
        help="Extra training weight for tracks in perfect/ (default: 2.0)",
    )
    parser.add_argument(
        "--apply-csv",
        action="store_true",
        help="Re-rank soundtrack_screening.csv with the new weights (similarity defaults to 0.5 if missing)",
    )
    args = parser.parse_args()

    approved_dir = args.calibration_root / "approved"
    rejects_dir = args.calibration_root / "rejects"
    perfect_dir = args.calibration_root / "perfect"
    approved = list_audio(approved_dir)
    rejects = list_audio(rejects_dir)
    perfect = list_audio(perfect_dir)
    # Positives = approved + perfect (each file should live in only one folder).
    if not (approved or perfect) or not rejects:
        print(
            f"Need rejects/ plus approved/ and/or perfect/ "
            f"(found {len(approved)} approved, {len(perfect)} perfect, {len(rejects)} rejects)",
            file=sys.stderr,
        )
        return 1

    screener = load_screener()
    import torch
    from transformers import AutoProcessor, ClapModel, pipeline

    print(f"Loading {args.model}...", flush=True)
    classifier = pipeline("zero-shot-audio-classification", model=args.model, device=-1)
    model = ClapModel.from_pretrained(args.model)
    processor = AutoProcessor.from_pretrained(args.model)
    model.eval()

    records: list[dict] = []
    labels: list[int] = []
    kinds: list[str] = []
    sample_weights: list[float] = []

    groups = (
        ("perfect", 1, perfect, float(args.perfect_weight)),
        ("approved", 1, approved, 1.0),
        ("rejects", 0, rejects, 1.0),
    )
    for tag, label, paths, weight in groups:
        for i, path in enumerate(paths, 1):
            print(f"[{tag} {i}/{len(paths)}] {path.name}", flush=True)
            try:
                rec = score_track(screener, classifier, model, processor, path, args.samples)
            except Exception as exc:  # noqa: BLE001 - report and continue calibration set
                print(f"  SKIPPED: {exc}", file=sys.stderr, flush=True)
                continue
            rec["kind"] = tag
            records.append(rec)
            labels.append(label)
            kinds.append(tag)
            sample_weights.append(weight)

    if len(records) < 4 or len(set(labels)) < 2:
        print("Not enough scored calibration tracks to fit weights.", file=sys.stderr)
        return 1

    # Similarity target: prefer perfect centroid when available; else all positives.
    perfect_embs = [r["embedding"] for r, k in zip(records, kinds) if k == "perfect"]
    positive_embs = [r["embedding"] for r, y in zip(records, labels) if y == 1]
    reject_embs = [r["embedding"] for r, y in zip(records, labels) if y == 0]
    target_embs = perfect_embs if perfect_embs else positive_embs
    approved_mean = np.mean(np.stack(target_embs), axis=0)
    reject_mean = np.mean(np.stack(reject_embs), axis=0)
    approved_mean = approved_mean / (np.linalg.norm(approved_mean) + 1e-9)
    reject_mean = reject_mean / (np.linalg.norm(reject_mean) + 1e-9)

    for rec in records:
        cos_a = cosine(rec["embedding"], approved_mean)
        cos_r = cosine(rec["embedding"], reject_mean)
        # Map contrast into roughly 0..1 (0.5 = equidistant).
        rec["approved_similarity"] = float(np.clip(0.5 + 0.5 * (cos_a - cos_r), 0, 1))

    y = np.array(labels, dtype=float)
    sw = np.array(sample_weights, dtype=float)
    X_feat = np.array([[rec[k] for k in FEATURE_KEYS] for rec in records], dtype=float)
    X = np.concatenate([np.ones((len(records), 1)), X_feat], axis=1)
    weights = fit_logistic(X, y, sw, FEATURE_KEYS)

    logits = X @ weights
    probs = 1.0 / (1.0 + np.exp(-np.clip(logits, -30, 30)))
    metrics = confusion(probs, y)

    sim_perfect = (
        float(np.mean([r["approved_similarity"] for r, k in zip(records, kinds) if k == "perfect"]))
        if perfect_embs else None
    )
    sim_approved = (
        float(np.mean([r["approved_similarity"] for r, k in zip(records, kinds) if k == "approved"]))
        if any(k == "approved" for k in kinds) else None
    )
    sim_reject = float(np.mean([r["approved_similarity"] for r, y in zip(records, labels) if y == 0]))

    payload = {
        "feature_keys": FEATURE_KEYS,
        "intercept": float(weights[0]),
        "weights": {k: float(v) for k, v in zip(FEATURE_KEYS, weights[1:])},
        "metrics": metrics,
        "n_perfect": sum(1 for k in kinds if k == "perfect"),
        "n_approved": sum(1 for k in kinds if k == "approved"),
        "n_rejects": int(np.sum(y == 0)),
        "perfect_weight": float(args.perfect_weight),
        "similarity_centroid": "perfect" if perfect_embs else "approved+perfect",
        "mean_approved_similarity": {
            "perfect_tracks": sim_perfect,
            "approved_tracks": sim_approved,
            "reject_tracks": sim_reject,
        },
        "model": args.model,
        "samples_per_track": args.samples,
    }
    WEIGHTS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    np.savez(CENTROIDS_PATH, approved_mean=approved_mean, reject_mean=reject_mean)

    print("\nLearned weights:")
    print(f"  intercept = {payload['intercept']:.3f}")
    for key, value in payload["weights"].items():
        print(f"  {key:22} {value:+.3f}")
    print("\nCalibration fit (same tracks used to train — optimistic):")
    print(
        f"  accuracy={metrics['accuracy']:.2%}  "
        f"approved_recall={metrics['approved_recall']:.2%}  "
        f"tp={metrics['tp']} tn={metrics['tn']} fp={metrics['fp']} fn={metrics['fn']}"
    )
    print("  mean approved_similarity:")
    if sim_perfect is not None:
        print(f"    perfect  = {sim_perfect:.3f}")
    if sim_approved is not None:
        print(f"    approved = {sim_approved:.3f}")
    print(f"    rejects  = {sim_reject:.3f}")
    print(f"  similarity centroid source: {payload['similarity_centroid']}")
    print(f"\nWrote {WEIGHTS_PATH}")
    print(f"Wrote {CENTROIDS_PATH}")

    # Rank calibration tracks by learned score for a quick sanity listen list.
    print("\nCalibration tracks by learned score (high = more 'approved'):")
    ranked = sorted(
        zip(records, kinds, probs),
        key=lambda t: t[2],
        reverse=True,
    )
    for rec, kind, prob in ranked:
        print(
            f"  {prob:5.3f}  {kind.upper():8}  "
            f"sim={rec['approved_similarity']:.3f}  {Path(rec['file']).name}"
        )

    if args.apply_csv:
        apply_weights_to_csv(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
