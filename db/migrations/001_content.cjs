exports.up = async db => {
  await db.schema.createTable('patterns', t => {
    t.integer('id').primary(); t.text('key').unique().notNullable(); t.text('form').notNullable();
    t.text('title_ar'); t.text('level'); t.text('rule_ar'); t.text('rule_en'); t.text('status').notNullable();
  });
  await db.schema.createTable('sentences', t => {
    t.text('id').primary(); t.text('collection').notNullable(); t.integer('ordinal');
    t.text('en').notNullable(); t.text('ar'); t.text('context'); t.text('level'); t.integer('stage');
  });
  await db.schema.createTable('pattern_sentences', t => {
    t.integer('pattern_id').references('patterns.id'); t.text('sentence_id').references('sentences.id');
    t.integer('position'); t.primary(['pattern_id', 'sentence_id']); t.index('sentence_id');
  });
  await db.schema.createTable('media_files', t => {
    t.text('path').primary(); t.text('sha256').notNullable(); t.text('kind').notNullable();
    t.integer('width'); t.integer('height'); t.integer('duration_ms'); t.index('sha256');
  });
  await db.schema.createTable('scenes', t => {
    t.text('id').primary(); t.text('media_path').references('media_files.path').notNullable();
    t.integer('x').notNullable(); t.integer('y').notNullable(); t.integer('width').notNullable(); t.integer('height').notNullable();
    t.text('review_status').notNullable(); t.index('media_path');
  });
  await db.schema.createTable('sentence_scenes', t => {
    t.text('sentence_id').references('sentences.id'); t.text('scene_id').references('scenes.id');
    t.primary(['sentence_id', 'scene_id']); t.index('scene_id');
  });
  await db.schema.createTable('recordings', t => {
    t.text('sentence_id').references('sentences.id'); t.text('voice'); t.text('voice_id');
    t.text('media_path').references('media_files.path').notNullable();
    t.text('word_cues_json').notNullable(); t.text('status');
    t.primary(['sentence_id', 'voice']); t.index('media_path');
  });
  await db.schema.createTable('dialogues', t => {
    t.text('id').primary(); t.text('title_ar'); t.text('title_en');
    t.integer('after_pattern_id').references('patterns.id');
    t.text('media_path').references('media_files.path');
  });
  await db.schema.createTable('dialogue_turns', t => {
    t.text('id').primary(); t.text('dialogue_id').references('dialogues.id').notNullable();
    t.integer('position').notNullable(); t.text('voice').notNullable(); t.text('en').notNullable(); t.text('ar');
    t.text('scene_id').references('scenes.id'); t.integer('start_ms'); t.integer('end_ms'); t.text('word_cues_json');
    t.unique(['dialogue_id', 'position']);
  });
  await db.schema.createTable('dialogue_turn_patterns', t => {
    t.text('turn_id').references('dialogue_turns.id'); t.integer('pattern_id').references('patterns.id');
    t.primary(['turn_id', 'pattern_id']); t.index('pattern_id');
  });
  await db.schema.createTable('learning_routes', t => {
    t.text('id').primary(); t.text('title_ar').notNullable(); t.text('summary');
  });
  await db.schema.createTable('route_patterns', t => {
    t.text('route_id').references('learning_routes.id'); t.integer('pattern_id').references('patterns.id');
    t.integer('position').notNullable(); t.primary(['route_id', 'pattern_id']);
  });
  await db.schema.createTable('comparisons', t => {
    t.text('id').primary(); t.text('title_ar'); t.text('title_en'); t.text('body_json').notNullable();
  });
  await db.schema.createTable('comparison_patterns', t => {
    t.text('comparison_id').references('comparisons.id'); t.integer('pattern_id').references('patterns.id');
    t.integer('position').notNullable(); t.primary(['comparison_id', 'pattern_id']);
  });
  await db.schema.createTable('exercises', t => {
    t.text('id').primary(); t.integer('pattern_id').references('patterns.id').notNullable();
    t.text('kind').notNullable(); t.text('body_json').notNullable(); t.index('pattern_id');
  });
  await db.schema.createTable('terms', t => {
    t.increments('id'); t.text('kind').notNullable(); t.text('value').notNullable(); t.unique(['kind', 'value']);
  });
  await db.schema.createTable('pattern_terms', t => {
    t.integer('pattern_id').references('patterns.id'); t.integer('term_id').references('terms.id');
    t.primary(['pattern_id', 'term_id']); t.index('term_id');
  });
  await db.schema.createTable('coverage_gaps', t => {
    t.text('entity_id'); t.text('kind'); t.text('reason').notNullable(); t.primary(['entity_id', 'kind']);
  });
  await db.schema.createTable('content_imports', t => {
    t.text('fingerprint').primary(); t.text('imported_at').notNullable(); t.text('sources_json').notNullable();
  });
  await db.schema.createTable('content_state', t => {
    t.text('key').primary(); t.text('value').notNullable();
  });
  await db.schema.createTable('editorial_notes', t => {
    t.increments('id'); t.text('entity_type').notNullable(); t.text('entity_id').notNullable();
    t.text('note').notNullable(); t.text('state').defaultTo('open'); t.text('created_at').defaultTo(db.fn.now());
    t.index(['entity_type','entity_id']);
  });
  await db.schema.createTable('external_links', t => {
    t.text('system'); t.text('external_id'); t.text('entity_type').notNullable(); t.text('entity_id').notNullable();
    t.primary(['system','external_id']);
  });
  await db.raw(`CREATE VIEW scene_usage AS
    SELECT s.id AS scene_id,s.media_path,s.x,s.y,s.width,s.height,s.review_status,
           'sentence' AS used_by,ss.sentence_id AS entity_id
    FROM scenes s JOIN sentence_scenes ss ON ss.scene_id=s.id
    UNION ALL
    SELECT s.id,s.media_path,s.x,s.y,s.width,s.height,s.review_status,'dialogue_turn',dt.id
    FROM scenes s JOIN dialogue_turns dt ON dt.scene_id=s.id`);
};

exports.down = async db => {
  await db.raw('DROP VIEW IF EXISTS scene_usage');
  for (const table of ['external_links','editorial_notes','content_state','content_imports','coverage_gaps',
    'pattern_terms','terms','exercises','comparison_patterns','comparisons','route_patterns','learning_routes',
    'dialogue_turn_patterns','dialogue_turns','dialogues','recordings','sentence_scenes','scenes','media_files',
    'pattern_sentences','sentences','patterns']) await db.schema.dropTable(table);
};
