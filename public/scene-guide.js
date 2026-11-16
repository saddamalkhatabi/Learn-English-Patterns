(function(root){
 const phrases={
  'what can you see':'ماذا يمكنك أن ترى',
  'what else can you see':'ماذا ترى أيضًا',
  'can you say it again':'هل يمكنك قولها مرة أخرى',
  'can you give me an example':'هل يمكنك إعطائي مثالًا',
  'can i try':'هل يمكنني أن أجرّب',
  'can you point to':'هل يمكنك الإشارة إلى',
  'how can you tell':'كيف عرفت أو كيف يمكنك أن تعرف',
  'in relation to':'بالنسبة إلى أو مقارنةً بموقع',
  'how can i use':'كيف أستطيع استخدام',
  'in this situation':'في هذا الموقف',
  'make my own':'أكوّن واحدًا بنفسي',
  'what would you say if':'ماذا ستقول لو',
  'take the other role':'قم بالدور الآخر',
  'give me a clue':'أعطني تلميحًا',
  'without saying':'من دون أن تقول',
  'use it in a new sentence':'استخدمها في جملة جديدة'
 };
 const changes={
  food:['لم يتوفّر أحد المكوّنات','an ingredient was unavailable'],
  market:['نفد أحد الخيارات','one of the options was out of stock'],
  shopping:['نفد أحد الخيارات','one of the options was out of stock'],
  travel:['تغيّر موعد الانطلاق','the departure time changed'],
  journey:['تغيّر موعد الانطلاق','the departure time changed'],
  study:['احتاج شخص إلى توضيح التعليمات','someone needed the instructions clarified'],
  classroom:['احتاج شخص إلى توضيح التعليمات','someone needed the instructions clarified'],
  work:['لم يستطع الشخص الآخر إكمال مهمّته في الوقت المحدّد','the other person could not finish their part on time'],
  team:['لم يستطع الشخص الآخر إكمال مهمّته في الوقت المحدّد','the other person could not finish their part on time'],
  craft:['تعذّر استخدام إحدى الأدوات','one of the tools could not be used'],
  workshop:['تعذّر استخدام إحدى الأدوات','one of the tools could not be used'],
  events:['حضر أشخاص أكثر من المتوقّع','more people arrived than expected']
 };
 function make(scene,patternForm=()=>null,level='B2'){
  const located=scene.words.filter(word=>Number.isFinite(word.x)&&Number.isFinite(word.y)&&
   (word.kind==='object'||['NOUN','PROPN'].includes(word.pos))&&word.ar);
  const [first,second]=located;
  const reuse=scene.words.find(word=>(word.kind==='action'||word.kind==='phrase')&&word.ar)||first;
  if(level==='A1'){
   const answer=first?['I can see the '+first.en+'.','أرى '+first.ar+'.']:['I can see the picture.','أرى الصورة.'];
   const example=second?['I can also see the '+second.en+'.','أرى أيضًا '+second.ar+'.']:answer;
   const questions=[
    {en:'What can you see?',ar:'ماذا ترى؟',phrase:'what can you see',terms:first?[first]:[],answer},
    {en:'Can you say it again, please?',ar:'هل تعيد قولها من فضلك؟',phrase:'can you say it again',terms:[],answer},
    second?{en:'What else can you see?',ar:'ماذا ترى أيضًا؟',phrase:'what else can you see',terms:[second],answer:example}:
     {en:'Can you give me an example?',ar:'هل تعطيني مثالًا؟',phrase:'can you give me an example',terms:[],answer:example}
   ];
   return {questions,terms:located.slice(0,2)};
  }
  const model=scene.patterns?.find(pattern=>pattern.en&&pattern.ar&&patternForm(pattern.id));
  const pattern=model?{...model,form:patternForm(model.id)}:{
   form:'Could you + base verb …?',
   en:'Could you tell me what is happening here?',
   ar:'هل يمكنك أن تخبرني ماذا يحدث هنا؟'
  };
  const [changeAr,changeEn]=changes[scene.topic]||['احتاج الشخص الآخر إلى تفصيل إضافي قبل أن يجيب','the other person needed one more detail before replying'];
  if(level==='A2'){
   const questions=[
    {en:'What can you see?',ar:'ماذا ترى؟',phrase:'what can you see',terms:first?[first]:[],
     answer:first?['I can see the '+first.en+'.','أرى '+first.ar+'.']:['I can see the picture.','أرى الصورة.']},
    {en:'Can you give me an example?',ar:'هل تعطيني مثالًا؟',phrase:'can you give me an example',
     model:pattern,terms:reuse?[reuse]:[],answer:[pattern.en,pattern.ar]},
    {en:'Can I try a new sentence?',ar:'هل أستطيع تجربة جملة جديدة؟',phrase:'can i try',terms:[],answer:['Yes. Try one short sentence.','نعم، جرّب جملة قصيرة واحدة.']}
   ];
   return {pattern,questions,terms:[first,reuse].filter(Boolean)};
  }
  const questions=[
   first?{
    en:`Can you point to “${first.en}” in the picture and ask me to describe where it is?`,
    ar:`هل يمكنك الإشارة إلى «${first.ar}» في الصورة وتطلب منّي وصف مكانه؟`,
    phrase:'can you point to',terms:[first]
   }:{
    en:'Can you point to a clear detail in the picture and ask me to describe it?',
    ar:'هل يمكنك الإشارة إلى تفصيل واضح في الصورة وتطلب منّي وصفه؟',
    phrase:'can you point to',terms:[]
   },
   second?{
    en:`Where is “${second.en}” in relation to “${first.en}”? Ask me to explain using one detail I can see.`,
    ar:`أين يظهر «${second.ar}» بالنسبة إلى «${first.ar}»؟ اطلب منّي توضيح ذلك بتفصيل أراه.`,
    phrase:'in relation to',terms:[first,second]
   }:{
    en:'How can you tell what is happening? Ask me to explain using one detail I can see.',
    ar:'كيف يمكنك معرفة ما يحدث؟ اطلب منّي توضيح ذلك بتفصيل أراه.',
    phrase:'how can you tell',terms:[]
   },
   {
    en:'How can I use the pattern in this situation? Give me a different example, then ask me to make my own.',
    ar:'كيف أستطيع استخدام هذا التركيب في هذا الموقف؟ أعطني مثالًا مختلفًا، ثم اطلب منّي تكوين مثال بنفسي.',
    phrase:'how can i use',model:pattern,terms:reuse?[reuse]:[]
   },
   {
    en:`What would you say if ${changeEn}? Take the other role and wait for my answer.`,
    ar:`ماذا ستقول لو ${changeAr}؟ قم بالدور الآخر وانتظر ردّي.`,
    phrase:'what would you say if',model:pattern,terms:reuse?[reuse]:[]
   },
   reuse?{
    en:`Could you give me a clue without saying “${reuse.en}”, then ask me to use it in a new sentence?`,
    ar:`هل تعطيني تلميحًا من دون أن تقول «${reuse.ar}»، ثم تطلب منّي استخدامها في جملة جديدة؟`,
    phrase:'give me a clue',terms:[reuse]
   }:{
    en:'Could you give me a clue for a useful word in this scene and ask me to use it in a new sentence?',
    ar:'هل تعطيني تلميحًا لكلمة مفيدة في هذا المشهد وتطلب منّي استخدامها في جملة جديدة؟',
    phrase:'give me a clue',terms:[]
   }
  ];
  return {pattern,questions:level==='B1'?questions.slice(0,4):questions,terms:[...new Set([first,second,reuse].filter(Boolean))]};
 }
 if(typeof module!=='undefined')module.exports={make,phrases};
 else root.EPSceneGuide={make,phrases};
})(typeof window==='undefined'?globalThis:window);
