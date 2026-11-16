"""Produce and align American-wording recordings using the project's Adam/Bella voices."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import torch

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
sys.path.insert(0, str(ROOT / ".media-tools/scripts/upstream"))
from acoustic_pattern_fallback import ForcedAligner
import generate_audio
from kokoro import KPipeline

VOICES = {"male": "am_adam", "female": "af_bella"}
BYTES_PER_MS = 48  # 24 kHz, mono, signed 16-bit PCM.


def decode(path):
    return subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(path),
                                    "-ar", "24000", "-ac", "1", "-f", "s16le", "-"])


def publish(path, label):
    audio = path.read_bytes()
    digest = hashlib.sha256(audio).hexdigest()
    relative = f"assets/audio/english-{label}-{digest[:12]}.mp3"
    (PUBLIC / relative).write_bytes(audio)
    return {"path": relative, "sha256": digest,
            "duration_ms": round(len(decode(path)) / BYTES_PER_MS)}


def main():
    plan = json.loads(subprocess.check_output(["node", "scripts/plan-english-audio.cjs"], cwd=ROOT))
    torch.set_num_threads(2)
    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M", device="cpu")
    aligner = ForcedAligner()
    output = {"schema": 1, "sentences": {}, "dialogues": {}}
    with tempfile.TemporaryDirectory() as directory:
        generate_audio.ROOT = Path(directory)
        clip = Path(directory) / "clip.mp3"

        def record(text, voice):
            clip.unlink(missing_ok=True)
            generate_audio.write_clip(pipeline, VOICES[voice], text, clip)
            pcm = decode(clip)
            end_ms = round(len(pcm) / BYTES_PER_MS)
            words = [{"start_ms": start, "end_ms": min(end, end_ms)}
                     for _, start, end in aligner.align(clip, text)]
            assert len(words) == len(text.split())
            assert all(0 <= word["start_ms"] < word["end_ms"] <= end_ms for word in words)
            return pcm, words

        for sentence in plan["sentences"]:
            sentence_id, text = sentence["id"], sentence["text"]
            output["sentences"][sentence_id] = {}
            for voice, voice_id in VOICES.items():
                _, words = record(text, voice)
                output["sentences"][sentence_id][voice] = {
                    **publish(clip, f"{sentence_id}-{voice}"), "text": text, "voice_id": voice_id,
                    "status": "structurally_verified", "words": words,
                }
        for dialogue in plan["dialogues"]:
            source = decode(PUBLIC / dialogue["originalPath"]) if dialogue.get("originalPath") else None
            parts, cues = [], []
            offset = 0
            gap = bytes(BYTES_PER_MS * 300)
            for segment in dialogue["segments"]:
                prior = segment["reuse"]
                if prior:
                    start, end = prior["start_ms"], prior["end_ms"]
                    pcm = source[start * BYTES_PER_MS:end * BYTES_PER_MS]
                    words = [{"start_ms": word["start_ms"] - start, "end_ms": word["end_ms"] - start}
                             for word in prior["words"]]
                else:
                    pcm, words = record(segment["text"], segment["voice"])
                start = round(offset / BYTES_PER_MS)
                end = round((offset + len(pcm)) / BYTES_PER_MS)
                cues.append({"start_ms": start, "end_ms": end, "words": [
                    {"start_ms": start + word["start_ms"], "end_ms": min(end, start + word["end_ms"])}
                    for word in words]})
                parts.extend((pcm, gap))
                offset += len(pcm) + len(gap)
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", "24000",
                            "-ac", "1", "-i", "-", "-c:a", "libmp3lame", "-b:a", "64k", str(clip)],
                           input=b"".join(parts[:-1]), check=True)
            recording = publish(clip, f"dialogue-{dialogue['id']}")
            assert abs(recording["duration_ms"] - cues[-1]["end_ms"]) <= 2
            output["dialogues"][dialogue["id"]] = {**recording, "title": dialogue["title"],
                "signature": dialogue["signature"], "intro": cues[0], "turns": cues[1:]}
    (PUBLIC / "english-usage-audio.json").write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
