const learningLevelNames={
 A1:['البداية اليومية','Everyday basics','عرّف بنفسك، واطلب شيئًا، واسأل عن المكان والسعر والوقت.','Introduce yourself, make a request, and ask about place, price and time.'],
 A2:['المواقف اليومية','Everyday exchanges','صِف روتينك، واحكِ ما حدث، ورتّب موعدًا أو خطة قصيرة.','Describe routines, say what happened, and make a plan.'],
 B1:['التوضيح واتخاذ القرار','Explaining and deciding','اشرح الأسباب، وقارن الخيارات، وحلّ مشكلة في حوار.','Explain reasons, compare options and resolve a problem.'],
 B2:['النقاش والمواقف المركّبة','Discussion and complex situations','ناقش الشروط والبدائل وادعم رأيك بتفاصيل واضحة.','Discuss conditions and alternatives and support an opinion.']
};
let learningLevels={patterns:{},patternOrder:[],dialogues:{},dialogueOrder:[],starter:{},sentences:{},scenes:{},starterScenes:[]};
const learningLevelsReady=fetch('learning-levels.json').then(response=>{
 if(!response.ok)throw Error('Learning sequence unavailable');
 return response.json();
}).then(data=>{learningLevels=data;return data}).catch(()=>null);
function learningLevelLabel(level){
 const name=learningLevelNames[level];
 return name?`${level} · ${T(name[0],name[1])}`:level;
}
function learningLevelOptions(selected='',all=true){
 return (all?`<option value="">${T('كل المستويات','All levels')}</option>`:'')+
  Object.keys(learningLevelNames).map(level=>
   `<option value="${level}" ${level===selected?'selected':''}>${learningLevelLabel(level)}</option>`).join('');
}
function learningLevelGuide(level){
 const name=learningLevelNames[level];
 return name?T(name[2],name[3]):'';
}
function lessonLevelPractice(id){
 const level=learningLevels.patterns[id];
 if(level==='A1')return T('استمع إلى مثال واحد، ثم أعده وقل الجملة بصوتك. بدّل كلمة واحدة وحافظ على تركيب النمط.','Hear one example, replay it and say it aloud. Change one word and keep the same structure.');
 if(level==='A2')return T('استمع إلى مثالين. بعدهما استخدم النمط للحديث عن موقف مشابه في يومك.','Listen to two examples, then use the pattern to talk about a similar situation in your day.');
 if(level)return T('قارن بين المثالين الأولين. قل متى يناسبك كلّ استعمال، ثم جرّب مثالًا مختلفًا.','Compare the first two examples. Say when you would use each one, then try a different example.');
 return '';
}
function sentenceLearningLevel(row){
 return learningLevels.sentences[row.id]||row.difficulty?.cefr||row.level?.split('–')[0]||'A2';
}
function sceneLearningLevel(scene){
 const id=scene.id.replace(/^studio:/,'');
 return learningLevels.scenes[id]||learningLevels.sentences[scene.sentenceId||id]||'A2';
}
function orderLearningPatterns(ids){
 const requested=new Set(ids);
 const ordered=learningLevels.patternOrder.filter(id=>requested.delete(id));
 return [...ordered,...requested];
}
function orderedPatternRows(rows){
 const byId=new Map(rows.map(row=>[row.id,row]));
 return orderLearningPatterns(byId.keys()).map(id=>byId.get(id));
}
