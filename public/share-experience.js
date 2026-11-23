let activeSharedPlan=null;
const incomingShare=EPShare.read(new URLSearchParams(location.search));
function currentShareDescriptor(control){
 const kind=control.dataset.share;
 const target=control.dataset.shareId||page;
 const section=control.dataset.shareSection||(page==='advanced'?advancedSection():'');
 if(kind==='coach-plan'&&route){
  const form=$('#route-purpose');
  const selected=form?teacherRouteOptions():{...route.session,...route.session.filters};
  return EPShare.normalize(kind,{plan:{...selected,version:1,showEnglish:!hideCoachText,imageMode:patternsImageMode}});
 }
 if(kind==='reference-plan'&&referencePlayer){
  const {voice,rate,auto}=referencePlayer.state;
  return EPShare.normalize(kind,{plan:{...epReference,version:1,voice,rate,auto,guideVoice:referenceGuidedVoiceMode,
   purposeSteps:referencePurposePrefs,imageMode:patternsImageMode}});
 }
 if(kind==='pattern'&&!PILOT?.patterns.some(row=>row.id===Number(target))&&!patterns.some(row=>row.id===Number(target)))return null;
 return EPShare.normalize(kind,{target,section});
}
function shareTitle(descriptor){
 const {kind,target,section}=descriptor;
 if(kind==='coach-plan')return T('خطة استماع وتدريب','Listen & practise plan');
 if(kind==='reference-plan')return T('خطة الألف جملة (نمط)','1,000 sentences study plan');
 if(kind==='pattern'){
  const pattern=PILOT?.patterns.find(row=>row.id===target)||patterns.find(row=>row.id===target);
  return `${T('درس النمط','Pattern lesson')} · ${englishDisplay(pattern.form,pattern)}`;
 }
 if(kind==='advanced-item'){
  const row=EPAdvanced.get(section,target);
  return row?T(row.ar,advancedEnglish(row).title):T('خدمات متقدمة','Advanced learning');
 }
 if(target==='advanced'&&section){
  if(section==='comparisons')return T('مقارنات العبارات','Phrase comparisons');
  return T(...advancedTabs[section]);
 }
 return T(...epLabel(target));
}
function shareNetworks(url,title){
 const data=encodeURIComponent(url),text=encodeURIComponent(title);
 return [
  ['WhatsApp',`https://wa.me/?text=${text}%0A${data}`],
  ['Telegram',`https://t.me/share/url?url=${data}&text=${text}`],
  ['Facebook',`https://www.facebook.com/sharer/sharer.php?u=${data}`],
  ['X',`https://twitter.com/intent/tweet?url=${data}&text=${text}`]
 ];
}
function openAppShare(control){
 const descriptor=currentShareDescriptor(control);
 if(!descriptor){toast(T('أكمل اختيار الخطة لتتمكّن من مشاركتها.','Choose your plan before sharing it.'));return}
 const url=EPShare.link(new URL('index.html',location.href),descriptor).href,title=shareTitle(descriptor);
 const dialog=document.createElement('dialog');
 dialog.className='share-dialog';
 dialog.setAttribute('aria-labelledby','share-dialog-title');
 dialog.innerHTML=`<div class="advanced-dialog-head"><h2 id="share-dialog-title">${T('مشاركة','Share')}</h2>
  <form method="dialog"><button class="secondary" autofocus aria-label="${T('إغلاق','Close')}">×</button></form></div>
  <p class="share-title" dir="auto">${H(title)}</p>
  ${descriptor.plan?`<p>${T('يحتوي الرابط على إعدادات هذه الخطة.','The link includes the settings for this plan.')}</p>`:''}
  <label>${T('رابط المشاركة','Share link')}<input id="share-url" type="url" dir="ltr" readonly value="${H(url)}"></label>
  <div class="buttonrow"><button type="button" class="primary" id="share-copy">${T('نسخ الرابط','Copy link')}</button>
  ${navigator.share?`<button type="button" class="secondary" id="share-native">${T('تطبيقات الجهاز','Share through device')}</button>`:''}
  ${shareNetworks(url,title).map(([name,href])=>`<a class="secondary" href="${H(href)}" target="_blank" rel="noopener noreferrer">${name}</a>`).join('')}</div>
  <p id="share-feedback" role="status"></p>`;
 const input=dialog.querySelector('input'),status=dialog.querySelector('#share-feedback');
 dialog.querySelector('#share-copy').onclick=async()=>{
  try{await navigator.clipboard.writeText(url);status.textContent=T('نُسخ الرابط.','Link copied.')}
  catch{input.focus();input.select();status.textContent=T('حُدّد الرابط لنسخه.','The link is selected for copying.')}
 };
 const native=dialog.querySelector('#share-native');
 if(native)native.onclick=async()=>{
  try{await navigator.share({title,url})}
  catch(error){if(error.name!=='AbortError')status.textContent=T('يمكنك نسخ الرابط أو اختيار موقع مشاركة.','Copy the link or choose a sharing service.')}
 };
 document.body.append(dialog);
 dialog.showModal();
 dialog.addEventListener('close',()=>{dialog.remove();if(control.isConnected)control.focus({preventScroll:true})},{once:true});
}
document.addEventListener('click',event=>{
 const control=event.target.closest?.('[data-share]');
 if(control)openAppShare(control);
});
function paintSharedPlanBanner(){
 if(!activeSharedPlan||EPShare.destination(activeSharedPlan.descriptor)!==page||$('#shared-plan-banner'))return;
 $('#app').insertAdjacentHTML('afterbegin',`<div id="shared-plan-banner" class="panel shared-plan-banner">
  <div><b>${T('خطة مشتركة','Shared plan')}</b>
  <p>${T('الإعدادات مطبّقة على هذه الزيارة. يمكنك العودة إلى خطتك المحفوظة متى شئت.','These settings apply to this visit. You can return to your saved plan at any time.')}</p></div>
  <button type="button" class="secondary" onclick="restoreSharedPlan()">${T('العودة إلى إعداداتي','Restore my settings')}</button></div>`);
}
function useSharedCoachPlan(plan){
 const patternIds=plan.patternIds.filter(id=>PILOT?.pattern_order.includes(id));
 const purposeId=EPPurposes.get(plan.purposeId)?plan.purposeId:'';
 const routeId=CURRICULUM?.routes.find(item=>item.id===plan.routeId)?.id||'';
 const options={...plan,patternIds,purposeId,routeId};
 if(!route?.queue(options).length)return null;
 stopSpeech();
 const previous={session:route.session,storage:route.storage,hideCoachText,patternsImageMode};
 route.storage=null;
 route.configure(options);
 hideCoachText=!plan.showEnglish;
 patternsImageMode=plan.imageMode;applyPatternsImageMode();
 return ()=>{
  route.pause();
  route.audio.removeAttribute('src');route.audio.load();
  route.session=previous.session;route.storage=previous.storage;
  hideCoachText=previous.hideCoachText;patternsImageMode=previous.patternsImageMode;applyPatternsImageMode();
 };
}
function useSharedReferencePlan(plan){
 if(!referencePlayer)return null;
 stopSpeech();
 const previous={view:epReference,storage:referencePlayer.storage,player:referencePlayer.state,
  guideVoice:referenceGuidedVoiceMode,purposeSteps:{...referencePurposePrefs},patternsImageMode};
 epReference=Object.fromEntries(Object.keys(referenceDefaults).map(key=>[key,plan[key]]));
 epReference.purpose=EPPurposes.get(epReference.purpose)?epReference.purpose:'';
 referencePage=0;
 referencePlayer.storage=null;
 referencePlayer.state={...referencePlayer.state,ids:[],cursor:0,complete:false,offset:0,voice:plan.voice,rate:plan.rate,auto:plan.auto};
 referenceGuidedVoiceMode=plan.guideVoice;
 Object.assign(referencePurposePrefs,plan.purposeSteps);
 patternsImageMode=plan.imageMode;applyPatternsImageMode();
 return ()=>{
  stopSpeech();
  epReference=previous.view;referencePage=0;
  referencePlayer.loading=false;referencePlayer.resumeRequested=false;
  referencePlayer.audio.removeAttribute('src');referencePlayer.audio.load();
  referencePlayer.state=previous.player;referencePlayer.storage=previous.storage;
  referenceGuidedVoiceMode=previous.guideVoice;Object.assign(referencePurposePrefs,previous.purposeSteps);
  patternsImageMode=previous.patternsImageMode;applyPatternsImageMode();
 };
}
function restoreSharedPlan(){
 if(!activeSharedPlan)return;
 activeSharedPlan.restore();activeSharedPlan=null;
 delete document.body.dataset.sharedPlan;
 const url=new URL(location.href);
 for(const key of ['share','target','section','plan'])url.searchParams.delete(key);
 history.replaceState(history.state,'',url);
 coachPaintKey='';render();
}
function setSharedAdvancedSection(section){
 if(section==='phrases'||section==='comparisons'){advancedTab='phrases';advancedPhraseView=section}
 else if(advancedTabs[section])advancedTab=section;
 advancedPage=0;
}
async function openIncomingShare(){
 const descriptor=incomingShare;
 if(!descriptor||window.frameElement)return;
 const target=EPShare.destination(descriptor);
 if(target==='advanced')setSharedAdvancedSection(descriptor.section);
 const url=new URL(location.href);url.hash=target;
 history.replaceState(history.state,'',url);page=target;render();
 if(descriptor.kind==='advanced-item'){
  if(EPAdvanced.get(descriptor.section,descriptor.target))openAdvancedItem(descriptor.section,descriptor.target);
  else toast(T('تعذّر العثور على العنصر المشترك.','The shared item could not be found.'));
 }
 if(descriptor.kind==='pattern'){
  await pilotReady;
  if(page===target&&patterns.some(row=>row.id===descriptor.target))openPatternLesson(descriptor.target);
  else if(page===target)toast(T('تعذّر العثور على النمط المشترك.','The shared pattern could not be found.'));
 }
 if(descriptor.plan){
  await Promise.all([pilotReady,referenceDataReady,learningReady]);
  if(page!==target)return;
  const restore=descriptor.kind==='coach-plan'?useSharedCoachPlan(descriptor.plan):useSharedReferencePlan(descriptor.plan);
  if(restore){activeSharedPlan={descriptor,restore};document.body.dataset.sharedPlan=descriptor.kind;coachPaintKey='';render()}
  else toast(T('لا توجد مادة توافق إعدادات الخطة المشتركة.','The shared plan has no matching material.'));
 }
}
document.addEventListener('DOMContentLoaded',()=>{
 const before=render;
 render=function(){before();paintSharedPlanBanner()};
 openIncomingShare().catch(()=>toast(T('تعذّر فتح الرابط المشترك.','The shared link could not be opened.')));
},{once:true});
