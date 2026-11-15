(function(root){
 const phrases={
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
 function make(scene,patternForm=()=>null){
  const located=scene.words.filter(word=>Number.isFinite(word.x)&&Number.isFinite(word.y)&&
   (word.kind==='object'||['NOUN','PROPN'].includes(word.pos))&&word.ar);
  const [first,second]=located;
  const reuse=scene.words.find(word=>(word.kind==='action'||word.kind==='phrase')&&word.ar)||first;
  const model=scene.patterns?.find(pattern=>pattern.en&&pattern.ar&&patternForm(pattern.id));
  const pattern=model?{...model,form:patternForm(model.id)}:{
   form:'Could you + base verb …?',
   en:'Could you tell me what is happening here?',
   ar:'هل يمكنك أن تخبرني ماذا يحدث هنا؟'
  };
  const [changeAr,changeEn]=changes[scene.topic]||['احتاج الشخص الآخر إلى تفصيل إضافي قبل أن يجيب','the other person needed one more detail before replying'];
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
  return {pattern,questions,terms:[...new Set([first,second,reuse].filter(Boolean))]};
 }
 if(typeof module!=='undefined')module.exports={make,phrases};
 else root.EPSceneGuide={make,phrases};
})(typeof window==='undefined'?globalThis:window);
