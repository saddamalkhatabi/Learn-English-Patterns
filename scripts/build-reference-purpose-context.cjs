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
 'ref-0004':['طلب منك شخص قرارًا الآن. ماذا تقول لتطلب فرصة للتفكير؟','Someone wants an answer now. Say you need time to think.'],
 'ref-0005':['طرح عليك شخص سؤالًا وتعرف إجابته. ماذا تقول له؟','Someone has a question. Let them know you can answer it.'],
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
 'ref-0035':['أخبرهم أنك كنت الوحيد الذي عرف بالأمر.','Tell them nobody else knew about it at the time.'],
 'ref-0036':['أخبرهم أن رأيك لن يؤثّر في القرار.','Tell them your opinion makes no difference to the decision.'],
 'ref-0037':['قبل أن يغادر شخص المنزل، ذكّره بإقفال الباب.','Before someone leaves the house, remind them to lock the door.'],
 'ref-0038':['صارح شخصًا بأنك لا تستطيع الاستمرار في الكذب على توم.','Tell someone you cannot keep being dishonest with Tom.'],
 'ref-0039':['أخذت مظلة شخص آخر بالخطأ. كيف تخبره بذلك بلطف؟','You picked up someone else’s umbrella by mistake. Tell them politely.'],
 'ref-0040':['يبدو صديقك حزينًا. صف ما تلاحظه واسأله إن كان قد حدث شيء.','A friend looks down. Tell them what you notice and ask if something happened.'],
 'ref-0041':['انصح شخصًا بالإقلاع عن التدخين.','Give someone advice about quitting smoking.'],
 'ref-0042':['ترغب في بعض الهواء. أخبر من معك أنك تميل إلى الخروج للتمشّي.','You would like some fresh air. Tell your friend you feel like taking a walk.'],
 'ref-0043':['يسألك شخص متى يمكنه المغادرة. بيّن أنه يستطيع المغادرة متى شاء.','Someone asks when they can leave. Tell them they are free to go any time.'],
 'ref-0044':['تحدّث عن انطباعك بأن توم واقع في الحب.','Give your impression that Tom is in love.'],
 'ref-0045':['اذكر شيئًا كان لديك في السابق في بوسطن.','Tell someone you once owned a house in Boston.'],
 'ref-0046':['سمعت صوتًا ولم تتأكد من مصدره. قل إنه يشبه بكاء شخص.','You hear a sound. Say it sounds as if someone is crying.'],
 'ref-0047':['حذّر شخصًا من أن تصرّفه يوشك أن يغضبك.','Warn someone that what they are doing could make you angry.'],
 'ref-0048':['يدعوك شخص إلى النميمة. وضّح أنك لا تملك وقتًا لذلك.','Someone tries to draw you into gossip. Say you have no time for it.'],
 'ref-0049':['خشيت أن تتأخر لكنك وصلت في الموعد. كيف تخبرهم بما استطعت فعله؟','You thought you might be late, but you made it. Tell them you got there in time.'],
 'ref-0050':['استمر الحر طويلًا. أخبر شخصًا أنك سئمت منه.','The heat has lasted too long. Tell someone you are fed up with it.'],
 'ref-0051':['اشرح أن خطتك آنذاك كانت أن تقول الحقيقة.','Explain that you had planned to tell the truth.'],
 'ref-0052':['كم يستغرق الوصول إلى المحطة؟ أجب بذكر ساعة واحدة.','How long does it take to get to the station? Give a one-hour estimate.'],
 'ref-0053':['اخترت السباحة. أخبر شخصًا بالقرار الذي اتخذته.','Tell someone that you chose to go swimming.'],
 'ref-0054':['صِف كيف اعتدت أن يرفع توم صوته عليك باستمرار.','Describe how you have grown accustomed to Tom shouting at you.'],
 'ref-0055':['اطلب من شخص وعدًا بألّا يفعل ذلك.','Ask someone to promise not to do it.'],
 'ref-0056':['يتساءل أحدهم إن كان توم قد رآكما. قل إنك تستبعد ذلك.','Someone asks whether Tom saw you both. Say you doubt he did.'],
 'ref-0057':['يسألك شخص عن مصدر الكتاب. أخبره أنك استعرته من هذه المكتبة.','Where did you get the book? Explain that you borrowed it from this library.'],
 'ref-0058':['يسألك شخص عن عادتك مع القهوة. قل إنك تشربها نادرًا.','How often do you drink coffee? Say it is a rare habit.'],
 'ref-0059':['عبّر عن وضوح رغبة توم وماري في قضاء الوقت معًا.','Say it is obvious that Tom and Mary want time together.'],
 'ref-0060':['أخبر المستمع أنك طلبت من شخص إحضار نظارتك من غرفتك.','Tell someone you asked him to get your glasses from your room.'],
 'ref-0061':['أوشك الوقت المناسب للمغادرة. قل إن عليك العودة إلى البيت قريبًا.','It is nearly time to leave. Say you should head home soon.'],
 'ref-0062':['اقترح أحدهم العشاء خارج المنزل. قل إنك لا ترغب في ذلك هذا المساء.','Someone suggests dinner out. Say you are not in the mood this evening.'],
 'ref-0063':['طمئن من يستعد لاختبار بأن لديك إحساسًا بأنه سينجح.','Encourage someone before a test. Say you have a feeling they will pass.'],
 'ref-0064':['سألك شخص أيّ من والديك يتكلم الفرنسية. أخبره أن كليهما يتحدثها.','Someone asks which of your parents speaks French. Say that both do.'],
 'ref-0065':['يتساءل شخص إن كنت ذكرته بالأمر. قل إنك تتذكر أنك أخبرته.','Someone asks if you mentioned it before. Say you remember telling them.'],
 'ref-0066':['وجدت شيئًا تحت الأريكة. ألفت انتباه من معك إلى ما وجدته.','You found something under the sofa. Get someone to look at what you found.'],
 'ref-0067':['حان موعد النوم. أخبر من تخاطبه أن عليه الذهاب إلى فراشه الآن.','It is bedtime. Tell the person you are speaking to that it is time for bed.'],
 'ref-0068':['تودّع شخصًا وتأمل لقاءه مرة أخرى. عبّر عن شوقك للقاء القادم.','You are saying goodbye to someone. Tell them you look forward to seeing them again.'],
 'ref-0069':['اذكر كم مضى على تخرّج توم من الثانوية. المدّة ثلاث سنوات.','How long ago did Tom finish high school? Say that three years have passed.'],
 'ref-0070':['طُلب منك أن تأتي الآن. أخبرهم بأنك لا تستطيع الحضور في هذه اللحظة.','Someone wants you to come now. Say you are unable to come right away.'],
 'ref-0071':['تحدث عن أمر صعب الفهم. قل إنك لا تتوقع من المستمع أن يفهمه.','You are explaining something difficult. Say you do not expect the listener to understand it.'],
 'ref-0072':['أخبرهم بأن توم نجا وعبّر عن ارتياحك.','Share the welcome news that Tom survived.'],
 'ref-0073':['طمئن شخصًا إلى أن قرار طريقة عيشه يعود له وحده.','Reassure someone that nobody has the right to dictate how they live.'],
 'ref-0074':['قارن مستواك في الفرنسية بمستوى توم. قل إنك على الأرجح تتحدثها أفضل منه.','Compare your French with Tom’s. Say you probably speak it better.'],
 'ref-0075':['ذكّر من يخاطبك بأنك أخبرته مرارًا أنك لا تريد دراسة الفرنسية.','Remind someone you keep telling them that you do not want to study French.'],
 'ref-0076':['لم تنتهِ من استعدادك بعد. اطلب مزيدًا من الوقت للتحضير.','You are not ready yet. Say you need a little more time to prepare.'],
 'ref-0077':['سُئلت أيهما ذهب إلى بوسطن. وضّح أن توم وماري لم يذهبا.','Which of them went to Boston? Say that neither Tom nor Mary went.'],
 'ref-0078':['عبّر عن ارتياحك، إلى حدٍّ ما، لأنك لم تقابل توم قط.','Say you are somewhat glad that you never met Tom.'],
 'ref-0079':['في مكان يبدو مألوفًا، قل إن لديك إحساسًا بأنك زرته من قبل.','The place feels familiar. Say you have a feeling you have been here before.'],
 'ref-0080':['بعد تأخر العمل، أشر إلى أن جزءًا كبيرًا من الوقت ضاع.','Point out that a great deal of time was wasted.'],
 'ref-0081':['صف كيف توقفت عن الضحك فورًا.','Tell someone you stopped laughing at once.'],
 'ref-0082':['مهما كانت النتيجة، طمئنهم إلى أنك ستتّصل بهم غدًا.','Whatever happens, tell them you will call tomorrow.'],
 'ref-0083':['توقّع ما قد يحدث للعمّال في المستقبل مع انتشار الروبوتات.','Predict that robots will take over the jobs of many workers.'],
 'ref-0084':['يسألك أحدهم عن عادة ترفيهية. أخبره بأنك تذهب إلى السينما كثيرًا.','Someone asks how often you go to the movies. Say you go often.'],
 'ref-0085':['اقترح على من معك أن تعرفوا من أخذ أموالكم.','Suggest finding out who took your money.'],
 'ref-0086':['يسألك شخص إن كنت تعرف السباحة. أخبره بأنك تستطيعها.','Can you swim? Tell the person that you are able to.'],
 'ref-0087':['وصلتم بعد فوات الأوان. احكِ كيف كان الوضع عند وصولكم.','You arrived too late. Describe what had already happened by the time you got there.'],
 'ref-0088':['يسألك شخص عن هديتك المفضّلة في العيد. اذكر أن الغيتار هو الشيء الوحيد الذي تريده.','What is the only gift you want for Christmas? Say you want a guitar.'],
 'ref-0089':['اشرح لِمَ غبت عن المدرسة. كان السبب المرض.','Why were you absent from school? Explain that you were ill.'],
 'ref-0090':['عُد إلى موقف شعرت فيه بالمشكلة وقل إنك كنت تعرف أن هناك خطبًا ما.','Recall the moment you realized something was wrong.'],
 'ref-0091':['يتجنّب شخص السؤال. حثّه على الإجابة مباشرة.','Someone is avoiding your question. Urge them to answer it directly.'],
 'ref-0092':['المهمة تبدو سهلة. نبّه إلى أن صعوبتها أكبر مما يوحي به مظهرها.','The task looks easy. Point out that it is harder than it appears.'],
 'ref-0093':['يسأل مسافر عن مصرف قريب. اذكر ما يقع أمام الفندق.','A traveler asks about a nearby bank. Tell them what is in front of the hotel.'],
 'ref-0094':['اطلب من شخص أن يعتني بأطفالك إذا حدث لك مكروه.','Ask someone to look after your children if anything happens to you.'],
 'ref-0095':['معك خبر مفرح. عبّر عن شدّة حماسك لإخبار توم به.','You have good news. Say how eager you are to share it with Tom.'],
 'ref-0096':['تحدّث عن قرارك بشأن الزواج وبيّن أنك لا تريده بالتأكيد.','Make it clear that you definitely do not want to get married.'],
 'ref-0097':['تناول شخصًا مفاتيحه وقل له إنها هنا.','Hand someone their keys. What do you say?'],
 'ref-0098':['يسألك شخص عن المسافة إلى الساحل. قدّرها بنحو ثلاثة كيلومترات.','How far is the coast from here? Give an estimate of three kilometers.'],
 'ref-0099':['أخبر شخصًا بأن تغيير الوظيفة خيار تفكّر فيه الآن.','Tell someone you are considering a change of jobs.'],
 'ref-0100':['اذكر أن إقامة توم السابقة في بوسطن كانت لفترة قصيرة.','Tell someone Tom lived in Boston only briefly.'],
 'ref-0101':['افترض سبب زيارة الشخص. تظن أنه جاء ليسألك عن توم.','Give your best guess about the visit. You think it is to ask about Tom.'],
 'ref-0102':['حين يسألك أحد عن الحياة دون كهرباء، قل إنك لا تستطيع تصوّرها.','Someone asks about life without electricity. Say you cannot picture it.'],
 'ref-0103':['عبّر عن دهشتك حين تكتشف أن الشخص لم يكن يعرف ذلك.','Show your surprise that the listener did not know that.'],
 'ref-0104':['اذكر احتمال زيارتك لبوسطن يومًا ما من دون تحديد موعد.','Say that you will probably visit Boston sooner or later.'],
 'ref-0105':['صِف الإرهاق الذي شعرتم به بنهاية يوم طويل.','Say how tired everyone felt by the end of the day.'],
 'ref-0106':['عبّر عن قلقك على صحة توم.','Tell someone that Tom’s health is worrying you.'],
 'ref-0107':['قدّم نصيحة بشأن أول خطوة. أخبره أن يتصل بمحامٍ.','Give advice about the first step. Tell them to contact a lawyer.'],
 'ref-0108':['احكِ ما حدث لتوم بعد شربه ثلاث زجاجات من البيرة.','Tell what happened after Tom drank three bottles of beer.'],
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
  [`${ar}. استعن بتعبير «${anchor.ar}».`,`${en}. Use this idea: ${anchor.en}.`,row.ar]:
  [`${ar}.`,`${en}.`,row.ar];
}
const output=path.join(__dirname,'../public/reference-purpose-context.js');
const serialized=Object.entries(data).map(([id,value])=>` ${JSON.stringify(id)}:${JSON.stringify(value)}`).join(',\n');
fs.writeFileSync(output,`(function(root){\n'use strict';\nconst prompts={\n${serialized}\n};\nif(typeof module==='object')module.exports=prompts;else root.EPReferencePurposeContext=prompts;\n})(globalThis);\n`);
console.log(`Prepared contextual prompts for ${Object.keys(data).length} reference sentences.`);
