"""Recover missing sung lines from local, word-timed transcripts without changing the audio.

Pass directories containing 01.json ... 18.json or EP-REF-SONG-001.json ...
EP-REF-SONG-102.json. Multiple independent ASR passes can cover the same song.
"""

import argparse
from collections import defaultdict
from difflib import SequenceMatcher
from hashlib import sha256
import importlib.util
from pathlib import Path
import re
import unicodedata

spec = importlib.util.spec_from_file_location('import_reference_songs', Path(__file__).with_name('import-reference-songs.py'))
library = importlib.util.module_from_spec(spec)
spec.loader.exec_module(library)
HANDOFF, PUBLIC, QA = library.HANDOFF, library.PUBLIC, library.QA
read_json, tokens, write_json = library.read_json, library.tokens, library.write_json
NEGATIONS = {'no', 'not', 'never', 'cant', 'cannot', 'dont', 'doesnt', 'didnt', 'wont', 'isnt', 'arent', 'wasnt', 'werent'}


def normal(text):
    return ''.join(char for char in unicodedata.normalize('NFKD', text.casefold())
                   if char.isascii()).replace("'", "")


def token_spans(text):
    for word in re.finditer(r"[^\W_]+(?:(?:'|’)\w+)*", text, re.UNICODE):
        normalized = normal(word[0])
        parts = list(tokens(normalized))
        for part, _, _ in parts:
            yield part, *word.span()


def transcript(rows):
    words = []
    places = defaultdict(list)
    for row in rows:
        start, end = round(row['start'] * 1000), round(row['end'] * 1000)
        if end <= start or start < 0:
            continue
        for key, _, _ in token_spans(row['word']):
            places[key].append(len(words))
            words.append((key, start, end, row['probability']))
    return words, places


def is_vocal(text):
    return bool(text.strip()) and not text.strip().startswith('[')


def editable_gaps(cues, duration):
    end = 0
    gaps = []
    for cue in sorted(cues, key=lambda row: row['start_ms']):
        if cue['start_ms'] - end >= 500:
            gaps.append((end, cue['start_ms']))
        end = max(end, cue['end_ms'])
    if duration - end >= 500:
        gaps.append((end, duration))
    return gaps


def align(entry, passage, gaps):
    expected = list(token_spans(entry['en']))
    keys = [word[0] for word in expected]
    if len(keys) < 2:
        return
    words, offsets = passage
    size = len(keys)
    negatives = NEGATIONS.intersection(keys)
    # Candidate beginnings come from words distinctive to this recording.
    ranked = sorted((len(offsets[key]), position, key) for position, key in enumerate(keys) if offsets[key])
    starts = {offset - position + shift for _, position, key in ranked[:5]
              for offset in offsets[key] for shift in (-1, 0, 1)}
    starts.update(offsets[keys[0]])
    for offset in sorted(starts):
        if not 0 <= offset < len(words):
            continue
        start = words[offset][1]
        gap = next(((left, right) for left, right in gaps if left - 160 <= start < right), None)
        if not gap:
            continue
        left, right = gap
        for length in range(max(2, size - 2), size + 3):
            heard = words[offset:offset + length]
            end = heard[-1][2]
            if len(heard) != length or end > right + 160 or end - start < 300 or end - start > size * 1550 + 1300:
                continue
            if any(following[1] - word[2] > 2000 for word, following in zip(heard, heard[1:])):
                continue
            heard_keys = [word[0] for word in heard]
            exact = heard_keys == keys
            if not exact and size < 4:
                continue
            sequence = SequenceMatcher(None, keys, heard_keys, autojunk=False)
            blocks = sequence.get_matching_blocks()
            matches = sum(block.size for block in blocks)
            similarity = 2 * matches / (size + length)
            if not exact:
                matched_ends = size >= 7 and keys[:2] == heard_keys[:2] and keys[-2:] == heard_keys[-2:]
                minimum = .85 if size <= 6 else .75 if matched_ends else .79
                if similarity < minimum or matches < 4 or NEGATIONS.intersection(heard_keys) != negatives:
                    continue
            # Avoid pulling in the words of the previous or following sung line.
            if blocks[0].a > 1 or blocks[0].b > 1 or (blocks[-2].b + blocks[-2].size < length - 1):
                continue
            confidence = sum(word[3] for word in heard) / length
            if confidence < (.56 if exact else .54):
                continue
            start_ms, end_ms = max(left, start), min(right, end)
            measured = exact and confidence >= .69
            marks = []
            if measured:
                for (_, first, last), (_, word_start, word_end, probability) in zip(expected, heard):
                    if probability < .49:
                        continue
                    if marks and marks[-1][:2] == [first, last]:
                        marks[-1][3] = min(end_ms, max(marks[-1][3], word_end))
                        continue
                    word_start = max(word_start, marks[-1][3] if marks else start_ms)
                    word_end = min(word_end, end_ms)
                    if word_end > word_start:
                        marks.append([first, last, word_start, word_end])
            measured = measured and len(marks) >= min(4, len({(first, last) for _, first, last in expected}))
            score = similarity + .10 * confidence + (.22 if measured else .06 if exact else 0)
            yield score, {**entry, 'start_ms': start_ms, 'end_ms': end_ms, 'words': marks if measured else [],
                          **({} if measured else {'approximate': True})}


def choose(entries, passes, reserved, duration):
    gaps = editable_gaps(reserved, duration)
    candidates = []
    for entry in entries:
        for passage in passes:
            candidates.extend(align(entry, passage, gaps))
    selected = []
    for _, cue in sorted(candidates, key=lambda pair: (
        pair[0], len(pair[1]['en']), pair[1]['start_ms'], pair[1]['end_ms']), reverse=True):
        start, end = cue['start_ms'], cue['end_ms']
        if end - start < 260:
            continue
        if all(end <= other['start_ms'] or start >= other['end_ms'] for other in selected):
            selected.append(cue)
    return sorted(selected, key=lambda cue: cue['start_ms'])


def foundation_entries(content):
    lines = content['text'].split('\n')
    entries = {}
    for index, line in enumerate(lines):
        if is_vocal(line):
            entries.setdefault(line, {'en': line, 'sourceLine': index})
    return list(entries.values())


def reference_entries(song, translations):
    prompt = (HANDOFF / song['promptPath']).read_text('utf-8').split('\nLyrics:\n', 1)[1]
    entries = {text: {'en': text, 'ar': translations['lyrics'][text]}
               for text in prompt.splitlines() if text in translations['lyrics']}
    for text, arabic in translations.get('recordedLyrics', {}).get(song['id'], {}).items():
        entries[text] = {'en': text, 'ar': arabic}
    for example in song['examples']:
        text = example['english']
        entries[text] = {'en': text, 'ar': example['arabic'], 'referenceId': example['referenceId']}
    return list(entries.values())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('transcripts', nargs='+', type=Path)
    parser.add_argument('--write', action='store_true', help='write the acoustic recovery data to public/')
    args = parser.parse_args()
    foundation = read_json(PUBLIC / 'song-library.json')
    references = read_json(PUBLIC / 'reference-song-library.json')
    lyrics = read_json(PUBLIC / 'song-lyrics.json')
    timings = read_json(PUBLIC / 'song-timing.json')
    ref_sync = read_json(PUBLIC / 'reference-song-sync.json')
    lyrics.update(ref_sync['lyrics'])
    timings.update(ref_sync['timings'])
    extras = read_json(PUBLIC / 'reference-song-extras.json')
    plans = {song['id']: song for song in read_json(HANDOFF / 'manifest.json')['songs']}
    translations = read_json(QA / 'reference-song-lyrics-ar.json')
    durations = {track['id']: track['durationMs'] for track in read_json(QA / 'reference-songs-20261124.json')}
    recovered = {}
    for song in foundation + references:
        key = song['id']
        timing = timings[key]
        names = [key + '.json', 'refined-' + key + '.json']
        inputs = [folder / name for folder in args.transcripts for name in names if (folder / name).is_file()]
        if not inputs:
            raise ValueError(f'No transcript for {key}')
        passes = [transcript(read_json(file)) for file in inputs]
        reserved = list(timing['lines'])
        reserved.extend(example for example in extras.get(key, {}).get('examples', []) if 'start_ms' in example)
        entries = reference_entries(plans[key], translations) if key in plans else foundation_entries(lyrics[key])
        duration = durations.get(key, song['duration'] * 1000)
        cues = choose(entries, passes, reserved, duration)
        if cues:
            digest = sha256((PUBLIC / song['path']).read_bytes()).hexdigest()
            if digest != timing['sha256']:
                raise ValueError(f'Recording changed since the original alignment: {key}')
            recovered[key] = {'sha256': digest, 'cues': cues}
        print(f'{key}: {len(cues)} added, {sum(bool(cue.get("approximate")) for cue in cues)} estimated', flush=True)
    if args.write:
        write_json(PUBLIC / 'song-vocal-recovery.json', recovered)


if __name__ == '__main__':
    main()
