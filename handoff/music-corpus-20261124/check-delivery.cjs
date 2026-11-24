const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const { readdir, stat } = require('node:fs/promises');
const path = require('node:path');
const { songs } = require('./manifest.json');

const inbox = process.argv[2];

async function sha256(file) {
 const hash = createHash('sha256');
 for await (const chunk of createReadStream(file)) hash.update(chunk);
 return hash.digest('hex');
}

function list(heading, items) {
 if (items.length === 0) return;
 console.log(`\n${heading} (${items.length})`);
 for (const item of items) console.log(`  ${item}`);
}

async function checkDelivery(folder) {
 const entries = await readdir(folder, { withFileTypes: true });
 const names = entries.filter(entry => entry.isFile()).map(entry => entry.name);
 const received = new Set(names);
 const expectedById = new Map(songs.map(song => [song.id, song.expectedAudioFilename]));
 const expectedNames = new Set(expectedById.values());
 const alternates = new Map();
 const unexpected = [];
 for (const name of names.sort()) {
  if (expectedNames.has(name)) continue;
  const id = name.match(/\bEP-REF-SONG-\d{3}(?!\d)/i)?.[0].toUpperCase();
  if (expectedById.has(id)) {
   const files = alternates.get(id) ?? [];
   files.push(name);
   alternates.set(id, files);
  } else if (path.extname(name).toLowerCase() === '.mp3') {
   unexpected.push(name);
  }
 }

 const missing = [];
 const needsRename = [];
 const extraCopies = [];
 const empty = [];
 const unreadable = [];
 const firstByHash = new Map();
 const identical = [];
 let found = 0;
 for (const { id, expectedAudioFilename: name } of songs) {
  const candidates = alternates.get(id) ?? [];
  if (!received.has(name)) {
   if (candidates.length) needsRename.push(`${name} <- ${candidates.join(' | ')}`);
   else missing.push(name);
   continue;
  }
  if (candidates.length) extraCopies.push(`${name} + ${candidates.join(' | ')}`);

  found++;
  const fullPath = path.join(folder, name);
  try {
   if ((await stat(fullPath)).size === 0) {
    empty.push(name);
    continue;
   }
   const digest = await sha256(fullPath);
   const first = firstByHash.get(digest);
   if (first) identical.push(`${first} = ${name}`);
   else firstByHash.set(digest, name);
  } catch (error) {
   unreadable.push(`${name} (${error.code ?? error.message})`);
  }
 }

 console.log(`${found}/${songs.length} expected MP3 filenames found.`);
 list('Missing with no matching track ID', missing);
 list('Expected names missing; check these files with matching IDs', needsRename);
 list('Extra files carrying an already matched track ID', extraCopies);
 list('Unexpected MP3 filenames', unexpected);
 list('Empty MP3 files', empty);
 list('Unreadable MP3 files', unreadable);
 list('Byte-identical files under different expected names', identical);

 const issues = [missing, needsRename, extraCopies, unexpected, empty, unreadable, identical];
 if (issues.some(items => items.length > 0)) process.exitCode = 1;
 else console.log('Delivery names are complete. Review the recordings by listening before import.');
}

if (inbox) {
 checkDelivery(path.resolve(inbox)).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
 });
} else {
 console.error('Usage: node check-delivery.cjs "path/to/recordings"');
 process.exitCode = 1;
}
