let ideaWordMode='hidden',ideaLabelLanguage='en';
let ideaFlashTimer,ideaRevealTimer,ideaFlashStep=0,ideaSelected=null;
let ideaFrameObserver;
try{
 const language=localStorage.getItem('nasaq-idea-label-language');
 if(['en','ar','both','alternate'].includes(language))ideaLabelLanguage=language;
}catch{}

function ideaViewer(scene){
 return `<div id="idea-scene-viewer">
  <div class="idea-picture-frame">${ideaPicture(scene)}<div id="idea-picture-labels"></div></div>
  <div id="idea-picture-caption" class="idea-picture-caption"></div>
  <div class="idea-viewer-tools">
   <div class="idea-label-controls" role="group" aria-label="${T('كلمات على الصورة','Words on the picture')}">
    ${[['hidden','إخفاء الكلمات','Hide words'],['visible','أظهر الكلمات','Show words'],['flash','ومضات الحفظ','Recall flashes']].map(([id,ar,en])=>
     `<button type="button" class="secondary" data-idea-word-mode="${id}" aria-pressed="${ideaWordMode===id}" onclick="setIdeaWordMode('${id}')">${T(ar,en)}</button>`).join('')}
   </div>
   <div class="idea-viewer-options">
    <label class="idea-filter">${T('لغة العلامات','Label language')} <select id="idea-label-language" onchange="setIdeaLabelLanguage(this.value)">
     ${[['en','الإنجليزية','English'],['ar','العربية','Arabic'],['both','العربية والإنجليزية','Arabic and English'],['alternate','تناوب اللغتين','Alternate languages']].map(([id,ar,en])=>
      `<option value="${id}" ${ideaLabelLanguage===id?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
    <label class="idea-filter">${T('نوع المفردات','Vocabulary type')} <select id="idea-word-filter" onchange="setIdeaWordFilter(this.value)">
     ${[['','الكل','All'],['object','الأشياء والأشخاص','Objects and people'],['action','الأفعال','Actions'],['description','الأوصاف','Descriptions'],['phrase','عبارات المشهد','Scene phrases']].map(([id,ar,en])=>
      `<option value="${id}" ${ideaWordFilter===id?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
   </div>
   <p class="idea-picture-hint">${T('المس العلامة أو الكلمة لترى معناها لثوانٍ. في الومضات تظهر كلمة واحدة وتظهر ترجمتها أسفل الصورة.','Tap a marker or word to reveal its meaning briefly. Flash mode shows one word with its translation below.')}</p>
   <div class="buttonrow"><button class="secondary" onclick="stepIdeaScene(-1)">← ${T('المشهد السابق','Previous scene')}</button>
    <button class="secondary" onclick="stepIdeaScene(1)">${T('المشهد التالي','Next scene')} →</button>
    <button type="button" id="idea-zoom-button" class="primary" onclick="toggleIdeaZoom()">⛶ ${T('تكبير المشهد','Enlarge scene')}</button></div>
  </div></div>`;
}

function clearIdeaFlash(){
 clearTimeout(ideaFlashTimer);
 clearTimeout(ideaRevealTimer);
 ideaFlashStep=0;
 ideaSelected=null;
}

function setIdeaWordMode(mode){
 ideaWordMode=mode;
 clearIdeaFlash();
 document.querySelectorAll('[data-idea-word-mode]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.ideaWordMode===mode));
 });
 paintIdeaLabels(currentIdeaScene());
}

function setIdeaLabelLanguage(language){
 ideaLabelLanguage=language;
 try{localStorage.setItem('nasaq-idea-label-language',language)}catch{}
 setIdeaWordMode(language==='alternate'?'flash':ideaWordMode==='hidden'?'visible':ideaWordMode);
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
 paintIdeaLabels(scene);
}

function toggleIdeaZoom(){
 const dialog=$('#idea-zoom'),viewer=$('#idea-scene-viewer'),scene=currentIdeaScene();
 if(!dialog||!viewer||!scene)return;
 if(dialog.open){dialog.close();return}
 dialog.showModal();
 mountIdeaViewer(scene);
 positionIdeaLabels();
}

function restoreIdeaZoom(){
 const viewer=$('#idea-scene-viewer'),home=$('#idea-viewer-home');
 if(!viewer||!home)return;
 home.append(viewer);
 const button=$('#idea-zoom-button');
 button.textContent=`⛶ ${T('تكبير المشهد','Enlarge scene')}`;
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
 const kind=word&&{object:['اسم','Noun'],action:['فعل','Verb'],description:['صفة','Adjective']}[word.kind];
 caption.innerHTML=word?ideaLabelText(word,language)+(kind?`<span class="idea-caption-kind">${T(...kind)}</span>`:''):'';
}

function showIdeaMarker(index){
 const scene=currentIdeaScene(),word=scene?.words[index];
 if(!word)return;
 clearTimeout(ideaFlashTimer);
 clearTimeout(ideaRevealTimer);
 ideaSelected=index;
 const language=ideaLabelLanguage==='ar'?'en':'ar';
 updateIdeaCaption(word,language==='en'?'both':'ar');
 if(ideaWordMode==='flash'){
  paintIdeaPoints([{...word,index}],language);
 }else{
  const layer=$('#idea-picture-labels');
  layer?.querySelectorAll('.idea-map-point').forEach(point=>{
   const selected=+point.dataset.word===index;
   point.classList.toggle('selected',selected);
   const w=scene.words[+point.dataset.word];
   point.querySelector('.idea-map-label').innerHTML=ideaLabelText(w,selected?language:ideaLabelLanguage);
  });
  positionIdeaLabels();
 }
 ideaRevealTimer=setTimeout(()=>{
  updateIdeaCaption(null);
  if(ideaWordMode==='flash'){paintIdeaLabels(scene);return}
  const label=$(`.idea-map-point[data-word="${index}"] .idea-map-label`);
  if(label)label.innerHTML=ideaLabelText(word,ideaLabelLanguage);
  positionIdeaLabels();
 },2400);
}

function paintIdeaPoints(words,language){
 const layer=$('#idea-picture-labels');
 layer.innerHTML='<svg class="idea-map-leaders" aria-hidden="true"></svg>'+words.map(word=>{
  const name=H(word.en+' · '+word.ar),selected=ideaSelected===word.index;
  return `<div class="idea-map-point ${selected?'selected':''}" data-word="${word.index}" style="--x:${word.x}%;--y:${word.y}%">
   <button type="button" class="idea-pin" onclick="showIdeaMarker(${word.index})" aria-label="${name}">${word.index+1}</button>
   <button type="button" class="idea-map-label" onclick="showIdeaMarker(${word.index})">${ideaLabelText(word,language)}</button></div>`;
 }).join('');
 positionIdeaLabels();
}

function paintIdeaLabels(scene){
 const layer=$('#idea-picture-labels');
 if(!scene||!layer)return;
 clearTimeout(ideaFlashTimer);
 clearTimeout(ideaRevealTimer);
 updateIdeaCaption(null);
 const words=visibleIdeaWords(scene).filter(word=>Number.isFinite(word.x)&&Number.isFinite(word.y));
 if(ideaWordMode==='hidden'||!words.length){layer.innerHTML='';return}
 if(ideaWordMode==='visible'){paintIdeaPoints(words,ideaLabelLanguage);return}
 const flash=()=>{
  if(page!=='lab'||ideaWordMode!=='flash'||scene.id!==ideaSceneId||!layer.isConnected)return;
  const alternating=ideaLabelLanguage==='alternate';
  const step=ideaFlashStep++;
  const word=words[(alternating?Math.floor(step/2):step)%words.length];
  const language=alternating?(step%2?'ar':'en'):ideaLabelLanguage;
  ideaSelected=word.index;
  paintIdeaPoints([word],language);
  updateIdeaCaption(word,language==='ar'?'both':'ar');
  ideaFlashTimer=setTimeout(()=>{
   layer.innerHTML='';
   updateIdeaCaption(null);
   ideaFlashTimer=setTimeout(flash,1400);
  },2300);
 };
 flash();
}

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
