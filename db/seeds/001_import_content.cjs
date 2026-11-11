const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const names = ['pilot', 'supplement', 'expansion-media', 'source-corpus', 'curriculum', 'pattern-catalog',
  'dialogues', 'dialogue-audio', 'comparisons', 'scene-archive', 'idea-scenes', 'conversation-scenes', 'training-audio','vocabulary-index'];
const displayable = new Set(['visually_reviewed', 'assistant-reviewed', 'imported-unreviewed']);

exports.seed = async db => {
  const files = Object.fromEntries(names.map(name => [name, fs.readFileSync(path.join(root, 'public', name+'.json'))]));
  const sources = Object.fromEntries(names.map(name => [name, hash(files[name])]));
  const fingerprint = hash(JSON.stringify({ format: 7, sources }));
  if ((await db('content_state').where('key', 'current_import').first())?.value === fingerprint) {
    console.log('Content already indexed: ' + fingerprint.slice(0, 12));
    return;
  }
  const data = Object.fromEntries(names.map(name => [name, JSON.parse(files[name])]));
  const pilot = data.pilot, expansion = data['expansion-media'], corpus = data['source-corpus'], curriculum = data.curriculum;
  const patterns = [...pilot.patterns, ...expansion.patterns];
  const metadata = new Map(curriculum.patterns.map(item => [item.id, item]));
  const links = new Map(data['pattern-catalog'].patterns.map(item => [item.planned_pattern_id || item.id, item]));
  const patternIds = new Map(data['pattern-catalog'].patterns.map(item => [item.id, item.planned_pattern_id || item.id]));
  const allRows = [
    ...pilot.sentences.map(row => ['foundation', row]),
    ...expansion.sentences.map(row => ['expansion', row]),
    ...corpus.sentences.map(row => ['reference', row]),
    ...data.supplement.sentences.map(row => ['supplement', row])
  ];
  const media = new Map(), scenes = new Map(), bySentence = new Map(), recordings = [], gaps = [];
  function addMedia(file, kind){
    const item = { path: file.path, sha256: file.sha256, kind,
      width: file.width ?? null, height: file.height ?? null, duration_ms: file.duration_ms ?? null };
    const prior = media.get(file.path);
    if(prior&&prior.sha256!==item.sha256)throw Error('Conflicting media hash: ' + item.path);
    media.set(item.path, item);
  }
  for(const [collection, row] of allRows){
    const im = row.image;
    if(im?.crop&&displayable.has(im.status)){
      addMedia({ ...im, path: im.atlas }, 'image');
      const sceneId = 'scene-'+row.id;
      scenes.set(sceneId,{id:sceneId, media_path:im.atlas, ...im.crop, review_status:im.status});
      bySentence.set(row.id,sceneId);
    }else if(collection!=='supplement'){
      gaps.push({entity_id:row.id,kind:'scene',reason:im?.status||'missing-or-withheld'});
    }
    for(const [voice, rec] of Object.entries(row.recordings||{})){
      if(!rec.sha256)continue;
      addMedia(rec, 'audio');
      recordings.push({sentence_id:row.id,voice,voice_id:rec.voice_id,media_path:rec.path,
        word_cues_json:JSON.stringify(rec.words),status:rec.status});
    }
  }
  const dialogueRows=[], turns=[], turnPatterns=[];
  for(const dialogue of data.dialogues.dialogues){
    const asset = data['dialogue-audio'][dialogue.id];
    const audio = asset && JSON.stringify(asset.signature)===JSON.stringify(dialogue.lines.map(line=>[line.en,line.voice]))?asset:null;
    if(audio)addMedia(audio,'dialogue');
    else gaps.push({entity_id:dialogue.id,kind:'dialogue-audio',reason:'pending'});
    dialogueRows.push({id:dialogue.id,title_ar:dialogue.ar,title_en:dialogue.en,after_pattern_id:dialogue.after,media_path:audio?.path??null});
    dialogue.lines.forEach((line, position)=>{
      const id=dialogue.id+'/'+(position+1), time=audio?.turns[position];
      turns.push({id,dialogue_id:dialogue.id,position,voice:line.voice,en:line.en,ar:line.ar,
        scene_id:bySentence.get(line.scene)??null,start_ms:time?.start_ms??null,end_ms:time?.end_ms??null,
        word_cues_json:time?JSON.stringify(time.words):null});
      for(const pattern_id of line.patterns)turnPatterns.push({turn_id:id,pattern_id});
    });
  }
  const terms=new Map(), patternTerms=[], sentenceTerms=[];
  function termIds(categories){
    const ids=[];
    for(const [kind,values] of Object.entries(categories)){
      for(const value of new Set((Array.isArray(values)?values:[]).map(v=>typeof v==='string'?v:v?.ar).filter(Boolean))){
        const key=kind+'\0'+value;
        if(!terms.has(key))terms.set(key,{id:terms.size+1,kind,value});
        ids.push(terms.get(key).id);
      }
    }
    return ids;
  }
  for(const pattern of patterns){
    const lesson=pattern.lesson||metadata.get(pattern.id);
    const catalog=links.get(pattern.id);
    const categories={keyword:lesson?.keywords,domain:catalog?.domains,purpose:catalog?.purposes};
    for(const term_id of termIds(categories))patternTerms.push({pattern_id:pattern.id,term_id});
  }
  for(const row of corpus.sentences){
    for(const term_id of termIds({keyword:row.keywords,domain:row.domains,purpose:row.purposes,grammar:row.grammar})){
      sentenceTerms.push({sentence_id:row.id,term_id});
    }
  }
  const sceneDescriptions=[], sceneTerms=[];
  const archive=data['scene-archive'], topics=new Map(archive.topics.map(t=>[t.id,t]));
  for(const row of archive.scenes){
    const scene_id=bySentence.get(row.id);
    if(!scene_id)continue;
    sceneDescriptions.push({scene_id,description_en:row.description,description_ar:row.descriptionAr});
    const labels=row.topics.flatMap(id=>[topics.get(id).ar,topics.get(id).en]);
    const words=[...row.keywords,...labels];
    for(const term_id of termIds({
      scene_keyword_ar:words.filter(word=>/[\u0600-\u06ff]/.test(word)),
      scene_keyword_en:words.filter(word=>!/[\u0600-\u06ff]/.test(word)),
      scene_topic:row.topics
    }))sceneTerms.push({scene_id,term_id});
  }
  function registerPracticeScene(row,en,ar){
    addMedia(row,'image');
    if(scenes.has(row.id))return;
    scenes.set(row.id,{id:row.id,media_path:row.path,x:0,y:0,width:row.width,height:row.height,review_status:'assistant-reviewed'});
    sceneDescriptions.push({scene_id:row.id,description_en:en,description_ar:ar});
  }
  const ideas=data['idea-scenes'];
  for(const row of ideas.scenes)registerPracticeScene(row,row.sentenceEn,row.sentenceAr);
  const dialogueSceneUses=[];
  for(const [dialogue_id,entry] of Object.entries(data['conversation-scenes'].scenes)){
    for(const [position,scene] of [...(entry.cover?[[0,entry.cover]]:[]),...Object.entries(entry.turns)]){
      registerPracticeScene(scene,scene.en,scene.ar);
      dialogueSceneUses.push({dialogue_id,position:Number(position),scene_id:scene.id});
    }
  }
  for(const asset of Object.values(data['training-audio']))addMedia(asset,'audio');
  const patternSentences=new Map();
  for(const pattern of patterns)pattern.sentence_ids.forEach((sentence_id,position)=>{
    patternSentences.set(pattern.id+'/'+sentence_id,{pattern_id:pattern.id,sentence_id,position});
  });
  for(const row of corpus.sentences)for(const catalogId of row.pattern_ids||[]){
    const id=patternIds.get(catalogId);
    if(id!=null)patternSentences.set(id+'/'+row.id,{pattern_id:id,sentence_id:row.id,position:null});
  }
  const routes=curriculum.routes.map(item=>item.id==='full-course'?{...item,pattern_ids:[...pilot.pattern_order,...expansion.patterns.map(p=>p.id)]}:item);
  const rows = {
    patterns:patterns.map(p=>{
      const lesson=p.lesson||metadata.get(p.id);
      return {id:p.id,key:p.key,form:p.form,title_ar:p.title,level:p.level,
        rule_ar:lesson?.explanation_ar??null,rule_en:lesson?.explanation_en??null,status:'available'};
    }),
    sentences:allRows.map(([collection,s])=>({id:s.id,collection,ordinal:s.ordinal??null,en:s.en,ar:s.ar??null,
      context:s.context??null,level:s.difficulty?.cefr??s.level??null,stage:s.difficulty?.stage??null})),
    pattern_sentences:[...patternSentences.values()], media_files:[...media.values()], scenes:[...scenes.values()],
    sentence_scenes:[...bySentence].map(([sentence_id,scene_id])=>({sentence_id,scene_id})), recordings,
    dialogues:dialogueRows, dialogue_turns:turns, dialogue_turn_patterns:turnPatterns,
    learning_routes:routes.map(r=>({id:r.id,title_ar:r.title,summary:r.description??null})),
    route_patterns:routes.flatMap(r=>[...new Set(r.pattern_ids)].map((pattern_id,position)=>({route_id:r.id,pattern_id,position}))),
    comparisons:data.comparisons.map(c=>({id:c.id,title_ar:c.ar,title_en:c.en,body_json:JSON.stringify(c)})),
    comparison_patterns:data.comparisons.flatMap(c=>c.patterns.map((pattern_id,position)=>({comparison_id:c.id,pattern_id,position}))),
    exercises:patterns.flatMap(p=>{
      const lesson=p.lesson||metadata.get(p.id);
      return [...(lesson?.exams||[]),...(lesson?.advanced||[])].map(q=>({id:q.id,pattern_id:p.id,
        kind:q.question?'advanced':'closed',body_json:JSON.stringify(q)}));
    }),
    terms:[...terms.values()],pattern_terms:patternTerms,sentence_terms:sentenceTerms,
    scene_descriptions:sceneDescriptions,scene_terms:sceneTerms,coverage_gaps:gaps,
    idea_topics:ideas.topics,
    idea_scenes:ideas.scenes.map((s,position)=>({scene_id:s.id,position,topic_id:s.topic,title_ar:s.ar,title_en:s.en,task_ar:s.taskAr,task_en:s.taskEn})),
    idea_scene_words:ideas.scenes.flatMap(s=>s.words.map((w,position)=>({scene_id:s.id,position,ar:w.ar,en:w.en,kind:w.kind,x:w.x??null,y:w.y??null}))),
    idea_scene_patterns:ideas.scenes.flatMap(s=>s.patterns.map((p,position)=>({scene_id:s.id,pattern_id:p.id,position,
      example_en:p.en??null,example_ar:p.ar??null,task_en:p.taskEn??null,task_ar:p.taskAr??null}))),
    dialogue_scene_uses:dialogueSceneUses,
    vocabulary_entries:data['vocabulary-index'].entries.map(entry=>({id:entry.id,en:entry.en,lemma:entry.lemma,ar:entry.ar||null,pos:entry.pos})),
    vocabulary_sources:data['vocabulary-index'].sources.map((source,id)=>({id,kind:source.type,entity_id:source.id,turn:source.turn??null,en:source.en,ar:source.ar||null})),
    vocabulary_occurrences:data['vocabulary-index'].entries.flatMap(entry=>entry.sourceIds.map(source_id=>({entry_id:entry.id,source_id}))),
    vocabulary_scene_links:data['vocabulary-index'].entries.flatMap(entry=>entry.sceneIds.map(scene_id=>({entry_id:entry.id,scene_id}))),
    dialogue_stages:Object.entries(data['conversation-scenes'].lifecycles||{}).flatMap(([dialogue_id,life])=>life.stages.map((stage,position)=>({
      dialogue_id,position,from_turn:stage.from,to_turn:stage.to,title_ar:stage.ar,title_en:stage.en,purpose_ar:stage.purposeAr,purpose_en:stage.purposeEn,
      scene_id:data['conversation-scenes'].scenes[dialogue_id].turns[stage.from].id
    })))
  };
  await db.transaction(async trx=>{
    if((await trx('content_state').where('key','current_import').first())?.value===fingerprint)return;
    for(const table of Object.keys(rows).reverse())await trx(table).del();
    for(const [table,items] of Object.entries(rows)){
      for(let i=0;i<items.length;i+=80)await trx(table).insert(items.slice(i,i+80));
    }
    await trx('content_imports').insert({fingerprint,imported_at:new Date().toISOString(),sources_json:JSON.stringify(sources)})
      .onConflict('fingerprint').ignore();
    await trx('content_state').insert({key:'current_import',value:fingerprint}).onConflict('key').merge();
  });
  console.log('Indexed '+JSON.stringify(Object.fromEntries(Object.entries(rows).map(([name,items])=>[name,items.length]))));
};
