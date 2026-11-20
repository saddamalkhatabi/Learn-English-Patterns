const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const songs = require('../public/song-library.json');
const teaching = require('../public/teaching-index.json').sentences;
const sentences = [
 ...require('../public/pilot.json').sentences,
 ...require('../public/expansion-media.json').sentences
];
const source = path.join(__dirname, '../handoff/music-pilot-20261120');
const prompts = fs.readdirSync(source).filter(name => /^EP-SONG-\d{2}-.+\.txt$/.test(name));
const sentenceIds = new Map(sentences.map(row => [`${row.pattern_id}|${row.en}`, row.id]));

// The general teaching index marks lead-ins. These examples also need
// connectors, the second part of a construction, or a more precise span.
const fixedPhrases = {
 103: ["I'm"],
 104: ['It is'],
 114: ["What's", 'name'],
 9050: ['please'],
 9031: ['every day'],
 9032: ['At night'],
 9034: ['on weekends'],
 9065: ['Does she'],
 9074: ['I went to'],
 9097: ['starts at'],
 10: ['It takes', 'to'],
 9140: ['because'],
 9141: ['because of'],
 9142: ['so'],
 9143: ["That's why"],
 9144: ['so that', 'can'],
 9145: ['to'],
 9148: ['but'],
 9149: ['However'],
 9151: ['instead of'],
 9153: ['not only', 'but also'],
 9154: ['For example'],
 9155: ['such as'],
 9156: ['unless'],
 9165: ['that'],
 9166: ['where'],
 9167: ['the day when'],
 9104: ['If', "I'll"],
 9105: ['When', "I'll"],
 9106: ['As soon as', "I'll"],
 9120: ['I prefer', 'to'],
 9169: ['If I were', 'I would'],
 9170: ['If', 'had', 'would have'],
 9175: ['the more']
};

function highlightRanges({id, en}) {
 const phrases = fixedPhrases[id];
 if (phrases) {
  return phrases.flatMap(phrase => {
   const literal = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   const matches = [...en.matchAll(new RegExp(`\\b${literal}\\b`, 'gi'))];
   assert(matches.length, `Song pattern ${id} is missing "${phrase}"`);
   return matches.map(match => [match.index, match.index + match[0].length]);
  }).sort(([a], [b]) => a - b);
 }

 const sentenceId = sentenceIds.get(`${id}|${en}`);
 const indexes = teaching[sentenceId]?.highlight;
 assert(indexes?.length, `Song pattern ${id} needs a highlight for "${en}"`);
 const words = [...en.matchAll(/\S+/g)];
 const ranges = [];
 for (const [position, index] of indexes.entries()) {
  const word = words[index];
  assert(word, `Song pattern ${id} has an invalid word index`);
  const end = word.index + word[0].replace(/[^\p{L}\p{N}]+$/u, '').length;
  if (position && indexes[position - 1] + 1 === index) ranges.at(-1)[1] = end;
  else ranges.push([word.index, end]);
 }
 return ranges;
}

const lyrics = {};
assert.equal(prompts.length, songs.length);
for (const song of songs) {
 const prompt = prompts.find(name => name.startsWith(`EP-SONG-${song.id}-`));
 assert(prompt, `Song ${song.id} has no lyrics source`);
 const text = fs.readFileSync(path.join(source, prompt), 'utf8')
  .replace(/\r\n/g, '\n').split(/^Lyrics:\n/m)[1]?.trim();
 assert(text, `Lyrics section is missing in ${prompt}`);
 const lines = text.split('\n');
 const highlights = {};
 for (const pattern of song.patterns) {
  const line = lines.indexOf(pattern.en);
  assert(line >= 0, `Song ${song.id} is missing "${pattern.en}"`);
  highlights[line] = highlightRanges(pattern);
 }
 lyrics[song.id] = {text, highlights};
}
fs.writeFileSync(path.join(__dirname, '../public/song-lyrics.json'), JSON.stringify(lyrics, null, 2) + '\n');
console.log(`Built lyrics for ${songs.length} songs`);
