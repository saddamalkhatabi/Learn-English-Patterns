"""Synthesize with Adam/Bella and publish one aligned MP3 per conversation."""
import argparse
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--shard-index', type=int, default=0)
    parser.add_argument('--shard-count', type=int, default=1)
    parser.add_argument('--output-dir', type=Path)
    args = parser.parse_args()
    if not 0 <= args.shard_index < args.shard_count:
        parser.error('shard-index must be within shard-count')
    if args.shard_count > 1 and args.output_dir is None:
        parser.error('sharded runs require a separate output directory')
    output = PUBLIC / 'dialogue-audio.json'
    published = json.loads(output.read_text(encoding='utf-8'))
    dialogues = json.loads((PUBLIC / 'dialogues.json').read_text(encoding='utf-8'))['dialogues']
    destination = args.output_dir or PUBLIC
    (destination / 'assets/audio').mkdir(parents=True, exist_ok=True)
    catalog = {}
    for name in ('pilot', 'supplement', 'source-corpus', 'expansion-media'):
        for row in json.loads((PUBLIC / (name + '.json')).read_text(encoding='utf-8'))['sentences']:
            for voice, recording in row['recordings'].items():
                catalog[(row['en'], voice)] = recording
    model = None
    def get_model():
        nonlocal model
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
        return model

    result = {}
    pending_index = 0
    for dialogue in dialogues:
        key = dialogue['id']
        assert re.fullmatch(r'[a-z0-9-]+', key) and key not in result
        signature = [[line['en'], line['voice']] for line in dialogue['lines']]
        prior = published.get(key, {})
        path = prior.get('path', '')
        assert not path or re.fullmatch(rf'assets/audio/dialogue-{key}-[0-9a-f]{{12}}\.mp3', path)
        target = PUBLIC / path
        old_signature = prior.get('signature', [])
        reusable = (target.is_file() and old_signature == signature[:len(old_signature)]
                    and len(prior.get('turns', [])) == len(old_signature)
                    and prior.get('sha256') == hashlib.sha256(target.read_bytes()).hexdigest())
        title = dialogue['en'].strip().rstrip('.!?') + '.'
        if reusable and old_signature == signature and prior.get('title') == title and prior.get('intro'):
            if args.output_dir is None:
                result[key] = prior
            continue
        selected = pending_index % args.shard_count == args.shard_index
        pending_index += 1
        if not selected:
            continue
        previous_pcm = pcm(target) if reusable else None
        parts = []
        turns = []
        offset_bytes = 0
        gap = bytes(48 * 300)
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            temp = Path(directory)
            for index, (english, voice) in enumerate([[title, 'female'], *signature]):
                recording = catalog.get((english, voice))
                clip = PUBLIC / recording['path'] if recording else None
                raw = None
                old = (prior.get('intro') if index == 0 and prior.get('title') == title
                       else prior['turns'][index - 1] if 0 < index <= len(old_signature) else None)
                if previous_pcm is not None and old:
                    start_ms, end_ms = old['start_ms'], old['end_ms']
                    raw = previous_pcm[start_ms * 48:end_ms * 48]
                    cues = [[w['start_ms'] - start_ms, w['end_ms'] - start_ms] for w in old['words']]
                elif recording and validate(recording, clip, english, voice, probe=False):
                    cues = [[word['start_ms'], word['end_ms']] for word in recording['words']]
                else:
                    pipeline, aligner, write_clip = get_model()
                    clip = temp / f'{index}.mp3'
                    write_clip(pipeline, VOICES[voice], english, clip)
                    cues = [[start, end] for _, start, end in aligner.align(clip, english)]
                if raw is None:
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
            (destination / path).write_bytes(data)
            result[key] = {'path': path, 'sha256': digest, 'duration_ms': duration,
                           'title': title, 'intro': turns[0], 'signature': signature, 'turns': turns[1:]}
    (destination / output.name).write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n',
                                           encoding='utf-8', newline='\n')
    cues = json.loads(subprocess.check_output(['node', str(ROOT / 'scripts/training-cues.cjs')]))
    cue_output = PUBLIC / 'training-audio.json'
    published_cues = json.loads(cue_output.read_text(encoding='utf-8'))
    recorded_cues = {}
    with tempfile.TemporaryDirectory(dir=ROOT) as directory:
        for key, text in cues.items():
            assert re.fullmatch(r'[a-z0-9-]+', key)
            prior = published_cues.get(key, {})
            target = PUBLIC / prior.get('path', '')
            if prior.get('text') == text and target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == prior.get('sha256'):
                if args.output_dir is None:
                    recorded_cues[key] = prior
                continue
            selected = pending_index % args.shard_count == args.shard_index
            pending_index += 1
            if not selected:
                continue
            pipeline, _, write_clip = get_model()
            clip = Path(directory) / f'{key}.mp3'
            voice = 'male' if key.startswith('comparison-') and key.endswith('-male') else 'female'
            write_clip(pipeline, VOICES[voice], text, clip)
            data = clip.read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            path = f'assets/audio/training-{key}-{digest[:12]}.mp3'
            (destination / path).write_bytes(data)
            recorded_cues[key] = {'path': path, 'sha256': digest,
                                  'duration_ms': round(len(pcm(clip)) / 48), 'text': text}
            print(f'{key}: recorded training cue', flush=True)
    (destination / cue_output.name).write_text(json.dumps(recorded_cues, indent=2, ensure_ascii=False) + '\n',
                                               encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
