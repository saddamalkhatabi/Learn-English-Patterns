exports.up = async db => {
  await db.schema.alterTable('idea_scenes', table => {
    table.integer('position').notNullable().defaultTo(0);
  });
  await db.schema.alterTable('idea_scene_words', table => {
    table.text('kind').notNullable().defaultTo('object');
    table.float('x');
    table.float('y');
  });
  await db.schema.createTable('idea_scene_patterns', table => {
    table.text('scene_id').references('idea_scenes.scene_id');
    table.integer('pattern_id').references('patterns.id');
    table.integer('position').notNullable();
    table.text('example_en');
    table.text('example_ar');
    table.primary(['scene_id', 'pattern_id']);
    table.index('pattern_id');
  });
};

exports.down = async db => {
  await db.schema.dropTable('idea_scene_patterns');
  await db.schema.alterTable('idea_scene_words', table => table.dropColumns('kind', 'x', 'y'));
  await db.schema.alterTable('idea_scenes', table => table.dropColumn('position'));
};
