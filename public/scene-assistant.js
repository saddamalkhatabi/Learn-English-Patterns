const sceneAssistantVisibility=new Map();
const sceneAssistantSteps=new Map();
function sceneAssistantIsOpen(scene){
 return sceneAssistantVisibility.get(scene.id.replace(/^studio:/,''))??['A1','A2'].includes(sceneLearningLevel(scene));
}

function sceneAssistantButton(scene){
 return `<button type="button" class="secondary scene-assistant-toggle" aria-controls="scene-assistant"
  aria-expanded="${sceneAssistantIsOpen(scene)}" onclick="toggleSceneAssistant(this)">${T('مساعد مشاركة الشاشة','Screen-sharing coach')}</button>`;
}

function sceneAssistantPanel(scene){
 const open=sceneAssistantIsOpen(scene),level=sceneLearningLevel(scene);
 return `<aside id="scene-assistant" class="scene-ai scene-assistant" aria-labelledby="scene-assistant-title" ${open?'':'hidden'}>
  <h3 id="scene-assistant-title">${T('مساعد مشاركة الشاشة','Screen-sharing coach')} · ${level}</h3>
  ${level==='A1'?`<p>${T('قل سؤالًا واحدًا واستمع إلى الرد. أعد السؤال والرد كما تشاء.','Say one question and hear the reply. Repeat both as often as you like.')}</p>`:''}
  <details class="idea-disclosure"><summary>${T('كيف أتدرّب مع مساعدي؟','How do I practise with my assistant?')}</summary>
   <p>${T('ابدأ مشاركة الشاشة من تطبيق المساعد واختر تبويب هذا الموقع. انسخ تعليمات الجلسة إلى المساعد ثم اقرأ السؤال الظاهر. يمكنك أيضًا تشغيل السؤال والرد النموذجي هنا.','Start screen sharing in your assistant and choose this site’s tab. Copy the session instructions into the assistant and read the displayed question aloud. You can also play the question and model reply here.')}</p></details>
  <div id="scene-assistant-step">${open?sceneAssistantStep(scene):''}</div>
  <div class="buttonrow">
   <button type="button" class="secondary" onclick="copySceneAssistantText(this,'session')">${T('انسخ تعليمات الجلسة','Copy session instructions')}</button>
  </div>
  <textarea data-scene-ai-prompt dir="ltr" lang="en" rows="6" readonly hidden aria-label="${T('النص الجاهز للمساعد','Text for the assistant')}"></textarea>
  <p data-scene-ai-status role="status"></p></aside>`;
}

function sceneAssistantGuide(scene){
 return EPSceneGuide.make(scene,id=>PILOT?.patterns.find(pattern=>pattern.id===id)?.form,sceneLearningLevel(scene));
}

function sceneAssistantIndex(scene,count){
 return Math.min(count-1,Math.max(0,sceneAssistantSteps.get(scene.id.replace(/^studio:/,''))||0));
}

function sceneAssistantQuestionMarkup(question){
 const expression=question.phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const highlights=new Set(EPTeaching.indices(question.en,new RegExp('\\b'+expression+'\\b','i')));
 return question.en.split(/\s+/).map((word,index)=>highlights.has(index)?`<span class="pattern-token">${H(word)}</span>`:H(word)).join(' ');
}

function sceneAssistantStep(scene){
 const {questions}=sceneAssistantGuide(scene),index=sceneAssistantIndex(scene,questions.length),question=questions[index];
 const level=sceneLearningLevel(scene);
 const labels=level==='A1'?[['اسأل عمّا تراه','Ask what is visible'],['اطلب التكرار','Ask for repetition'],['استمع إلى مثال آخر','Hear another example']]:
  level==='A2'?[['اسأل عمّا تراه','Ask what is visible'],['اطلب مثالًا','Ask for an example'],['جرّب جملة قصيرة','Try a short sentence']]:[
  ['حدّد تفصيلًا','Locate a detail'],['فسّر ما تراه','Explain what you see'],['طبّق التركيب','Use the pattern'],
  ['غيّر مجرى الحوار','Change the dialogue'],['استرجع كلمة','Recall a word']
 ];
 const entry=vocabularyEntryFor({en:question.phrase,pos:'PHRASE'});
 return `<div class="scene-assistant-nav buttonrow">
   <button type="button" data-scene-guide-step="-1" class="secondary" onclick="stepSceneAssistant(-1)" ${index===0?'disabled':''}>${T('السابق','Previous')}</button>
   <strong>${T(...labels[index])} <small><bdi>${index+1}/${questions.length}</bdi></small></strong>
   <button type="button" data-scene-guide-step="1" class="secondary" onclick="stepSceneAssistant(1)" ${index===questions.length-1?'disabled':''}>${T('التالي','Next')}</button>
  </div>
  ${question.model?`<p class="pattern-form" lang="en" dir="ltr">${H(question.model.form)}</p>`:''}
  <details class="idea-disclosure" open><summary>${T('السؤال الذي أقوله للمساعد','Question to ask your assistant')}</summary>
   <p class="scene-assistant-question" lang="en" dir="ltr">${sceneAssistantQuestionMarkup(question)}</p>
   <div class="buttonrow scene-assistant-guide-actions">
    <button type="button" class="secondary" onclick="speakSceneAssistantQuestion()">▶ ${T('استمع إلى السؤال','Hear the question')}</button>
    ${question.answer?`<button type="button" class="primary" onclick="speakSceneAssistantQuestion(true)">▶ ${T('استمع إلى رد نموذجي','Hear a model reply')}</button>`:''}
    <button type="button" class="secondary" onclick="copySceneAssistantText(this,'question')">${T('انسخ السؤال','Copy question')}</button>
    ${entry?`<button type="button" class="textlink" data-scene-guide-atlas onclick="openVocabularyFromScene('${entry.id}')">${T('العبارة في الأطلس','Expression in the atlas')} ↗</button>`:''}
   </div>
  </details>
  <details class="idea-disclosure"><summary>${T('الترجمة والتلميح','Translation and hint')}</summary>
   ${EP.ar(question.ar)}
   ${question.answer?`<p lang="en" dir="ltr">${H(question.answer[0])}</p>${EP.ar(question.answer[1])}`:''}
   ${question.model?`<p lang="en" dir="ltr">${comparisonModel(question.model.en,question.model)}</p>${EP.ar(question.model.ar)}
   <p>${T('طبّق التركيب في هذا الموقف','Use the pattern for this scene')}</p>
   ${EP.pair(scene.taskAr,scene.taskEn)}`:''}
   ${index<questions.length-1&&question.terms.length?`<ul class="scene-assistant-terms">${question.terms.map(word=>{
    const wordIndex=scene.words.indexOf(word);
    return `<li><button type="button" class="textlink" lang="en" dir="ltr" onclick="showIdeaMarker(${wordIndex},{clickedLanguage:'en',fromList:true})">${H(word.en)}</button>
     <button type="button" class="textlink ar-content" lang="ar" dir="rtl" onclick="showIdeaMarker(${wordIndex},{clickedLanguage:'ar',fromList:true})">${H(word.ar)}</button></li>`;
   }).join('')}</ul>`:''}
  </details>`;
}

function refreshSceneAssistant(scene,withAtlas=false){
 const host=$('#scene-assistant-step');
 if(!host||!scene)return;
 host.innerHTML=sceneAssistantStep(scene);
 if(withAtlas&&!vocabularyData)loadVocabulary().then(data=>{
  if(data&&host.isConnected&&currentIdeaScene()?.id===scene.id){
   const {questions}=sceneAssistantGuide(scene);
   const step=questions[sceneAssistantIndex(scene,questions.length)];
   const entry=vocabularyEntryFor({en:step.phrase,pos:'PHRASE'});
   if(entry&&!host.querySelector('[data-scene-guide-atlas]'))host.querySelector('.scene-assistant-guide-actions')?.insertAdjacentHTML('beforeend',
    `<button type="button" class="textlink" data-scene-guide-atlas onclick="openVocabularyFromScene('${entry.id}')">${T('العبارة في الأطلس','Expression in the atlas')} ↗</button>`);
  }
 });
}

function toggleSceneAssistant(button){
 const panel=$('#scene-assistant'),scene=currentIdeaScene();
 if(!panel||!scene)return;
 const open=panel.hidden;
 sceneAssistantVisibility.set(scene.id.replace(/^studio:/,''),open);
 panel.hidden=!open;
 button.setAttribute('aria-expanded',String(open));
 if(open)refreshSceneAssistant(scene,true);
}

function stepSceneAssistant(delta){
 const scene=currentIdeaScene();
 if(!scene)return;
 const {questions}=sceneAssistantGuide(scene);
 const index=Math.max(0,Math.min(questions.length-1,sceneAssistantIndex(scene,questions.length)+delta));
 sceneAssistantSteps.set(scene.id.replace(/^studio:/,''),index);
 refreshSceneAssistant(scene);
 const controls=$('#scene-assistant-step');
 const next=controls.querySelector(`[data-scene-guide-step="${delta}"]:not(:disabled)`)||
  controls.querySelector('[data-scene-guide-step]:not(:disabled)');
 next?.focus({preventScroll:true});
}

function openSceneAssistantGuide(id,step){
 return openLinkedLearning(dialogueSceneLocations.has(id)?'photo':'scene',id,{step});
}

function speakSceneAssistantQuestion(answer=false){
 const scene=currentIdeaScene();
 if(!scene)return;
 const {questions}=sceneAssistantGuide(scene);
 const question=questions[sceneAssistantIndex(scene,questions.length)];
 const text=answer?question.answer?.[0]:question.en;
 if(text)speak(text);
}

function copySceneAssistantText(button,kind){
 const scene=currentIdeaScene();
 if(!scene)return;
 const {pattern,questions,terms}=sceneAssistantGuide(scene);
 const level=sceneLearningLevel(scene);
 const box=$('#scene-assistant [data-scene-ai-prompt]');
 const question=questions[sceneAssistantIndex(scene,questions.length)];
 const instructions={
  A1:'I will say one of the listed questions aloud. Answer it in one short English sentence, slowly, and wait. Repeat the same words when I ask. Use common vocabulary. Do not ask me a question, test me, or begin a role-play. Give an Arabic meaning only if I ask for it.',
  A2:'Start by answering my question in one short sentence. Model the target pattern once. Only when I say I am ready, invite me to try one short sentence and give one helpful correction. Wait at each turn.',
  B1:'Answer my cue in two brief sentences. Then ask one follow-up using the target pattern. Let me explain a detail or offer a reason. When we role-play, change one condition and wait for my reply.',
  B2:'Use my cues to practise a short role-play. Add one plausible complication, ask me to compare options and justify a choice, then help me rephrase one answer naturally.'
 };
 box.value=kind==='question'?question.en+(question.model?`\nTarget pattern: ${pattern.form}\nExample: ${pattern.en}`:''):`Help me practise at level ${level}. I speak Arabic.
 ${instructions[level]}
Scene model: ${scene.sentenceEn}
${pattern?`Target pattern: ${pattern.form}\nExample: ${pattern.en}\n`:''}Scene vocabulary: ${terms.map(word=>word.en).join(', ')||'use an obvious detail from the scene'}.
Use visible details you can verify or the written context here. Treat role-play changes as imaginary.
${questions.map((item,index)=>`${index+1}. ${item.en}${item.answer?` Model reply: ${item.answer[0]}`:''}`).join('\n')}`;
 return copySceneAiPrompt(button);
}
