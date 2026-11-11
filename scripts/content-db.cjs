const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { openContentDb, syncContent } = require('../db/content.cjs');
const root = path.resolve(__dirname, '..');

async function main() {
  const [command, id, output] = process.argv.slice(2);
  if (!['sync', 'summary', 'scene'].includes(command)) throw Error('Use sync, summary, or scene <id> [output.webp]');
  const db = openContentDb();
  try {
    if (command === 'sync') {
      await syncContent(db);
    } else if (command === 'summary') {
      const tables = ['patterns','sentences','scenes','recordings','dialogues','dialogue_turns','comparisons',
        'exercises','learning_routes','idea_scenes','idea_scene_words','idea_scene_patterns','dialogue_scene_uses','dialogue_stages',
        'vocabulary_entries','vocabulary_sources','vocabulary_occurrences','vocabulary_scene_links','coverage_gaps','editorial_notes','external_links'];
      const counts = await Promise.all(tables.map(table => db(table).count({count:'*'}).first()));
      console.log(JSON.stringify(Object.fromEntries(tables.map((name,i)=>[name,counts[i].count])), null, 2));
    } else {
      if (!id) throw Error('A scene or sentence ID is required');
      const scene = await db('scenes').where('id',id).first() ||
        await db('scenes').join('sentence_scenes','scene_id','scenes.id').where('sentence_id',id).select('scenes.*').first();
      if (!scene) throw Error('No displayable scene for '+id);
      const media = await db('media_files').where('path',scene.media_path).first();
      const uses = await db('scene_usage').where('scene_id',scene.id).select('used_by','entity_id');
      if(await db('idea_scenes').where('scene_id',scene.id).first())uses.push({used_by:'idea_lab',entity_id:scene.id});
      const dialogueUses=await db('dialogue_scene_uses').where('scene_id',scene.id);
      for(const use of dialogueUses)uses.push({used_by:use.position?'dialogue_turn_art':'dialogue_cover',entity_id:use.position?`${use.dialogue_id}/${use.position}`:use.dialogue_id});
      if (output) {
        const out = path.resolve(output);
        if (path.extname(out).toLowerCase()!=='.webp') throw Error('Output must end in .webp');
        if (fs.existsSync(out)) throw Error('Output already exists: '+out);
        const publicDir=path.join(root,'public'), source=path.resolve(publicDir,media.path);
        if(!source.startsWith(publicDir+path.sep))throw Error('Scene asset is outside public');
        execFileSync('ffmpeg',['-v','error','-n','-i',source,'-vf',
          `crop=${scene.width}:${scene.height}:${scene.x}:${scene.y}:exact=1`,'-frames:v','1','-quality','90',out]);
      }
      console.log(JSON.stringify({scene,media,uses},null,2));
    }
  } finally {
    await db.destroy();
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
