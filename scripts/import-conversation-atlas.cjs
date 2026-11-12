const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { asset, webpSize } = require('./media-validation.cjs');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'production/conversation-scene-batches');
const limit = 36 * 1024;
const ffmpeg = process.env.EP_FFMPEG || 'ffmpeg';

function planAtlases(count, series) {
  assert(Number.isInteger(count) && count > 0, 'Choose a positive number of atlases');
  assert(series === 0 || [1, 2, 3].includes(series), 'Choose level 1, 2, or 3');
  const { dialogues } = require('../public/dialogues.json');
  const plan = require('../public/dialogue-plan.json');
  const levels = new Map(plan.entries.map(entry => [entry.id, entry.series ?? plan.defaultSeries]));
  const { lifecycles } = require('./conversation-scene-sources.cjs');
  const missing = dialogues.filter(dialogue => !lifecycles[dialogue.id] && (!series || levels.get(dialogue.id) === series));
  const jobs = [];
  for (let index = 0; index < Math.min(missing.length, count * 4); index += 4) {
    const stories = missing.slice(index, index + 4).map(dialogue => {
      const count = dialogue.lines.length;
      const starts = [0, Math.floor(count * .3), Math.floor(count * .6), count - 1];
      const stages = starts.map((start, i) => {
        const to = starts[i + 1] ?? count;
        return { from: start + 1, to, cue: dialogue.lines.slice(start, to).map(line => line.en).join(' ') };
      });
      return { id: dialogue.id, title: dialogue.en, stages };
    });
    const rows = stories.map((story, row) => `Row ${row + 1}: ${story.title}. ` + story.stages
      .map((stage, column) => `Column ${column + 1}: visually depict the situation or action in "${stage.cue}".`).join(' '));
    const emptyRows = Array.from({ length: 4 - stories.length }, (_, i) => `Row ${stories.length + i + 1}: neutral blank fill; this row will be discarded.`);
    const instructions = 'One wide photographic contact sheet with four equal rows and four equal columns. Clean seams at 25%, 50% and 75% with no gaps or frames. Each row is one four-shot story, keeping characters and setting consistent within that row. Modest everyday Arabic settings and loose long sleeves, with neatly worn hijabs for women. Clear objects, gestures and facial expressions for vocabulary learning. Cues are context only. No written dialogue, subtitles, overlays, readable signage, clock digits, badges or panel numbers. Never mix content across seams.';
    jobs.push({ stories, prompt: [instructions, ...rows, ...emptyRows].join('\n') });
  }
  return { total: dialogues.length, illustrated: Object.keys(lifecycles).length, pendingInSelection: missing.length, jobs };
}

function atlasDetails(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', 'The source atlas must be a PNG');
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  return { width, height, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

function inspectAtlas(file) {
  const { width, height, sha256 } = atlasDetails(file);
  const rgb = execFileSync(ffmpeg, ['-v', 'error', '-i', file, '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'],
    { maxBuffer: width * height * 4 });
  function seams(axis) {
    const extent = axis === 'x' ? width : height;
    const span = axis === 'x' ? height : width;
    const stride = axis === 'x' ? 3 : width * 3;
    return [1, 2, 3].map(part => {
      const expected = Math.round(extent * part / 4);
      const margin = Math.max(3, Math.round(extent * .025));
      const candidates = [];
      for (let position = expected - margin; position <= expected + margin; position++) {
        let change = 0;
        let light = 0;
        let dark = 0;
        for (let n = 0; n < span; n += 2) {
          const at = (axis === 'x' ? n * width + position : position * width + n) * 3;
          const r = rgb[at], g = rgb[at + 1], b = rgb[at + 2];
          change += Math.abs(r - rgb[at - stride]) + Math.abs(g - rgb[at + 1 - stride]) + Math.abs(b - rgb[at + 2 - stride]);
          if (Math.min(r, g, b) >= 245) light++;
          if (Math.max(r, g, b) <= 14) dark++;
        }
        const samples = Math.ceil(span / 2);
        candidates.push({ position, change: change / (samples * 3), divider: Math.max(light, dark) / samples });
      }
      const score = candidate => candidate.change - .45 * Math.abs(candidate.position - expected);
      const strongest = [...candidates].sort((a, b) => score(b) - score(a))[0];
      const borders = candidates.filter(candidate => candidate.divider > .94 && Math.abs(candidate.position - strongest.position) <= 9);
      if (borders.length) return [borders[0].position, borders.at(-1).position + 1];
      const split = strongest.change < 12 ? expected : strongest.position;
      return [split, split];
    });
  }
  const xs = [[0, 0], ...seams('x'), [width, width]];
  const ys = [[0, 0], ...seams('y'), [height, height]];
  const crops = Array.from({ length: 16 }, (_, index) => {
    const row = Math.floor(index / 4), column = index % 4;
    return [xs[column][1], ys[row][1], xs[column + 1][0], ys[row + 1][0]];
  });
  return { width, height, sha256, crops };
}

function importAtlas(manifestFile) {
  const { batch, atlas, conversations } = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  assert(/^[a-z0-9-]+$/.test(batch), 'Invalid batch name');
  const actual = atlasDetails(atlas.file);
  assert.equal(actual.sha256, atlas.sha256, 'The reviewed atlas differs from the file being imported');
  const publication = path.join(outputDirectory, batch + '.json');
  assert(!fs.existsSync(publication), 'This batch is already registered');
  assert(conversations.length >= 1 && conversations.length <= 4);
  const rows = new Map(require('../public/dialogues.json').dialogues.map(dialogue => [dialogue.id, dialogue]));
  const plan = new Map(require('../public/dialogue-plan.json').entries.map(entry => [entry.id, entry]));
  const { lifecycles } = require('./conversation-scene-sources.cjs');
  const files = [];
  const records = conversations.map(({ id, stages }) => {
    const dialogue = rows.get(id);
    assert(/^[a-z0-9-]+$/.test(id) && dialogue && !lifecycles[id] && stages.length === 4, id);
    let from = 1;
    return {
      id,
      goalAr: plan.get(id)?.taskAr || dialogue.ar,
      goalEn: plan.get(id)?.taskEn || dialogue.en,
      stages: stages.map(({ to, en, ar, purposeEn, purposeAr, crop, words }, i) => {
        assert(Number.isInteger(to) && from <= to && to <= dialogue.lines.length, id);
        if (i === 3) assert.equal(to, dialogue.lines.length, id);
        const [x, y, right, bottom] = crop;
        const width = right - x, height = bottom - y;
        assert(crop.length === 4 && crop.every(Number.isInteger), id);
        assert(x >= 0 && y >= 0 && right <= actual.width && bottom <= actual.height && width > height && height >= 140 && width <= 640, id);
        assert(en && ar && purposeEn && purposeAr && words.length >= 2, id);
        for (const word of words) {
          assert(word.en && word.ar && ['object', 'action', 'description', 'phrase'].includes(word.kind), id);
          assert([word.x, word.y].every(value => Number.isFinite(value) && value >= 0 && value <= 100), id);
        }
        const key = `life-${id}-${i + 1}`;
        const image = {
          id: 'conv-' + key,
          path: `assets/scenes/conversations/${key}.webp`,
          width, height, en, ar,
          sourceCrop: { canvas: [actual.width, actual.height], box: crop }
        };
        const target = asset(root, image.path);
        assert(!fs.existsSync(target), target);
        assert(!files.some(file => file.target === target), target);
        files.push({ target, crop, width, height });
        const stage = { from, to, en, ar, purposeEn, purposeAr, image, words };
        from = to + 1;
        return stage;
      })
    };
  });
  for (const [i, a] of files.entries()) {
    for (const b of files.slice(i + 1)) {
      const [ax, ay, ar, ab] = a.crop;
      const [bx, by, br, bb] = b.crop;
      assert(ar <= bx || br <= ax || ab <= by || bb <= ay, 'Reviewed crops overlap');
    }
  }

  // Encode and validate every frame before writing anything to the published archive.
  const encoded = files.map(({ crop, width, height, target }) => {
    const [x, y] = crop;
    for (const quality of [82, 75, 68, 61, 54]) {
      const bytes = execFileSync(ffmpeg, ['-v', 'error', '-i', atlas.file,
        '-vf', `crop=${width}:${height}:${x}:${y}:exact=1`, '-frames:v', '1',
        '-c:v', 'libwebp', '-compression_level', '6', '-quality', String(quality), '-f', 'webp', 'pipe:1']);
      assert.deepEqual(webpSize(bytes), [width, height]);
      if (bytes.length <= limit) return { target, bytes };
    }
    throw Error('Could not meet the 36 KiB limit: ' + target);
  });
  fs.mkdirSync(outputDirectory, { recursive: true });
  const written = [];
  try {
    for (const { target, bytes } of encoded) {
      fs.writeFileSync(target, bytes, { flag: 'wx' });
      written.push(target);
    }
    fs.writeFileSync(publication, JSON.stringify({ schema: 1, atlas: actual, conversations: records }, null, 2) + '\n', { flag: 'wx' });
  } catch (error) {
    for (const target of written) fs.unlinkSync(target);
    throw error;
  }
  console.log(JSON.stringify({ batch, conversations: records.length, images: files.length,
    bytes: encoded.reduce((sum, item) => sum + item.bytes.length, 0) }));
}

const [, , action, file, level] = process.argv;
if (action === 'inspect' && file) console.log(JSON.stringify(inspectAtlas(file), null, 2));
else if (action === 'import' && file) importAtlas(file);
else if (action === 'plan') console.log(JSON.stringify(planAtlases(Number(file || 10), Number(level || 0)), null, 2));
else throw Error('Usage: node scripts/import-conversation-atlas.cjs plan [atlas-count] [level] | inspect atlas.png | import reviewed-batch.json');
