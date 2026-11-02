#!/usr/bin/env python3
"""Generate actual original Kokoro-82M narration from versioned lesson scripts.

Output: assets/audio/<lesson-id>/intro.mp3 and scene-1-1.mp3 ... scene-1-4.mp3
Optional --full writes all 36 scene voice clips (rather than just the 12 beginner clips).
Only report clips as generated when this script exits successfully and files exist.
"""
from __future__ import annotations
import argparse
import json
import pathlib
import subprocess
import sys
import numpy as np
import soundfile as sf
from kokoro import KPipeline

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio"
RATE = 24000

def write_clip(pipeline, voice: str, text: str, out: pathlib.Path):
    if out.exists() and out.stat().st_size > 1024:
        print(f"REUSED {out.relative_to(ROOT)}", flush=True)
        return False
    chunks = []
    for graphemes, phonemes, audio in pipeline(text, voice=voice, speed=0.96):
        arr = np.asarray(audio, dtype=np.float32).flatten()
        if arr.size:
            chunks.append(arr)
    if not chunks:
        raise RuntimeError(f"No Kokoro audio produced for {out}: {text!r}")
    gap = np.zeros(int(0.085 * RATE), np.float32)
    wave = np.concatenate(
        [segment for i, chunk in enumerate(chunks) for segment in ((gap, chunk) if i else (chunk,))]
    )
    peak = max(float(np.max(np.abs(wave))), 0.001)
    if peak > 0.95:
        wave *= 0.95 / peak
    fade = min(int(0.012 * RATE), wave.size // 2)
    if fade:
        wave[:fade] *= np.linspace(0, 1, fade)
        wave[-fade:] *= np.linspace(1, 0, fade)
    out.parent.mkdir(parents=True, exist_ok=True)
    wav = out.with_suffix(".wav")
    sf.write(wav, wave, RATE)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
         "-c:a", "libmp3lame", "-qscale:a", "5", str(out)], check=True
    )
    wav.unlink(missing_ok=True)
    print(f"CREATED {out.relative_to(ROOT)} {out.stat().st_size} bytes", flush=True)
    return True

def main():
    arg = argparse.ArgumentParser()
    arg.add_argument("--full", action="store_true", help="Generate all three depths")
    arg.add_argument("--stories", action="store_true", help="Narrate all story chapters and dialogues with Kokoro")
    a = arg.parse_args()
    data = json.loads((ROOT / "data" / "lessons.json").read_text("utf-8"))
    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    count = 0
    for li, lesson in enumerate(data["lessons"]):
        lid = lesson["id"]
        # Use one consistent narrator for the English explanation.
        count += int(write_clip(pipeline, "af_heart", lesson["explanationEn"], OUT / lid / "intro.mp3"))
        for depth, level in enumerate(lesson["levels"]):
            if depth > 0 and not a.full:
                continue
            for i, scene in enumerate(level["scenes"], start=1):
                # Alternate two natural English voices for variety.
                voice = "af_bella" if (li + i) % 2 else "am_adam"
                count += int(write_clip(pipeline, voice, scene["en"], OUT / lid / f"scene-{depth+1}-{i}.mp3"))
    if a.stories:
        stories = json.loads((ROOT / "data" / "stories.json").read_text("utf-8"))["lessons"]
        for li, lesson in enumerate(data["lessons"]):
            lid = lesson["id"]
            content = stories[lid]
            for depth, chapter in enumerate(content["levels"], start=1):
                for i, line in enumerate(chapter["lines"], start=1):
                    voice = "af_bella" if i % 2 else "am_adam"
                    count += int(write_clip(pipeline, voice, line["en"], OUT / lid / f"story-{depth}-{i}.mp3"))
            for i, line in enumerate(content["dialogue"], start=1):
                voice = "af_bella" if i % 2 else "am_adam"
                count += int(write_clip(pipeline, voice, line["en"], OUT / lid / f"dialogue-{i}.mp3"))
    print(f"New Kokoro MP3 recordings created: {count}.", flush=True)

if __name__ == "__main__":
    main()

