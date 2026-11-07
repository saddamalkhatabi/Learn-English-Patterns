/* Rich lessons and common exam formats. Closed questions are checked automatically.
   Personal production is explicitly heuristic/self-assessed, never fake AI grading. */
let CURRICULUM=null,examCursor=0,examTimer=null,lessonDrafts={},examResults={};
try{examResults=JSON.parse(localStorage.getItem('nasaq-exams-v1')||'{}');lessonDrafts=JSON.parse(localStorage.getItem('nasaq-drafts-v1')||'{}')}catch{}
const learningReady=fetch('curriculum.json').then(r=>r.json()).then(d=>{CURRICULUM=d;applyLearningMetadata();render();return d}).catch(()=>null);
pilotReady.then(()=>{applyLearningMetadata();if(!['coach','catalog'].includes(page))render()});
function learningMeta(id){return CURRICULUM?.patterns.find(p=>p.id===id)||PILOT?.patterns.find(p=>p.id===id)?.lesson}
function applyLearningMetadata(){if(!CURRICULUM)return;patterns.forEach(p=>{const m=learningMeta(p.id);if(m){p.keywords=m.keywords;p.meaning=m.explanation_ar;p.compare=m.comparison_ar}});if(PILOT)patterns.sort((a,b)=>PILOT.pattern_order.indexOf(a.id)-PILOT.pattern_order.indexOf(b.id))}
function sentenceRows(pid=current?.id){return PILOT?.sentences.filter(s=>s.pattern_id===pid)||[]}
function lessonScene(pid=current?.id,n=example){return sentenceRows(pid)[n]||sentenceRows(pid)[0]}
function spokenText(text,id=''){return `<div ${id?`id="${id}"`:''} class="spoken-text" data-spoken-text="${esc(text)}" lang="en" dir="ltr">${text.split(' ').map((w,i)=>`<span data-word="${i}">${esc(w)}</span>`).join(' ')}</div>`}
function lessonThumb(s,cls=''){return s?`<div class="lesson-thumb ${cls}">${pilotScene(s)}</div>`:''}
function bilingual(ar,en){return `<div class="bilingual"><p lang="ar" dir="rtl">${esc(ar)}</p><p lang="en" dir="ltr">${esc(en)}</p></div>`}
function advancedContent(pid){const meta=learningMeta(pid);if(!meta)return '';return `<details class="advanced"><summary>متقدم اختياري · فروق واستعمالات مهمة في الاختبارات</summary><p class="sub">افتح هذا الجزء إذا أردت التوسع. لا يلزم لإكمال التدريب الأساسي.</p>${meta.advanced.map((a,i)=>`<section class="advanced-item"><h3 dir="ltr">${esc(a.title)}</h3>${bilingual(a.ar,a.en)}<div class="prompt">${esc(a.example)}</div><div class="advanced-q" data-advanced="${a.id}"><p class="english">${esc(a.question.prompt)}</p>${a.question.options.map((o,j)=>`<button class="choice" onclick="checkAdvanced(${pid},${i},${j},this)">${esc(o)}</button>`).join('')}<div class="feedback" id="feedback-${a.id}" role="status"></div></div></section>`).join('')}</details>`}
function checkAdvanced(pid,i,j,el){const a=learningMeta(pid).advanced[i],ok=a.question.options[j]===a.question.answer;el.className='choice '+(ok?'correct':'incorrect');$('#feedback-'+a.id).innerHTML=(ok?'✓ إجابة صحيحة':'راجع الإجابة ثم حاول مجددًا')+bilingual(a.ar,a.en)}
function openLesson(id,s=0){stopSpeech();current=patterns.find(p=>p.id===id)||patterns[0];stage=Math.max(0,Math.min(5,s));example=0;built=[];passed=false;auto=false;examCursor=0;if(!state.seen.includes(current.id))state.seen.push(current.id);state.last=current.id;state.stage=stage;persist();renderLesson();if(!$('#lesson').open)$('#lesson').showModal();revealLessonTarget('.stage-label')}
function renderLesson(){const p=current,rows=sentenceRows(),s=lessonScene(),meta=learningMeta(p.id),names=['اكتشف المعنى','افهم البناء','قارن الاستعمال','استرجع الجملة','عبّر بفكرة جديدة','تدرّب للاختبارات'];state.stage=stage;persist();let content='';
 if(stage===0){content=`<h2>${esc(p.ar)}</h2><div class="lesson-play-all"><button class="primary" id="auto-btn" onclick="toggleLessonAuto()">${auto?'■ إيقاف التتابع':'▷ تشغيل كل أمثلة النمط من البداية'}</button><p id="lesson-listening-feedback" role="status"></p></div>${s?`<div class="lesson-scene">${patternsSentenceScene(s)}<span>${esc(s.context)}</span></div>`:''}<div class="sentence">${spokenText(p.examples[example][0],'sentence')}</div><div class="translation">${esc(p.examples[example][1])}</div><div class="audio-controls"><button onclick="playLessonExample()">▷ استمع</button><button onclick="state.voice=1-state.voice;playLessonExample()">⇄ الصوت الآخر</button><button onclick="$('#sentence').classList.toggle('masked-text')">إخفاء / إظهار النص</button></div><div class="audio-controls"><button onclick="selectLessonExample((example-1+current.examples.length)%current.examples.length)">→ السابق</button><span class="chip">${example+1} / ${p.examples.length}</span><button onclick="selectLessonExample((example+1)%current.examples.length)">التالي ←</button></div><p id="audio-status" class="lesson-hint">Adam وBella · تسجيلان وتوقيتان مستقلان لكل جملة.</p><div class="lesson-mini-grid">${rows.map((x,i)=>`<button class="${i===example?'active':''}" onclick="selectLessonExample(${i})">${lessonThumb(x)}<span>${i+1}</span><small>${esc(x.context)}</small></button>`).join('')}</div>`}
 else if(stage===1){content=`<h2>نمط ثابت. جمل بمعانٍ مختلفة.</h2><div class="prompt pattern-form">${esc(p.form)}</div>${bilingual(meta?.explanation_ar||p.meaning,meta?.explanation_en||'Notice the structure and use it in different contexts.')}<div class="example-list">${rows.map((x,i)=>lessonExampleRow(x,i)).join('')}</div><p class="lesson-hint">الجزء المشترك يساعدك على بناء أفكار جديدة؛ المفردات والسياق يغيران المعنى.</p>`}
 else if(stage===2){const quiz=p.comparisonQuiz||{options:[p.wrong,p.examples[0][0]],answer:p.examples[0][0]};content=`<h2>اختر الصيغة الصحيحة.</h2>${bilingual(meta?.comparison_ar||p.compare,meta?.comparison_en||'Compare the meaning and form.')}${quiz.ar?EP.ar(quiz.ar):''}${quiz.prompt?spokenText(quiz.prompt):''}${quiz.options.map(option=>`<button class="choice" onclick="checkChoice(this,${option===quiz.answer})">${esc(option)}</button>`).join('')}<div id="exercise-feedback" class="feedback" role="status"></div>${advancedContent(p.id)}`}
 else if(stage===3){p.words=p.examples[example][0].split(' ');const bank=p.words.map((w,i)=>({w,i})).sort((a,b)=>a.w.localeCompare(b.w));content=`<h2>أعد بناء الجملة. التصحيح تلقائي.</h2><p>${esc(p.examples[example][1])}</p><div class="answerbank" id="answerbank"></div><div class="wordbank">${bank.map(({w,i})=>`<button data-word="${i}" onclick="addWord(${i})">${esc(w)}</button>`).join('')}</div><div class="audio-controls"><button onclick="built=[];passed=false;updateWords()">ابدأ من جديد</button><button onclick="built=[];selectLessonExample((example+1)%current.examples.length)">جرّب جملة أخرى ←</button></div><div id="exercise-feedback" class="feedback" role="status"></div>`}
 else if(stage===4){const transfer=PILOT?.exercises?.find(e=>e.id===s?.exercise_ids[0]);content=`<h2>استخدم النمط في موقف جديد.</h2><p>اكتب جملة جديدة بالإنجليزية أولًا. يمكنك بعد ذلك تسجيل قراءتك والاستماع إليها. التسجيل اختياري، والجملة المكتوبة مطلوبة للمتابعة.</p><p>${esc(transfer?.prompt||PILOT?.patterns.find(x=>x.id===p.id)?.transfer?.prompt||'كوّن جملة عن حياتك بفعل أو موقف مختلف عن الأمثلة.')}</p><div class="prompt pattern-form">${esc(p.form)}</div><textarea id="production" lang="en" dir="ltr" aria-label="جملتك الجديدة" placeholder="Your own new idea…" oninput="saveLessonDraft(this.value)">${esc(lessonDrafts[p.id]||'')}</textarea><div id="exercise-feedback" class="feedback" role="status"></div><div class="buttonrow"><button class="secondary" id="record-btn" onclick="toggleRecord()">● سجّل صوتك</button><button class="secondary" onclick="const t=$('#production').value.trim();if(t)speak(t);else toast('اكتب جملتك أولًا.')">▷ اسمع جملتك</button></div><div id="record-playback"></div>${bilingual('يُفحص تركيب البداية مبدئيًا أثناء الكتابة. الجمل المفتوحة تحتاج مراجعة معنى؛ لا نمنح درجة طلاقة أو نطق من النص.','The opening structure is checked while you type. Open-ended meaning is self-assessed; no fluency or pronunciation score is inferred from text.')}`}
 else{content=examPanel(p.id)}
 $('#lesson-content').innerHTML=`<div class="lesson-top"><b>${esc(p.ar)} · ${p.examples.length} جملة</b><button onclick="closeLesson()" aria-label="إغلاق الدرس">×</button></div><div class="lesson-body"><div class="steps">${names.map((n,i)=>`<span title="${n}" class="${i<=stage?'done':''}"></span>`).join('')}</div><div class="stage-label">${stage+1} / ${names.length} · ${names[stage]}</div>${content}</div><p id="lesson-step-feedback" class="lesson-step-feedback" role="status"></p><div class="lesson-bottom"><button class="secondary" onclick="previousStage()">${stage?'→ السابق':'إغلاق'}</button><label class="auto-next-label"><input type="checkbox" ${state.lessonAutoNext!==false?'checked':''} onchange="state.lessonAutoNext=this.checked;persist()"> النمط التالي تلقائيًا بعد إكمال الدرس</label><button class="primary" id="next-stage" onclick="nextStage()">${['انتقل إلى فهم البناء ←','انتقل إلى المقارنة ←','انتقل إلى ترتيب الكلمات ←','انتقل إلى تطبيق النمط ←','انتقل إلى الاختبار ←','إنهاء الدرس ✓'][stage]}</button></div>`;
 if(stage===0&&s?.teaching_note)$('.translation').insertAdjacentHTML('afterend',bilingual(s.teaching_note.ar,s.teaching_note.en));if(stage===1)markPatternStructure();if(stage===3)updateWords();if(stage===4&&lessonDrafts[p.id])checkProduction();if(stage===5)showSavedExam();
}
function selectLessonExample(n){stopSpeech();auto=false;example=n;built=[];passed=false;renderLesson();revealLessonTarget(stage===0?'.lesson-active-example':'.wordbank')}
function playLessonExample(done){speak(current.examples[example][0],state.voice,done)}
function toggleLessonAuto(){
 if(auto){stopSpeech();auto=false;renderLesson();revealLessonTarget('#auto-btn');return}
 stopSpeech();
 if(referencePlayerOpen)closeReferencePlayer();
 example=0;
 auto=true;
 function playNext(){
  if(!auto)return;
  state.voice=example%2;
  renderLesson();
  playLessonExample(()=>{
   if(!auto)return;
   if(example+1<current.examples.length){example++;playNext();return}
   auto=false;
   renderLesson();
   $('#lesson-listening-feedback').textContent='اكتمل الاستماع. يمكنك إعادة الأمثلة من البداية أو الانتقال إلى فهم البناء.';
  });
 }
 playNext();
 revealLessonTarget('.lesson-active-example');
}
function revealLessonTarget(selector){
 const target=$('#lesson').querySelector(selector);
 if(!target)return;
 if(!target.matches('input,textarea,button'))target.tabIndex=-1;
 target.focus({preventScroll:true});
 target.scrollIntoView({block:'center',behavior:'instant'});
}
function explainLessonStep(message,selector){
 const notice=$('#lesson-step-feedback');
 notice.textContent=message;
 const target=selector&&$('#lesson').querySelector(selector);
 if(target){
  target.before(notice);
  target.setAttribute('aria-describedby','lesson-step-feedback');
  revealLessonTarget(selector);
 }else notice.scrollIntoView({block:'nearest'});
}
function checkChoice(el,ok){el.className='choice '+(ok?'correct':'incorrect');const m=learningMeta(current.id);$('#exercise-feedback').innerHTML=(ok?'✓ صحيح':'جرّب مرة أخرى')+bilingual(m?.explanation_ar||current.meaning,m?.explanation_en||'Use the correct structure.');if(ok)passed=true}
function addWord(i){if(built.includes(i))return;built.push(i);updateWords()}
function updateWords(){if(!$('#answerbank'))return;$('#answerbank').innerHTML=built.map((i,j)=>`<button onclick="built.splice(${j},1);passed=false;updateWords()">${esc(current.words[i])}</button>`).join('');document.querySelectorAll('[data-word]').forEach(el=>{el.disabled=built.includes(+el.dataset.word);el.style.opacity=el.disabled?.25:1});if(built.length===current.words.length)checkWords();else{passed=false;$('#exercise-feedback').textContent='رتّب الكلمات؛ تُفحص الإجابة تلقائيًا عند اكتمالها.'}}
function checkWords(){passed=built.length===current.words.length&&built.every((x,i)=>x===i);const m=learningMeta(current.id);$('#exercise-feedback').innerHTML=passed?'✓ جملة صحيحة. جرّب قولها دون النظر.':bilingual('الترتيب يحتاج تعديلًا. اضغط كلمة لإعادتها إلى الاختيارات. '+(m?.explanation_ar||''),'The order needs adjustment. Tap a selected word to return it. '+(m?.explanation_en||''))}
function saveLessonDraft(v){lessonDrafts[current.id]=v;try{localStorage.setItem('nasaq-drafts-v1',JSON.stringify(lessonDrafts))}catch{}clearTimeout(examTimer);examTimer=setTimeout(()=>{if(stage===4)checkProduction()},600)}
function previousStage(){
 if(recorder?.state==='recording'){explainLessonStep('أوقف تسجيلك أولًا حتى تتمكن من الاستماع إليه.','#record-btn');return}
 stopSpeech();auto=false;
 if(!stage){closeLesson();return}
 stage--;passed=false;built=[];renderLesson();revealLessonTarget('.stage-label');
}
function nextStage(){
 if(stage===2&&!passed){explainLessonStep('اختر الإجابة الصحيحة حتى تنتقل إلى ترتيب الكلمات.','.lesson-body .choice');return}
 if(stage===3&&!passed){explainLessonStep('رتّب الكلمات حتى يظهر التصحيح، ثم اضغط متابعة.','.wordbank');return}
 if(stage===4){
  if(recorder?.state==='recording'){explainLessonStep('اضغط «إيقاف التسجيل» أولًا.','#record-btn');return}
  const text=$('#production').value.trim();
  if(text.split(/\s+/).length<4){explainLessonStep('اكتب جملة بالإنجليزية من أربع كلمات على الأقل. التسجيل وحده لا يحل محل الجملة المكتوبة.','#production');return}
  if(!isNewPilotIdea(text)){explainLessonStep('هذه جملة من أمثلة المنهج. غيّر تفاصيلها واكتب فكرة من عندك.','#production');return}
  lessonDrafts[current.id]=text;
 }
 if(stage===5){
  if(currentExam()?.type==='input'&&$('#exam-answer')?.value.trim())checkExamInput($('#exam-answer').value);
  const exams=learningMeta(current.id)?.exams||[];
  const unanswered=exams.findIndex(q=>!examResults[q.id]?.correct);
  if(unanswered>=0){
   if(unanswered!==examCursor)selectExam(unanswered);
   const done=exams.filter(q=>examResults[q.id]?.correct).length;
   explainLessonStep(`أجبت إجابة صحيحة عن ${done} من ${exams.length}. أكمل السؤال الظاهر ثم بقية الأسئلة لإنهاء الدرس.`,currentExam()?.type==='input'?'#exam-answer':'[data-exam-option]');
   return;
  }
  state.done[current.id]=state.done[current.id]||{due:Date.now()+864e5,interval:1,reviews:0};
  state.stage=0;persist();
  const order=PILOT?.pattern_order||patterns.map(p=>p.id),next=order[order.indexOf(current.id)+1];
  if(next&&state.lessonAutoNext!==false){openLesson(next);toast('اكتمل النمط، وانتقلنا إلى التالي.')}
  else{closeLesson();toast('اكتمل تدريب النمط. موعد المراجعة الأولى غدًا.')}
  return;
 }
 stopSpeech();auto=false;stage++;passed=false;renderLesson();revealLessonTarget('.stage-label');
}
function examPanel(pid){const m=learningMeta(pid);if(!m)return '<p>جارٍ تحميل تدريبات الاختبارات…</p>';examCursor=Math.min(examCursor,m.exams.length-1);const q=m.exams[examCursor];return `<h2>ممارسة أسئلة الاختبارات الشائعة</h2><p class="lesson-hint">${esc(CURRICULUM?.notice||'أسئلة تدريبية أصلية')}</p><div class="exam-tabs">${m.exams.map((x,i)=>`<button class="${i===examCursor?'active':''} ${examResults[x.id]?.correct?'solved':''}" onclick="selectExam(${i})">${i+1}${examResults[x.id]?.correct?' ✓':''}</button>`).join('')}</div><span class="chip">${examCursor+1} / ${m.exams.length} · ${esc(q.kind)}</span><p>${esc(q.ar)}</p><div class="exam-prompt" dir="${/[\u0600-\u06ff]/.test(q.prompt)?'rtl':'ltr'}">${esc(q.prompt)}</div>${q.type==='input'?`<input class="exam-answer" id="exam-answer" aria-label="إجابة الاختبار" dir="ltr" value="${esc(examResults[q.id]?.value||'')}" oninput="autoCheckExam(this.value)" placeholder="Type the missing word(s)…">`:q.options.map((o,i)=>`<button class="choice" data-exam-option="${i}" onclick="checkExamChoice(${i})">${esc(o)}</button>`).join('')}<div id="exam-feedback" class="exam-feedback" role="status"></div><details class="solved-example"><summary>مثال محلول مع الشرح بالعربية والإنجليزية</summary><div class="prompt">${esc(q.answer||q.answers[0])}</div>${bilingual(q.explain_ar,q.explain_en)}</details><div class="audio-controls"><button onclick="selectExam(Math.max(0,examCursor-1))">→ السؤال السابق</button><button onclick="selectExam(Math.min(${m.exams.length-1},examCursor+1))">السؤال التالي ←</button></div>${advancedContent(pid)}`}
function selectExam(n){if(currentExam()?.type==='input'&&$('#exam-answer')?.value.trim())checkExamInput($('#exam-answer').value);clearTimeout(examTimer);examCursor=n;renderLesson();revealLessonTarget('.exam-prompt')}
function normalizeAnswer(t){return String(t).toLowerCase().replace(/[’‘]/g,"'").replace(/[.,?!]/g,'').replace(/\s+/g,' ').trim()}
function currentExam(){return learningMeta(current.id)?.exams[examCursor]}
function autoCheckExam(v){clearTimeout(examTimer);const qid=currentExam().id;examTimer=setTimeout(()=>{if(stage===5&&currentExam()?.id===qid)checkExamInput(v)},600)}
function checkExamInput(v){const q=currentExam();if(!q||!v.trim())return;gradeExam(q,(q.answers||[q.answer]).some(a=>normalizeAnswer(a)===normalizeAnswer(v)),v)}
function checkExamChoice(i){const q=currentExam();document.querySelectorAll('[data-exam-option]').forEach(el=>{el.className='choice';if(+el.dataset.examOption===i)el.classList.add(q.options[i]===q.answer?'correct':'incorrect')});gradeExam(q,q.options[i]===q.answer,q.options[i])}
function gradeExam(q,ok,v){examResults[q.id]={correct:ok,value:v,at:Date.now()};try{localStorage.setItem('nasaq-exams-v1',JSON.stringify(examResults))}catch{}$('#exam-feedback').innerHTML=`<b>${ok?'✓ إجابة صحيحة':'الإجابة تحتاج تعديلًا؛ يمكنك المحاولة مجددًا.'}</b>`+bilingual(q.explain_ar,q.explain_en);const tabs=document.querySelectorAll('.exam-tabs button');if(tabs[examCursor]){tabs[examCursor].classList.toggle('solved',ok);tabs[examCursor].textContent=(examCursor+1)+(ok?' ✓':'')}}
function showSavedExam(){const q=currentExam(),r=examResults[q?.id];if(!r)return;$('#exam-feedback').innerHTML=`<b>${r.correct?'✓ سبق أن أجبت بصورة صحيحة':'يمكنك إعادة المحاولة'}</b>`+bilingual(q.explain_ar,q.explain_en)}

function markPatternStructure(){const rule=NasaqStructureRules.expression(current.id);if(!rule)return;document.querySelectorAll('.example-list [data-spoken-text]').forEach(node=>{const t=node.dataset.spokenText,m=t.match(rule);if(!m)return;let pos=0;node.querySelectorAll('[data-word]').forEach(el=>{el.classList.toggle('pattern-fixed',pos>=m.index&&pos<m.index+m[0].length);pos+=el.textContent.length+1})})}

function lessonExampleRow(x,i){const row=`<article class="example-row">${lessonThumb(x)}<div>${spokenText(x.en)}<p>${esc(x.ar)}</p><small>${esc(x.context)}</small></div><button class="iconbtn" aria-label="استمع إلى الجملة ${i+1}" onclick="speak(${esc(JSON.stringify(x.en))},${i%2})">▷</button></article>`;return x.optional_advanced?`<details class="advanced"><summary>مقارنة متقدمة اختيارية · تركيب آخر للاعتياد</summary>${row}${bilingual(x.teaching_note.ar,x.teaching_note.en)}</details>`:row}
