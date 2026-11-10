let ideaWordMode='hidden',ideaLabelLanguage='en';
let ideaSoloVoice='male';
let ideaFlashTimer,ideaRevealTimer,ideaSelected=null,ideaSequence=null,ideaVoice=null,ideaFlashVoice=false;
const ideaIntroducedScenes=new Set();
let ideaAutoFlash=true;
let ideaFrameObserver;
try{
 const language=localStorage.getItem('nasaq-idea-label-language');
 if(['en','ar','both','alternate'].includes(language))ideaLabelLanguage=language;
}catch{}

function ideaViewer(scene){
 const multiple=findIdeaScenes().length>1;
 return `<div id="idea-scene-viewer">
  <div class="idea-picture-frame">${ideaPicture(scene)}<div id="idea-picture-labels"></div></div>
  <div id="idea-picture-caption" class="idea-picture-caption"></div>
  <div class="idea-viewer-tools">
   <div class="idea-viewer-bar">
    <button class="secondary" data-idea-scene-step ${multiple?'':'disabled'} onclick="stepIdeaScene(-1)" aria-label="${T('المشهد السابق','Previous scene')}">‹</button>
    <button type="button" id="idea-zoom-button" class="secondary" onclick="toggleIdeaZoom()">⛶ ${T('تكبير','Enlarge')}</button>
    <button class="secondary" data-idea-scene-step ${multiple?'':'disabled'} onclick="stepIdeaScene(1)" aria-label="${T('المشهد التالي','Next scene')}">›</button>
   </div>
   <details class="idea-disclosure idea-picture-options"><summary>${T('خيارات الكلمات على الصورة','Picture word options')}</summary>
   <div class="idea-viewer-options">
    <label class="idea-filter">${T('العرض','Display')} <select id="idea-word-mode" onchange="setIdeaWordMode(this.value)">
     ${[['hidden','إخفاء الكلمات','Hide words'],['visible','إظهار الكلمات','Show words'],['flash','ومضات الحفظ','Recall flashes']].map(([id,ar,en])=>
      `<option value="${id}" ${ideaWordMode===id?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
    <label class="idea-filter">${T('لغة العلامات','Label language')} <select id="idea-label-language" onchange="setIdeaLabelLanguage(this.value)">
     ${[['en','الإنجليزية','English'],['ar','العربية','Arabic'],['both','العربية والإنجليزية','Arabic and English'],['alternate','تناوب اللغتين','Alternate languages']].map(([id,ar,en])=>
      `<option value="${id}" ${ideaLabelLanguage===id?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
    <label class="idea-filter">${T('نوع المفردات','Vocabulary type')} <select id="idea-word-filter" onchange="setIdeaWordFilter(this.value)">
     ${[['','الكل','All'],['object','الأشياء والأشخاص','Objects and people'],['action','الأفعال','Actions'],['description','الأوصاف','Descriptions']].map(([id,ar,en])=>
      `<option value="${id}" ${ideaWordFilter===id?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
    <label class="idea-filter">${T('صوت المفردة أو المثال','Word or example voice')} <select onchange="ideaSoloVoice=this.value">
     <option value="male" ${ideaSoloVoice==='male'?'selected':''}>Adam</option><option value="female" ${ideaSoloVoice==='female'?'selected':''}>Bella</option>
    </select></label>
   </div>
   <p class="idea-picture-hint">${T('انقر علامةً لعرض معناها مؤقتًا. تظهر ترجمة الكلمات أسفل الصورة أثناء الوميض.','Tap a marker to reveal its meaning briefly. Flashes show the translation below the picture.')}</p>
   <div class="idea-zoom-audio">${ideaAudioControls()}</div></details>
  </div></div>`;
}

function ideaAudioControls(){
 return `<div class="idea-audio-tools">
  <button type="button" class="secondary" onclick="startIdeaSequence(ideaFlashVoice,true)">▷ ${T('انطق كل الكلمات','Play all words')}</button>
  <button type="button" class="secondary" data-idea-sync aria-pressed="${ideaFlashVoice}" onclick="toggleIdeaFlashVoice()">${T('مزامنة الوميض مع النطق','Sync flashes with audio')}</button>
  <button type="button" class="secondary" data-idea-stop onclick="setIdeaWordMode('hidden',false)" hidden>${T('إيقاف','Stop')}</button>
  <small data-idea-audio-status role="status"></small></div>`;
}

function clearIdeaFlash(){
 clearTimeout(ideaFlashTimer);
 clearTimeout(ideaRevealTimer);
 ideaSequence=null;
 ideaVoice?.stop();
 ideaVoice=null;
 ideaSelected=null;
}

function updateIdeaPlayback(status=''){
 document.querySelectorAll('[data-idea-sync]').forEach(button=>button.setAttribute('aria-pressed',String(ideaFlashVoice)));
 document.querySelectorAll('[data-idea-stop]').forEach(button=>{button.hidden=!ideaSequence&&!ideaVoice});
 document.querySelectorAll('[data-idea-audio-status]').forEach(element=>{element.textContent=status});
 document.querySelectorAll('[data-idea-vocab]').forEach(row=>row.classList.toggle('active',+row.dataset.ideaVocab===ideaSelected));
}

function setIdeaWordMode(mode,user=true){
 if(mode==='hidden'&&user)ideaAutoFlash=false;
 clearIdeaFlash();
 ideaWordMode=mode;
 if(mode==='flash'){startIdeaSequence(true,ideaFlashVoice);return}
 updateIdeaModeButtons();
 paintIdeaLabels(currentIdeaScene());
 updateIdeaPlayback();
}

function updateIdeaModeButtons(){
 const select=$('#idea-word-mode');
 if(select)select.value=ideaWordMode;
}

function toggleIdeaFlashVoice(){
 ideaFlashVoice=!ideaFlashVoice;
 if(ideaFlashVoice||ideaSequence?.flash)startIdeaSequence(true,ideaFlashVoice);
 else updateIdeaPlayback();
}

function setIdeaLabelLanguage(language){
 ideaLabelLanguage=language;
 try{localStorage.setItem('nasaq-idea-label-language',language)}catch{}
 setIdeaWordMode(language==='alternate'||ideaWordMode==='flash'?'flash':ideaWordMode,false);
}

function mountIdeaViewer(scene){
 const dialog=$('#idea-zoom');
 const viewer=$('#idea-scene-viewer');
 if(dialog.open){
  $('#idea-zoom-title').textContent=T(scene.ar,scene.en);
  dialog.querySelector('.idea-zoom-content').append(viewer);
  $('#idea-zoom-button').textContent=T('عودة للحجم العادي','Return to normal size');
 }
 ideaFrameObserver?.disconnect();
 if(typeof ResizeObserver==='function'){
  ideaFrameObserver=new ResizeObserver(positionIdeaLabels);
  ideaFrameObserver.observe(viewer.querySelector('.idea-picture-frame'));
 }
 if(!ideaSequence)paintIdeaLabels(scene);
}

function toggleIdeaZoom(){
 const dialog=$('#idea-zoom'),viewer=$('#idea-scene-viewer'),scene=currentIdeaScene();
 if(!dialog||!viewer||!scene)return;
 if(dialog.open){dialog.close();return}
 dialog.showModal();
 dialog.querySelector('.idea-zoom-content').append(viewer);
 $('#idea-zoom-title').textContent=T(scene.ar,scene.en);
 $('#idea-zoom-button').textContent=T('عودة للحجم العادي','Return to normal size');
 positionIdeaLabels();
}

function restoreIdeaZoom(){
 const viewer=$('#idea-scene-viewer'),home=$('#idea-viewer-home');
 if(!viewer||!home)return;
 home.append(viewer);
 const button=$('#idea-zoom-button');
 button.textContent=`⛶ ${T('تكبير','Enlarge')}`;
 positionIdeaLabels();
 button.focus({preventScroll:true});
}

function ideaLabelText(word,language){
 const en=`<span lang="en" dir="ltr">${H(word.en)}</span>`;
 const ar=`<span lang="ar" dir="rtl">${H(word.ar)}</span>`;
 return language==='both'?en+ar:language==='ar'?ar:en;
}

function updateIdeaCaption(word,language){
 const caption=$('#idea-picture-caption');
 if(!caption)return;
 caption.innerHTML=word?ideaLabelText(word,language)+`<span class="idea-caption-kind">${ideaWordKind(word)}</span>`:'';
}

function ideaWordKind(word){
 const kind={object:['اسم','Noun'],action:['فعل','Verb'],description:['صفة','Adjective']}[word.kind]||['عبارة','Phrase'];
 return T(...kind);
}

function showIdeaMarker(index,voice){
 const scene=currentIdeaScene(),word=scene?.words[index];
 if(!word)return;
 if(voice)stopSpeech();
 clearIdeaFlash();
 if(ideaWordMode==='flash'){ideaWordMode='hidden';updateIdeaModeButtons()}
 ideaSelected=index;
 const language=ideaLabelLanguage==='ar'?'en':'ar';
 updateIdeaCaption(word,language==='en'?'both':'ar');
 const anchored=Number.isFinite(word.x)&&Number.isFinite(word.y);
 if(ideaWordMode==='visible')paintIdeaPoints(visibleIdeaWords(scene).filter(w=>Number.isFinite(w.x)&&Number.isFinite(w.y)),ideaLabelLanguage,language);
 else paintIdeaPoints(anchored?[{...word,index}]:[],language);
 if(voice){
  const playback=pronounceIdeaWord(word,voice,name=>{
   queueMicrotask(()=>{if(ideaVoice===playback)updateIdeaPlayback(`${word.en} · ${name}`)});
  });
  ideaVoice=playback;
  playback.done.then(ok=>{
   if(ideaVoice!==playback)return;
   ideaVoice=null;
   updateIdeaPlayback(ok?'':T('تعذّر النطق. جرّب مرة أخرى.','Playback failed. Try again.'));
  });
 }
 updateIdeaPlayback();
 ideaRevealTimer=setTimeout(()=>{
  ideaSelected=null;
  paintIdeaLabels(scene);
  updateIdeaPlayback();
 },2400);
}

function paintIdeaPoints(words,language,selectedLanguage=language){
 const layer=$('#idea-picture-labels');
 if(!layer)return;
 layer.innerHTML='<svg class="idea-map-leaders" aria-hidden="true"></svg>'+words.map(word=>{
  const name=H(word.en+' · '+word.ar),selected=ideaSelected===word.index;
  return `<div class="idea-map-point ${selected?'selected':''}" data-word="${word.index}" style="--x:${word.x}%;--y:${word.y}%">
   <button type="button" class="idea-pin" onclick="showIdeaMarker(${word.index})" aria-label="${name}">${word.index+1}</button>
   <button type="button" class="idea-map-label" onclick="showIdeaMarker(${word.index})">${ideaLabelText(word,selected?selectedLanguage:language)}</button></div>`;
 }).join('');
 positionIdeaLabels();
}

function paintIdeaLabels(scene){
 const layer=$('#idea-picture-labels');
 if(!scene||!layer)return;
 updateIdeaCaption(null);
 const words=visibleIdeaWords(scene).filter(word=>Number.isFinite(word.x)&&Number.isFinite(word.y));
 if(ideaWordMode==='visible')paintIdeaPoints(words,ideaLabelLanguage==='alternate'?'en':ideaLabelLanguage);
 else layer.innerHTML='';
}

function pronounceIdeaWord(word,voice,onVoice){
 return playIdeaAudio(word.en,ideaWordCueId(word.en,voice),voice,onVoice);
}
function playIdeaAudio(text,cueId,voice,onVoice=()=>{}){
 const recording=PILOT?.trainingAudio?.[cueId];
 let audio,fallback,stopped=false,finish;
 const done=new Promise(resolve=>{finish=resolve});
 const recover=()=>{
  if(stopped||fallback)return;
  audio?.pause();
  onVoice(T('صوت الجهاز','Device voice'));
  fallback=synthesizeTrainingCue(text,state.rate||1,voice);
  fallback.done.then(finish);
 };
 if(recording?.text===text){
  audio=new Audio(recording.path);
  audio.playbackRate=state.rate||1;
  audio.onplaying=()=>onVoice(voice==='male'?'Adam':'Bella');
  audio.onended=()=>finish(true);
  audio.onerror=recover;
  audio.play().catch(recover);
 }else recover();
 return {done,stop(){stopped=true;audio?.pause();fallback?.stop();finish(false)}};
}

function startIdeaSequence(flash,sound){
 const scene=currentIdeaScene();
 if(!scene)return;
 if(sound)stopSpeech();
 clearIdeaFlash();
 const words=visibleIdeaWords(scene);
 if(!words.length){setIdeaWordMode('hidden',false);updateIdeaPlayback(T('لا توجد مفردات ضمن هذا الفلتر.','No vocabulary matches this filter.'));return}
 const sequence={flash,sound};
 ideaSequence=sequence;
 if(flash)ideaWordMode='flash';
 else if(ideaWordMode==='flash'){ideaWordMode='hidden';paintIdeaLabels(scene)}
 updateIdeaModeButtons();
 const play=async index=>{
  if(ideaSequence!==sequence||scene.id!==ideaSceneId)return;
  if(index===words.length){
   if(sound)recordDailyPractice('words',scene.id);
   if(flash)setIdeaWordMode('hidden',false);
   else{clearIdeaFlash();paintIdeaLabels(scene);updateIdeaPlayback()}
   return;
  }
  const word=words[index],voice=index%2?'female':'male';
  const language=ideaLabelLanguage==='alternate'?'en':ideaLabelLanguage;
  const anchored=Number.isFinite(word.x)&&Number.isFinite(word.y);
  ideaSelected=word.index;
  const paint=label=>{
   if(flash)paintIdeaPoints(anchored?[word]:[],label);
   updateIdeaCaption(word,label==='ar'?'both':'ar');
  };
  paint(language);
  const progress=T(`الكلمة ${index+1} من ${words.length}`,`Word ${index+1} of ${words.length}`);
  updateIdeaPlayback(progress+' · '+word.en);
  const next=()=>{
   if(flash)paintIdeaPoints([],language);
   ideaFlashTimer=setTimeout(()=>play(index+1),350);
  };
  if(sound){
   const playback=pronounceIdeaWord(word,voice,name=>{
    if(ideaSequence===sequence)updateIdeaPlayback(`${progress} · ${word.en} · ${name}`);
   });
   ideaVoice=playback;
   const ok=await playback.done;
   if(ideaSequence!==sequence)return;
   ideaVoice=null;
   if(!ok){setIdeaWordMode('hidden',false);updateIdeaPlayback(T('تعذّر النطق. شغّل الكلمات مرة أخرى.','Playback failed. Start the word list again.'));return}
  }
  const wait=sound?650:1550;
  ideaFlashTimer=setTimeout(()=>{
   if(flash&&ideaLabelLanguage==='alternate'){
    paint('ar');ideaFlashTimer=setTimeout(next,wait);
   }else next();
  },wait);
 };
 play(0);
}

const stopSpeechBeforeIdeaWords=stopSpeech;
stopSpeech=function(){
 if(ideaVoice||ideaSequence?.sound)setIdeaWordMode('hidden',false);
 stopSpeechBeforeIdeaWords();
};

function positionIdeaLabels(){
 const layer=$('#idea-picture-labels');
 if(!layer?.clientWidth)return;
 const points=[...layer.querySelectorAll('.idea-map-point')];
 if(!points.length)return;
 const width=layer.clientWidth,height=layer.clientHeight;
 const occupied=[],locations=new Map(),leaders=[];
 const overlap=(a,b)=>a.x<b.x+b.w+3&&a.x+a.w+3>b.x&&a.y<b.y+b.h+3&&a.y+a.h+3>b.y;
 const box=(x,y,w,h)=>({x:Math.min(Math.max(x,2),Math.max(2,width-w-2)),y:Math.min(Math.max(y,2),Math.max(2,height-h-2)),w,h});
 const free=candidates=>candidates.find(candidate=>!occupied.some(other=>overlap(candidate,other)));
 for(const point of points){
  const pin=point.querySelector('.idea-pin'),w=pin.offsetWidth,h=pin.offsetHeight;
  const x=point.offsetLeft,y=point.offsetTop,step=w+5;
  const moves=[[0,0],[0,-step],[0,step],[-step,0],[step,0],[-step,-step],[step,step],[-step,step],[step,-step],[0,-2*step],[0,2*step],[-2*step,0],[2*step,0]];
  const candidates=moves.map(([dx,dy])=>box(x+dx-w/2,y+dy-h/2,w,h));
  const place=free(candidates);
  pin.style.visibility=place?'visible':'hidden';
  if(!place)continue;
  pin.style.left=`${place.x-x}px`;
  pin.style.top=`${place.y-y}px`;
  occupied.push(place);
  locations.set(point,place);
  const cx=place.x+w/2,cy=place.y+h/2;
  if(Math.hypot(cx-x,cy-y)>3)leaders.push(`<line x1="${x}" y1="${y}" x2="${cx}" y2="${cy}"/><circle cx="${x}" cy="${y}" r="2.5"/>`);
 }
 points.sort((a,b)=>Number(b.classList.contains('selected'))-Number(a.classList.contains('selected')));
 for(const point of points){
  const label=point.querySelector('.idea-map-label'),pin=locations.get(point);
  const w=label.offsetWidth,h=label.offsetHeight;
  const candidates=pin?[box(pin.x+pin.w+6,pin.y+(pin.h-h)/2,w,h),box(pin.x-w-6,pin.y+(pin.h-h)/2,w,h),
   box(pin.x+(pin.w-w)/2,pin.y-h-6,w,h),box(pin.x+(pin.w-w)/2,pin.y+pin.h+6,w,h),
   box(pin.x+pin.w+4,pin.y-h-4,w,h),box(pin.x-w-4,pin.y+pin.h+4,w,h)]:[];
  const place=free(candidates);
  label.style.visibility=place?'visible':'hidden';
  if(!place)continue;
  label.style.left=`${place.x-point.offsetLeft}px`;
  label.style.top=`${place.y-point.offsetTop}px`;
  occupied.push(place);
 }
 layer.querySelector('svg').innerHTML=leaders.join('');
}
window.addEventListener('resize',positionIdeaLabels);
