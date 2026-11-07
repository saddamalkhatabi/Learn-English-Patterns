exports.up = db => db.schema.createTable('sentence_terms', t => {
  t.text('sentence_id').references('sentences.id');
  t.integer('term_id').references('terms.id');
  t.primary(['sentence_id', 'term_id']);
  t.index('term_id');
});
exports.down = db => db.schema.dropTable('sentence_terms');
