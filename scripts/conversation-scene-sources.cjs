const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const images = { ...require('../production/conversation-scenes.json') };
const lifecycles = { ...require('../production/dialogue-lifecycles.json') };
const words = new Map();
const directory = path.join(__dirname, '../production/conversation-scene-batches');

if (fs.existsSync(directory)) {
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.json')).sort()) {
    const batch = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
    assert(batch.schema === 1 && batch.conversations.length, name);
    for (const { id, goalAr, goalEn, stages } of batch.conversations) {
      assert(!lifecycles[id] && goalAr && goalEn && stages.length === 4, id);
      const turns = {};
      lifecycles[id] = {
        goalAr, goalEn,
        stages: stages.map(({ image, words: labels, ...stage }) => {
          assert(!words.has(image.id) && labels.length >= 2, image.id);
          words.set(image.id, labels);
          for (let turn = stage.from; turn <= stage.to; turn++) {
            assert(!turns[turn], `${id} · ${turn}`);
            turns[turn] = image;
          }
          return stage;
        })
      };
      // A cover linked to another library scene can be replaced by its dedicated first frame.
      images[id] = { cover: stages[0].image, turns };
    }
  }
}

module.exports = { images, lifecycles, words };
