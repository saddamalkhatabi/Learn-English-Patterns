const model=require('./public/share-model.js');
const advanced=require('./public/advanced-curriculum.js');
const catalog=require('./public/pattern-catalog.json');
const patterns=new Map(catalog.patterns.map(row=>[row.planned_pattern_id||row.id,row]));
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
function details(descriptor){
 const {kind,target,section,plan}=descriptor;
 if(kind==='pattern'){
  const pattern=patterns.get(target);
  return pattern?[`درس النمط · ${pattern.form}`,
   `${pattern.title}. افتح الشرح والأمثلة والتدريبات في English Patterns.`,'library']:null;
 }
 if(kind==='advanced-item'){
  const row=advanced.get(section,target),collection=model.advancedTabs[section];
  return row&&collection?[`${collection[0]} · ${row.en}`,row.ruleAr||row.ar,collection[2]]:null;
 }
 if(kind==='coach-plan'){
  const count=plan.patternIds.filter(id=>patterns.has(id)).length;
  if(!count)return null;
  const mode=plan.mode==='interactive'?'تدريب تفاعلي':'استماع متتابع';
  const note=[plan.learningLevel,plan.speakPurpose?'غرض العبارة':null,plan.expandVocabulary?'توسيع المفردات':null].filter(Boolean);
  return ['خطة مشتركة · الاستماع والتدريب',
   `${mode} لمجموعة من ${count} نمط. ${note.length?note.join(' · ')+'. ':''}افتح الرابط لاستخدام إعدادات الخطة.`,'coach'];
 }
 if(kind==='reference-plan'){
  const area=plan.section==='patterns'?'الأنماط':'الجمل';
  const strategy=plan.section==='patterns'?plan.patternStrategy:plan.sentenceStrategy;
  const method={basic:'استماع متتابع',study:'شرح مع أمثلة إضافية',purpose:'الغرض ثم الجملة'}[strategy];
  return ['خطة مشتركة · الألف جملة (نمط)',`تدرّب على ${area} باستراتيجية «${method}» وإعدادات البحث والعرض المشتركة.`,'references'];
 }
 return target==='advanced'&&model.advancedTabs[section]||model.sections[target];
}
function publicOrigin(request,configured){
 for(const value of [configured,`${request.headers['x-forwarded-proto']?.split(',')[0].trim()==='https'||request.socket.encrypted?'https':'http'}://${request.headers.host||'localhost'}`]){
  if(!value)continue;
  try{
   const url=new URL(value);
   if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/')return url.origin;
  }catch{}
 }
 return 'http://localhost';
}
function previewHTML(template,input,request,configured){
 const descriptor=model.read(input.searchParams),preview=details(descriptor||{kind:'page',target:'home'});
 if(!preview)return template;
 const [name,description,imageKey]=preview;
 const origin=publicOrigin(request,configured);
 const canonical=descriptor?model.link(new URL('index.html',origin),descriptor):new URL('/',origin);
 // Fragments are for app navigation; query parameters identify the crawler-visible resource.
 canonical.hash='';
 const image=new URL(`assets/home/${imageKey}.webp`,origin).href;
 const title=name==='English Patterns'?name:`${name} | English Patterns`;
 const properties={
  'og:type':'website','og:locale':'ar_YE','og:site_name':'English Patterns','og:title':title,'og:description':description,
  'og:url':canonical.href,'og:image':image,'og:image:type':'image/webp','og:image:width':'780','og:image:height':'520','og:image:alt':name
 };
 const twitter={'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image,'twitter:image:alt':name};
 const fallback=new URL('icon-512.png',origin).href;
 const tags=[
  ...Object.entries(properties).map(([key,value])=>`<meta property="${key}" content="${escape(value)}">`),
  `<meta property="og:image" content="${escape(fallback)}"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="English Patterns">`,
  ...Object.entries(twitter).map(([key,value])=>`<meta name="${key}" content="${escape(value)}">`)
 ].join('');
 if(!descriptor)return template.replace('</head>',()=>tags+'</head>');
 return template.replace(/<title>[^<]*<\/title>/,()=>`<title>${escape(title)}</title>`)
  .replace(/<meta name="description" content="[^"]*">/,()=>`<meta name="description" content="${escape(description)}">`)
  .replace('</head>',()=>tags+'</head>');
}
module.exports={previewHTML};
