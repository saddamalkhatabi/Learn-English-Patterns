(function(root){
 const phrases={
  'can you point to':'هل يمكنك الإشارة إلى',
  'what stands out':'ما الذي يلفت الانتباه',
  'where in the picture':'أين في الصورة',
  'can you see':'هل يمكنك أن ترى',
  'what can you see':'ماذا يمكنك أن ترى',
  'what do you notice about':'ماذا تلاحظ بشأن',
  'say it again':'قلها مجددًا',
  'can you say it again':'هل يمكنك قولها مرة أخرى',
  'give me a short example':'أعطني مثالًا قصيرًا',
  'let me try':'دعني أجرّب',
  'take the other role':'قم بالدور الآخر',
  'ask me a follow-up':'اطرح عليّ سؤال متابعة',
  'change one detail':'غيّر تفصيلًا واحدًا',
  'give me a clue':'أعطني تلميحًا',
  'how can you tell':'كيف يمكنك أن تعرف',
  'in a new sentence':'في جملة جديدة'
 };
 const labels={
  locate:['حدّد ما تراه','Find a visible detail'],
  choice:['اختر تفصيلًا','Choose a detail'],
  notice:['لاحظ الموقف','Notice the situation'],
  repeat:['اسمع وأعد النطق','Listen and repeat'],
  pattern:['طبّق النمط','Practise the pattern'],
  role:['تبادل الأدوار','Take turns'],
  followup:['تابع من ردّك','Build on your reply'],
  change:['غيّر تفصيلًا','Change one detail'],
  recall:['استرجع المفردة','Recall a word'],
  compare:['قارن وفسّر','Compare and explain']
 };
 // Short, authored partner lines for the first nine scenes in the learning path.
 const starterTurns={
  'idea-home-01':[
   ['Would you like some tea with your bread?','هل ترغب في بعض الشاي مع خبزك؟'],
   ['Yes, please. I’d like some tea.','نعم، من فضلك. أودّ بعض الشاي.']],
  'idea-food-04':[
   ['Would you like sugar in your tea?','هل ترغب في سكر في الشاي؟'],
   ['No, thanks. I’d like it without sugar.','لا، شكرًا. أودّه دون سكر.']],
  'idea-home-02':[
   ['What do you need to pack first?','ماذا تحتاج أن تضع في الحقيبة أولًا؟'],
   ['I need to pack my notebook.','أحتاج إلى وضع دفتري في الحقيبة.']],
  'idea-travel-09':[
   ['Where do you want to get off?','أين تريد النزول؟'],
   ['At the library, please.','عند المكتبة، من فضلك.']],
  'idea-home-03':[
   ['Is there a spare key?','هل يوجد مفتاح احتياطي؟'],
   ['Yes. There’s one in the drawer.','نعم. يوجد واحد في الدرج.']],
  'idea-home-09':[
   ['Thanks for having me. Where can I sit?','شكرًا على استضافتي. أين يمكنني الجلوس؟'],
   ['You can sit here. Would you like some tea?','يمكنك الجلوس هنا. هل ترغب في بعض الشاي؟']],
  'idea-food-02':[
   ['Would you like the oranges or the pears?','هل ترغب في البرتقال أم الكمثرى؟'],
   ['I’d like the oranges, please.','أودّ البرتقال، من فضلك.']],
  'idea-food-01':[
   ['The flatbread is still warm. How many pieces?','الخبز المسطّح ما زال دافئًا. كم قطعة تريد؟'],
   ['Can I have two pieces, please?','هل يمكنني الحصول على قطعتين، من فضلك؟']],
  'idea-home-05':[
   ['Where should I put the milk?','أين أضع الحليب؟'],
   ['Put it in the refrigerator, please.','ضعه في الثلاجة، من فضلك.']]
 };
 const changes={
  food:['لم يتوفّر أحد المكوّنات','one ingredient is unavailable'],
  market:['نفد الخيار الأول','the first option is out of stock'],
  shopping:['نفد الخيار الأول','the first option is out of stock'],
  travel:['تغيّر موعد الانطلاق','the departure time changes'],
  journey:['تغيّر الطريق','the route changes'],
  study:['لم يفهم أحدهم التعليمات','someone needs the instructions clarified'],
  classroom:['احتاج أحدهم إلى مثال آخر','someone needs another example'],
  work:['تأخّر أحدهم في إنهاء المهمة','someone needs more time to finish'],
  team:['احتاج الفريق إلى توزيع المهمة من جديد','the team needs to divide the task again'],
  home:['احتاج أحدهم إلى شيء مختلف','someone asks for something different'],
  craft:['تعذّر استخدام أداة','one tool is unavailable'],
  workshop:['تعذّر استخدام أداة','one tool is unavailable'],
  events:['حضر أشخاص أكثر من المتوقّع','more people arrive than expected']
 };

 const point=word=>Number.isFinite(word.x)&&Number.isFinite(word.y);
 const object=word=>word.kind==='object'||['NOUN','PROPN'].includes(word.pos);
 const seed=text=>Array.from(text||'').reduce((value,char)=>(Math.imul(value,31)+char.charCodeAt(0))>>>0,0);
 const clean=text=>text.trim().replace(/[.!?؟]+$/,'');
 const sentence=text=>clean(text)+'.';
 const key=scene=>scene.id?.replace(/^studio:/,'')||scene.sentenceEn||scene.en;
 const pair=(en,ar)=>[en,ar];
 function step(kind,en,ar,phrase,details={}){
  return {kind,label:labels[kind],en,ar,phrase,terms:[],...details};
 }
 function position(word){
  const horizontal=word.x<37?['to the left','إلى اليسار']:word.x>63?['to the right','إلى اليمين']:['near the center','قرب الوسط'];
  if(word.y<28)return [horizontal[0]+' near the top',horizontal[1]+' قرب أعلى الصورة'];
  if(word.y>73)return [horizontal[0]+' near the bottom',horizontal[1]+' قرب أسفل الصورة'];
  return horizontal;
 }
 function markerText(word){
  return /^the\s/i.test(word.en)?word.en:'the '+word.en;
 }
 function relation(first,second){
  const x=first.x-second.x,y=first.y-second.y;
  const [en,ar]=Math.max(Math.abs(x),Math.abs(y))<12?['close to','قرب']:
   Math.abs(x)>Math.abs(y)?(x<0?['to the left of','إلى يسار']:['to the right of','إلى يمين']):
    (y<0?['above','فوق']:['below','أسفل']);
  return pair(`I see ${markerText(first)} ${en} ${markerText(second)}.`,`أرى «${first.ar}» ${ar} «${second.ar}».`);
 }
 function photoDetail(scene,visible,context,variant){
  const [first,second]=visible;
  if(!first)return step('notice',
   `What stands out in “${scene.en||clean(context[0])}”? Describe one detail using the caption.`,
   `ما الذي يلفت الانتباه في «${scene.ar||clean(context[1])}»؟ صف تفصيلًا واحدًا بالاستعانة بالتعليق.`,
   'what stands out',{answer:context,turn:context});
  const name=markerText(first),reply=pair(`I can see ${name}.`,`أرى ${first.ar}.`);
  const options=[
   step('locate',`Can you point to ${name}?`,`هل يمكنك الإشارة إلى «${first.ar}»؟`,'can you point to',
    {terms:[first],answer:reply,turn:reply}),
   step('locate',`Where in the picture is ${name}?`,`أين يظهر «${first.ar}» في الصورة؟`,'where in the picture',
    {terms:[first],answer:pair(`It’s ${position(first)[0]}.`,`يظهر ${position(first)[1]}.`),turn:reply}),
   step('notice',`Can you see ${name} in this photo?`,`هل ترى «${first.ar}» في هذه الصورة؟`,'can you see',
    {terms:[first],answer:reply,turn:reply}),
   step('notice',`What do you notice about ${name}?`,`ماذا تلاحظ بشأن «${first.ar}»؟`,'what do you notice about',
    {terms:[first],answer:pair(`It’s ${position(first)[0]}.`,`يظهر ${position(first)[1]}.`),turn:reply})
  ];
  if(second)options.push(step('choice',`Can you see ${name} and ${markerText(second)}? Name just one.`,
   `هل ترى «${first.ar}» و«${second.ar}»؟ سمِّ واحدًا فقط.`,'can you see',
   {terms:[first,second],answer:reply,turn:pair(`I can see ${markerText(second)}.`,`أرى ${second.ar}.`)}));
  if(second)options.push(step('notice',`What can you see besides ${name}?`,
   `ماذا ترى إلى جانب «${first.ar}»؟`,'what can you see',
   {terms:[second],answer:pair(`I can see ${markerText(second)}.`,`أرى ${second.ar}.`),turn:reply}));
  return options[variant%options.length];
 }
 function make(scene,patternForm=()=>null,level='B2',{focus}={}){
  const words=(scene.words||[]).filter(word=>word.en&&word.ar);
  const annotated=words.filter(word=>point(word)&&object(word));
  const visible=annotated.includes(focus)?[focus,...annotated.filter(word=>word!==focus)]:annotated;
  const variant=seed(key(scene));
  // Keep authored order for teaching cues and use a different activity sequence across scenes.
  const context=pair(scene.sentenceEn||scene.en||'Let’s look at this photo.',scene.sentenceAr||scene.ar||'لننظر إلى هذه الصورة.');
  const starter=starterTurns[key(scene)];
  const models=(scene.patterns||[]).filter(pattern=>pattern.en&&pattern.ar&&patternForm(pattern.id));
  const model=models.find(pattern=>pattern.id===scene.practicePatternId)||models[level==='A1'?0:variant%Math.max(1,models.length)];
  const first=visible[0],second=visible[1];
  const detail=photoDetail(scene,visible,context,variant);
  const keyTerm=focus||words.find(word=>point(word)&&word.kind==='action')||second||first||words.find(word=>object(word));
  const term=keyTerm?[keyTerm]:[];
  const pattern=model?{...model,form:patternForm(model.id)}:first?
   {form:'I can see + noun',en:detail.turn[0],ar:detail.turn[1]}:
   {form:'Could you + base verb …?',en:'Could you tell me what’s happening here?',ar:'هل يمكنك إخباري ماذا يحدث هنا؟'};
  const modelLine=pair(pattern.en,pattern.ar);
  const echo=keyTerm?step('repeat',variant%2?`Can you say it again? Say “${keyTerm.en}” slowly, please.`:
   `Say it again, then say “${keyTerm.en}” slowly, please.`,
   variant%2?`هل يمكنك قولها مرة أخرى؟ قل «${keyTerm.ar}» ببطء من فضلك.`:
    `قلها مجددًا ثم انطق «${keyTerm.ar}» ببطء من فضلك.`,variant%2?'can you say it again':'say it again',
   {terms:term,answer:level==='A1'?pair(sentence(keyTerm.en),sentence(keyTerm.ar)):
    pair(`${sentence(context[0])} ${sentence(keyTerm.en)}`,`${sentence(context[1])} ${sentence(keyTerm.ar)}`),turn:modelLine}):
   step('repeat',`Say it again slowly. Use the scene sentence for “${scene.en||clean(context[0])}”.`,
    `قلها مجددًا ببطء. استخدم جملة المشهد «${scene.ar||clean(context[1])}».`,'say it again',
    {answer:context,turn:context});
  const apply=step('pattern',variant%2?
   `Give me a short example like “${clean(pattern.en)}” for “${scene.en||clean(context[0])}”.`:
   `Let me try the pattern from “${clean(pattern.en)}” in a new sentence.`,
   variant%2?`أعطني مثالًا قصيرًا مثل «${clean(pattern.ar)}» في «${scene.ar||clean(context[1])}».`:
    `دعني أجرّب نمط «${clean(pattern.ar)}» في جملة جديدة.`,
   variant%2?'give me a short example':'let me try',{terms:term,model:pattern,answer:modelLine,turn:modelLine});
  const task=pair(scene.taskEn||scene.sentenceEn||context[0],scene.taskAr||scene.sentenceAr||context[1]);
  const invitation=first?pair(`What could you say about ${markerText(first)} here?`,`ماذا يمكنك أن تقول عن «${first.ar}» هنا؟`):context;
  const [roleEn,roleAr]=[
   [`Take the other role in “${scene.en||clean(context[0])}”. Say one line and wait for me.`,
    `قم بالدور الآخر في «${scene.ar||clean(context[1])}». قل جملة واحدة وانتظر ردّي.`],
   [`Take the other role in “${scene.en||clean(context[0])}”. Let me start, then reply to my line.`,
    `قم بالدور الآخر في «${scene.ar||clean(context[1])}». دعني أبدأ ثم أجب عن جملتي.`],
   [`Take the other role in “${scene.en||clean(context[0])}”. Give me a choice I can answer aloud.`,
    `قم بالدور الآخر في «${scene.ar||clean(context[1])}». اعرض عليّ خيارين لأجيب بصوتي.`]
  ][variant%3];
  const role=step('role',roleEn,roleAr,'take the other role',
   {terms:term,model:pattern,answer:starter?.[0]||invitation,turn:starter?.[1]||modelLine});
  const next=step('followup',first?
   `Ask me a follow-up about ${markerText(first)} using a detail from what I just said.`:
   `Ask me a follow-up about “${scene.en||clean(context[0])}” using something I just said.`,
   first?`اطرح عليّ سؤال متابعة عن «${first.ar}» اعتمادًا على تفصيل من ردّي.`:
    `اطرح عليّ سؤال متابعة عن «${scene.ar||clean(context[1])}» اعتمادًا على كلمة من ردّي.`,
   'ask me a follow-up',{terms:[first,second].filter(Boolean),answer:second?
    pair(`What about ${markerText(second)}?`,`وماذا عن «${second.ar}»؟`):context,
    turn:second?pair(`I can see ${markerText(second)} too.`,`أرى أيضًا «${second.ar}».`):modelLine});
  const delta=changes[scene.topic]||(keyTerm?
   [`يحتاج الطرف الآخر إلى توضيح «${keyTerm.ar}»`,`the other person asks about “${keyTerm.en}”`]:
   ['يطلب الطرف الآخر توضيحًا لنقطة من الجملة','the other person asks you to clarify one part of the line']);
  const change=step('change',`Change one detail for “${scene.en||clean(context[0])}”. This time, ${delta[1]}. Take the other role.`,
   `غيّر تفصيلًا واحدًا في «${scene.ar||clean(context[1])}». هذه المرة ${delta[0]}. قم بالدور الآخر.`,'change one detail',
   {terms:term,model:pattern,
    answer:pair(`Imagine that ${delta[1]}. What will you say now?`,`تخيّل هذا التغيير. ${delta[0]}. ماذا ستقول الآن؟`),
    turn:pair('Could we try something different?','هل يمكننا تجربة شيء مختلف؟'),hypothetical:true});
  const clue=keyTerm&&point(keyTerm)?
   pair(`Look ${position(keyTerm)[0]}. Think about that part of the scene.`,`انظر ${position(keyTerm)[1]}. فكّر في ذلك الجزء من المشهد.`):
   pair('Think of a useful word for this situation. You can ask me for another hint.','فكّر في كلمة مفيدة لهذا الموقف. يمكنك طلب تلميح آخر.');
  const recall=step('recall',keyTerm?
   `Give me a clue for “${keyTerm.en}” without saying the word itself. Then let me use it.`:
   `Give me a clue for a word in “${scene.en||clean(context[0])}”. Then let me use it.`,
   keyTerm?`أعطني تلميحًا لكلمة «${keyTerm.ar}» من دون نطقها. ثم دعني أستخدمها.`:
    `أعطني تلميحًا لكلمة في «${scene.ar||clean(context[1])}» ثم دعني أستخدمها.`,
   'give me a clue',{terms:term,answer:clue,turn:modelLine});
  const compare=step('compare',second?
   `How can you tell where ${markerText(first)} is in relation to ${markerText(second)}? Ask me to explain.`:
   `How can you tell what is happening in “${scene.en||clean(context[0])}”? Ask me for one reason.`,
   second?`كيف تعرف موضع «${first.ar}» بالنسبة إلى «${second.ar}»؟ اطلب منّي أن أشرح.`:
    `كيف تعرف ما يحدث في «${scene.ar||clean(context[1])}»؟ اطلب منّي ذكر سبب واحد.`,
   'how can you tell',{terms:visible.slice(0,2),answer:second?relation(first,second):context,turn:modelLine});
  const questions=level==='A1'?[detail,variant%2?apply:echo,role,variant%2?echo:apply,next]:
   level==='A2'?[detail,variant%2?role:apply,variant%2?apply:role,echo,next,change]:
   [detail,variant%2?apply:compare,role,variant%2?compare:apply,next,change,...(level==='B2'?[recall,echo]:[])];
  return {kind:'photo',pattern,context,task,terms:[...new Set([first,second,keyTerm].filter(Boolean))],questions};
 }

 function makeJourney({dialogue,life,stages,level},selection,role='male',patternForm=()=>null){
  const frames=stages.map((stage,i)=>{
   const picked=stage.scene.words.find((_,wordIndex)=>selection?.has(i+':'+wordIndex));
   const detail=picked||stage.scene.words.find(word=>point(word)&&object(word))||stage.scene.words[0];
   return {detail,stage,index:i};
  });
  const modelFor=(line)=>{
   const id=line?.patterns?.find(id=>patternForm(id));
   return id?{id,form:patternForm(id),en:line.en,ar:line.ar}:undefined;
  };
  let focusPattern;
  const questions=frames.map(({detail,stage,index})=>{
   const from=stage.from-1,to=stage.to-1,number=index+1;
   const turns=dialogue.lines.slice(from,to+1).map((line,i)=>({...line,index:from+i}));
   const partner=turns.find(line=>line.voice!==role);
   const own=turns.find(line=>line.voice===role&&line.index>(partner?.index??-1))||turns.find(line=>line.voice===role);
   const model=modelFor(own)||modelFor(partner);
   focusPattern??=model;
   const goal=pair(stage.purposeEn||stage.en,stage.purposeAr||stage.ar);
   const action=clean(goal[0]);
   const anchor=detail?` Use “${detail.en}” if it helps.`:'';
   const anchorAr=detail?` استفد من «${detail.ar}» إذا ناسب السياق.`:'';
   const prev=frames[index-1]?.detail;
   const bridge=prev&&index>0&&level!=='A1'?
    ` Carry “${prev.en}” forward from photo ${index}.`:'';
   const bridgeAr=bridge?` اربطها بتفصيل «${prev.ar}» من اللقطة ${index}.`:'';
   const invitation=detail?pair(`What would you say about “${detail.en}” here?`,`ماذا ستقول عن «${detail.ar}» هنا؟`):
    pair(`What would you say to ${action.charAt(0).toLowerCase()+action.slice(1)}?`,`ماذا ستقول لتحقيق هذا الهدف؟`);
   return step('role',
    `In photo ${number}, take the other role. Help me ${action.charAt(0).toLowerCase()+action.slice(1)}.${anchor}${bridge}`,
    `في اللقطة ${number}، قم بالدور الآخر. الهدف هو «${clean(goal[1])}».${anchorAr}${bridgeAr}`,
    'take the other role',{terms:detail?[detail]:[],model,frames:index?[index-1,index]:[0],
     answer:partner?pair(partner.en,partner.ar):invitation,turn:own?pair(own.en,own.ar):null,
     recordings:{answer:partner?.index,turn:own?.index},learnerStarts:Boolean(own&&partner&&own.index<partner.index),goal});
  });
  const last=frames.at(-1),first=frames[0];
  if(last&&first){
   const object=last.detail?` with “${last.detail.en}”`:'';
   const objectAr=last.detail?` مستعينًا بـ«${last.detail.ar}»`:'';
   questions.push(step('change',
    `Change one detail in the ending${object}. Go from photo 1 to photo ${frames.length}. Take the other role and wait for me.`,
    `غيّر تفصيلًا واحدًا في النهاية${objectAr}. انتقل من اللقطة 1 إلى اللقطة ${frames.length}. قم بالدور الآخر وانتظر ردّي.`,
    'change one detail',{frames:[0,last.index],terms:[first.detail,last.detail].filter(Boolean),model:focusPattern,
     answer:role==='male'?pair('Could we try a different option first?','هل يمكننا تجربة خيار آخر أولًا؟'):
      pair('All right. What would you suggest instead?','حسنًا. ماذا تقترح بدلًا من ذلك؟'),hypothetical:true}));
  }
  return {kind:'journey',context:pair(dialogue.en,dialogue.ar),task:pair(life.goalEn,life.goalAr),pattern:focusPattern,
   terms:frames.map(frame=>frame.detail).filter(Boolean),questions,frames,role,firstVoice:dialogue.lines[0].voice};
 }

 const api={make,makeJourney,phrases};
 if(typeof module!=='undefined')module.exports=api;
 else root.EPSceneGuide=api;
})(typeof window==='undefined'?globalThis:window);
