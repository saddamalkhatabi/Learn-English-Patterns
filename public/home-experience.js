/* Practice milestones live with the learner's existing local progress. */
function practiceDate(date=new Date()){
 const month=String(date.getMonth()+1).padStart(2,'0');
 const day=String(date.getDate()).padStart(2,'0');
 return `${date.getFullYear()}-${month}-${day}`;
}

function recordDailyPractice(kind,id){
 const day=practiceDate(),key=`${kind}:${id}`;
 const previous=state.dailyPractice?.[day]||[];
 if(previous.includes(key))return;
 state.dailyPractice={...state.dailyPractice,[day]:[...previous,key]};
 persist();
 if(page==='home'&&$('#home-achievement'))$('#home-achievement').innerHTML=homeAchievement();
}

function localPracticeSummary(now=new Date()){
 const days=state.dailyPractice||{};
 const dateAt=offset=>new Date(now.getFullYear(),now.getMonth(),now.getDate()-offset,12);
 const count=offset=>days[practiceDate(dateAt(offset))]?.length||0;
 const week=Array.from({length:7},(_,index)=>({date:dateAt(6-index),count:count(6-index)}));
 let streak=0,offset=count(0)?0:1;
 while(count(offset++))streak++;
 return {week,streak,today:count(0)};
}

function homeNextLesson(){
 const next=patterns.find(pattern=>!state.done[pattern.id]);
 const current=patterns.find(pattern=>pattern.id===state.last&&!state.done[pattern.id]);
 if(current&&state.seen.includes(current.id))return {id:current.id,stage:state.stage,resume:true};
 return next&&{id:next.id,stage:0,resume:false};
}

function homeAchievement(){
 const {week,streak,today}=localPracticeSummary();
 const locale=T('ar','en');
 const dateFormat=new Intl.DateTimeFormat(locale,{weekday:'long',day:'numeric',month:'long'});
 const shortFormat=new Intl.DateTimeFormat(locale,{weekday:'short'});
 const completed=patterns.filter(pattern=>state.done[pattern.id]);
 const completedLevels=[...new Set(completed.map(pattern=>pattern.level))].sort().join(' · ');
 const seenLevels=[...new Set(patterns.filter(pattern=>state.seen.includes(pattern.id)).map(pattern=>pattern.level))].sort().join(' · ');
 const lesson=homeNextLesson(),reviews=due().length;
 const next=reviews?`<a class="primary" href="#review">${T('راجع نمطًا مستحقًا','Review a due pattern')} ←</a>`:
  lesson?`<button class="primary" onclick="openLesson(${lesson.id},${lesson.stage||0})">${lesson.resume?T('أكمل تدريبك','Resume your practice'):T('تدرّب على نمط','Practise a pattern')} ←</button>`:
  `<a class="primary" href="#lab">${T('انطق مفردات مشهد','Practise a scene’s vocabulary')} ←</a>`;
 return `<div class="home-goal">
  <span class="eyebrow">${T('خطوة اليوم','TODAY’S STEP')}</span>
  <h2>${T('مساعد الإنجاز','Progress assistant')}</h2>
  <p>${today?T('أحسنت! أنجزت هدف اليوم. يمكنك الاكتفاء بهذه الخطوة أو متابعة التدريب.','You reached today’s goal. You can stop here or keep practising.'):
   T('هدفك اليوم ممارسة واحدة. أكمل نمطًا أو مراجعة أو استمع إلى قائمة مفردات مشهد.','Today’s goal is one practice activity. Finish a lesson or review, or listen to a scene’s vocabulary list.')}</p>
  <progress max="1" value="${today?1:0}" aria-label="${T('هدف اليوم','Today’s goal')}"></progress>
  <small>${today?T(`${today} ممارسة اليوم`,`${today} practice activities today`):T('بقيت ممارسة واحدة','One activity to go')}</small>
  <div class="buttonrow">${next}<a class="textlink" href="#progress">${T('تفاصيل تقدّمي','My progress details')} ↗</a></div>
 </div><div class="home-history">
  <div class="home-stats">
   <div><strong>${completed.length} / ${patterns.length}</strong><small>${T('أنماط أكملتها','Lessons completed')}</small></div>
   <div><strong>${streak}</strong><small>${T('أيام ممارسة متتالية','Consecutive practice days')}</small></div>
  </div>
  <p><b>${completedLevels?T('مستويات الدروس المكتملة','Completed lesson levels'):T('مستويات استكشفتها','Levels explored')}</b>
   <span dir="ltr">${H(completedLevels||seenLevels||'—')}</span></p>
  <ol class="home-week" aria-label="${T('آخر سبعة أيام','Last seven days')}">${week.map(({date,count})=>
   `<li class="${count?'practised':''}" aria-label="${H(dateFormat.format(date))} · ${count}"><span aria-hidden="true">${count?'✓':'·'}</span><small>${H(shortFormat.format(date))}</small></li>`
  ).join('')}</ol>
  <small>${T('بياناتك محفوظة في هذا المتصفح. المستويات المعروضة مأخوذة من الدروس التي مارستها.','Your activity is saved in this browser. Levels reflect the lessons you have used.')}</small>
 </div>`;
}

const homeServices=[
 ['library','study-01','تعلّم الأنماط','Pattern lessons','افهم القاعدة وطبّقها خطوة بخطوة.','Understand a structure and practise it step by step.'],
 ['coach','travel-01','الاستماع والتدريب','Listen & practise','اختر مسارًا واستمع إلى أمثلته وشرح قواعده.','Choose a route and hear its examples and rules.'],
 ['references','market-01','مكتبة الألف جملة','1,000 sentences','ابحث عن جملة بالغرض أو الموضوع أو البناء.','Find sentences by purpose, topic or structure.'],
 ['dialogues','care-01','المحادثات','Conversations','استمع إلى حوارات بصوتين وتابع النص والمشهد.','Listen to two voices and follow the transcript and scene.'],
 ['comparisons','classroom-01','المقارنات','Comparisons','ميّز الصيغ المتشابهة بالأمثلة والشرح.','Tell similar structures apart with examples and explanations.'],
 ['lab','workshop-01','مختبر الأفكار','Idea Lab','سمِّ ما تراه، ثم ابتكر وصفًا أو حوارًا من الصورة.','Name what you see, then create a description or dialogue.'],
 ['scene-studio','civic-01','تكلّم من الصورة','Speak from a scene','استمع إلى الجملة الأساسية، ثم وسّعها بوصفك وأسئلتك.','Hear the model sentence, then expand it with your own description and questions.'],
 ['routes','work-01','تعلّم حسب غرضك','Learn by purpose','ابدأ من موقف تريد التعامل معه بالإنجليزية.','Start with a situation you want to handle in English.'],
 ['catalog','gathering-01','معرض المشاهد','Scene gallery','اكتشف الجمل من خلال صورها.','Discover sentences through their scenes.'],
 ['curriculum','craft-01','استكشف الأنماط','Explore patterns','تصفّح الصيغ والموضوعات للوصول إلى النمط الذي تريده.','Browse structures and topics to find the pattern you want.'],
 ['path','field-01','خطة التعلّم','Learning plan','انتقل بين وحدات التعلّم بالترتيب الذي يناسبك.','Work through the course units at your own pace.'],
 ['review','team-01','المراجعة','Review','استرجع الأنماط التي حان وقت مراجعتها.','Recall the patterns due for review.'],
];

home=function(){
 const lesson=homeNextLesson();
 return head(T('تعلّم الإنجليزية من خلال الأنماط','Learn English through patterns'),
  T('افهم تركيب الجملة، واسمعه في موقف حقيقي، ثم استخدمه لتعبّر عن فكرتك.','Understand how a sentence is built, hear it in context, then use it to express your own idea.'))+
  `<section class="ep-home-hero">
   <div class="ep-home-copy"><span class="eyebrow">ENGLISH PATTERNS</span>
    <h2>${T('افهم النمط.<br><em>واصنع عبارتك.</em>','Notice the pattern.<br><em>Make it yours.</em>')}</h2>
    <p>${T('لاحظ الجزء الأحمر. غيّر ما حوله لتقول شيئًا جديدًا.','Notice the words in red. Change what comes around them to say something new.')}</p>
    <div class="buttonrow">${lesson?`<button class="primary" onclick="openLesson(${lesson.id},${lesson.stage||0})">${lesson.resume?T('أكمل درسك','Continue your lesson'):T('ابدأ بنمط واحد','Start with one pattern')} ←</button>`:''}
    <button class="secondary" onclick="$('#home-services').scrollIntoView({block:'start'})">${T('استكشف الخدمات','Explore learning tools')} ↓</button></div>
   </div><div class="ep-home-image home-hero-photo"><img src="assets/scenes/idea-lab/study-01.webp" width="500" height="300" alt="">
    <div class="ep-image-caption" lang="en" dir="ltr"><b class="pattern-form">I want to</b> learn something new.</div></div>
  </section>
  <section id="home-achievement" class="home-achievement panel">${homeAchievement()}</section>
  <section id="home-services"><div class="sectionhead"><h2>${T('اختر كيف تتمرّن','Choose how to practise')}</h2></div>
   <div class="home-services">${homeServices.map(([route,image,ar,en,arDesc,enDesc])=>
    `<a class="home-service" href="#${route}"><img src="assets/scenes/idea-lab/${image}.webp" width="500" height="300" loading="lazy" alt="">
     <div><h3>${T(ar,en)}</h3><p>${T(arDesc,enDesc)}</p><span class="textlink">${T('افتح','Open')} ↗</span></div></a>`
   ).join('')}</div>
  </section>`;
};
if(page==='home')render();
