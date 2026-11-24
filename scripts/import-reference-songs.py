"""Import a verified sequence of reference songs from timestamped word transcripts."""

import argparse
from collections import defaultdict
from hashlib import sha256
import json
from pathlib import Path
import re
from shutil import copyfile
from subprocess import check_output


ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
HANDOFF = ROOT / 'handoff/music-corpus-20261124'
QA = ROOT / 'production/qa'
TOKEN = re.compile(r"\d+:\d+|[a-zA-Z0-9]+(?:['’][a-zA-Z]+)*")
READINGS = {'2:30': ('two', 'thirty'), '2': ('two',), '30': ('thirty',), 'atm': ('a', 't', 'm')}
TIMESTAMP_JITTER_MS = 100


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n',
                    encoding='utf-8', newline='\n')


def tokens(text):
    for match in TOKEN.finditer(text):
        key = match[0].lower().replace('’', "'")
        for part in READINGS.get(key, (key,)):
            yield part, *match.span()


def prepared_transcript(rows):
    words = [(token, round(row['start'] * 1000), round(row['end'] * 1000), row['probability'])
             for row in rows for token, _, _ in tokens(row['word'])]
    offsets = defaultdict(list)
    for index, word in enumerate(words):
        offsets[word[0]].append(index)
    return words, offsets


def matches(text, transcript):
    expected = list(tokens(text))
    if not expected:
        return
    words, offsets = transcript
    target = [item[0] for item in expected]
    count = len(target)
    for offset in offsets[target[0]]:
        window = words[offset:offset + count]
        if [word[0] for word in window] != target:
            continue
        start, end = window[0][1], window[-1][2]
        confidence = sum(word[3] for word in window) / count
        if not 240 <= end - start <= 1850 * count + 1500 or confidence < 0.55:
            continue
        # Acronyms and written numerals can share one ASR word interval.
        if any(not -TIMESTAMP_JITTER_MS <= following[1] - word[2] <= 2100 and following[1:3] != word[1:3]
               for word, following in zip(window, window[1:])):
            continue
        measured = {}
        for (_, first, last), (_, word_start, word_end, probability) in zip(expected, window):
            if probability < 0.50 or word_end <= word_start:
                continue
            previous = measured.get((first, last))
            measured[first, last] = [first, last, previous[2] if previous else word_start, word_end]
        timed_words = []
        for first, last, word_start, word_end in measured.values():
            if timed_words:
                word_start = max(word_start, timed_words[-1][3])
            if word_end > word_start:
                timed_words.append([first, last, word_start, word_end])
        if timed_words:
            yield {'start_ms': start, 'end_ms': end, 'words': timed_words}, confidence


def select_cues(candidates):
    # Favor a reference sentence over a coincidental fragment of a lyric.
    candidates.sort(key=lambda item: (
        bool(item['entry'].get('referenceId')), len(list(tokens(item['entry']['english']))), item['confidence']
    ), reverse=True)
    chosen = []
    for candidate in candidates:
        cue = candidate['cue']
        if all(cue['end_ms'] <= other['cue']['start_ms'] + TIMESTAMP_JITTER_MS or
               cue['start_ms'] >= other['cue']['end_ms'] - TIMESTAMP_JITTER_MS
               for other in chosen):
            chosen.append(candidate)
    return sorted(chosen, key=lambda item: item['cue']['start_ms'])


def highlight(text, indexes):
    words = list(re.finditer(r'\S+', text))
    result = []
    previous = -2
    for index in indexes:
        assert 0 <= index < len(words), (text, index)
        word = words[index]
        start = word.start() + len(word[0]) - len(word[0].lstrip('"\'‘“'))
        end = word.start() + len(word[0].rstrip(',.?!;:"\'’”'))
        if end <= start:
            continue
        if index == previous + 1:
            result[-1][1] = end
        else:
            result.append([start, end])
        previous = index
    return result


def reference_highlight(ref, text, teaching, focus):
    if ref not in focus:
        return highlight(text, teaching[ref]['highlight'])
    ranges = []
    for phrase in focus[ref][1:]:
        found = re.search(r'(?<!\w)' + re.escape(phrase) + r'(?!\w)', text, re.I)
        assert found, (ref, phrase)
        ranges.append(list(found.span()))
    return sorted(ranges)


def compile_song(song, candidates, source_rows, teaching, focus):
    text, scenes, translations, highlights, timing = [], [], {}, {}, []
    for item in select_cues(candidates):
        cue = item['cue']
        entry = item['entry']
        if timing:
            start = max(cue['start_ms'], timing[-1]['end_ms'])
            words = [[first, last, max(word_start, start), end]
                     for first, last, word_start, end in cue['words'] if end > start]
            if not words:
                continue
            cue = {**cue, 'start_ms': start, 'words': words}
        if timing and cue['start_ms'] - timing[-1]['end_ms'] > 3500:
            text.append('')
        line = len(text)
        text.append(entry['english'])
        translations[line] = entry['arabic']
        timing.append({'line': line, **cue})
        ref = entry.get('referenceId')
        if ref:
            row = source_rows[ref]
            image = row['image']
            assert row['en'] == entry['english'] and row['ar'] == entry['arabic'], ref
            assert (PUBLIC / image['atlas']).is_file(), ref
            highlights[line] = reference_highlight(ref, row['en'], teaching, focus)
            scenes.append({'line': line, 'referenceId': ref, 'sentenceId': ref,
                           'context': teaching[ref]['purpose_ar'],
                           'image': {key: image[key] for key in ('atlas', 'width', 'height', 'crop')}})
    examples = {scene['referenceId'] for scene in scenes}
    omitted = [entry['referenceId'] for entry in song['examples'] if entry['referenceId'] not in examples]
    return dict(text='\n'.join(text), translations=translations, highlights=highlights, scenes=scenes), timing, omitted


def import_songs(mapping, source_dir, transcripts, minimum_passes):
    plan = read_json(HANDOFF / 'manifest.json')['songs']
    by_id = {song['id']: song for song in plan}
    source_rows = {row['id']: row for row in read_json(PUBLIC / 'source-corpus.json')['sentences']}
    teaching = read_json(PUBLIC / 'teaching-index.json')['sentences']
    translations = read_json(QA / 'reference-song-lyrics-ar.json')
    topics = translations['topics']
    lines_ar = translations['lyrics']
    focus = translations['patternFocus']
    catalog, lyrics, timings, audit, copies = [], {}, {}, [], []
    assert len({row['id'] for row in mapping}) == len(mapping)
    for intake in sorted(mapping, key=lambda row: by_id[row['id']]['songOrder']):
        song = by_id[intake['id']]
        name = song['id']
        inputs = [folder / (name + '.json') for folder in transcripts if (folder / (name + '.json')).is_file()]
        if len(inputs) < minimum_passes:
            continue
        recognized = [prepared_transcript(read_json(file)) for file in inputs]
        proposal = sorted((sum(any(next(matches(row['english'], words), None) for words in recognized)
                               for row in other['examples']), other['id']) for other in plan)
        count, match_id = proposal[-1]
        assert match_id == name and count >= 4 and count > proposal[-2][0], (name, proposal[-3:])

        source = source_dir / intake['source']
        length = float(check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                     '-of', 'default=nw=1:nk=1', str(source)], text=True).strip())
        duration_ms = round(length * 1000)
        digest = sha256(source.read_bytes()).hexdigest()
        prompt = (HANDOFF / song['promptPath']).read_text(encoding='utf-8').split('\nLyrics:\n', 1)[1]
        entries = {line: {'english': line, 'arabic': lines_ar[line]} for line in prompt.splitlines()
                   if line in lines_ar}
        entries.update({entry['english']: entry for entry in song['examples']})
        candidates = [dict(entry=entry, cue=cue, confidence=confidence) for entry in entries.values()
                      for words in recognized for cue, confidence in matches(entry['english'], words)
                      if cue['end_ms'] <= duration_ms]
        content, cues, missing = compile_song(song, candidates, source_rows, teaching, focus)
        assert len(song['examples']) - len(missing) >= 4, name
        lyrics[name] = content
        timings[name] = {'sha256': digest, 'lines': cues}
        asset = f"assets/audio/songs/{song['expectedAudioFilename']}"
        topic_index = song['songOrder'] - 1
        topic_en = topics[topic_index] if topic_index < len(topics) else next(
            line for line in prompt.splitlines() if line and not line.startswith('['))
        patterns = []
        for row in song['examples']:
            ref = row['referenceId']
            form = focus[ref][0] if ref in focus else teaching[ref]['form']
            patterns.append({'referenceId': ref, 'en': row['english'], 'ar': row['arabic'], 'form': form})
        catalog.append({'id': name, 'collection': 'reference', 'number': f"{song['songOrder']:03}",
                        'title': song['title'], 'level': song['level'], 'topicAr': song['purposeAr'],
                        'topicEn': topic_en, 'duration': round(length), 'path': asset,
                        'patterns': patterns})
        audit.append({'id': name, 'sourceFilename': intake['source'], 'sourceCreationUtc': intake['createdUtc'],
                      'durationMs': duration_ms, 'sha256': digest, 'matchedLines': len(cues),
                      'timedWords': sum(len(cue['words']) for cue in cues), 'matchingTranscriptPasses': len(inputs),
                      'matchedExamples': len(song['examples']) - len(missing), 'untimedReferences': missing})
        copies.append((source, PUBLIC / asset))
        print(name, audit[-1]['matchedExamples'], '/', len(song['examples']), len(cues), 'lines', missing)

    return catalog, {'lyrics': lyrics, 'timings': timings}, audit, copies


def publish_songs(catalog, sync, audit, copies):
    catalog_path = PUBLIC / 'reference-song-library.json'
    sync_path = PUBLIC / 'reference-song-sync.json'
    audit_path = QA / 'reference-songs-20261124.json'
    if catalog_path.is_file():
        catalog = sorted({row['id']: row for row in read_json(catalog_path) + catalog}.values(),
                         key=lambda row: row['id'])
        previous = read_json(sync_path)
        sync = {key: {**previous[key], **rows} for key, rows in sync.items()}
        audit = sorted({row['id']: row for row in read_json(audit_path) + audit}.values(),
                       key=lambda row: row['id'])
    for source, destination in copies:
        copyfile(source, destination)
    write_json(catalog_path, catalog)
    write_json(sync_path, sync)
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mapping', type=Path, help='JSON list mapping planned ids to source filenames and creation times')
    parser.add_argument('source', type=Path, help='folder containing the source recordings')
    parser.add_argument('transcripts', nargs='+', type=Path, help='folders with per-ID, word-timed transcription JSON')
    parser.add_argument('--min-passes', type=int, default=1)
    parser.add_argument('--publish', action='store_true', help='copy audio and update the release manifests')
    args = parser.parse_args()
    mapping = read_json(args.mapping)
    catalog, sync, audit, copies = import_songs(mapping, args.source, args.transcripts, args.min_passes)
    print(f"{len(catalog)}/{len(mapping)} recordings; {sum(row['matchedExamples'] for row in audit)} synced examples")
    if args.publish:
        assert len(catalog) == len(mapping), 'Complete the requested transcripts before publication'
        publish_songs(catalog, sync, audit, copies)


if __name__ == '__main__':
    main()
