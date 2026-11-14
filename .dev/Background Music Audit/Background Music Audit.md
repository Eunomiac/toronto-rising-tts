> **Current workflow:** See [`README.md`](./README.md) for install/scan commands, [`Pre-Approved Plague Tale Tracks.md`](./Pre-Approved%20Plague%20Tale%20Tracks.md) for human calibration labels, and `soundtrack_screening.csv` for the latest ranked passages. The notes below are the original design discussion that led to `soundtrack_screener.py`.

**Absolutely. And I think we can get surprisingly close to automating exactly what you're looking for.**

In fact, I'd build a Python utility specifically for *Toronto Rising* that scans your soundtrack collection and ranks passages according to how suitable they are for unobtrusive, atmospheric background music.

The trick is to combine **digital signal processing (DSP)** with **AI-based music classification**. They solve different problems, and together they're considerably more useful than either alone.

## **What we can detect**

| Your requirement                            | Technique                        | Reliability                      |
| ------------------------------------------- | -------------------------------- | -------------------------------- |
| Relatively constant volume                  | RMS loudness analysis            | Very good                        |
| No sudden dramatic crescendos               | Detect loudness spikes and jumps | Very good                        |
| Consistent instrumentation and texture      | Spectral analysis                | Good for major changes           |
| Violins, violas, cellos, orchestral strings | AI instrument classification     | Moderate to good                 |
| No singing, speaking, or choir              | AI vocal classification          | Moderate; needs spot-checking    |
| Consistent mood and emotional intensity     | AI audio embeddings              | Approximate                      |
| No major melodic or thematic developments   | Musical structure analysis       | Difficult; requires human review |

One important distinction: **steady volume doesn't necessarily mean steady intensity**. A track can maintain almost constant loudness while developing from a melancholy cello passage into an aggressively rhythmic string ostinato.

That's why I'd measure both loudness and changes in musical texture.

### **The AI side is already quite capable**

Two particularly useful options:

- **[Essentia / MTG-Jamendo models](https://essentia.upf.edu/models.html?utm_source=chatgpt.com):** Pretrained music-tagging models with explicit labels including strings, violin, viola, cello, orchestra, and voice. These are particularly attractive for instrumentation, although installing Essentia directly on Windows is awkward; Linux or WSL is better.&#x20;

  [image](https://www.google.com/s2/favicons?domain=https://essentia.upf.edu\&sz=32)

  Essentia 2.1-beta6-dev documentation+1

- **[LAION CLAP](https://huggingface.co/laion/larger_clap_music_and_speech?utm_source=chatgpt.com):** A model that compares audio with natural-language descriptions. We can ask whether a passage more closely resembles *quiet, sustained string music*, *dramatic percussion-heavy orchestral music*, or *music containing human voices*.&#x20;

  [image](https://www.google.com/s2/favicons?domain=https://huggingface.co\&sz=32)

  Hugging Face+1



CLAP's similarity scores aren't calibrated probabilities of an instrument being present, but they're very useful for ranking candidates.

And importantly, I would analyze **short passages, not just whole files**. A 90-minute YouTube soundtrack compilation might contain thirty excellent ambient passages and a handful of unsuitable action cues. We don't want to throw out the whole recording because of those exceptions.

## **I put together a working first version**

**Soundtrack Screener — Python**

15 KB • Python script • Windows-compatible

Download soundtrack_screener.py

It uses FFmpeg to process your audio in small chunks, so it can handle long OST compilations without loading the entire recording into RAM.

I tested the signal-analysis portion against your uploaded *Last Agni Kai* mixdown, and it successfully produced a ranked set of candidate passages. The optional AI classification portion is included but hasn't been tested locally with downloaded model weights.

### **1. Install the dependencies**

You already have FFmpeg, so in PowerShell:

```
py -m pip install numpy scipy
```

For optional AI instrument and vocal recognition:

```
py -m pip install transformers torch
```

The AI model downloads its weights on first use. CPU processing works but can be considerably slower than GPU inference.

### **2. Scan your soundtrack folder**

```
py soundtrack_screener.py "D:\Projects\.CODING\toronto-rising-tts\background-music" --window 120 --step 60
```

This scans overlapping two-minute passages, advancing by one minute each time.

It generates `soundtrack_screening.csv`, sorted by stability score. The CSV includes the filename, start/end timestamps, dynamic range, loudness spikes, and a measure of changes in musical texture.

### **3. Enable AI classification**

```
py soundtrack_screener.py "D:\Projects\.CODING\toronto-rising-tts\background-music" --window 120 --step 60 --ai --ai-top 30
```

This takes the 30 most stable passages, samples each at three points, and estimates their suitability using the CLAP model.

The extra columns include:

| Column               | Meaning                                     |
| -------------------- | ------------------------------------------- |
| `strings_match`      | Relative match to string/cello descriptions |
| `voice_risk`         | Relative match to singing, choir, or speech |
| `likely_instruments` | Best-matching instrument descriptions       |
| `overall_rank`       | Combined heuristic ranking                  |

These are useful comparative scores, not definitive detections or percentages of certainty.

## **What I'd build next**

The next improvement I'd prioritize would be **a visual timeline of each recording**, where different sections are marked by their background-music suitability.

For example, imagine a hypothetical ten-minute track with the following structure:

**Illustrative soundtrack analysis**

10:00 total

0:00–2:30

Quiet strings

2:30–4:00

Brass crescendo

4:00–7:30

Sustained cello

7:30–8:30

Choir

8:30–10:00

Soft strings

Illustration only—not an analysis of an actual soundtrack.

Then we could automatically extract the promising passages with FFmpeg, preserving their original quality before you bring them into Audition for trimming, looping, and LUFS matching.

One final distinction worth emphasizing: **musical theme changes are much harder to identify than loudness changes.** A passage can move through completely different melodies while retaining similar instrumentation and spectral characteristics. The script flags large texture changes but doesn't genuinely understand compositional structure.

For that, I'd eventually add comparisons between consecutive CLAP audio embeddings, plus manual labels from tracks you've already approved.

And that's where this could get particularly powerful: **we could train or calibrate the ranking against the actual ambient music you've already selected for Toronto Rising.** Rather than defining “good background music” in the abstract, we'd be teaching the system to recognize *your specific aesthetic*: haunting, restrained, string-heavy, emotionally atmospheric, and never so dramatic that it steals the scene from your players.

That strikes me as a much more promising long-term solution than simply searching every OST for its quietest tracks.