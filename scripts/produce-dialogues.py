"""Synthesize with Adam/Bella and publish one aligned MP3 per conversation."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
TOOLS = ROOT / '.media-tools/scripts'
sys.path.insert(0, str(TOOLS))
from recording_validation import VOICES, validate


def pcm(path):
    return subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
                                    '-ar', '24000', '-ac', '1', '-f', 's16le', '-'])


def main():
    output = PUBLIC / 'dialogue-audio.json'
    published = json.loads(output.read_text(encoding='utf-8'))
    dialogues = json.loads((PUBLIC / 'dialogues.json').read_text(encoding='utf-8'))['dialogues']
    catalog = {}
    for name in ('pilot', 'supplement', 'source-corpus'):
        for row in json.loads((PUBLIC / (name + '.json')).read_text(encoding='utf-8'))['sentences']:
            for voice, recording in row['recordings'].items():
                catalog[(row['en'], voice)] = recording
    model = None
    result = {}
    for dialogue in dialogues:
        key = dialogue['id']
        assert re.fullmatch(r'[a-z0-9-]+', key) and key not in result
        signature = [[line['en'], line['voice']] for line in dialogue['lines']]
        prior = published.get(key, {})
        path = prior.get('path', '')
        assert not path or re.fullmatch(rf'assets/audio/dialogue-{key}-[0-9a-f]{{12}}\.mp3', path)
        target = PUBLIC / path
        if target.is_file() and prior.get('signature') == signature and prior.get('sha256') == hashlib.sha256(target.read_bytes()).hexdigest():
            result[key] = prior
            continue
        parts = []
        turns = []
        offset_bytes = 0
        gap = bytes(48 * 300)
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            temp = Path(directory)
            for index, (english, voice) in enumerate(signature):
                recording = catalog.get((english, voice))
                clip = PUBLIC / recording['path'] if recording else None
                if recording and validate(recording, clip, english, voice, probe=False):
                    cues = [[word['start_ms'], word['end_ms']] for word in recording['words']]
                else:
                    if model is None:
                        sys.path.insert(0, str(TOOLS / 'upstream'))
                        import torch
                        from kokoro import KPipeline
                        from acoustic_pattern_fallback import ForcedAligner
                        import generate_audio
                        generate_audio.ROOT = ROOT
                        torch.set_num_threads(2)
                        model = (KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M'),
                                 ForcedAligner(), generate_audio.write_clip)
                    pipeline, aligner, write_clip = model
                    clip = temp / f'{index}.mp3'
                    write_clip(pipeline, VOICES[voice], english, clip)
                    cues = [[start, end] for _, start, end in aligner.align(clip, english)]
                raw = pcm(clip)
                start = round(offset_bytes / 48)
                end = round((offset_bytes + len(raw)) / 48)
                assert len(cues) == len(english.split()), (key, index, cues)
                words = [{'start_ms': start + a, 'end_ms': min(start + b, end)} for a, b in cues]
                assert all(start <= w['start_ms'] < w['end_ms'] <= end for w in words), (key, index)
                turns.append({'start_ms': start, 'end_ms': end, 'words': words})
                parts.extend((raw, gap))
                offset_bytes += len(raw) + len(gap)
                print(f'{key}: aligned turn {index + 1} ({voice})', flush=True)
            rendered = temp / 'conversation.mp3'
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1',
                            '-i', '-', '-c:a', 'libmp3lame', '-b:a', '64k', str(rendered)],
                           input=b''.join(parts[:-1]), check=True)
            duration = round(len(pcm(rendered)) / 48)
            assert abs(duration - turns[-1]['end_ms']) <= 2
            data = rendered.read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            path = f'assets/audio/dialogue-{key}-{digest[:12]}.mp3'
            (PUBLIC / path).write_bytes(data)
            result[key] = {'path': path, 'sha256': digest, 'duration_ms': duration,
                           'signature': signature, 'turns': turns}
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
