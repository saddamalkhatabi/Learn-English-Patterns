exports.up = db => db.schema.alterTable('idea_scene_patterns', table => {
  table.text('task_en');
  table.text('task_ar');
});

exports.down = db => db.schema.alterTable('idea_scene_patterns', table => {
  table.dropColumns('task_en', 'task_ar');
});
