decorateTeacherConfig=function(){};
let teacherQueueIds, teacherQueueOrder=[];
function teacherOrder(){
 if(teacherQueueIds!==route.session.ids){
  teacherQueueIds=route.session.ids;
  const byId=new Map(PILOT.sentences.map(s=>[s.id,s.pattern_id]));
  teacherQueueOrder=[...new Set(teacherQueueIds.map(id=>byId.get(id)))];
 }
 return teacherQueueOrder;
}
function teacherSummary(){
 return T(`المسار الحالي · ${teacherOrder().length} نمطًا · ${route.session.ids.length} جملة`,`Current route · ${teacherOrder().length} patterns · ${route.session.ids.length} sentences`);
}
function teacherDialogueOptions(){
 const options=[
  [1,'محادثة واحدة (مطلوبة)','One conversation (required)'],
  [2,'حتى محادثتين','Up to two conversations'],
  [3,'حتى ثلاث محادثات','Up to three conversations'],
  [-1,'كل المحادثات المرتبطة','All related conversations']
 ];
 return `<label class="field">${T('مرحلة المحادثة · استمع إلى واحدة كاملة على الأقل','Conversation stage · listen to at least one in full')}
  <select id="route-dialogues">${options.map(([value,ar,en])=>
   `<option value="${value}" ${route.dialogueLimit===value?'selected':''}>${T(ar,en)}</option>`
  ).join('')}</select></label>`;
}
function teacherDialoguePanel(){
 const index=(route.session.dialogueCursor??0)+1;
 const count=route.session.dialogueIds?.length||1;
 const choices=(route.session.dialogueIds||[]).map(id=>PILOT.dialogues.find(d=>d.id===id)).filter(Boolean);
 return `<div class="coach-dialogue-wrap"><p class="eyebrow">${T('٣ · تطبيق بالمحادثة','3 · Conversation practice')} · ${index} / ${count}</p>
  <p>${T('استمع إلى محادثة واحدة كاملة على الأقل قبل الانتقال إلى النمط التالي.','Listen to at least one full conversation before moving to the next pattern.')}</p>
  <div class="dialogue-navigation">
   <button class="secondary" onclick="chooseCoachDialogue(-1)" ${index<=1?'disabled':''}>${T('المحادثة السابقة','Previous conversation')}</button>
   <label>${T('محادثات هذا النمط','Conversations for this pattern')}<select onchange="route.chooseDialogue(this.value)">${choices.map(d=>`<option value="${H(d.id)}" ${d.id===route.activeDialogue.id?'selected':''}>${H(T(d.ar,d.en))}</option>`).join('')}</select></label>
   <button class="secondary" onclick="chooseCoachDialogue(1)" ${index>=count?'disabled':''}>${T('المحادثة التالية','Next conversation')}</button>
  </div>
  ${dialoguePanel(route.activeDialogue,'jumpCoachDialogue')}</div>`;
}
function chooseCoachDialogue(delta){
 const index=(route.session.dialogueCursor??0)+delta;
 const id=route.session.dialogueIds?.[index];
 if(id)route.chooseDialogue(id);
}
function markTeacherSettings(){
 $('#teacher-selection-status').textContent=T('اختيار جديد. اضغط «طبّق الاختيار وابدأ» لتحديث التدريب.','New selection. Press Apply selection and start to update the route.');
}
function selectTeacherPatterns(checked){
 $('#teacher-route').value='';
 document.querySelectorAll('[name="route-pattern"]').forEach(input=>input.checked=checked);
 markTeacherSettings();
}
function filterTeacherPatterns(query){
 const term=query.trim().toLowerCase();
 document.querySelectorAll('[data-teacher-pattern]').forEach(label=>label.hidden=!label.textContent.toLowerCase().includes(term));
}
function chooseTeacherPurpose(id){
 const purpose=CURRICULUM?.routes.find(item=>item.id===id);
 if(!purpose)return;
 const ids=new Set(id==='full-course'?PILOT.pattern_order:purpose.pattern_ids);
 document.querySelectorAll('[name="route-pattern"]').forEach(input=>input.checked=ids.has(+input.value));
}
configureRoute=function(){
 const routeId=$('#teacher-route').value;
 const purpose=CURRICULUM?.routes.find(item=>item.id===routeId);
 const patternIds=(routeId==='full-course'?PILOT.pattern_order:purpose?.pattern_ids)||[...document.querySelectorAll('[name="route-pattern"]:checked')].map(input=>+input.value);
 const options={patternIds,routeId,stage:+$('#route-stage').value,cefr:$('#route-cefr').value,
  sample:+$('#route-sample').value,mode:$('#route-mode').value,voiceMode:$('#route-voice').value,
  autoNextPattern:$('#route-auto-next').checked,dialoguesPerPattern:Number($('#route-dialogues').value),readingSeconds:$('#route-reading-seconds').value==='default'?null:Number($('#route-reading-seconds').value),rate:route.session.rate};
 if(!route.queue(options).length){
  $('#teacher-selection-status').textContent=T('لا توجد جمل لهذا الاختيار. غيّر الأنماط أو المستوى أو المرحلة.','No sentences match. Change the patterns, level or stage.');
  return;
 }
 stopSpeech();
 if(referencePlayerOpen)closeReferencePlayer();
 coachPaintKey='';
 route.configure(options);
 $('#teacher-selection-status').textContent=teacherSummary();
 $('#teacher-active-route').textContent=teacherSummary();
 document.querySelector('.route-config').open=false;
 route.play();
 document.querySelector('.coach-shell')?.scrollIntoView({block:'start'});
};
coach=function(){if(!PILOT||!route)return head(T('الاستماع والتدريب','Listen & practise'),T('جارٍ تحميل المسار…','Loading your route…'));const selected=new Set(route.session.filters?.patternIds||teacherOrder());return `${head(T('استمع للفكرة. وتوقف لتفهم البناء.','Hear the idea. Stop to notice the structure.'),T('اسمع تركيب النمط وقاعدته، راجعها بالوتيرة التي تختارها، ثم استمع إلى الأمثلة ومحادثة تطبّقها.','Hear how the pattern works, review it at your pace, then listen to examples and a conversation.'),'GUIDED LISTENING')}<details class="panel route-config" open><summary>${T('اختيار المسار وإعدادات التدريب','Choose your route & practice settings')}</summary><div class="route-filters" onchange="markTeacherSettings()"><label class="field">${T('مسار حسب الغرض','Purpose route')}<select id="teacher-route" onchange="chooseTeacherPurpose(this.value)"><option value="">${T('اختيار يدوي','Manual selection')}</option>${(CURRICULUM?.routes||[]).map(r=>`<option value="${r.id}" ${route.session.filters?.routeId===r.id?'selected':''}>${T(r.title,EP.dictionary.get(r.title)||r.id.replace(/-/g,' '))}</option>`).join('')}</select></label><label class="field">${T('طريقة التدريب','Practice mode')}<select id="route-mode"><option value="listen" ${route.session.mode==='listen'?'selected':''}>${T('استماع متتابع','Continuous listening')}</option><option value="interactive" ${route.session.mode==='interactive'?'selected':''}>${T('إنتاج عبارة بعد كل جملة','Write a new idea after each sentence')}</option></select></label><label class="field">${T('سياسة الصوت','Voice selection')}<select id="route-voice"><option value="alternate">${T('تناوب Adam وBella','Alternate Adam & Bella')}</option><option value="male" ${route.session.voiceMode==='male'?'selected':''}>Adam</option><option value="female" ${route.session.voiceMode==='female'?'selected':''}>Bella</option></select></label><label class="field">${T('عدد الأمثلة لكل نمط','Examples per pattern')}<select id="route-sample">${[[0,'كل الأمثلة','All examples'],[3,'مراجعة سريعة · حتى 3','Quick review · up to 3'],[6,'مراجعة متنوعة · حتى 6','Varied review · up to 6']].map(([v,ar,en])=>`<option value="${v}" ${(route.session.filters?.sample||0)===v?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label><label class="field">${T('مرحلة الأمثلة','Example stage')}<select id="route-stage"><option value="0">${T('جميع المراحل','All stages')}</option>${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${route.session.filters?.stage===n?'selected':''}>${n}</option>`).join('')}</select></label><label class="field">${T('المستوى','Level')}<select id="route-cefr"><option value="">${T('الجميع','All')}</option>${['A1','A2','B1'].map(n=>`<option ${route.session.filters?.cefr===n?'selected':''}>${n}</option>`).join('')}</select></label><label class="field">${T('شرح القاعدة ووقت المراجعة','Rule explanation and review time')}<select id="route-reading-seconds"><option value="default" ${route.session.readingSeconds==null?'selected':''}>${T('استخدم إعداد الشرح العام','Use default rule settings')}</option>${ruleReviewOptions(route.session.readingSeconds??NaN)}</select></label>${teacherDialogueOptions()}<label class="setting-toggle"><input id="route-auto-next" type="checkbox" ${route.session.autoNextPattern!==false?'checked':''}>${T('بدء النمط التالي تلقائيًا بعد المحادثة','Start the next pattern automatically after conversation')}</label><details class="teacher-patterns"><summary>${T('اختيار الأنماط','Choose patterns')} · ${PILOT.patterns.length}</summary><div class="buttonrow"><button type="button" onclick="selectTeacherPatterns(true)">${T('اختيار الكل','Select all')}</button><button type="button" onclick="selectTeacherPatterns(false)">${T('إلغاء الكل','Clear all')}</button></div><input type="search" aria-label="${T('ابحث عن نمط','Find a pattern')}" placeholder="${T('اسم النمط أو معناه','Pattern or meaning')}" oninput="filterTeacherPatterns(this.value)"><fieldset aria-label="${T('الأنماط','Patterns')}">${PILOT.patterns.map(p=>`<label data-teacher-pattern><input onchange="$('#teacher-route').value=''" name="route-pattern" type="checkbox" value="${p.id}" ${selected.has(p.id)?'checked':''}><span class="pattern-form" style="font-size:15px" lang="en" dir="ltr">${H(p.form)}</span><small>${H(T(p.title,p.form))}</small></label>`).join('')}</fieldset></details><p id="teacher-selection-status" role="status">${teacherSummary()}</p><button class="primary" onclick="configureRoute()">${T('طبّق الاختيار وابدأ','Apply selection and start')}</button></div></details><p id="teacher-active-route" role="status">${teacherSummary()}</p><section class="coach-shell"><div class="coach-meta" id="coach-meta"></div><div id="coach-idea-practice" class="buttonrow"></div><div class="progress-track" role="progressbar" aria-label="${T('تقدم التدريب','Practice progress')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="coach-progress"></i></div><div class="coach-body" id="coach-body"></div><div class="coach-controls"><button class="secondary" onclick="coachPrevious()">← ${T('السابق','Previous')}</button><button class="primary" id="coach-toggle" onclick="toggleCoach()"></button><button class="secondary" id="coach-next" onclick="coachNext()">${T('التالي','Next')} →</button><button class="secondary" id="coach-other-voice" onclick="route.otherVoice()">${T('الصوت الآخر','Other voice')}</button><label class="speedlabel">${T('السرعة','Speed')}<select aria-label="${T('سرعة التدريب','Practice speed')}" onchange="route.setRate(this.value)">${[.75,.85,1,1.15].map(v=>`<option value="${v}" ${route.session.rate===v?'selected':''}>${v}×</option>`).join('')}</select></label><span id="coach-image-options">${patternsImageControls()}</span></div><div class="seek-row"><span id="coach-time"></span><input type="range" min="0" step=".01" id="coach-seek" aria-label="${T('موضع التسجيل','Audio position')}" onchange="route.seek(this.value)"><span id="coach-duration"></span></div><div class="coach-options"><label><input type="checkbox" ${hideCoachText?'checked':''} onchange="hideCoachText=this.checked;paintTextVisibility()">${T('إخفاء النص الإنجليزي اختياريًا','Optionally hide English text')}</label><span id="coach-status" role="status"></span></div></section><div class="ep-section-title"><h2>${T('جمل النمط الحالي','Current pattern examples')}</h2><span>${T('انقر مثالًا من المسار للانتقال إليه','Choose an example from the route')}</span></div><div id="coach-sentences" class="sentence-strip"></div>`};
toggleCoach=function(){if(!route)return;stopRecorded();catalogAudio?.pause();if(referencePlayerOpen)closeReferencePlayer();if(route.running)route.pause();else route.play();requestAnimationFrame(()=>document.querySelector('.coach-shell')?.scrollIntoView({block:'start',behavior:'auto'}))};
coachNext=function(){
 const phase=route.session.phase;
 if(route.isCue){if(!route.running)route.play();return}
 if(phase==='comparison'){
  if(route.comparisonRemaining>0){toast(T('انتظر واقرأ القاعدة أولًا، أو أضف وقتًا للقراءة.','Read the rule until the timer finishes, or add more reading time.'));return}
  route.running=true;route.finishReading();
 }else if(phase==='exercise')completeTransfer();
 else if(phase==='dialogue')route.finishDialogue();
 else if(['between','conversation-pending','finished'].includes(phase))route.play();
 else if(phase==='interlude'){route.running=true;route.finishInterlude()}
 else{route.running=true;route.advance()}
};
function epReadingProgress(){if(!route||route.session.phase!=='comparison'||!$('#reading-progress'))return;const remaining=route.comparisonRemaining,total=route.comparisonDuration;$('#reading-progress').value=Math.max(0,100*(1-remaining/total));$('#reading-seconds').textContent=remaining>0?T(`${Math.ceil(remaining/1000)} ثانية للقراءة`,`${Math.ceil(remaining/1000)} seconds to read`):T('انتهى وقت القراءة؛ يمكنك المتابعة.','Reading time complete; you can continue.');$('#reading-state').textContent=route.running?T('انتظر وتعلّم قبل الانتقال.','Wait and learn before moving on.'):T('مؤقت القراءة متوقف. اضغط استكمال.','Reading timer paused. Press Resume.');$('#reading-continue').disabled=remaining>0;$('#coach-next').disabled=remaining>0}
updateCoach=function(){if(page!=='coach'||!$('#coach-body')||!route)return;const s=route.sentence,p=route.pattern,r=route.recording;if(!s){$('#coach-body').innerHTML=`<div class="empty">${T('اختر أنماطًا لبدء المسار.','Choose patterns to start a route.')}</div>`;return}const original=PILOT.sentences.filter(x=>x.pattern_id===s.pattern_id),position=original.findIndex(x=>x.id===s.id)+1,order=teacherOrder(),key=[s.id,route.session.phase,route.session.dialogueId,route.session.voice,EP.prefs.language,EP.prefs.arabic,Boolean(EP.teaching)].join('/'),duration=(r?.duration_ms||0)/1000;
 const practice=$('#coach-idea-practice');
 if(practice&&practice.dataset.pattern!==String(s.pattern_id)){
  practice.dataset.pattern=s.pattern_id;
  practice.innerHTML=ideaPracticeButton(s.pattern_id);
 }
 $('#coach-meta').innerHTML=`<span>${T('النمط','Pattern')} ${order.indexOf(s.pattern_id)+1} / ${order.length}</span><span>${T('المثال','Example')} ${position>0?position:T('حوار','Dialogue')} / ${original.length}</span><b>${route.progress.toFixed(1)}% ${T('من المسار','of route')}</b>`;$('#coach-progress').style.width=route.progress+'%';document.querySelector('.progress-track[role=progressbar]')?.setAttribute('aria-valuenow',route.progress.toFixed(1));
 if(coachPaintKey!==key){coachPaintKey=key;if(route.session.phase==='comparison')$('#coach-body').innerHTML=`<section class="comparison-view"><span class="eyebrow">${T('١ · شرح القاعدة','1 · RULE EXPLANATION')}</span><h2>${T('راجع القاعدة التي سمعتها','Review the rule you just heard')}</h2>${EP.rule(s)}<div class="reading-meter"><div class="reading-status"><b id="reading-seconds"></b><button onclick="route.extendComparison(10000)">＋ ${T('10 ثوانٍ للقراءة','10 seconds to read')}</button></div><progress id="reading-progress" max="100" value="0" aria-label="${T('تقدم وقت القراءة','Reading time progress')}"></progress><p id="reading-state"></p></div><button class="primary" id="reading-continue" onclick="coachNext()" disabled>${T('تابع إلى الأمثلة','Continue to examples')} →</button></section>`;
 else if(route.isCue){
 const phase=route.session.phase,labels=trainingCueLabels[phase],step={'pattern-intro':1,'explanation-intro':2,'dialogue-intro':3}[phase];
 $('#coach-body').innerHTML=`<section class="comparison-view"><span class="eyebrow">${step} / 3 · ♪</span><h2>${phase==='pattern-intro'?T('تركيب النمط وشرح القاعدة','Pattern structure and rule'):T(...labels)}</h2>${phase==='dialogue-intro'?`<p>${T('بعد الفاصل، استمع إلى محادثة كاملة.','After the introduction, listen to a full conversation.')}</p>`:EP.rule(s)}</section>`;
 }
 else if(route.session.phase==='conversation-pending')$('#coach-body').innerHTML=`<section class="comparison-view"><h2>${T('مرحلة المحادثة','Conversation stage')}</h2><p>${T('لم يتوفر التسجيل. اتصل بالإنترنت وأعد تحميل الصفحة.','Audio is unavailable. Connect to the internet and reload.')}</p></section>`;
 else if(route.session.phase==='dialogue')$('#coach-body').innerHTML=teacherDialoguePanel();
 else if(route.session.phase==='between')$('#coach-body').innerHTML=`<section class="comparison-view"><h2>${T('أكملت أمثلة هذا النمط','Pattern examples complete')}</h2><p>${T('اضغط التالي للمتابعة.','Press Next to continue.')}</p></section>`;
 else if(route.session.phase==='exercise')$('#coach-body').innerHTML=`<section class="comparison-view"><h2>${T('استخدم البناء بفكرة جديدة.','Use the structure for a new idea.')}</h2>${EP.rule(s,{compact:true})}<p>${T(PILOT.exercises?.find(e=>e.id===s.exercise_ids?.[0])?.prompt||p.transfer?.prompt||'كوّن فكرة جديدة بنفس النمط.','Write a new idea using this pattern. Change the action, situation or person rather than copying an example.')}</p><textarea id="coach-transfer" lang="en" dir="ltr" aria-label="${T('عبارتك الجديدة','Your new sentence')}" placeholder="Your own new idea…"></textarea><button class="primary" onclick="completeTransfer()">${T('كتبت فكرتي، تابع','I wrote my idea — continue')} →</button><p id="coach-transfer-feedback" role="status"></p></section>`;
 else if(route.session.phase==='finished')$('#coach-body').innerHTML=`<div class="comparison-view"><span class="bigicon">✓</span><h2>${T('اكتمل المسار.','Route complete.')}</h2><p>${T('حان وقت استخدام البناء من ذاكرتك. جرّب موقفًا جديدًا في مختبر الأفكار.','Try using the structure from memory in a new situation in the Idea lab.')}</p><button class="primary" onclick="navigate('lab')">${T('طبق ما تعلمته','Use what you learned')} →</button></div>`;
 else $('#coach-body').innerHTML=`<div class="coach-scene">${patternsSentenceScene(s)}<span class="voice-tag">${route.session.voice==='male'?'Adam':'Bella'}</span></div><div class="coach-sentence"><strong class="pattern-form" lang="en" dir="ltr">${H(s.display_pattern||p.form)}</strong><div class="sentence" id="coach-english" lang="en" dir="ltr">${EP.words(s,'data-cue')}</div><p id="coach-arabic" class="ar-content" lang="ar" dir="rtl">${H(s.ar)}</p><small>${T('انظر إلى الجزء الأحمر، ثم لاحظ الكلمات التي تتغير.','Notice the red structure, then the words that change.')}</small></div><div class="coach-rule">${EP.rule(s)}</div>`;
 $('#coach-sentences').innerHTML=original.map((x,i)=>!route.session.ids.includes(x.id)?'':`<button class="${x.id===s.id?'active':''}" onclick="playCatalogSentence('${x.id}')">${lessonThumb(x)}<span>${i+1}</span><b lang="en" dir="ltr">${EP.words(x)}</b>${EP.ar(x.ar)}</button>`).join('');paintTextVisibility();applyPatternsImageMode();window.EPOffline?.rememberSentences(original);if(route.running&&['sentence','interlude','dialogue','pattern-intro','dialogue-intro'].includes(route.session.phase))document.querySelector('.coach-shell')?.scrollIntoView({block:'start',behavior:'auto'});}
 $('#coach-toggle').textContent=route.running?'Ⅱ '+T('إيقاف مؤقت','Pause'):route.session.phase==='finished'?'▷ '+T('أعد تشغيل المسار','Replay route'):'▷ '+T('تشغيل / استكمال','Play / resume');$('#coach-time').textContent=timeText(route.session.offset);$('#coach-duration').textContent=timeText(duration);const seek=$('#coach-seek');seek.max=duration||1;seek.value=route.session.offset;seek.disabled=!route.hasAudio;$('#coach-other-voice').disabled=!['sentence'].includes(route.session.phase);$('#coach-next').disabled=route.session.phase==='finished';$('#coach-status').textContent=route.error||T('موضعك محفوظ على هذا الجهاز.','Your place is saved on this device.');paintCoachWords(route.session.offset*1000);epReadingProgress();EP.apply()};
setInterval(()=>{if(page==='coach'&&route?.session.phase==='comparison')epReadingProgress()},250);
const epVisibleLesson=renderLesson;renderLesson=function(){epVisibleLesson();if(stage===0){const body=document.querySelector('.lesson-body'),image=body.querySelector('.lesson-scene'),sentence=body.querySelector('.sentence'),translation=body.querySelector('.translation');if(image&&sentence){const layout=document.createElement('div');layout.className='lesson-active-example';image.before(layout);layout.append(image);const text=document.createElement('div');text.className='lesson-active-text';layout.append(text);text.append(sentence);if(translation)text.append(translation);for(const controls of [...body.querySelectorAll(':scope > .audio-controls')].slice(0,2))text.append(controls);const rule=body.querySelector('#lesson-rule');if(rule)layout.after(rule);sentence.classList.remove('masked-text','hidden')}}EP.decorate()};

const epPlayCatalogBefore=playCatalogSentence;playCatalogSentence=function(id){if(referencePlayerOpen)closeReferencePlayer();epPlayCatalogBefore(id);requestAnimationFrame(()=>document.querySelector('.coach-shell')?.scrollIntoView({block:'start',behavior:'auto'}))};
