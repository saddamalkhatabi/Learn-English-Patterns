const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { cueId, purposePrompt } = require('../public/reference-study-audio.js');
const { describeReference } = require('../public/teaching-core.js');
const purposeTree = require('../public/purpose-tree.js');
const english = require('../public/english-usage.js');
const coursePrompts = require('../public/course-purpose-prompts.js');
const referencePrompts = require('../public/reference-purpose-context.js');
const audio = require('../public/training-audio.json');
const recordedCoursePurposes = require('../production/qa/song-study-purposes.json');
const purposeTiming = require('../production/qa/song-study-purpose-timing.json');
const usageAudio = require('../public/english-usage-audio.json').sentences;
const foundation = require('../public/song-library.json');
const references = require('../public/reference-song-library.json');
const lyrics = require('../public/song-lyrics.json');
const courseRows = ['pilot', 'expansion-media', 'supplement'].flatMap(name => require('../public/' + name + '.json').sentences);
const referenceRows = require('../public/source-corpus.json').sentences;
const catalog = require('../public/pattern-catalog.json').patterns;
const courseById = new Map(courseRows.map(row => [row.id, row]));
const referencesById = new Map(referenceRows.map(row => [row.id, row]));
const referencesByText = new Map(referenceRows.map(row => [row.en, row]));
const courseMain = new Map(catalog.map(row => [
 row.planned_pattern_id || row.id,
 row.published_sentence_ids?.[0] || row.examples[0]?.id,
]));

function referencePurpose(row, guide) {
 const authored = referencePrompts[row.id];
 return authored ? { ar: authored[0], en: authored[1] } : purposePrompt(row, guide);
}

function recordedPurpose(prompt) {
 const clip = audio[cueId('purpose', prompt.en, 'female')];
 return clip?.sha256 && clip.text === prompt.en ? clip : undefined;
}

function coursePurpose(pattern, row, scene, text, translations) {
 const specificRecording = recordedCoursePurposes[pattern.id];
 if (specificRecording && english.sameSpeech(specificRecording.sentence, pattern.en)) {
  return { en: specificRecording.en, ar: specificRecording.ar,
   recording: recordedPurpose(specificRecording) || specificRecording.recording };
 }
 const main = courseById.get(courseMain.get(pattern.id));
 const authored = coursePrompts[pattern.id];
 if (authored && main && english.sameSpeech(main.en, pattern.en)) return { ar: authored[0], en: authored[1] };
 const reference = referencesByText.get(pattern.en);
 if (reference) return referencePurpose(reference, describeReference(reference));
 const guide = describeReference({ ...row, grammar: row.grammar || [], purposes: row.purposes || [] });
 const specific = purposePrompt(row, guide);
 if (!english.sameSpeech(specific.en, guide.purpose_en.replace(/[.!?]?$/, mark => mark || '.')) &&
  recordedPurpose(specific)) return specific;
 return { en: text[scene.purposeLine], ar: translations[scene.purposeLine] };
}

function sentenceRecording(pattern, candidates) {
 for (const row of candidates) {
  if (!row || !english.sameSpeech(row.en, pattern.en)) continue;
  const recordings = english.projectSentence(row, usageAudio[row.id]).recordings;
  const clip = [recordings?.male, recordings?.female].find(recording => recording?.sha256 && recording.path);
  if (clip) return clip;
 }
 throw Error('No recording for song sentence '+pattern.en);
}

function wordCues(text, intervals, duration) {
 const tokens = [...text.matchAll(/\S+/gu)];
 assert.equal(intervals?.length, tokens.length, text);
 let previousEnd = 0;
 return tokens.map(([token], index) => {
  const word = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  assert(word, text);
  const from = tokens[index].index + token.indexOf(word);
  const [start, end] = intervals[index];
  assert(Number.isInteger(start) && Number.isInteger(end) && start >= previousEnd && end > start && end <= duration, text);
  previousEnd = end;
  return [from, from + word.length, start, end];
 });
}

function studyEntry(pattern, sentence, purpose, general) {
 const clip = purpose.recording || recordedPurpose(purpose);
 const timing = clip && purposeTiming[clip.path];
 assert.equal(clip?.text, purpose.en, 'Wrong purpose recording for ' + pattern.en);
 assert(timing && timing.sha256 === clip.sha256, 'Missing word timing for ' + clip.path);
 return {
  sentence: sentence.path,
  sentenceWords: wordCues(pattern.en, sentence.words?.map(word => [word.start_ms, word.end_ms]), sentence.duration_ms),
  general,
  purpose: { en: purpose.en, ar: purpose.ar, path: clip.path, words: wordCues(purpose.en, timing.words, clip.duration_ms) },
 };
}

function collect(song) {
 const foundationLyrics = lyrics[song.id];
 const text = foundationLyrics?.text.split('\n');
 return song.patterns.map((pattern, index) => {
  const { referenceId } = pattern;
  if (referenceId) {
   const row = referencesById.get(referenceId);
   const guide = describeReference(row);
   return studyEntry(pattern, sentenceRecording(pattern, [row]), referencePurpose(row, guide),
    purposeTree.forStructure(guide.construction, purposeTree.forReference(guide, row.en)));
  }
  const scene = foundationLyrics.scenes[index];
  const exactPattern = courseRows.filter(row => row.pattern_id === pattern.id && row.en === pattern.en);
  const example = courseById.get(scene.sentenceId);
  const purpose = coursePurpose(pattern, example || exactPattern[0] || pattern, scene, text, foundationLyrics.translations);
  assert(purpose.en && purpose.ar, pattern.en);
  return studyEntry(pattern, sentenceRecording(pattern, [example, ...exactPattern, referencesByText.get(pattern.en)]),
   purpose, purposeTree.forPattern(pattern.id));
 });
}

const study = Object.fromEntries([...foundation, ...references].map(song => [song.id, collect(song)]));
fs.writeFileSync(path.resolve(__dirname, '../public/song-study.json'), JSON.stringify(study) + '\n');
if (require.main === module) {
 const entries = Object.values(study).flat();
 console.log(JSON.stringify({ songs: Object.keys(study).length, sentences: entries.length,
  recordedPurposes: entries.filter(entry => entry.purpose.path).length }));
}
