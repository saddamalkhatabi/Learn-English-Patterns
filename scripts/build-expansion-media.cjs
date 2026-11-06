// Every authored example has real dual audio; an image appears only when its file is present.
const fs=require('node:fs'),assert=require('node:assert/strict');
const plan=require('../production/plans/expansion-all-153.json'),all=plan.manifest_paths.flatMap(p=>JSON.parse(fs.readFileSync(p)).sentences);
const authored = new Map(require('../content/batches/expansion-all-153.json').patterns.map(p => [p.catalog_id, p]));
const patterns = plan.patterns.map(p => {
 const source = authored.get(p.catalog_id);
 const exam = q => {
  const [instruction, ...example] = (q.prompt_ar || q.prompt).split('\n');
  const tokens = q.type === 'order' ? q.tokens || q.options : null;
  const options = tokens ? undefined : q.options;
  if (options?.length) assert(options.includes(q.answer), 'No correct option: ' + p.key + '/' + q.id);
  return {
   id: p.key + '-' + q.id, type: options?.length ? 'choice' : 'input',
   kind: tokens ? 'ترتيب الكلمات' : 'تطبيق النمط', ar: instruction,
   prompt: example.join('\n') || tokens?.join(' · ') || '',
   answer: q.answer, options, explain_ar: q.explanation_ar,
   explain_en: source.explanation_en, scene_id: p.sentence_ids[0]
  };
 };
 return {
  id: p.id, key: p.key, title: p.title, form: p.form, level: source.level,
  sentence_ids: p.sentence_ids, source: p.source_ids,
  comparisonQuiz: source.wrong_pair ? {
   ar: source.wrong_pair.reason_ar, options: [source.wrong_pair.wrong, source.wrong_pair.correct], answer: source.wrong_pair.correct
  } : exam(source.questions.find(q => q.options?.includes(q.answer))),
  explanation_ar: source.explanation_ar,
  topic: 'أنماط مترابطة', comparison: { ar: source.contrast_ar, en: source.contrast_en },
  transfer: { prompt: source.transfer.prompt_ar }, lesson: {
   id: p.id, explanation_ar: source.explanation_ar, explanation_en: source.explanation_en,
   comparison_ar: source.contrast_ar, comparison_en: source.contrast_en,
   keywords: Array.isArray(source.keywords) ? source.keywords : [...source.keywords.ar, ...source.keywords.en],
   exams: source.questions.map(exam), advanced: source.advanced.map(q => {
    const question = exam(q);
    return { id: question.id, title: p.form, ar: question.ar, en: source.contrast_en, example: question.prompt, question };
   })
  }
 };
});
const visible=new Set(['assistant-reviewed','visually_reviewed','imported-unreviewed']);
const sentences=all.map(s=>{
 const image=visible.has(s.image.status)?s.image:null;
 if(image)assert(fs.existsSync('public/'+image.atlas));
 return{id:s.id,pattern_id:s.pattern_id,catalog_id:s.catalog_id,en:s.en,ar:s.ar,context:s.context,difficulty:s.difficulty,exercise_ids:s.exercise_ids,scene_description:s.scene_description,image,recordings:Object.fromEntries(['male','female'].map(g=>{const r=s.recordings[g];assert(r.sha256&&fs.existsSync('public/'+r.path));return[g,{path:r.path,sha256:r.sha256,voice_id:r.voice_id,duration_ms:r.duration_ms,status:r.status,words:r.words.map(({start_ms,end_ms})=>({start_ms,end_ms}))}]}))};
});
fs.writeFileSync('public/expansion-media.json',JSON.stringify({schema:3,patterns,sentences})+'\n');
console.log(JSON.stringify({expansion_examples:sentences.length,scenes_visible:sentences.filter(s=>s.image).length}));
