const families=require('../content/reference-study.cjs');
const {describeReference,rules}=require('../public/teaching-core.js');
const {normalize,tokens,includesTerm}=require('../public/vocabulary-core.js');

const byFamily=new Map(families.map(family=>[family.id,family]));
const orderedFamilies=[byFamily.get('service'),byFamily.get('directions'),...families.filter(family=>!['service','directions'].includes(family.id))];
const exactWords=text=>tokens(text).map(normalize).join(' ');
const shortLessonLeads=new Set(['i am',"i'm",'it is',"it's","what's","let's"]);
const lessonConstraints=new Map([
 [5,/^[Tt]his is (?:(?:my|your|his|her|its|our|their|an?|the|some|one of)\b(?!\s+(?:little|bit)\b)|[A-Z][a-z]+\b)/],
 [114,/^(?:what is|what['’]s) (?:my|your|his|her|its|our|their) name\b/i],
 [9106,/^as soon as\b[^.!?]*\bi(?: will|['’]ll)\b/i],
 [9127,/^would you mind (?:not )?\w+ing\b/i],
 [9153,/^not only\b[^.!?]*\bbut also\b/i],
 [9174,/^by the time\b[^.!?]+,\s*[^.!?]+\bhad\s+\w+/i]
]);

function findFamily(row,guide){
 return orderedFamilies.find(family=>{
  if(!family.constructions.includes(guide.construction)||family.cue&&!family.cue.test(row.en))return false;
  if(family.id==='possession'&&guide.construction==='yes-no-question')
   return /^(?:do you have|have you got) (?!to\b|any idea\b)/i.test(row.en);
  if(family.id==='recent-event')return /^(?:(?:have|has|did)\b|\w+['’](?:ve|s)\b)/i.test(row.en);
  return true;
 });
}

function studyKey(row,guide){
 if(!guide.form)return '';
 const form=normalize(guide.form);
 if(guide.construction==='wh-question'){
  const interrogative=row.en.match(/^(?:by the way, )?(?:exactly )?(how (?:much|many|long|old|often|far)|what|where|when|which|who|whose|why|how)\b/i)?.[1];
  return interrogative?'question|'+normalize(interrogative):'';
 }
 return guide.construction+'|'+form;
}

function lessonLeads(pattern){
 return pattern.form.split(/\s*\+\s*|…/)[0].split(/\s*\/\s*/).map(lead=>lead.trim().replace(/[?.]+$/,''))
  .filter(lead=>/^[a-z]+(?:['’][a-z]+)?(?: [a-z]+(?:['’][a-z]+)?)*$/i.test(lead))
  .map(exactWords).filter(lead=>lead.split(' ').length>=2||shortLessonLeads.has(lead));
}

function makeReferenceStudy(corpus,course,levels){
 const patterns=course.flatMap(book=>book.patterns);
 const lessonRows=new Map(patterns.map(pattern=>[pattern.id,[]]));
 for(const s of course.flatMap(book=>book.sentences))lessonRows.get(s.pattern_id)?.push(s);
 const lessons=patterns.map(pattern=>({pattern,leads:lessonLeads(pattern),rows:lessonRows.get(pattern.id)}))
  .filter(lesson=>lesson.leads.length&&lesson.rows.length)
  .sort((a,b)=>Math.max(...b.leads.map(lead=>lead.length))-Math.max(...a.leads.map(lead=>lead.length)));
 const groups={},examples={},rows={},rowsByKey=new Map();
 const records=corpus.map(row=>{
  const guide=describeReference(row);
  const family=findFamily(row,guide);
  const key=studyKey(row,guide);
  if(key){
   if(!rowsByKey.has(key))rowsByKey.set(key,[]);
   rowsByKey.get(key).push(row);
  }
  return {row,guide,family,key};
 });

 for(const family of families){
  const anchors=records.filter(record=>record.family===family);
  // Prefer a reference that actually has a usable construction cue and a short prompt.
  anchors.sort((a,b)=>Number(Boolean(b.guide.form))-Number(Boolean(a.guide.form))||a.row.en.length-b.row.en.length);
  const anchor=anchors[0]?.row||corpus.find(row=>row.id===family.anchor);
  if(!anchor)continue;
  const lesson=matchingLesson(anchor,describeReference(anchor),lessons);
  const ids=family.examples.map(({key,pair,...example})=>{
   const id='study-'+family.id+'-'+key;
   if(pair){
    const [, ,us,uk]=pair;
    if(!example.uk||!includesTerm(example.en,us)||!includesTerm(example.uk,uk))throw Error('Regional wording is not used in '+id);
   }
   examples[id]={...example,id,referenceId:anchor.id,level:levels[anchor.id],
    patternIds:lesson&&matchesLessonWording(example.en,lesson)?[lesson.pattern.id]:[],
    ...(pair?{pair}:{})};
   return id;
  });
  groups[family.id]={comparison:family.comparison,caution:family.caution,examples:ids};
 }

 for(const {row,guide,family,key} of records){
  const lesson=matchingLesson(row,guide,lessons);
  const courseExamples=lesson?.rows.filter(s=>matchesLessonWording(s.en,lesson))||[];
  const extraIds=[family?.id,...(family?.include||[])].flatMap(id=>groups[id]?.examples||[]);
  const candidates=[...courseExamples.slice(0,3),...extraIds.map(id=>examples[id]),...(rowsByKey.get(key)||[])];
  const seen=new Set([exactWords(row.en)]);
  const related=[];
  for(const s of candidates){
   const words=exactWords(s.en);
   if(seen.has(words))continue;
   seen.add(words);
   related.push(s.id);
   if(related.length>=8)break;
  }
  const comparison=lesson?.pattern.comparison;
  // For a variant with its own cue, use its vetted family or course contrast.
  // The general note is valid when the displayed form is the general rule's form.
  const general=rules[guide.construction];
  const note=comparison?.ar&&comparison.en?[comparison.ar,comparison.en]:
   general?.[0]===guide.form&&general[3]&&general[4]?[general[3],general[4]]:undefined;
  rows[row.id]={examples:related,
   ...(family&&groups[family.id]?{group:family.id}:{}),
   ...(lesson?{lessonId:lesson.pattern.id}:{}),
   ...(!family&&note?{comparison:note}:{})};
 }
 return {schema:1,rows,groups,examples};
}

function startsWithLead(text,lead){
 const normalized=exactWords(text);
 return normalized===lead||normalized.startsWith(lead+' ');
}

function matchesLessonWording(text,{pattern,leads}){
 const constraint=lessonConstraints.get(pattern.id);
 if(constraint&&!constraint.test(text))return false;
 return pattern.id===114||leads.some(lead=>startsWithLead(text,lead));
}

function matchingLesson(row,guide,lessons){
 if(!guide.form)return null;
 return lessons.find(lesson=>{
  const {pattern,leads}=lesson;
  if([105,106,9077].includes(pattern.id)&&guide.construction!=='possession')return false;
  if([103,104].includes(pattern.id)&&guide.construction!=='description')return false;
  if([107,109].includes(pattern.id)&&/^(?:i want|i['’]d like) to\b/i.test(row.en))return false;
  if(!matchesLessonWording(row.en,lesson))return false;
  // Short openings need a disambiguating constraint or source evidence.
  return lessonConstraints.has(pattern.id)||leads.some(lead=>lead.split(' ').length>=3&&startsWithLead(row.en,lead))||
   pattern.source?.some(id=>row.source_ids.includes(id))||row.pattern_ids.includes(pattern.id)||
   [6,8,103,104,116,117,118].includes(pattern.id);
 });
}

module.exports={makeReferenceStudy};
