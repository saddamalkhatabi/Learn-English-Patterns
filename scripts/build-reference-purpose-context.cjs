const fs=require('node:fs');
const path=require('node:path');
const teaching=require('../public/teaching-core.js');
const english=require('../public/english-usage.js');
const vocabulary=require('../public/vocabulary-core.js');
const audio=require('../public/reference-study-audio.js');
const purposes=require('../public/purpose-tree.js');
const lessons=require('../public/course-purpose-prompts.js');
const {sentences}=require('../public/source-corpus.json');
const {patterns}=require('../public/pattern-catalog.json');
const atlas=require('../public/vocabulary-index.json');
const course=new Map(['pilot','expansion-media'].flatMap(file=>require('../public/'+file+'.json').sentences).map(row=>[row.id,row]));
const known=new Map(patterns.flatMap(pattern=>{
 const base=course.get((pattern.published_sentence_ids||pattern.examples.map(row=>row.id))[0]);
 const prompt=lessons[pattern.planned_pattern_id||pattern.id];
 return base&&prompt?[[vocabulary.normalize(english.analyze(base.en,base).us),prompt]]:[];
}));
const revision={
 'ref-0006':['هل كان ما قلته على سبيل الجد؟','Were you being serious?'],
 'ref-0007':['ارفض التفاحة التي عرضت عليك.','Decline an apple someone has offered you.'],
 'ref-0010':['اعتذر عن تصرّف قمت به.','Take responsibility and apologize for something you did.'],
 'ref-0011':['أين تتمنّى أن تعيش؟','Where would you like to live?'],
 'ref-0012':['اسأل شخصًا إن كان يرغب في إنجاب أطفال.','Find out whether someone wants children.'],
 'ref-0013':['اعرض كوبًا من الشاي على ضيفك.','Offer your guest a cup of tea.'],
 'ref-0014':['اترك للمتحدث فرصة لطرح سؤال آخر.','Give someone a chance to ask another question.'],
 'ref-0016':['اشرح أن سبب زيارتك هو شكر الشخص.','Explain that you came to express your thanks.'],
 'ref-0017':['عبّر بقوة عن رأيك السلبي في الأمر.','Express a strongly negative opinion of an idea.'],
 'ref-0021':['اطلب نصيحة بشأن ما تقوله.','Ask for advice on what to say.'],
 'ref-0022':['صِف صعوبة التعبير عن نفسك بالفرنسية.','What is difficult for you when speaking French?'],
 'ref-0023':['طمئن طالبًا إلى أن الذهاب إلى المدرسة اليوم اختياري.','Tell a student they can stay home from school today.'],
 'ref-0024':['اطلب إذنًا للمجموعة بالسباحة في هذا المكان.','Check whether your group may swim here.'],
 'ref-0025':['اطلب التأكد من اسم الشخص المذكور.',"Check whether you remember the person's name correctly."],
 'ref-0026':['اقترح الانتظار لمعرفة نتيجة المحاولة الجديدة.','Suggest waiting to see the result this time.'],
 'ref-0027':['أخبر شخصًا بأنك بدأت تعيش بمفردك.','Describe a change toward living independently.'],
 'ref-0028':['عبّر عن أملك بأن تكون مساعدتك مفيدة.','Say that you hope the help you gave was useful.'],
 'ref-0029':['بيّن أن تصرّف شخص آخر يزعجك.','Tell someone their recurring behaviour bothers you.'],
 'ref-0030':['اطلب من شخص أن يناولك الحقيبة.','Ask someone to hand you the bag.'],
 'ref-0031':['أنه النشاط لأن ما أُنجز اليوم يكفي.',"Bring today's activity to a close."],
 'ref-0032':['قل إنك لا تعرف من تكون زوجة توم.','Admit you do not know who Tom is married to.'],
 'ref-0033':['اشتكِ من شدة الحرّ.','Complain about weather that is uncomfortably hot.'],
 'ref-0034':['تهيّأ لإخبار المستمع بخططك.','Introduce what you are about to say about your plans.'],
 'ref-0254':['وضّح أن حاجتك إلى مساعدة الشخص هي سبب مجيئك.',"Explain that you came because you need the listener's help."],
 'ref-0324':['صارح شخصًا بأن ما حدث لك لا يفارق تفكيرك.','Tell someone that an upsetting experience is still on your mind.'],
 'ref-0604':['اسأل شخصًا عن الطبق الذي يعدّه اليوم.','Find out what dish someone is preparing today.'],
 'ref-0674':['اقترح الأحد القادم موعدًا بديلًا.','Suggest next Sunday as another possible date.'],
 'ref-0744':['صِف الطريقة الفظّة التي عامل بها توم ماري.','Tell someone how rudely Tom treated Mary.']
};
const contextualHeads={
 'ask-information':['اطلب معلومة تتعلق بهذا الموضوع','Ask a question about this topic'],
 clarify:['اطلب توضيح هذا الجزء','Ask for clarification about this point'],
 description:['أخبر المستمع بشيء عن هذا الموضوع','Give the listener a fact about this topic'],
 explain:['وضّح السبب أو النتيجة في هذا السياق','Explain the reason or result in this context'],
 request:['اطلب من الشخص أن يفعل شيئًا في هذا الموقف','Make a request in this situation'],
 permission:['تحدّث عن الإذن في هذا الموقف','Talk about permission in this situation'],
 offer:['اعرض شيئًا أو وجّه دعوة في هذا السياق','Make an offer or invitation in this context'],
 advice:['تبادل النصيحة في هذا الموقف','Ask for or give advice in this situation'],
 instruction:['وجّه المستمع إلى ما ينبغي القيام به','Give the listener a direction to follow'],
 obligation:['بيّن ما يلزم أو يمكن تركه في هذا الموقف','Say what is needed or optional in this situation'],
 ability:['تحدّث عمّا يستطيع الشخص فعله في هذا الموقف','Talk about what someone can do in this situation'],
 planning:['تحدّث عمّا قد يحدث أو عمّا يُخطّط له','Discuss what might happen or what is planned'],
 schedule:['اذكر توقيت الحدث في هذا الموقف','Give the scheduled time in this situation'],
 social:['تصرّف بلباقة في هذا الموقف','Respond politely in this situation'],
 introduce:['تعارف مع شخص في هذا الموقف','Make an introduction in this situation'],
 gratitude:['تبادل الشكر في هذا الموقف','Exchange thanks in this situation'],
 apology:['اعتذر أو طمئن الشخص في هذا الموقف','Apologize or reassure someone in this situation'],
 emotion:['صف شعورك في هذا الموقف','Describe a feeling in this situation'],
 narration:['احكِ ما حصل في هذا الموقف','Tell the listener what happened in this situation'],
 routine:['اذكر ما يتكرّر في هذا السياق','Describe what regularly happens in this context'],
 preference:['اذكر رغبة أو تفضيلًا في هذا الموقف','State a wish or preference in this situation'],
 opinion:['قدّم رأيًا أو قارن بين الخيارات في هذا السياق','Offer an opinion or compare options in this context'],
 hypothetical:['تخيّل ما قد يحدث في هذا الموقف','Imagine what could happen in this situation']
};
const anchors=new Map();
for(const term of atlas.entries){
 if(!audio.eligibleWord(term)||term.ar.length>55||term.en.length>36)continue;
 for(const index of term.sourceIds){
  const {id,type}=atlas.sources[index];
  if(type!=='sentence'||!id.startsWith('ref-'))continue;
  if(!anchors.has(id))anchors.set(id,[]);
  anchors.get(id).push(term);
 }
}
const normalize=text=>text.normalize('NFKD').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا');
const weakAnchors=new Set(['here','there','today','now','then','when','what about','time','thing','something','person']);
function anchorFor(row,form){
 const match=(anchors.get(row.id)||[]).filter(term=>vocabulary.includesTerm(row.en,term.en)&&
  !vocabulary.includesTerm(form,term.en)&&!english.sameSpeech(row.en.replace(/[.!?]+$/,''),term.en)).map(term=>{
   const ar=term.ar.split(/[؛،]/)[0].trim();
   const translated=normalize(row.ar).includes(normalize(ar));
   const type=vocabulary.posFor(term);
   const score=Number(translated)*8+(type==='NOUN'?5:type==='PHRASE'?3:0)+Number(term.en.includes(' '))*2-
    Number(weakAnchors.has(vocabulary.normalize(term.en)))*14+
    row.en.toLowerCase().lastIndexOf(term.en.toLowerCase())/row.en.length;
   return {ar,en:term.en,score};
  }).sort((a,b)=>b.score-a.score);
 return match[0];
}
const data={};
for(const row of sentences){
 const guide=teaching.describeReference(row);
 const specific=audio.purposePrompt(row,guide);
 const curated=revision[row.id]||known.get(vocabulary.normalize(english.analyze(row.en,row).us));
 if(curated){data[row.id]=curated;continue}
 if(!english.sameSpeech(specific.en,guide.purpose_en+'.')&&specific.en!==guide.purpose_en)continue;
 const purpose=purposes.forReference(guide,row.en);
 const [ar,en]=contextualHeads[purpose];
 const anchor=anchorFor(row,guide.form);
 data[row.id]=anchor?
  [`${ar}. الفكرة التي ستستخدمها: ${anchor.ar}.`,`${en}. Use this idea: ${anchor.en}.`]:
  [`${ar}. المعنى المقصود: ${row.ar}`,`${en}. Think of how you would express the meaning.`];
}
const output=path.join(__dirname,'../public/reference-purpose-context.js');
const serialized=Object.entries(data).map(([id,value])=>` ${JSON.stringify(id)}:${JSON.stringify(value)}`).join(',\n');
fs.writeFileSync(output,`(function(root){\n'use strict';\nconst prompts={\n${serialized}\n};\nif(typeof module==='object')module.exports=prompts;else root.EPReferencePurposeContext=prompts;\n})(globalThis);\n`);
console.log(`Prepared contextual prompts for ${Object.keys(data).length} reference sentences.`);
