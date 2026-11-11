exports.up=async db=>{
 await db.schema.createTable('vocabulary_entries',table=>{
  table.text('id').primary();table.text('en').notNullable();table.text('lemma');table.text('ar');table.text('pos').notNullable();
  table.index(['en','pos']);
 });
 await db.schema.createTable('vocabulary_sources',table=>{
  table.integer('id').primary();table.text('kind').notNullable();table.text('entity_id').notNullable();table.integer('turn');
  table.text('en').notNullable();table.text('ar');table.index(['kind','entity_id']);
 });
 await db.schema.createTable('vocabulary_occurrences',table=>{
  table.text('entry_id').references('vocabulary_entries.id');table.integer('source_id').references('vocabulary_sources.id');
  table.primary(['entry_id','source_id']);table.index('source_id');
 });
 await db.schema.createTable('vocabulary_scene_links',table=>{
  table.text('entry_id').references('vocabulary_entries.id');table.text('scene_id').references('scenes.id');
  table.primary(['entry_id','scene_id']);table.index('scene_id');
 });
 await db.schema.createTable('dialogue_stages',table=>{
  table.text('dialogue_id').references('dialogues.id');table.integer('position').notNullable();table.integer('from_turn').notNullable();table.integer('to_turn').notNullable();
  table.text('title_ar').notNullable();table.text('title_en').notNullable();table.text('purpose_ar').notNullable();table.text('purpose_en').notNullable();
  table.text('scene_id').references('scenes.id');table.primary(['dialogue_id','position']);
 });
};
exports.down=async db=>{
 for(const table of ['dialogue_stages','vocabulary_scene_links','vocabulary_occurrences','vocabulary_sources','vocabulary_entries'])await db.schema.dropTable(table);
};
