let instantIndexPromise,instantDictionaryPromise,instantLookup,instantAudio,instantFirstClick,instantLastGesture,instantPointerType;
let instantSelecting=false,instantSelectionTimer;
const instantTextControls='button,a[href],summary,label[for],[role="button"]';
const instantTextSkip='script,style,[hidden],[aria-hidden="true"],[data-no-instant-lookup],select,input[type="password"],audio,video,.instant-vocabulary,.english-usage-badge,.english-usage-audio-label';

function loadInstantIndex(){
 if(!instantIndexPromise)instantIndexPromise=loadVocabulary().then(data=>{
  if(data)return EPInstantVocabulary.index(data);
  instantIndexPromise=null;
  return EPInstantVocabulary.index({entries:[],sources:[]});
 });
 return instantIndexPromise;
}

function loadInstantDictionary(){
 if(!instantDictionaryPromise)instantDictionaryPromise=fetch('instant-dictionary.json').then(response=>{
  if(!response.ok)throw Error('dictionary');
  return response.json();
 }).catch(()=>{instantDictionaryPromise=null;return {}});
 return instantDictionaryPromise;
}

function instantTextBlock(node){
 let block=node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;
 while(block?.parentElement&&['inline','contents'].includes(getComputedStyle(block).display)&&
  !block.matches(instantTextControls))block=block.parentElement;
 return block;
}
function instantTextRun(block){
 const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,{acceptNode:part=>
  part.parentElement.closest(instantTextSkip)||getComputedStyle(part.parentElement).display==='none'?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
 let text='';
 const nodes=[];
 while(walker.nextNode()){
  const part=walker.currentNode,start=text.length;
  text+=part.data;
  if(part.length)nodes.push({part,start,end:text.length});
 }
 function offsetFor(container,offset){
  if(container.nodeType===Node.TEXT_NODE){
   const item=nodes.find(node=>node.part===container);
   return item?item.start+offset:-1;
  }
  const boundary=document.createRange();
  boundary.setStart(container,offset);
  boundary.collapse(true);
  return nodes.find(({part})=>boundary.comparePoint(part,part.length)>=0)?.start??text.length;
 }
 function rangeFor(start,end){
  const first=nodes.find(part=>part.start<=start&&start<part.end),last=nodes.find(part=>part.start<end&&end<=part.end);
  if(!first||!last)return null;
  const range=document.createRange();
  range.setStart(first.part,start-first.start);range.setEnd(last.part,end-last.start);
  return range;
 }
 return {text,offsetFor,rangeFor};
}
function instantTextContext(event){
 const target=event.target;
 if(!(target instanceof Element)||target.closest(instantTextSkip))return null;
 const editable=target.closest('textarea,input');
 if(editable){
  if(typeof editable.selectionStart!=='number'||editable.selectionStart===editable.selectionEnd)return null;
  return {target,text:editable.value,offset:editable.selectionStart,rect:editable.getBoundingClientRect()};
 }
 const caret=document.caretPositionFromPoint?.(event.clientX,event.clientY)||document.caretRangeFromPoint?.(event.clientX,event.clientY);
 const node=caret?.offsetNode||caret?.startContainer,offset=caret?.offset??caret?.startOffset;
 if(node?.nodeType!==Node.TEXT_NODE||!target.contains(node)&&!node.parentElement.contains(target))return null;
 const {text,offsetFor,rangeFor}=instantTextRun(instantTextBlock(node));
 const position=offsetFor(node,offset);
 const nearby=EPInstantVocabulary.words(text).filter(word=>word.start<=position&&position<=word.end);
 const hit=nearby.find(word=>[...(rangeFor(word.start,word.end)?.getClientRects()||[])].some(rect=>
  rect.left-2<=event.clientX&&rect.right+2>=event.clientX&&rect.top-2<=event.clientY&&rect.bottom+2>=event.clientY));
 if(!hit)return null;
 const specificTarget=target.closest('[data-idea-vocab],[data-word].idea-map-point');
 const specific=specificTarget?currentIdeaScene()?.words[Number(specificTarget.dataset.ideaVocab??specificTarget.dataset.word)]:null;
 return {text,offset:Math.min(position,hit.end-1),target,rangeFor,specific,rect:rangeFor(hit.start,hit.end)?.getBoundingClientRect()};
}

function instantSelectionContext(){
 const selection=window.getSelection();
 if(!selection?.rangeCount||selection.isCollapsed)return null;
 const range=selection.getRangeAt(0),{startContainer,endContainer}=range;
 const target=instantTextBlock(startContainer);
 if(!target||target===document.body||target.closest(instantTextSkip+',textarea,input')||target!==instantTextBlock(endContainer))return null;
 const {text,offsetFor}=instantTextRun(target);
 const start=offsetFor(startContainer,range.startOffset),end=offsetFor(endContainer,range.endOffset);
 const rect=range.getBoundingClientRect();
 if(start<0||end<=start||end-start>400||!rect.width||!EPInstantVocabulary.words(text.slice(start,end)).length)return null;
 return {target,text,start,end,rect,selection:true};
}
function queueInstantSelection(){
 clearTimeout(instantSelectionTimer);
 if(!EP.prefs.instantVocabulary){closeInstantVocabulary();return}
 if(instantSelecting)return;
 instantSelectionTimer=setTimeout(()=>{
  if(instantSelecting||!EP.prefs.instantVocabulary||performance.now()-(instantLastGesture?.time??-Infinity)<450)return;
  const context=instantSelectionContext(),prior=instantLookup?.context;
  if(!context){
   if(prior?.selection)closeInstantVocabulary();
   return;
  }
  if(prior?.selection&&prior.target===context.target&&prior.start===context.start&&prior.end===context.end)return;
  showInstantVocabulary(context);
 },260);
}

function closeInstantVocabulary(){
 const popup=instantLookup?.popup;
 instantLookup=null;
 popup?.remove();
 globalThis.CSS?.highlights?.delete('instant-vocabulary-selection');
 instantAudio?.stop();instantAudio=null;
}

function positionInstantVocabulary(popup,anchor){epPositionFloating(popup,anchor)}

function moveInstantHighlight(session,match){
 const range=session.context.rangeFor?.(match.start,match.end);
 if(!range)return;
 if(globalThis.Highlight&&globalThis.CSS?.highlights){
  CSS.highlights.set('instant-vocabulary-selection',new Highlight(range));
  const selection=window.getSelection();
  if(selection?.rangeCount&&selection.getRangeAt(0).intersectsNode(range.commonAncestorContainer))selection.removeAllRanges();
 }else{
  const selection=window.getSelection();
  selection?.removeAllRanges();selection?.addRange(range);
 }
 session.anchor=range.getBoundingClientRect();
 positionInstantVocabulary(session.popup,session.anchor);
}

function pronounceInstantVocabulary(session){
 if(instantLookup!==session)return;
 const {result,match}=session;
 stopSpeech({keepReferencePlayer:Boolean(session.context.target.closest('#reference-player'))});
 if(match.lang==='ar'){
  if(!('speechSynthesis' in window))return;
  const utterance=new SpeechSynthesisUtterance(match.text);
  utterance.lang='ar';utterance.rate=state.rate||1;
  const arabicVoice=speechSynthesis.getVoices().find(voice=>voice.lang.toLowerCase().startsWith('ar'));
  if(arabicVoice)utterance.voice=arabicVoice;
  speechSynthesis.speak(utterance);
  instantAudio={stop:()=>speechSynthesis.cancel()};
  return;
 }
 const voice=state.voice===1?'female':'male',alternate=voice==='male'?'female':'male';
 const recording=result?.entry?.audio[voice]||result?.entry?.audio[alternate];
 const text=match.text;
 if(recording&&EPInstantVocabulary.key(recording.text)===EPInstantVocabulary.key(text)){
  const player=playVocabularyClip(recording);
  instantAudio=player;
  player.done.then(ok=>{
   if(!ok&&instantLookup===session&&instantAudio===player)instantAudio=synthesizeTrainingCue(text,state.rate||1,voice);
  });
 }else instantAudio=synthesizeTrainingCue(text,state.rate||1,voice);
}

function paintInstantVocabulary(session,indexed){
 if(instantLookup!==session)return;
 const {popup,match,result}=session,related=result?.entry?EPInstantVocabulary.related(indexed,result.entry):[];
 const value=match.lang==='en'?result?.ar:result?.entry?.en||result?.en;
 const type=result?.entry?wordTypeBadge(result.entry):wordTypeBadge({pos:'X'});
 const entry=result?.entry,forms=entry&&['VERB','AUX','CONTR','PHRASE'].includes(entry.pos)?
  (PILOT?.patterns||[]).filter(pattern=>entry.patternIds.includes(pattern.id)&&
   [entry.en,entry.lemma].some(term=>term&&EPVocabulary.includesTerm(pattern.form.split('+')[0],term))).slice(0,2):[];
 popup.querySelector('.instant-vocabulary-body').innerHTML=`
  <div class="instant-vocabulary-heading"><b lang="${match.lang}" dir="auto">${H(match.text)}</b>${type}</div>
  ${value?`<p lang="${match.lang==='en'?'ar':'en'}" dir="auto">${H(value)}</p>`:
   result?.parts?.length?`<strong>${T('معاني الكلمات والتراكيب','Meanings of words and expressions')}</strong>
    <dl class="instant-vocabulary-parts">${result.parts.map(part=>`<dt dir="auto">${H(part.text)}</dt><dd dir="auto">${H(part.value)}</dd>`).join('')}</dl>`:
   `<p>${T('لا تتوفر ترجمة لهذه الصيغة في المعجم.','This form has no dictionary translation.')}</p>`}
  ${result?.entry?.expansion?`<p lang="en" dir="ltr">${H(result.entry.expansion)}</p>`:''}
  ${entry?vocabularyUsageTags(entry):''}
  ${related.length||forms.length?`<strong>${T('تراكيب شائعة','Common expressions')}</strong><ul>${forms.map(pattern=>
   `<li class="pattern-token" lang="en" dir="ltr">${H(pattern.form)}</li>`).join('')}${related.slice(0,3-forms.length).map(item=>
   `<li><b lang="en" dir="ltr">${H(item.en)}</b><span lang="ar" dir="rtl">${H(item.ar)}</span></li>`).join('')}</ul>`:''}
  <div class="buttonrow">
   <button class="secondary" type="button" data-instant-audio>▶ ${T('انطق','Pronounce')}</button>
   ${result?.entry&&value?`<button class="textlink" type="button" data-instant-atlas>${T('افتح في الأطلس','Open in atlas')} ↗</button>`:''}
  </div>
  ${result?.dictionary?`<small><a href="dictionaries/README.txt" target="_blank" rel="noopener noreferrer">FreeDict</a></small>`:''}`;
 popup.querySelector('[data-instant-audio]').addEventListener('click',()=>pronounceInstantVocabulary(session));
 popup.querySelector('[data-instant-atlas]')?.addEventListener('click',()=>{
  const source=result.entry.sourceIds.map(id=>indexed.sources[id]).find(row=>EPInstantVocabulary.key(row[match.lang])===EPInstantVocabulary.key(session.context.text));
  closeInstantVocabulary();openVocabularyFromScene(result.entry.id,source?.id||'');
 });
 positionInstantVocabulary(popup,session.anchor);
}

async function showInstantVocabulary(context,initial){
 closeInstantVocabulary();
 const popup=document.createElement('aside');
 popup.className='instant-vocabulary';
 popup.setAttribute('aria-label',T('الترجمة الفورية','Instant vocabulary'));
 popup.setAttribute('popover','manual');
 popup.innerHTML=`<button type="button" class="secondary instant-vocabulary-close" aria-label="${T('أغلق الترجمة','Close translation')}">×</button>
  <div class="instant-vocabulary-body" aria-live="polite"><p>${T('جارٍ البحث في المعجم…','Looking up the expression…')}</p></div>`;
 (context.target.closest('dialog[open]')||document.body).append(popup);
 try{if(typeof popup.showPopover==='function')popup.showPopover();else popup.removeAttribute('popover')}
 catch{popup.removeAttribute('popover')}
 popup.querySelector('.instant-vocabulary-close').addEventListener('click',closeInstantVocabulary);
 const session={popup,context,match:initial,anchor:context.rect};
 instantLookup=session;
 positionInstantVocabulary(popup,session.anchor);
 const indexed=await loadInstantIndex();
 if(instantLookup!==session||!context.target.isConnected||!EP.prefs.instantVocabulary){
  if(instantLookup===session)closeInstantVocabulary();
  return;
 }
 const match=context.selection?EPInstantVocabulary.selectRange(indexed,context.text,context.start,context.end):
  EPInstantVocabulary.select(indexed,context.text,context.offset);
 if(!match){closeInstantVocabulary();return}
 session.match=match;
 session.result=EPInstantVocabulary.best(indexed,match,context.text,context.specific);
 if(match.source&&(match.lang==='en'?!session.result?.ar:!session.result?.entry)){
  session.result={...session.result,en:match.source.en,ar:match.source.ar};
 }
 if(!context.selection){
  moveInstantHighlight(session,match);
  pronounceInstantVocabulary(session);
 }
 if(match.lang==='en'?!session.result?.ar:!session.result?.entry&&!session.result?.en){
  const dictionary=await loadInstantDictionary();
  if(instantLookup!==session)return;
  const fallback=EPInstantVocabulary.dictionaryResult(dictionary,match);
  if(fallback)session.result={...session.result,...fallback,dictionary:true};
  else if(context.selection)session.result={...session.result,parts:EPInstantVocabulary.selectionParts(indexed,match,context.text,dictionary)};
 }
 paintInstantVocabulary(session,indexed);
}

function instantGesture(event,context=instantTextContext(event)){
 if(!context)return false;
 const word=EPInstantVocabulary.words(context.text).find(part=>part.start<=context.offset&&context.offset<part.end);
 if(!word)return false;
 const now=performance.now(),previous=instantLastGesture;
 const repeated=previous&&now-previous.time<220&&Math.hypot(previous.x-event.clientX,previous.y-event.clientY)<12;
 if(repeated)return true;
 const gesture={time:now,x:event.clientX,y:event.clientY};
 instantLastGesture=gesture;
 const initial={...word,lang:EPInstantVocabulary.language(word.text)};
 if(initial.lang==='en'&&['a','an','the'].includes(word.key)){
  loadInstantIndex().then(indexed=>{
   if(instantLastGesture===gesture&&context.target.isConnected&&EP.prefs.instantVocabulary&&
    EPInstantVocabulary.select(indexed,context.text,context.offset))showInstantVocabulary(context,initial);
  });
 }else showInstantVocabulary(context,initial);
 return true;
}

document.addEventListener('click',event=>{
 if(!EP.prefs.instantVocabulary||!event.isTrusted||!(event.target instanceof Element)||event.detail===0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||
  event.target.closest('.instant-vocabulary'))return;
 const context=instantTextContext(event);
 if(!context)return;
 if(!instantIndexPromise)loadInstantIndex();
 const now=performance.now(),first=instantFirstClick;
 const double=event.detail>1||(event.pointerType||instantPointerType)==='touch'&&first&&now-first.time<=380&&
  Math.hypot(first.x-event.clientX,first.y-event.clientY)<=22;
 if(double){
  if(first?.timer)clearTimeout(first.timer);
  instantFirstClick=null;
  if(instantGesture(event,context)){event.preventDefault();event.stopImmediatePropagation()}
  return;
 }
 const control=event.target.closest(instantTextControls);
 const click={time:now,x:event.clientX,y:event.clientY};
 instantFirstClick=click;
 if(!control)return;
 event.preventDefault();event.stopImmediatePropagation();
 const target=event.target;
 click.timer=setTimeout(()=>{
  if(instantFirstClick===click)instantFirstClick=null;
  if(target.isConnected)target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,
   button:0,clientX:click.x,clientY:click.y}));
 },380);
},true);

document.addEventListener('dblclick',event=>{
 if(EP.prefs.instantVocabulary&&instantGesture(event)){
  event.preventDefault();event.stopImmediatePropagation();
 }
},true);
document.addEventListener('pointerdown',event=>{
 instantPointerType=event.pointerType;
 instantSelecting=event.isPrimary!==false&&!instantLookup?.popup.contains(event.target);
 clearTimeout(instantSelectionTimer);
 if(instantLookup&&!instantLookup.popup.contains(event.target))closeInstantVocabulary();
},true);
for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{
 if(!instantSelecting||event.isPrimary===false)return;
 instantSelecting=false;
 queueInstantSelection();
},true);
document.addEventListener('selectionchange',queueInstantSelection);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&instantLookup){closeInstantVocabulary();event.preventDefault();event.stopPropagation()}
},true);
window.addEventListener('hashchange',closeInstantVocabulary);
epOnViewportChange(()=>{
 if(instantLookup)positionInstantVocabulary(instantLookup.popup,instantLookup.anchor);
});
document.addEventListener('scroll',event=>{
 if(instantLookup&&!instantLookup.popup.contains(event.target))closeInstantVocabulary();
},true);
const stopBeforeInstantVocabulary=stopSpeech;
stopSpeech=function(options){instantAudio?.stop();instantAudio=null;stopBeforeInstantVocabulary(options)};
