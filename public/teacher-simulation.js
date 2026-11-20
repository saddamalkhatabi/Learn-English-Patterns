var teacherSimulation=null;
function teacherNarrationOptions(){
 return {
  narrate:narrateTrainingCue,narratePurpose:narrateSentencePurpose,narrateVocabulary:playCoachVocabulary,
  matchesPurpose:(selection,id)=>EPPurposes.matches(selection,EPPurposes.forPattern(id))
 };
}
function playCoachVocabulary(player){
 let stopped=false,sound;
 const voice=player.session.voice;
 const stop=()=>{stopped=true;sound?.stop();player.activeVocabulary=null};
 const done=(async()=>{
  await loadStudioVocabulary();
  if(stopped)return;
  const included=new Set(player.session.ids);
  const rows=player.data.sentences.filter(row=>row.pattern_id===player.pattern.id);
  rows.sort((a,b)=>Number(included.has(a.id))-Number(included.has(b.id)));
  const seen=new Set(),entries=[];
  for(const row of rows){
   for(const word of studioVocabulary?.[row.id]?.words||[]){
    const key=EPVocabulary.normalize(word.en);
    if(seen.has(key)||!referenceStudyAudio.eligibleWord(word)||!EPVocabulary.includesTerm(row.en,word.en))continue;
    const recording=referenceGuidedWordRecording({...word,row},word.en,voice);
    const sentence=referenceStudySentenceTrack(row,voice);
    if(!recording?.path||!sentence.recording?.path)continue;
    seen.add(key);
    entries.push({word,row,recording,sentence});
    break;
   }
   if(entries.length===3)break;
  }
  for(const [index,entry] of entries.entries()){
   for(const [step,recording] of [['word',entry.recording],['sentence',entry.sentence.recording]]){
    if(stopped)return;
    player.activeVocabulary={...entry,index,step,total:entries.length};
    player.emit();
    sound=playVocabularyClip(recording,{rate:player.session.rate});
    await sound.done;
   }
  }
  player.activeVocabulary=null;
 })();
 return {done,stop};
}
function coachPurposePhase(row){
 return `<section class="comparison-view"><h2>${T('اسمع غرض العبارة','Hear the purpose of the sentence')}</h2>
  ${purposeTag(sentencePurpose(row))}<p lang="en" dir="ltr">${H(EPPurposes.spoken(sentencePurpose(row)))}</p></section>`;
}
function coachVocabularyPhase(player,showEnglish=true){
 const entry=player.activeVocabulary;
 return `<section class="comparison-view coach-vocabulary"><h2>${T('وسّع مفردات النمط','Expand the pattern vocabulary')}</h2>${entry?`
  <p>${entry.index+1} / ${entry.total} · ${entry.step==='word'?T('استمع إلى المفردة','Hear the word'):T('استمع إليها في جملة','Hear it in a sentence')}</p>
  <div class="purpose-vocabulary-word"><b lang="en" dir="ltr">${H(entry.word.en)}</b> ${wordTypeBadge(entry.word)}</div>
  ${showEnglish?`<p lang="en" dir="ltr">${vocabularyLine(entry.row,entry.word.en)}</p>`:''}
  ${EP.ar(entry.row.ar)}`:`<p>${T('جارٍ إعداد المفردات…','Preparing vocabulary…')}</p>`}</section>`;
}
function vocabularyLine(row,term){
 const display=englishDisplay(row.en,row).split(' ');
 const marked=referenceStudyAudio.termIndexes(display,term);
 return display.map((part,index)=>marked.includes(index)?`<mark class="purpose-vocabulary-mark">${H(part)}</mark>`:H(part)).join(' ');
}
function teacherPurposeSettings(){
 return `<label class="field">${T('غرض التعبير','Communicative purpose')}<select id="route-purpose">${purposeOptions(route.session.filters?.purposeId)}</select></label>
  <label class="setting-toggle"><input id="route-speak-purpose" type="checkbox" ${route.session.speakPurpose?'checked':''}>${T('انطق غرض العبارة قبل المثال','Speak the purpose before the example')}</label>
  <label class="setting-toggle"><input id="route-expand-vocabulary" type="checkbox" ${route.session.expandVocabulary?'checked':''}>${T('وسّع مفردات النمط بعد الأمثلة','Expand pattern vocabulary after the examples')}</label>`;
}
const teacherSettingHelp={
 'teacher-route':['يختار مجموعة أنماط جاهزة. يمكن تضييقها بغرض التعبير أو المستوى.','Selects a preset collection. Narrow it by purpose or level.'],
 'route-purpose':['اختر فرعًا كاملًا من شجرة الأغراض أو حدّد غرضًا واحدًا.','Choose a whole branch from the purpose tree or select one purpose.'],
 'route-mode':['الاستماع ينتقل تلقائيًا. في التدريب التفاعلي يتوقف المسار بعد كل جملة لتكتب فكرة جديدة بنفس النمط.','Listening plays continuously. Interactive practice pauses after each sentence so you can write a new idea.'],
 'route-voice':['يختار صوت الأمثلة والمفردات. التناوب يغيّر الصوت بين الجمل. تقرأ Bella الغرض من تسجيل مستقل.','Chooses the example and vocabulary voice. Alternation switches voices between sentences. Bella reads the purpose from its own recording.'],
 'route-sample':['يحدد عدد الأمثلة للنمط الواحد. العينة السريعة تختار أول ثلاثة والمتنوعة توزّع الاختيار عبر المراحل.','Sets the number of examples per pattern. Quick review takes the first three. Varied review spreads the selection across stages.'],
 'route-stage':['يحصر الأمثلة في مرحلة بناء واحدة، من الفهم في البداية إلى إنتاج عبارات في المرحلة السادسة.','Limits examples to one teaching stage, from initial understanding to producing sentences in stage six.'],
 'route-level':['يستبقي الأنماط والأمثلة المطابقة لمستوى التعلّم الذي تختاره.','Keeps patterns and examples at the learning level you choose.'],
 'route-reading-seconds':['يضبط وقت المراجعة بعد الشرح الصوتي وقبل أول مثال. اختر صفرًا لتبدأ الأمثلة بعد الشرح مباشرة.','Sets the review time after the recorded rule and before the first example. Select zero to go straight to the examples after the rule.'],
 'route-dialogues':['يحدد عدد المحادثات المرتبطة المعروضة. أكمل محادثة واحدة قبل الانتقال إلى نمط جديد.','Sets how many related conversations you can choose from. Finish one conversation before moving to a new pattern.'],
 'route-auto-next':['بعد إكمال المحادثة يبدأ النمط التالي، أو يتوقف المسار حتى تضغط متابعة بحسب اختيارك.','After a completed conversation, this starts the next pattern or waits for you to resume.'],
 'route-speak-purpose':['تسمع الغرض قبل الجملة. جرّب تشغيله ثم إيقافه لسماع الفرق في تسلسل الاستماع.','Hear the purpose before each sentence. Try turning it off and on to hear how the sequence changes.'],
 'route-expand-vocabulary':['بعد آخر مثال تستمع إلى ثلاث مفردات مفيدة. تسمع كل مفردة ثم الجملة التي وردت فيها، ويظهر نوعها بجانبها.','After the final example, hear up to three terms, each followed by its sentence, with the word type shown.'],
 'route-preview-pattern':['اترك الاختيار على بداية المسار لتجربة الانتقال بين نمطين، أو اختر نمطًا من النتائج لتسمع تسجيلاته.','Preview the first two matching patterns to try automatic progression, or choose a matching pattern to hear its recordings.'],
 'route-preview-rate':['غيّر سرعة التشغيل. يفيد الإبطاء عند مراجعة النطق وتقطيع الجمل.','Change playback speed. Slower speeds can help you review pronunciation and phrasing.'],
 'route-preview-hide':['أخفِ الجملة الإنجليزية لترى كيف تبدو الشاشة عند التدريب على الاستماع وحده.','Hide the English sentence to try listening without reading along.']
};
function simulationField(id,label,control){
 return `<label class="field simulation-field">${label}${control}<small id="simulation-help-${id}">${T(...teacherSettingHelp[id])}</small></label>`;
}
function openTeacherSimulation(){
 if(!route||teacherSimulation)return;
 stopSpeech();
 const form=$('.route-filters'),trigger=$('#teacher-simulate');
 const dialog=document.createElement('dialog');
 dialog.className='teacher-simulation';
 dialog.setAttribute('aria-labelledby','teacher-simulation-title');
 const fields=Object.entries(teacherSettingHelp).filter(([id])=>form.querySelector('#'+id)).map(([id])=>{
  const original=form.querySelector('#'+id),field=original.cloneNode(true);
  const label=[...original.closest('label').childNodes].filter(node=>node.nodeType===3).map(node=>node.textContent.trim()).join(' ').trim();
  field.removeAttribute('id');
  field.removeAttribute('onchange');
  field.dataset.setting=id;
  if(field.tagName==='SELECT')for(const option of field.options)option.toggleAttribute('selected',option.value===original.value);
  else field.toggleAttribute('checked',original.checked);
  field.setAttribute('aria-describedby','simulation-help-'+id);
  return simulationField(id,H(label),field.outerHTML);
 }).join('');
 dialog.innerHTML=`<div class="simulation-header"><h2 id="teacher-simulation-title">${T('جرّب إعدادات التدريب','Try your practice settings')}</h2>
  <button class="secondary" type="button" data-sim-close aria-label="${T('إغلاق المحاكاة','Close simulation')}">×</button></div>
  <p>${T('غيّر إعدادًا، ثم شغّل المعاينة لتجربة أثره. هذه التجربة لها مسار مستقل.','Change a setting and play the preview to try it. This preview has its own route.')}</p>
  <div class="simulation-layout"><div class="simulation-settings">${fields}
   ${simulationField('route-preview-pattern',T('نمط للتجربة','Preview pattern'),'<select data-preview-pattern aria-describedby="simulation-help-route-preview-pattern"></select>')}
   ${simulationField('route-preview-rate',T('سرعة الاستماع','Playback speed'),`<select data-preview-rate aria-describedby="simulation-help-route-preview-rate">${[.75,.85,1,1.15].map(rate=>`<option value="${rate}" ${route.session.rate===rate?'selected':''}>${rate}×</option>`).join('')}</select>`)}
   ${simulationField('route-preview-hide',T('إخفاء الجملة الإنجليزية','Hide the English sentence'),`<input type="checkbox" data-preview-hide ${hideCoachText?'checked':''} aria-describedby="simulation-help-route-preview-hide">`)}
  </div><section class="simulation-stage"><h3>${T('المعاينة الحيّة','Live preview')}</h3><p data-sim-count role="status"></p>
   <div class="buttonrow"><button class="primary" type="button" data-sim-play></button>
   <button class="secondary" type="button" data-sim-next>${T('متابعة المعاينة','Continue preview')}</button></div>
   <div data-sim-content></div></section></div>`;
 document.body.append(dialog);
 const player=new NasaqRoutePlayer({data:PILOT,audio:new Audio(),storage:null,observePageHide:false,...teacherNarrationOptions(),
  readingDefault:route.readingDefault,onchange:paintTeacherSimulation});
 teacherSimulation={dialog,player};
 const target=key=>dialog.querySelector('[data-'+key+']');
 target('sim-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{
  player.pause();clearInterval(teacherSimulation.timer);teacherSimulation=null;
  dialog.remove();trigger?.focus();
 },{once:true});
 target('sim-play').onclick=()=>player.running?player.pause():player.play();
 target('sim-next').onclick=()=>advanceTeacherSimulation(player);
 dialog.querySelector('.simulation-settings').onchange=event=>{
  if(event.target.matches('[data-preview-hide]'))paintTeacherSimulation(player);
  else if(event.target.matches('[data-preview-rate]'))player.setRate(event.target.value);
  else updateTeacherSimulation(form,event.target.dataset.setting==='teacher-route');
 };
 updateTeacherSimulation(form);
 teacherSimulation.timer=setInterval(()=>{if(player.session.phase==='comparison')paintTeacherSimulation(player)},250);
 dialog.showModal();
}
function updateTeacherSimulation(form,presetChanged=false){
 const {dialog,player}=teacherSimulation;
 const original=selector=>form.querySelector(selector);
 const overrides=selector=>{
  const field=dialog.querySelector(`[data-setting="${selector.slice(1)}"]`);
  return field||original(selector);
 };
 let options=teacherRouteOptions(overrides);
 if(presetChanged&&!options.routeId)teacherSimulation.manual=true;
 if(teacherSimulation.manual&&!options.routeId)options={...options,patternIds:PILOT.pattern_order};
 const rows=player.queue(options),rowById=new Map(PILOT.sentences.map(row=>[row.id,row]));
 const matched=[...new Set(rows.map(id=>rowById.get(id).pattern_id))];
 const select=dialog.querySelector('[data-preview-pattern]'),choice=Number(select.value);
 select.innerHTML=`<option value="">${T('بداية المسار','Start of route')}</option>${matched.map(id=>
  `<option value="${id}" ${choice===id?'selected':''}>${H(PILOT.patterns.find(pattern=>pattern.id===id).form)}</option>`).join('')}`;
 const sample=Number(select.value)?[Number(select.value)]:matched.slice(0,2);
 dialog.querySelector('[data-sim-count]').textContent=rows.length?
  T(`تطابق ${rows.length} جملة في ${matched.length} نمط · المعاينة تعرض ${sample.length}.`,`${rows.length} matching sentences in ${matched.length} patterns · preview uses ${sample.length}.`):
  T('لا توجد أمثلة توافق هذا الاختيار. غيّر أحد المرشحات.','No examples match. Change one of the filters.');
 player.configure({...options,patternIds:sample,rate:Number(dialog.querySelector('[data-preview-rate]').value)});
}
function advanceTeacherSimulation(player){
 const phase=player.session.phase;
 if(!player.sentence||phase==='finished'||player.isCue)return;
 if(phase==='exercise'){player.continueAfterExercise();return}
 if(phase==='comparison'){if(!player.comparisonRemaining)player.play();return}
 if(phase==='sentence'){player.running=true;player.finishSentence();return}
 if(phase==='dialogue'){player.finishDialogue();return}
 player.play();
}
function paintTeacherSimulation(player){
 if(teacherSimulation?.player!==player)return;
 const {dialog}=teacherSimulation,row=player.sentence,phase=player.session.phase;
 const english=!dialog.querySelector('[data-preview-hide]').checked;
 const play=dialog.querySelector('[data-sim-play]'),next=dialog.querySelector('[data-sim-next]');
 play.textContent=player.running?T('إيقاف مؤقت','Pause'):T('▷ تشغيل المعاينة','▷ Play preview');
 play.disabled=!row||phase==='exercise';
 const wait=phase==='comparison'?Math.ceil(player.comparisonRemaining/1000):0;
 next.disabled=!row||player.isCue||phase==='finished'||wait>0;
 const host=dialog.querySelector('[data-sim-content]');
 const key=[row?.id,phase,wait,english,player.session.dialogueId,player.session.voice,player.activeVocabulary?.index,
  player.activeVocabulary?.step,player.error].join('/');
 if(host.dataset.key===key)return;
 host.dataset.key=key;
 if(!row){host.innerHTML='';return}
 if(player.error){host.innerHTML=`<p role="status">${H(player.error)}</p>`;return}
 switch(phase){
  case 'pattern-intro':case 'explanation-intro':host.innerHTML=`<h4>${T(...trainingCueLabels[phase])}</h4>${EP.rule(row)}`;break;
  case 'comparison':host.innerHTML=`<h4>${T('مراجعة القاعدة','Rule review')} · ${wait}s</h4>${EP.rule(row)}`;break;
  case 'purpose-intro':host.innerHTML=coachPurposePhase(row);break;
  case 'vocabulary':host.innerHTML=coachVocabularyPhase(player,english);break;
  case 'exercise':
   host.innerHTML=`<label>${T('جرّب كتابة فكرة جديدة بنفس النمط.','Try writing a new idea using the pattern.')}
    <textarea lang="en" dir="ltr"></textarea></label>`;break;
  case 'dialogue-intro':case 'dialogue':case 'conversation-pending':
   host.innerHTML=`<h4>${T('تطبيق بالمحادثة','Conversation practice')}</h4>
    <p>${H(T(player.activeDialogue?.ar||'',player.activeDialogue?.en||''))} · ${(player.session.dialogueCursor??0)+1} / ${player.session.dialogueIds?.length||1}</p>
    <label>${T('اختر محادثة','Choose a conversation')}<select onchange="teacherSimulation.player.chooseDialogue(this.value)">${(player.session.dialogueIds||[]).map(id=>{
     const conversation=PILOT.dialogues.find(item=>item.id===id);
     return `<option value="${H(id)}" ${id===player.session.dialogueId?'selected':''}>${H(T(conversation.ar,conversation.en))}</option>`;
    }).join('')}</select></label>`;break;
  case 'between':host.innerHTML=`<p>${T('انتهى هذا النمط. اضغط متابعة لبدء النمط التالي.','This pattern is complete. Continue to start the next pattern.')}</p>`;break;
  case 'finished':host.innerHTML=`<p>${T('اكتملت المعاينة. غيّر إعدادًا أو جرّبها مجددًا.','Preview complete. Change a setting or replay it.')}</p>`;break;
  default:host.innerHTML=`<p>${H(purposeLabel(sentencePurpose(row)))} · ${player.session.voice==='female'?'Bella':'Adam'}</p>
   ${english?`<p lang="en" dir="ltr">${EP.words(row)}</p>`:''}${EP.ar(row.ar)}`;break;
 }
 EP.apply();
}
