const sceneAssistantVisibility=new Map();
const sceneAssistantSteps=new Map();
const sceneAssistantModes=new Map();
const sceneAssistantRoles=new Map();
const sceneAssistantFocusWords=new Map();
let sceneAssistantAudio,sceneAssistantAudioEpoch=0;
const sceneAssistantKey=scene=>scene.id.replace(/^studio:/,'');
const sceneAssistantLevel=scene=>scene.learningLevel||sceneLearningLevel(scene);

function sceneAssistantIsOpen(scene){
 return sceneAssistantVisibility.get(sceneAssistantKey(scene))??['A1','A2'].includes(sceneAssistantLevel(scene));
}

function sceneAssistantMode(scene){
 return sceneAssistantModes.get(sceneAssistantKey(scene))||(['A1','A2'].includes(sceneAssistantLevel(scene))?'listen':'exchange');
}

function sceneAssistantButton(scene){
 return `<button type="button" class="secondary scene-assistant-toggle" aria-controls="scene-assistant" data-no-instant-lookup
  aria-expanded="${sceneAssistantIsOpen(scene)}" onclick="toggleSceneAssistant(this)">${T('مساعد مشاركة الشاشة','Screen-sharing coach')}</button>`;
}

function sceneAssistantPanel(scene){
 const open=sceneAssistantIsOpen(scene),level=sceneAssistantLevel(scene);
 return `<aside id="scene-assistant" class="scene-ai scene-assistant" aria-labelledby="scene-assistant-title" ${open?'':'hidden'}>
  <h3 id="scene-assistant-title">${T('مساعد مشاركة الشاشة','Screen-sharing coach')} · ${level}</h3>
  <details class="idea-disclosure"><summary>${T('كيف أتدرّب مع مساعدي؟','How do I practise with my assistant?')}</summary>
   <p>${T('ابدأ محادثة صوتية في تطبيق المساعد وشارك تبويب التمرين. الصق تعليمات الجلسة، ثم انطق الطلب الحالي. يمكنك سماع النماذج الصوتية هنا أيضًا.','Start a voice conversation in your assistant and share this tab. Paste the session instructions, then say the current cue aloud. You can also hear the model lines here.')}</p>
   ${scene.journey?`<p>${T('قل «Next photo» عند الانتقال إلى اللقطة التالية، أو «Swap roles» لتبادل الدورين مع المساعد.','Say “Next photo” when you move to the next frame, or “Swap roles” to switch roles with the assistant.')}</p>`:''}</details>
  <div id="scene-assistant-step">${open?sceneAssistantStep(scene):''}</div>
  <div class="buttonrow">
   <button type="button" class="secondary" data-no-instant-lookup onclick="copySceneAssistantText(this,'session')">${T('انسخ تعليمات الجلسة','Copy session instructions')}</button>
  </div>
  <textarea data-scene-ai-prompt dir="ltr" lang="en" rows="6" readonly hidden aria-label="${T('النص الجاهز للمساعد','Text for the assistant')}"></textarea>
  <p data-scene-ai-status role="status"></p></aside>`;
}

function sceneAssistantGuide(scene){
 const form=id=>PILOT?.patterns.find(pattern=>pattern.id===id)?.form;
 if(scene.journey){
  const role=sceneAssistantRoles.get(sceneAssistantKey(scene))||scene.journey.dialogue.lines[0].voice;
  return EPSceneGuide.makeJourney(scene.journey,studioJourneySelection(scene.journey.dialogue.id),role,form);
 }
 return EPSceneGuide.make(scene,form,sceneAssistantLevel(scene),{focus:scene.words?.[sceneAssistantFocusWords.get(sceneAssistantKey(scene))]});
}

function sceneAssistantIndex(scene,count){
 return Math.min(count-1,Math.max(0,sceneAssistantSteps.get(sceneAssistantKey(scene))||0));
}

function sceneAssistantQuestionMarkup(question,text){
 const expression=question.phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const highlights=new Set(EPTeaching.indices(text,new RegExp('\\b'+expression+'\\b','i')));
 return text.split(/\s+/).map((word,index)=>highlights.has(index)?`<span class="pattern-token">${H(word)}</span>`:H(word)).join(' ');
}

function sceneAssistantAtlasButton(question){
 const entry=vocabularyEntryFor({en:question.phrase,pos:'PHRASE'});
 return entry?`<button type="button" class="textlink" data-scene-guide-atlas onclick="openVocabularyFromScene('${entry.id}')">${T('العبارة في الأطلس','Expression in the atlas')} ↗</button>`:'';
}

function sceneAssistantFrames(guide,question,index){
 if(!guide.frames)return '';
 const other=guide.role==='male'?'female':'male';
 const speaker=voice=>voice===guide.firstVoice?T('المتحدث الأول','Speaker 1'):T('المتحدث الثاني','Speaker 2');
 return `<div class="scene-assistant-journey">
  <div class="buttonrow" role="group" aria-label="${T('اختر لقطة','Choose a photo')}">${guide.frames.map(frame=>
   `<button type="button" class="secondary" data-scene-guide-frame="${frame.index}" data-no-instant-lookup aria-pressed="${frame.index===index}"
    onclick="selectSceneAssistantStep(${frame.index},'[data-scene-guide-frame=&quot;${frame.index}&quot;]')">${T(`اللقطة ${frame.index+1}`,`Photo ${frame.index+1}`)}</button>`).join('')}</div>
  <div class="scene-assistant-frames">${question.frames.map(index=>{
   const frame=guide.frames[index];
   return `<figure>${studioJourneyPhoto(frame.stage.scene,index+1)}<figcaption>
    <b>${T(`اللقطة ${index+1}`,`Photo ${index+1}`)}</b> ${frame.detail?H(T(frame.detail.ar,frame.detail.en)):''}</figcaption></figure>`;
  }).join('')}</div>
  <div class="buttonrow"><p>${T('دورك','Your role')} · ${speaker(guide.role)} <span aria-hidden="true">|</span>
   ${T('دور المساعد','Assistant role')} · ${speaker(other)}</p>
   <button type="button" class="secondary" id="scene-assistant-swap" data-no-instant-lookup onclick="swapSceneAssistantRole()">${T('بدّل الدورين','Swap roles')}</button></div>
 </div>`;
}

function sceneAssistantTerms(scene,question){
 if(!question.terms.length)return '';
 const items=question.terms.map(word=>{
  const index=scene.words?.indexOf(word)??-1;
  const text=englishDisplay(word.en,word);
  const entry=vocabularyEntryFor(word);
  return `<li>${index>=0&&hasIdeaPoint(word)?
   `<button type="button" class="textlink" lang="en" dir="ltr" onclick="showIdeaMarker(${index},{clickedLanguage:'en',fromList:true})">${H(text)}</button>`:
   `<b lang="en" dir="ltr">${H(text)}</b>`}
   ${EP.ar(word.ar)}
   ${entry?`<button type="button" class="textlink" onclick="openVocabularyFromScene('${entry.id}','${scene.journey?'':H(sceneAssistantKey(scene))}')">${T('الأطلس','Atlas')} ↗</button>`:''}</li>`;
 });
 return `<ul class="scene-assistant-terms">${items.join('')}</ul>`;
}

function sceneAssistantStep(scene){
 const guide=sceneAssistantGuide(scene),{questions}=guide;
 const index=sceneAssistantIndex(scene,questions.length),question=questions[index],mode=sceneAssistantMode(scene);
 const model=question.model;
 return `<div class="buttonrow scene-assistant-modes" role="group" data-no-instant-lookup aria-label="${T('طريقة الممارسة','Practice mode')}">
   <button type="button" class="secondary" data-scene-guide-mode="listen" aria-pressed="${mode==='listen'}" onclick="setSceneAssistantMode('listen')">${T('استمع وكرّر','Listen and repeat')}</button>
   <button type="button" class="secondary" data-scene-guide-mode="exchange" aria-pressed="${mode==='exchange'}" onclick="setSceneAssistantMode('exchange')">${T('استمع ثم ردّ','Listen and respond')}</button>
  </div>
  <div class="scene-assistant-nav buttonrow" data-no-instant-lookup>
   <button type="button" data-scene-guide-step="-1" class="secondary" onclick="stepSceneAssistant(-1)" ${index===0?'disabled':''}>${T('السابق','Previous')}</button>
   <strong>${T(...question.label)} <small><bdi>${index+1}/${questions.length}</bdi></small></strong>
   <button type="button" data-scene-guide-step="1" class="secondary" onclick="stepSceneAssistant(1)" ${index===questions.length-1?'disabled':''}>${T('التالي','Next')}</button>
  </div>
  ${scene.words?.length?`<label class="scene-assistant-focus">${T('اختر كلمة لهذه الجولة','Choose a word for this round')}
   <select id="scene-assistant-focus" onchange="setSceneAssistantFocus(this.value)">
    <option value="">${T('من تفاصيل المشهد','From the scene')}</option>
    ${scene.words.map((word,index)=>`<option value="${index}" ${index===sceneAssistantFocusWords.get(sceneAssistantKey(scene))?'selected':''}>${H(englishDisplay(word.en,word))}</option>`).join('')}
   </select></label>`:''}
  ${sceneAssistantFrames(guide,question,index)}
  ${question.goal?`<p class="lesson-hint">${H(T(question.goal[1],question.goal[0]))}</p>`:''}
  ${model?`<div class="buttonrow"><b class="pattern-form" lang="en" dir="ltr">${H(model.form)}</b>
   ${model.id?`<button type="button" class="textlink" onclick="openLinkedLearning('lesson',${model.id})">${T('درس النمط','Pattern lesson')} ↗</button>`:''}</div>`:''}
  <p class="scene-assistant-cue-label">${T('قل للمساعد','Say to your assistant')}</p>
  <p class="scene-assistant-question" lang="en" dir="ltr">${englishIndexedMarkup(question.en,question,
   text=>sceneAssistantQuestionMarkup(question,text))}</p>
  <div class="buttonrow scene-assistant-guide-actions" data-no-instant-lookup>
   <button type="button" class="secondary" onclick="speakSceneAssistantQuestion('prompt')">▶ ${T('استمع إلى الطلب','Hear the cue')}</button>
   <button type="button" class="primary" onclick="speakSceneAssistantQuestion('answer')">▶ ${mode==='exchange'?T('اسمع دور الشريك ثم أجب','Hear the partner, then reply'):T('استمع إلى الرد','Hear the reply')}</button>
   ${question.turn&&question.turn[0]!==question.answer[0]?`<button type="button" class="secondary" onclick="speakSceneAssistantQuestion('exchange')">▶ ${T('استمع إلى الدورين','Hear both turns')}</button>`:''}
   <button type="button" class="secondary" data-scene-guide-stop onclick="stopSceneAssistantAudio()" hidden>${T('أوقف الصوت','Stop audio')}</button>
   <button type="button" class="textlink" onclick="copySceneAssistantText(this,'question')">${T('انسخ الطلب','Copy the cue')}</button>
   <button type="button" class="textlink" onclick="copySceneAssistantText(this,'round')">${T('انسخ الجولة الحالية','Copy this round')}</button>
   ${sceneAssistantAtlasButton(question)}
  </div>
  <p class="scene-assistant-audio" data-scene-guide-audio role="status"></p>
  <details class="idea-disclosure"><summary>${T('الترجمة والنماذج','Translation and model lines')}</summary>
   ${EP.ar(question.ar)}
   <p lang="en" dir="ltr">${englishTextMarkup(question.answer[0],{ar:question.answer[1]})}</p>${EP.ar(question.answer[1])}
   ${question.turn&&question.turn[0]!==question.answer[0]?`<p class="lesson-hint">${T('ردّ يمكنك تجربته','A reply you can try')}</p>
    <p lang="en" dir="ltr">${englishTextMarkup(question.turn[0],{ar:question.turn[1]})}</p>${EP.ar(question.turn[1])}`:''}
   ${model?`<p lang="en" dir="ltr">${comparisonModel(model.en,model)}</p>${EP.ar(model.ar)}`:''}
   ${sceneAssistantTerms(scene,question)}
  </details>`;
}

function refreshSceneAssistant(scene,withAtlas=false){
 const host=$('#scene-assistant-step');
 if(!host||!scene)return;
 host.innerHTML=sceneAssistantStep(scene);
 if(withAtlas&&!vocabularyData)loadVocabulary().then(data=>{
  if(!data||!host.isConnected||currentIdeaScene()?.id!==scene.id)return;
  const {questions}=sceneAssistantGuide(scene),question=questions[sceneAssistantIndex(scene,questions.length)];
  if(!host.querySelector('[data-scene-guide-atlas]'))host.querySelector('.scene-assistant-guide-actions')?.insertAdjacentHTML('beforeend',sceneAssistantAtlasButton(question));
 });
}

function toggleSceneAssistant(button){
 const panel=$('#scene-assistant'),scene=currentIdeaScene();
 if(!panel||!scene)return;
 const open=panel.hidden;
 sceneAssistantVisibility.set(sceneAssistantKey(scene),open);
 panel.hidden=!open;
 button.setAttribute('aria-expanded',String(open));
 if(open)refreshSceneAssistant(scene,true);
 else stopSceneAssistantAudio();
}

function setSceneAssistantMode(mode){
 const scene=currentIdeaScene();
 if(!scene||mode===sceneAssistantMode(scene))return;
 stopSceneAssistantAudio();
 sceneAssistantModes.set(sceneAssistantKey(scene),mode);
 refreshSceneAssistant(scene);
 $(`[data-scene-guide-mode="${mode}"]`)?.focus({preventScroll:true});
}

function setSceneAssistantFocus(value){
 const scene=currentIdeaScene();
 if(!scene?.words?.length)return;
 stopSceneAssistantAudio();
 const key=sceneAssistantKey(scene);
 if(value==='')sceneAssistantFocusWords.delete(key);
 else sceneAssistantFocusWords.set(key,Number(value));
 refreshSceneAssistant(scene);
 $('#scene-assistant-focus')?.focus({preventScroll:true});
}

function swapSceneAssistantRole(){
 const scene=currentIdeaScene();
 if(!scene?.journey)return;
 const role=sceneAssistantGuide(scene).role;
 stopSceneAssistantAudio();
 sceneAssistantRoles.set(sceneAssistantKey(scene),role==='male'?'female':'male');
 refreshSceneAssistant(scene);
 $('#scene-assistant-swap')?.focus({preventScroll:true});
}

function selectSceneAssistantStep(index,focus){
 const scene=currentIdeaScene();
 if(!scene)return;
 const {questions}=sceneAssistantGuide(scene);
 stopSceneAssistantAudio();
 sceneAssistantSteps.set(sceneAssistantKey(scene),Math.max(0,Math.min(questions.length-1,index)));
 refreshSceneAssistant(scene);
 ($(focus)||$('#scene-assistant-step [data-scene-guide-step]:not(:disabled)'))?.focus({preventScroll:true});
}

function stepSceneAssistant(delta){
 const scene=currentIdeaScene();
 if(!scene)return;
 const {questions}=sceneAssistantGuide(scene);
 selectSceneAssistantStep(sceneAssistantIndex(scene,questions.length)+delta,`[data-scene-guide-step="${delta}"]:not(:disabled)`);
}

function openSceneAssistantGuide(id,step){
 return openLinkedLearning(dialogueSceneLocations.has(id)?'photo':'scene',id,{step});
}

function stopSceneAssistantAudio(){
 sceneAssistantAudioEpoch++;
 sceneAssistantAudio?.stop();
 sceneAssistantAudio=null;
 const status=$('[data-scene-guide-audio]');
 if(status)status.textContent='';
 const stop=$('[data-scene-guide-stop]');
 if(stop)stop.hidden=true;
}

async function speakSceneAssistantQuestion(kind){
 const scene=currentIdeaScene();
 if(!scene)return;
 const {questions}=sceneAssistantGuide(scene),question=questions[sceneAssistantIndex(scene,questions.length)];
 const partnerPart=['answer',question.answer],learnerPart=['turn',question.turn];
 const parts=kind==='prompt'?[['prompt',[question.en,question.ar]]]:
  kind==='exchange'?(question.learnerStarts?[learnerPart,partnerPart]:[partnerPart,learnerPart]):[partnerPart];
 stopSpeech();
 const epoch=sceneAssistantAudioEpoch,status=$('[data-scene-guide-audio]'),stop=$('[data-scene-guide-stop]');
 if(!status||!stop)return;
 stop.hidden=false;
 for(const [part,line] of parts){
  if(!line||epoch!==sceneAssistantAudioEpoch||!status?.isConnected)return;
  const dialogue=scene.journey?.dialogue,turnIndex=question.recordings?.[part];
  const cue=dialogue?.audio?.turns[turnIndex],original=dialogue?.lines[turnIndex];
  const text=englishSpeakable(line[0],{ar:line[1]});
  const source=scene.sentenceId&&dialogueScene(scene.sentenceId);
  const sceneClip=source?.recordings?.female;
  status.textContent=part==='turn'?T('تستمع الآن إلى الرد المقترح لدورك.','Listening to the model line for your role.'):
   T('جارٍ التشغيل…','Playing…');
  sceneAssistantAudio=cue&&original&&EPEnglish.sameSpeech(original.en,text)?
   playVocabularyClip({path:dialogue.audio.path,start_ms:cue.start_ms,end_ms:cue.end_ms}):
   sceneClip?.path&&EPEnglish.sameSpeech(source.en,text)?playVocabularyClip({path:sceneClip.path}):
   synthesizeTrainingCue(text,state.rate||1,original?.voice||(part==='turn'?'male':'female'));
  const ok=await sceneAssistantAudio.done;
  if(epoch!==sceneAssistantAudioEpoch||!status.isConnected)return;
  if(!ok){
   sceneAssistantAudio=null;
   stop.hidden=true;
   status.textContent=T('تعذّر تشغيل الصوت على هذا الجهاز.','Audio could not play on this device.');
   return;
  }
 }
 sceneAssistantAudio=null;
 stop.hidden=true;
 status.textContent=kind==='answer'&&sceneAssistantMode(scene)==='exchange'?
  T('دورك الآن. قل ردّك، ثم اطلب سؤال متابعة مرتبطًا به.','Your turn. Say your reply, then ask for a follow-up based on it.'):'';
}

function copySceneAssistantText(button,kind){
 const scene=currentIdeaScene();
 if(!scene)return;
 const guide=sceneAssistantGuide(scene),{questions}=guide;
 const index=sceneAssistantIndex(scene,questions.length),question=questions[index],level=sceneAssistantLevel(scene);
 const mode=sceneAssistantMode(scene);
 const box=$('#scene-assistant [data-scene-ai-prompt]');
 const english=line=>englishDisplay(line[0],{ar:line[1]});
 const instructions=mode==='listen'?
  'Start by answering the selected cue. Give one short natural line at a time, then pause. When I ask for repetition, repeat the same wording slowly. Ask me a question only after I say “Ask me” or “My turn”.':
  'Take the partner role. Say one short natural line and wait for me to speak. Build one follow-up on a real detail in my reply. Change the wording on another attempt and keep the same situation. Give one useful reformulation only after I have replied, then let me try it aloud.';
 const difficulty={
  A1:'Use everyday words and one short sentence per turn. A one- or two-word answer from me is fine.',
  A2:'Keep each turn short. Model the target pattern once, then let me change one word or detail.',
  B1:'Ask for one reason or one next step. Invite me to reuse the target pattern in a different line.',
  B2:'Ask me to compare options or make a decision. In a change round introduce exactly one complication.'
 };
 const round=item=>[
  englishDisplay(item.en,item),
  item.goal?`Communicative goal: ${english(item.goal)}`:'',
  item.model?`Target pattern: ${englishDisplay(item.model.form)}. Example: ${english([item.model.en,item.model.ar])}`:'',
  item.terms.length?`Focus details: ${item.terms.map(word=>englishDisplay(word.en,word)).join(', ')}.`:'',
  `Sample opening or response: ${english(item.answer)}`,
  item.turn&&item.turn[0]!==item.answer[0]?`Sample learner line, reveal only after I try: ${english(item.turn)}`:'',
  item.hypothetical?'This is an imagined change, not a detail from the photo.':''
 ].filter(Boolean).join('\n');
 const frames=guide.frames?.map(({stage,index,detail})=>`Photo ${index+1}: ${english([stage.purposeEn||stage.en,stage.purposeAr||stage.ar])} Scene line: ${english([stage.scene.sentenceEn,stage.scene.sentenceAr])}${detail?` Detail: ${englishDisplay(detail.en,detail)}.`:''}`);
 const roles=guide.frames?`I play ${guide.role===guide.firstVoice?'speaker 1':'speaker 2'}, and you take the other role. Follow the numbered photos. When I say “Next photo”, carry one relevant detail forward. When I say “Swap roles”, reverse roles at the current photo. If I ask for a different ending, return to the first photo briefly, then change the final step.`:'';
 box.value=kind==='question'?englishDisplay(question.en,question):[
  `Run an English voice practice at level ${level}. I speak Arabic. ${englishSessionInstruction()}`,
  instructions,difficulty[level],roles,
  `Situation: ${english(guide.context)}. Goal: ${english(guide.task)}`,
  'Use the shared photo, the supplied details, or the caption. If the screen is unavailable, use this written context. Treat changed details as imaginary. Do not repeat a question unless I ask. Give the Arabic meaning only when I ask.',
  frames?.join('\n'),
  `Start at round ${index+1}.`,
  kind==='round'?round(question):questions.map((item,i)=>`Round ${i+1}\n${round(item)}`).join('\n\n')
 ].filter(Boolean).join('\n');
 return copySceneAiPrompt(button);
}
const stopSpeechBeforeSceneAssistant=stopSpeech;
stopSpeech=function(options){stopSceneAssistantAudio();stopSpeechBeforeSceneAssistant(options)};
