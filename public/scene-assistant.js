let sceneAssistantOpen=false;
const sceneAssistantSteps=new Map();

function sceneAssistantButton(){
 return `<button type="button" class="secondary scene-assistant-toggle" aria-controls="scene-assistant"
  aria-expanded="${sceneAssistantOpen}" onclick="toggleSceneAssistant(this)">${T('مساعد مشاركة الشاشة','Screen-sharing coach')}</button>`;
}

function sceneAssistantPanel(scene){
 return `<aside id="scene-assistant" class="scene-ai scene-assistant" aria-labelledby="scene-assistant-title" ${sceneAssistantOpen?'':'hidden'}>
  <h3 id="scene-assistant-title">${T('تدرّب مع مساعدك الذكي','Practise with your AI assistant')}</h3>
  <p>${T('ابدأ مشاركة الشاشة من تطبيق المساعد واختر تبويب هذا الموقع. اقرأ له السؤال المعروض أو انسخ إليه تعليمات الجلسة.',
   'Start screen sharing in your AI assistant and choose this site’s tab. Read the current question aloud or copy the session instructions into the assistant.')}</p>
  <div id="scene-assistant-step">${sceneAssistantOpen?sceneAssistantStep(scene):''}</div>
  <div class="buttonrow">
   <button type="button" class="secondary" onclick="copySceneAssistantText(this,'session')">${T('انسخ تعليمات الجلسة','Copy session instructions')}</button>
  </div>
  <textarea data-scene-ai-prompt dir="ltr" lang="en" rows="6" readonly hidden aria-label="${T('النص الجاهز للمساعد','Text for the assistant')}"></textarea>
  <p data-scene-ai-status role="status"></p></aside>`;
}

function sceneAssistantGuide(scene){
 return EPSceneGuide.make(scene,id=>PILOT?.patterns.find(pattern=>pattern.id===id)?.form);
}

function sceneAssistantIndex(scene){
 return sceneAssistantSteps.get(scene.id.replace(/^studio:/,''))||0;
}

function sceneAssistantQuestionMarkup(question){
 const expression=question.phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const highlights=new Set(EPTeaching.indices(question.en,new RegExp('\\b'+expression+'\\b','i')));
 return question.en.split(/\s+/).map((word,index)=>highlights.has(index)?`<span class="pattern-token">${H(word)}</span>`:H(word)).join(' ');
}

function sceneAssistantStep(scene){
 const {questions}=sceneAssistantGuide(scene),index=sceneAssistantIndex(scene),question=questions[index];
 const labels=[
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
    <button type="button" class="secondary" onclick="copySceneAssistantText(this,'question')">${T('انسخ السؤال','Copy question')}</button>
    ${entry?`<button type="button" class="textlink" data-scene-guide-atlas onclick="openVocabularyFromScene('${entry.id}')">${T('العبارة في الأطلس','Expression in the atlas')} ↗</button>`:''}
   </div>
  </details>
  <details class="idea-disclosure"><summary>${T('الترجمة والتلميح','Translation and hint')}</summary>
   ${EP.ar(question.ar)}
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
   const step=sceneAssistantGuide(scene).questions[sceneAssistantIndex(scene)];
   const entry=vocabularyEntryFor({en:step.phrase,pos:'PHRASE'});
   if(entry&&!host.querySelector('[data-scene-guide-atlas]'))host.querySelector('.scene-assistant-guide-actions')?.insertAdjacentHTML('beforeend',
    `<button type="button" class="textlink" data-scene-guide-atlas onclick="openVocabularyFromScene('${entry.id}')">${T('العبارة في الأطلس','Expression in the atlas')} ↗</button>`);
  }
 });
}

function toggleSceneAssistant(button){
 const panel=$('#scene-assistant'),scene=currentIdeaScene();
 if(!panel||!scene)return;
 sceneAssistantOpen=panel.hidden;
 panel.hidden=!sceneAssistantOpen;
 button.setAttribute('aria-expanded',String(sceneAssistantOpen));
 if(sceneAssistantOpen)refreshSceneAssistant(scene,true);
}

function stepSceneAssistant(delta){
 const scene=currentIdeaScene();
 if(!scene)return;
 const {questions}=sceneAssistantGuide(scene);
 const index=Math.max(0,Math.min(questions.length-1,sceneAssistantIndex(scene)+delta));
 sceneAssistantSteps.set(scene.id.replace(/^studio:/,''),index);
 refreshSceneAssistant(scene);
 const controls=$('#scene-assistant-step');
 const next=controls.querySelector(`[data-scene-guide-step="${delta}"]:not(:disabled)`)||
  controls.querySelector('[data-scene-guide-step]:not(:disabled)');
 next?.focus({preventScroll:true});
}

async function openSceneAssistantGuide(id,step){
 await Promise.all([ideaLibraryReady,dialogueArchiveReady]);
 if(!ideaLibrary?.scenes.some(scene=>scene.id===id))return;
 sceneAssistantOpen=true;
 sceneAssistantSteps.set(id,step);
 if(dialogueSceneLocations.has(id)){await openSmartSentence(id);return}
 if(page!=='lab'){
  const changed=new Promise(resolve=>window.addEventListener('hashchange',resolve,{once:true}));
  navigate('lab');await changed;
 }
 if(page==='lab')chooseIdeaScene(id);
}

function speakSceneAssistantQuestion(){
 const scene=currentIdeaScene();
 if(scene)speak(sceneAssistantGuide(scene).questions[sceneAssistantIndex(scene)].en);
}

function copySceneAssistantText(button,kind){
 const scene=currentIdeaScene();
 if(!scene)return;
 const {pattern,questions,terms}=sceneAssistantGuide(scene);
 const box=$('#scene-assistant [data-scene-ai-prompt]');
 const question=questions[sceneAssistantIndex(scene)];
 box.value=kind==='question'?question.en+(question.model?`\nTarget pattern: ${pattern.form}\nExample: ${pattern.en}`:''):`Be my English conversation partner while I look at this scene. I speak Arabic. Start around A2 and adapt to my answers.
Scene model: ${scene.sentenceEn}
Practice goal: ${scene.taskEn}
Target pattern: ${pattern.form}
Example: ${pattern.en}
Scene vocabulary: ${terms.map(word=>word.en).join(', ')||'ask me to name a detail I can see'}.
If you can see my screen, use details you can verify. Otherwise use the context above and ask me to describe a visible detail. Treat role-play changes as imaginary.
Use these cues in order, one short turn at a time. Wait for my answer and let me ask follow-up questions. Give a brief Arabic hint only when I ask for one.
${questions.map((item,index)=>`${index+1}. ${item.en}`).join('\n')}
For the role-play, take the other role, respond naturally to my choices, then change one condition and let me adapt. End with one correction and ask me to reuse one expression without reading the example.`;
 return copySceneAiPrompt(button);
}
