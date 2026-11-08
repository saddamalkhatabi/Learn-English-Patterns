exports.up=async db=>{
 await db.schema.createTable('idea_topics',t=>{
  t.text('id').primary();t.text('ar').notNullable();t.text('en').notNullable();
 });
 await db.schema.createTable('idea_scenes',t=>{
  t.text('scene_id').primary().references('scenes.id');
  t.text('topic_id').notNullable().references('idea_topics.id').index();
  t.text('title_ar').notNullable();t.text('title_en').notNullable();
  t.text('task_ar').notNullable();t.text('task_en').notNullable();
 });
 await db.schema.createTable('idea_scene_words',t=>{
  t.text('scene_id').references('idea_scenes.scene_id');
  t.integer('position');t.text('ar').notNullable();t.text('en').notNullable();
  t.primary(['scene_id','position']);t.index('ar');t.index('en');
 });
 await db.schema.createTable('dialogue_scene_uses',t=>{
  t.text('dialogue_id').references('dialogues.id');
  t.integer('position'); // 0 is the cover, then turns start at 1.
  t.text('scene_id').notNullable().references('scenes.id').index();
  t.primary(['dialogue_id','position']);
 });
};
exports.down=async db=>{
 for(const table of ['dialogue_scene_uses','idea_scene_words','idea_scenes','idea_topics'])await db.schema.dropTable(table);
};
