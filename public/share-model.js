(function(root){
'use strict';
const sections={
 home:['English Patterns','تعلّم الإنجليزية من خلال الأنماط والصور والاستماع والتدريب.','library'],
 library:['دروس الأنماط','تعلّم تركيب الجملة من أمثلة وشرح وتدريبات متدرجة.','library'],
 coach:['الاستماع والتدريب','استمع إلى القاعدة والأمثلة وطبّقها في المحادثة.','coach'],
 purposes:['أغراض التعبير','استكشف الغرض من الجملة وتدرّب على فهمه واستخدامه.','references'],
 songs:['تعلّم الأنماط بالأغاني','غنِّ مع الكلمات المتزامنة وتابع الأنماط المميزة في النص.','songs'],
 'scene-studio':['مكتبة الصور الذكية','تعلّم مفردات الصور ومارس الإنجليزية في سياقات بصرية.','scene-studio'],
 dialogues:['المحادثات','استمع إلى حوارات وتدرّب على التعبير في مواقف الحياة.','dialogues'],
 comparisons:['المقارنات','قارن التراكيب القريبة لتعرف متى يناسبك كل منها.','comparisons'],
 references:['الألف جملة (نمط)','استكشف الجمل والتراكيب والأغراض وتدرّب بمسار الاستماع الذي تختاره.','references'],
 vocabulary:['أطلس المفردات','اعثر على الكلمة في سياق الجملة والصورة والمحادثة.','vocabulary'],
 advanced:['خدمات متقدمة','قارن تراكيب العبارات، وراجع القواعد، وتعلّم التعابير الاصطلاحية.','comparisons'],
 progress:['التقدّم والمراجعة','راجع ما تعلّمته وخطط لممارستك التالية.','library'],
 path:['خطة التعلّم','اختر مستوى وابدأ بأنماط تناسب خطوتك التالية.','library'],
 curriculum:['فهرس الأنماط','ابحث في الأنماط المصنفة حسب المستوى.','library'],
 routes:['مسارات التعلّم','اختر مجموعة أنماط للغرض أو الموقف الذي تريد تعلّمه.','coach'],
 catalog:['معرض المشاهد','شاهد الأمثلة في صورها واستمع إلى التسجيلات.','scene-studio'],
 stories:['قصة قصيرة','تعلّم من الإنجليزية المستخدمة في قصة قصيرة.','dialogues'],
 review:['مراجعة الأنماط','استرجع الأنماط وتدرّب عليها من جديد.','library'],
 settings:['الإعدادات والتنزيل','خصص تجربة التعلّم وجهّزها للاستخدام دون إنترنت.','library'],
 archive:['ملفاتي','الوصول إلى خيارات النسخ الاحتياطي والملفات.','library'],
 quality:['حالة المحتوى','اطّلع على تغطية الدروس والوسائط.','library'],
 about:['عن English Patterns','افهم البناء واستخدمه للتعبير عن فكرتك.','library'],
 production:['تغطية المحتوى','اطّلع على وسائط وأمثلة المنهج.','library']
};
const advancedTabs={
 phrases:['تراكيب العبارات','قارن استخدام الأفعال وحروف الجر وتراكيب المكان والزمان.','comparisons'],
 comparisons:['مقارنات العبارات','اختر بين عبارات تبدو متشابهة وتُستخدم في سياقات مختلفة.','comparisons'],
 grammar:['مكتبة القواعد','ادرس قواعد الإنجليزية من A1 إلى C2، وحلّ اختبارات المستويات والاختبار الشامل.','library'],
 idioms:['التعابير الاصطلاحية','اعرف معنى التعابير في سياقها وقارن الاستعمال الأمريكي والبريطاني.','vocabulary'],
 review:['مراجعة أخطائي','راجع القواعد والأسئلة التي تحتاج إلى محاولة أخرى.','library']
};
const list=(value,options,fallback)=>options.includes(value)?value:fallback;
const key=value=>typeof value==='string'&&/^[a-z0-9-]{1,80}$/.test(value)?value:'';
const level=(value,allowApproximate=false)=>list(value,allowApproximate?['','A1–A2','A2–B1','B1–B2']:['','A1','A2','B1','B2','C1','C2'],'');
const flag=(value,fallback)=>typeof value==='boolean'?value:fallback;
const speed=value=>list(value,[.65,.75,.85,1,1.15],1);
const imageMode=value=>list(value,['normal','focus','compact','hidden'],'compact');
const purposeSteps=['pattern-purpose','pattern-form','example-purpose'];
function coachPlan(source){
 return {version:1,
  patternIds:[...new Set((Array.isArray(source.patternIds)?source.patternIds:[]).slice(0,180)
   .filter(id=>Number.isInteger(id)&&id>0&&id<100000))],
  routeId:key(source.routeId),stage:list(source.stage,[0,1,2,3,4,5,6],0),learningLevel:level(source.learningLevel),purposeId:key(source.purposeId),
  sample:list(source.sample,[0,3,6],0),mode:list(source.mode,['listen','interactive'],'listen'),
  voiceMode:list(source.voiceMode,['male','female','alternate'],'alternate'),
  autoNextPattern:flag(source.autoNextPattern,true),speakPurpose:flag(source.speakPurpose,true),
  expandVocabulary:flag(source.expandVocabulary,false),showEnglish:flag(source.showEnglish,true),
  dialoguesPerPattern:list(source.dialoguesPerPattern,[-1,1,2,3],1),
  readingSeconds:list(source.readingSeconds,[null,0,5,10,15,25,30,40,45,60],null),rate:speed(source.rate),imageMode:imageMode(source.imageMode)
 };
}
function referencePlan(source){
 const strategy=value=>list(value,['basic','study','purpose'],'basic');
 return {version:1,
  query:typeof source.query==='string'?source.query.trim().slice(0,180):'',
  section:list(source.section,['sentences','patterns'],'sentences'),grammar:key(source.grammar),domain:key(source.domain),
  purpose:key(source.purpose),level:level(source.level,true),patternScope:list(source.patternScope,['','foundation'],''),
  patternLevel:level(source.patternLevel),sort:list(source.sort,['source','az','level','grammar'],'source'),
  view:list(source.view,['cards','rows','compact'],'cards'),size:list(source.size,[12,24,48,100],24),
  sentenceStrategy:strategy(source.sentenceStrategy),patternStrategy:strategy(source.patternStrategy),
  voice:list(source.voice,['male','female'],'male'),guideVoice:list(source.guideVoice,['pattern','stage','male','female'],'pattern'),
  rate:speed(source.rate),auto:flag(source.auto,true),imageMode:imageMode(source.imageMode),
  purposeSteps:Object.fromEntries(purposeSteps.map(step=>[step,flag(source.purposeSteps?.[step],true)]))
 };
}
function normalize(kind,descriptor={}){
 const target=descriptor.target;
 if(kind==='page'&&Object.hasOwn(sections,target)){
  const section=target==='advanced'&&Object.hasOwn(advancedTabs,descriptor.section)?descriptor.section:'';
  return {kind,target,section};
 }
 if(kind==='pattern'&&/^\d{1,5}$/.test(String(target))&&+target>0)return {kind,target:Number(target)};
 if(kind==='advanced-item'&&Object.hasOwn(advancedTabs,descriptor.section)&&descriptor.section!=='review'&&key(target))
  return {kind,target,section:descriptor.section};
 if((kind==='coach-plan'||kind==='reference-plan')&&descriptor.plan?.version===1){
  const plan=kind==='coach-plan'?coachPlan(descriptor.plan):referencePlan(descriptor.plan);
  if(kind==='coach-plan'&&!plan.patternIds.length)return null;
  return {kind,target:kind==='coach-plan'?'coach':'references',plan};
 }
 return null;
}
function read(params){
 const kind=params.get('share'),encoded=params.get('plan');
 if(encoded?.length>4800)return null;
 let plan;try{if(encoded)plan=JSON.parse(encoded)}catch{return null}
 return normalize(kind,{target:params.get('target'),section:params.get('section'),plan});
}
function destination(descriptor){
 if(descriptor.kind==='pattern')return 'library';
 if(descriptor.kind==='advanced-item')return 'advanced';
 return descriptor.target;
}
function link(base,descriptor){
 const url=new URL(base);
 url.search='';url.hash=destination(descriptor);
 url.searchParams.set('share',descriptor.kind);
 if(descriptor.plan)url.searchParams.set('plan',JSON.stringify(descriptor.plan));
 else url.searchParams.set('target',descriptor.target);
 if(descriptor.section)url.searchParams.set('section',descriptor.section);
 return url;
}
const api={sections,advancedTabs,normalize,read,link,destination};
if(typeof module==='object')module.exports=api;else root.EPShare=api;
})(globalThis);
