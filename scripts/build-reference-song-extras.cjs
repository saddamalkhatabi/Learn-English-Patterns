const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../public/reference-song-library.json');
const { lyrics, timings } = require('../public/reference-song-sync.json');
const teaching = require('../public/teaching-index.json').sentences;
const { patternFocus } = require('../production/qa/reference-song-lyrics-ar.json');
const reviewed = require('../production/qa/reference-song-estimates.json');
const durations = new Map(require('../production/qa/reference-songs-20261124.json').map(track => [track.id, track.durationMs]));
const source = new Map(require('../public/source-corpus.json').sentences.map(sentence => [sentence.id, sentence]));

function markPhrases(sentence, phrases) {
 return phrases.map(phrase => {
  const start = sentence.toLowerCase().indexOf(phrase.toLowerCase());
  assert(start >= 0, sentence);
  return [start, start + phrase.length];
 }).sort((a, b) => a[0] - b[0]);
}

function highlightRange(sentence, referenceId) {
 const marks = patternFocus[referenceId];
 if (marks) return markPhrases(sentence, marks.slice(1));
 const words = [...sentence.matchAll(/\S+/g)];
 return teaching[referenceId].highlight.map(index => {
  const match = words[index];
  const leading = match[0].match(/^["'“‘]*/)[0].length;
  const word = match[0].replace(/[,.?!;:"'’”]+$/, '');
  return [match.index + leading, match.index + word.length];
 }).filter(([start, end]) => end > start);
}

function collectTrack(song) {
 const timing = timings[song.id];
 const exact = new Set(lyrics[song.id].scenes.map(scene => scene.referenceId));
 const reviewedTrack = reviewed[song.id];
 const estimates = reviewedTrack?.sha256 === timing.sha256 ? reviewedTrack.estimates : {};
 const reservations = [...timing.lines];
 const examples = song.patterns.filter(pattern => !exact.has(pattern.referenceId)).map(pattern => {
  const { referenceId } = pattern;
  const { en, ar, image } = source.get(referenceId);
  assert.equal(en, pattern.en);
  assert.equal(ar, pattern.ar);
  const { atlas, width, height, crop } = image;
  const entry = { referenceId, image: { atlas, width, height, crop },
   context: teaching[referenceId].purpose_ar, highlights: highlightRange(en, referenceId) };
  if (Object.hasOwn(estimates, referenceId)) {
   const [start_ms, end_ms] = estimates[referenceId];
   assert(Number.isInteger(start_ms) && Number.isInteger(end_ms) && start_ms >= 0 &&
    end_ms > start_ms && end_ms <= durations.get(song.id), song.id + " " + referenceId);
   assert(reservations.every(cue => end_ms <= cue.start_ms || start_ms >= cue.end_ms), song.id + " " + referenceId);
   reservations.push({ start_ms, end_ms });
   Object.assign(entry, { start_ms, end_ms });
   const alternate = reviewedTrack.alternates?.[referenceId];
   if (alternate) {
    assert(alternate.en && alternate.ar && alternate.focus.length, referenceId);
    entry.spoken = { en: alternate.en, ar: alternate.ar, highlights: markPhrases(alternate.en, alternate.focus) };
   }
  }
  return entry;
 });
 return examples.length ? [[song.id, { sha256: timing.sha256, examples }]] : [];
}

const extras = Object.fromEntries(catalog.flatMap(collectTrack));
fs.writeFileSync(path.resolve(__dirname, '../public/reference-song-extras.json'), JSON.stringify(extras) + '\n');
if (require.main === module) {
 const examples = Object.values(extras).flatMap(track => track.examples);
 console.log(`${examples.filter(example => example.start_ms != null).length} estimated timings and ${examples.length} review scenes`);
}
