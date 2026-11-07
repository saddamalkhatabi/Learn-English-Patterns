const fs = require('node:fs');
const assert = require('node:assert/strict');
const { asset, sha } = require('./media-validation.cjs');
const read = name => JSON.parse(fs.readFileSync(`public/${name}.json`, 'utf8'));
const save = (file, value) => {
  const body = JSON.stringify(value) + '\n';
  fs.writeFileSync(file, body);
};
const pilot = read('pilot'), reference = read('source-corpus'), expansion = read('expansion-media');
const catalog = read('pattern-catalog');
const { replacements, visualReview } = require('../production/scene-replacements.json');
const rows = [...pilot.sentences, ...expansion.sentences, ...reference.sentences];
const byId = new Map(rows.map(s => [s.id, s]));
const themes = [
  ['home','المنزل والأسرة','Home and family',/\b(home|house|family|mother|father|grand\w+|kitchen|room)\b|المنزل|العائل|المطبخ/i],
  ['study','الدراسة والمكتبة','Study and library',/\b(stud\w+|class\w*|school|library|exam|notebook|book)\b|مدرس|مكتب[ةه]|دراس|اختبار/i],
  ['work','العمل والاجتماعات','Work and meetings',/\b(work|job|office|project|meeting|desk)\b|العمل|اجتماع|المكتب/i],
  ['travel','السفر والمواصلات','Travel and transport',/\b(train|bus|airport|station|ticket|travel|journey|hotel)\b|السفر|حافل|قطار|مطار/i],
  ['water','الماء والسباحة','Water and swimming',/\b(swim\w*|pool|beach|lake|sea|float|underwater)\b|سباح|مسبح|شاطئ|تحت الماء/i],
  ['outdoors','الطقس والطبيعة','Weather and outdoors',/\b(weather|park|garden|sun\w*|rain\w*|walk|mountain)\b|الطقس|حديق|مطر|مشمس/i],
  ['food','الطعام والشراب','Food and drink',/\b(food|eat\w*|cook\w*|cafe|café|tea|coffee|bakery|breakfast|lunch|dinner|rice)\b|طعام|شاي|قهو|الغداء|مخبز/i],
  ['shopping','التسوق والخدمات','Shopping and services',/\b(shop\w*|buy\w*|bought|price|market|pay|cost|bag)\b|سعر|متجر|سوق|أشتر/i],
  ['health','الصحة والعناية','Health and care',/\b(doctor|hospital|clinic|medicine|health|exercise|headache)\b|طبيب|صح[ةي]|عياد|مستشفى/i],
  ['social','الناس والمحادثة','People and conversation',/\b(friend\w*|introduc\w*|greet\w*|talk\w*|discuss\w*|neighbor\w*)\b|صديق|يتحدث|أصدقاء|تعارف/i],
  ['objects','الأشياء اليومية','Everyday objects',/\b(phone|key\w*|chair|door|window|table|clock|car)\b|هاتف|كرسي|باب|طاول/i],
  ['everyday','مواقف يومية','Everyday situations',/$^/]
];
// The bilingual pairs make scene-level objects and settings searchable in either
// language even when the original production brief was written in only one.
const visualTerms = [
  ['library','مكتبة',/\blibrar(y|ies)\b|مكتب[ةه]/i],
  ['notebook','دفتر',/\bnotebooks?\b|دفتر/i],
  ['book','كتاب',/\bbooks?\b|كتاب/i],
  ['laptop','حاسوب',/\b(laptop|computer)s?\b|حاسوب|حاسب/i],
  ['phone','هاتف',/\b(smart)?phones?\b|هاتف|جوال/i],
  ['window','نافذة',/\bwindows?\b|نافذ/i],
  ['door','باب',/\bdoors?\b|\bdoorway\b|باب/i],
  ['train','قطار',/\btrains?\b|قطار/i],
  ['bus','حافلة',/\b(bus|buses)\b|حافل/i],
  ['airport','مطار',/\bairports?\b|مطار/i],
  ['pool','مسبح',/\bpools?\b|مسبح/i],
  ['beach','شاطئ',/\bbeach\b|شاطئ/i],
  ['park','حديقة',/\b(park|garden)s?\b|حديق/i],
  ['rain','مطر',/\b(rain\w*|umbrellas?)\b|مطر/i],
  ['cafe','مقهى',/\b(cafe|coffee shop)s?\b|مقهى/i],
  ['coffee','قهوة',/\bcoffee\b|قهو/i],
  ['restaurant','مطعم',/\brestaurants?\b|مطعم/i],
  ['market','سوق',/\bmarket(s|place)?\b|السوق|متسوق/i],
  ['hospital','مستشفى',/\bhospitals?\b|مستشفى/i],
  ['desk','مكتب',/\bdesks?\b|على المكتب/i],
  ['meeting','اجتماع',/\bmeetings?\b|اجتماع/i],
  ['family','عائلة',/\bfamil(y|ies)\b|العائل|الأسرة/i],
  ['backpack','حقيبة ظهر',/\bbackpacks?\b|حقيبة ظهر/i],
  ['keys','مفاتيح',/\bkeys?\b|مفتاح|مفاتيح/i],
  ['chair','كرسي',/\bchairs?\b|كرسي|كراس/i],
  ['car','سيارة',/\bcars?\b|سيار/i],
];
const original = new Map(require('../production/image-prompts.json').patterns.flatMap(p=>p.scenes).map(s=>[s.sentence_id,s.description]));
const patternTags = new Map(catalog.patterns.map(p=>[p.planned_pattern_id||p.id,p.keywords||[]]));
const allowed = new Set(['assistant-reviewed','visually_reviewed','imported-unreviewed']);
for(const [id,change] of Object.entries(replacements)){
  const target=byId.get(id), source=byId.get(change.source);
  assert(target?.image && source?.image && allowed.has(source.image.status),id);
  target.image={...source.image,id:'scene-'+id,status:target.image.status,review_note:'Contextual scene reassignment after targeted visual inspection',replacement_source:source.id};
}
// Preserve existing JSON layout to keep image binding changes reviewable.
for(const [name,data] of [['pilot',pilot],['source-corpus',reference]]){
  const file=`public/${name}.json`, body=JSON.stringify(data,null,2)+'\n';
  if(fs.readFileSync(file,'utf8')!==body)fs.writeFileSync(file,body);
}
const hashes = new Map();
const missing=[], scenes=[];
for(const s of rows){
  const im=s.image;
  if(!im||!allowed.has(im.status)){missing.push({id:s.id,en:s.en,pattern_id:s.pattern_id??null,status:im?.status||'missing-or-withheld'});continue}
  const file=asset(process.cwd(),im.atlas);
  if(!hashes.has(file))hashes.set(file,sha(file));
  assert.equal(hashes.get(file),im.sha256,s.id);
  const c=im.crop;
  assert(c&&c.x>=0&&c.y>=0&&c.width>0&&c.height>0&&c.x+c.width<=im.width&&c.y+c.height<=im.height,s.id);
  const change=replacements[s.id], brief=change?.en||s.scene_description||original.get(s.id)||s.context||'';
  const arabicBrief=/[\u0600-\u06ff]/.test(brief);
  const description=arabicBrief?'':brief;
  const descriptionAr=change?.ar||(arabicBrief?brief:s.context||s.ar);
  const sceneText=[s.en,s.ar,description,descriptionAr,s.context].join(' ');
  const specific=visualTerms.filter(([, , re])=>re.test(sceneText)).flatMap(([en,ar])=>[en,ar]);
  const contextualTags=(patternTags.get(s.pattern_id)||[]).filter(tag=>sceneText.toLowerCase().includes(tag.toLowerCase()));
  const matched=themes.filter(([, , , re])=>re.test(sceneText)).map(t=>t[0]);
  const topicLabels=themes.filter(([id])=>(matched.length?matched:['everyday']).includes(id)).flatMap(([,ar,en])=>[ar,en]);
  const keywords=[...new Set([...specific,...(s.keywords||[]),...contextualTags,...topicLabels])];
  scenes.push({id:s.id,description,descriptionAr,keywords,topics:matched.length?matched:['everyday']});
}
save('public/scene-archive.json',{topics:themes.map(([id,ar,en])=>({id,ar,en})),scenes});
fs.writeFileSync('docs/SCENE-COVERAGE.json',JSON.stringify({
  expected:rows.length,available:scenes.length,assets:hashes.size,
  importedPendingVisualReview:rows.filter(s=>s.image?.status==='imported-unreviewed').length,
  technicalCheck:'File hash and crop bounds verified for each available scene',
  visualReview,replacements,missing
},null,2)+'\n');
console.log(JSON.stringify({scenes:scenes.length,missing:missing.length,assets:hashes.size}));
