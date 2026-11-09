const fs = require('node:fs');
const path = require('node:path');
const knex = require('knex');
const config = require('../knexfile.cjs');

function openContentDb() {
  fs.mkdirSync(path.dirname(config.connection.filename), { recursive: true });
  return knex(config);
}

async function syncContent(db) {
  await db.migrate.latest();
  await db.seed.run();
}

async function readIdeaLibrary(db) {
  return db.transaction(async trx => {
    const topics = new Map((await trx('idea_topics').select('id', 'ar', 'en')).map(topic => [topic.id, topic]));
    const records = await trx('idea_scenes as i')
      .join('scenes as s', 's.id', 'i.scene_id')
      .join('media_files as m', 'm.path', 's.media_path')
      .join('scene_descriptions as d', 'd.scene_id', 'i.scene_id')
      .select('i.scene_id as id', 'i.topic_id as topic', 'i.title_en as en', 'i.title_ar as ar',
        'd.description_en as sentenceEn', 'd.description_ar as sentenceAr',
        'i.task_en as taskEn', 'i.task_ar as taskAr', 'm.path', 'm.sha256', 's.width', 's.height')
      .orderBy('i.position');
    const scenes = new Map(records.map(row => [row.id, { ...row, words: [], patterns: [] }]));
    for (const { scene_id, en, ar, kind, x, y } of await trx('idea_scene_words').orderBy('position')) {
      scenes.get(scene_id).words.push({ en, ar, kind, ...(x===null?{}:{ x, y }) });
    }
    for (const { scene_id, pattern_id, example_en, example_ar, task_en, task_ar } of await trx('idea_scene_patterns').orderBy('position')) {
      scenes.get(scene_id).patterns.push({ id: pattern_id,
        ...(example_en ? { en: example_en, ar: example_ar } : {}),
        ...(task_en ? { taskEn: task_en, taskAr: task_ar } : {}) });
    }
    const topicOrder = [...new Set(records.map(row => row.topic))];
    return { schema: 2, topics: topicOrder.map(id => topics.get(id)), scenes: [...scenes.values()] };
  });
}

module.exports = { openContentDb, syncContent, readIdeaLibrary };
