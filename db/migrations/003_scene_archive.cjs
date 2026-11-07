exports.up = async db => {
  await db.schema.createTable('scene_descriptions', t => {
    t.text('scene_id').primary().references('scenes.id');
    t.text('description_en').notNullable();
    t.text('description_ar').notNullable();
  });
  await db.schema.createTable('scene_terms', t => {
    t.text('scene_id').references('scenes.id');
    t.integer('term_id').references('terms.id');
    t.primary(['scene_id','term_id']);
    t.index('term_id');
  });
};
exports.down = async db => {
  await db.schema.dropTable('scene_terms');
  await db.schema.dropTable('scene_descriptions');
};
