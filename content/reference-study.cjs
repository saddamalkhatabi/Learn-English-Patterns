const cambridgeGrammar='https://dictionary.cambridge.org/uk/grammar/british-grammar/british-english-and-american-english';
const cambridgeWord=word=>'https://dictionary.cambridge.org/dictionary/english/'+word;

// Each example is an original line. Regional pairs illustrate the same communicative task.
const families=[
 {
  id:'offer',constructions:['offer-invitation'],cue:/^would you like\b/i,
  comparison:['Would you like تعرِض شيئًا أو تدعو إلى فعل. Do you like تسأل عن تفضيل عام.',
   'Would you like offers something or invites an action. Do you like asks about a general preference.'],
  caution:['يمكن وضع اسم بعد like. إذا عرضت فعلًا فاستعمل to ثم الفعل الأساسي.',
   'Use a noun to offer something. To invite an action, follow like with to and the base verb.'],
  examples:[
   {key:'water',en:'Would you like some sparkling water?',ar:'هل ترغب في بعض الماء الفوّار؟'},
   {key:'join',en:'Would you like to join us for lunch?',ar:'هل تودّ الانضمام إلينا لتناول الغداء؟'},
   {key:'shop',en:'Would you like a shopping cart?',uk:'Would you like a shopping trolley?',ar:'هل ترغب في عربة تسوّق؟',
    source:cambridgeWord('shopping-trolley')}
  ]
 },
 {
  id:'permission',constructions:['polite-request'],include:['service'],cue:/^(?:(?:can|could|may) (?:i|we)|would you mind if|(?:is it|would it be) (?:okay|all right) if)\b/i,
  comparison:['Can I borrow…? استئذان من المتكلّم. Could you lend me…? طلب فعلٍ من المخاطَب.',
   'Can I borrow…? asks permission for the speaker. Could you lend me…? asks the listener to do something.'],
  caution:['في Would you mind if I…? يكون الفعل لك. ردّ Not at all يعني أن الطرف الآخر لا يمانع. كما تُستعمل Could I have…? لطلب شيء في المتجر أو المطعم.',
   'In Would you mind if I…?, the speaker acts. Not at all means the other person has no objection. Could I have…? can also request an item in a shop or restaurant.'],
  examples:[
   {key:'seat',en:'Could I sit here while I wait?',ar:'هل يمكنني الجلوس هنا ريثما أنتظر؟'},
   {key:'window',en:'Would you mind if I opened the window?',ar:'هل تمانع إذا فتحت النافذة؟'}
  ]
 },
 {
  id:'polite-request',constructions:['polite-request','yes-no-question'],
  cue:/^(?:(?:can|could|would|will) you (?:please|open|close|tell|help|drive|show|give|lend|wait|pass|bring|move|send|call)|would you mind \w+ing)\b/i,
  comparison:['Could you open…? يأخذ الفعل الأساسي. Would you mind opening…? يأخذ فعلًا بصيغة ‎-ing.',
   'Use the base verb in Could you open…? and an -ing form in Would you mind opening…?'],
  examples:[
   {key:'recipe',en:'Could you send me the recipe?',ar:'هل يمكنك إرسال الوصفة إليّ؟'},
   {key:'repeat',en:'Could you say that again, a little slower?',ar:'هل يمكنك قول ذلك مرة أخرى ببطء أكثر؟'},
   {key:'door',en:'Would you mind holding the door for me?',ar:'هل تمانع أن تمسك الباب لي؟'}
  ]
 },
 {
  id:'service',constructions:['polite-request'],anchor:'ref-0020',cue:/^(?:can|could|may) (?:i|we) (?:have|get)\b/i,
  comparison:['Can I get…? وCould I have…? طريقتان لطلب شيء في المتجر أو المطعم. يبيّن الاسم بعدهما ما تريد.',
   'Can I get…? and Could I have…? both work for ordering or requesting something. Name the item after the opening.'],
  examples:[
   {key:'check',en:'Can I get the check, please? We’re ready to go.',uk:'Could I have the bill, please? We’re ready to go.',
    ar:'هل يمكنني الحصول على الفاتورة، من فضلك؟ نحن مستعدون للمغادرة.',source:cambridgeWord('bill')},
   {key:'return',en:'Could I have a round-trip ticket to the city?',uk:'Could I have a return ticket to the city?',
    ar:'هل يمكنني الحصول على تذكرة ذهاب وإياب إلى المدينة؟',source:cambridgeWord('round-trip-ticket')},
   {key:'single',en:'Could I have a one-way ticket to the airport?',uk:'Could I have a single ticket to the airport?',
    ar:'هل يمكنني الحصول على تذكرة ذهاب فقط إلى المطار؟',source:cambridgeWord('one-way-ticket')}
  ]
 },
 {
  id:'possession',constructions:['possession','yes-no-question'],cue:/\b(?:have|has|had)\b|['’](?:ve|s) got\b|^have you got\b/i,
  comparison:['Have مع اسم تعبّر عن شيء تملكه أو علاقة لديك. Have got شائعة في الحديث البريطاني، وhave وحدها شائعة في الحديث الأمريكي.',
   'Have with a noun can describe possessions or relationships. Spoken British English often uses have got, and spoken American English often uses have.'],
  caution:['في الماضي استخدم had للملكية. وhave to مع فعل تعبّر عن ضرورة.',
   'Use had for past possession. Have to followed by a verb expresses necessity.'],
  examples:[
   {key:'flat',en:'I have a small apartment near the station.',uk:'I’ve got a small flat near the station.',
    ar:'لديّ شقة صغيرة قرب المحطة.',source:cambridgeGrammar,
    pair:['have-possession','construction','I have','I’ve got','لديّ','PHRASE']},
   {key:'charger',en:'Do you have a spare charger?',uk:'Have you got a spare charger?',
    ar:'هل لديك شاحن احتياطي؟',source:cambridgeGrammar,
    pair:['have-possession','construction','Do you have','Have you got','هل لديك؟','PHRASE']},
   {key:'room',en:'We have enough room for one more chair.',uk:'We’ve got enough room for one more chair.',
    ar:'لدينا مساحة كافية لكرسي إضافي.',source:cambridgeGrammar,
    pair:['have-possession','construction','We have','We’ve got','لدينا','PHRASE']}
  ]
 },
 {
  id:'obligation',constructions:['obligation'],cue:/\b(?:have|has|had) to\b|\bgot to\b/i,
  comparison:['Have to تبيّن ما يلزم فعله. Need to تبرز الحاجة وقد تكون قوة الطلب متقاربة بحسب السياق.',
   'Have to presents a requirement. Need to emphasizes a need and can be just as strong in context.'],
  caution:['للماضي استخدم had to. في النفي، don’t have to تعني أن الفعل اختياري.',
   'Use had to in the past. In the negative, don’t have to makes the action optional.'],
  examples:[
   {key:'book',en:'We have to book a table before Friday.',uk:'We’ve got to book a table before Friday.',
    ar:'علينا حجز طاولة قبل يوم الجمعة.',source:cambridgeGrammar,
    pair:['have-got-to','construction','We have to','We’ve got to','علينا أن','PHRASE']},
   {key:'line',en:'You have to stand in line for tickets.',uk:'You’ve got to queue for tickets.',
    ar:'عليك الوقوف في الطابور للحصول على التذاكر.',source:cambridgeWord('queue'),
    pair:['queue','vocabulary','stand in line','queue','يقف في الطابور','PHRASE']},
   {key:'charge',en:'I had to charge my phone before leaving.',ar:'اضطررت إلى شحن هاتفي قبل المغادرة.'}
  ]
 },
 {
  id:'optional',constructions:['lack-necessity'],
  comparison:['Don’t have to تترك الخيار مفتوحًا. Mustn’t تدل على المنع.',
   'Don’t have to leaves the choice open. Mustn’t expresses a prohibition.'],
  caution:['مع he أو she نستخدم doesn’t have to. يبقى have بصيغته الأساسية بعد doesn’t.',
   'Use doesn’t have to with he or she. Have stays in the base form after doesn’t.'],
  examples:[
   {key:'reserve',en:'You don’t have to reserve a seat.',ar:'لست مضطرًا إلى حجز مقعد.'},
   {key:'print',en:'She doesn’t need to print the receipt.',ar:'لا تحتاج إلى طباعة الإيصال.'},
   {key:'rush',en:'There’s no need to rush.',ar:'لا داعي للاستعجال.'}
  ]
 },
 {
  id:'past-habit',constructions:['past-habit'],
  comparison:['Used to + فعل أساسي تصف عادة أو حالة في الماضي. Be used to + اسم أو ‎-ing تصف الاعتياد.',
   'Used to + base verb describes a past habit or state. Be used to + noun or -ing describes familiarity.'],
  caution:['بعد did أو didn’t في السؤال أو النفي، الصيغة القياسية use to.',
   'After did or didn’t in questions or negatives, the standard spelling is use to.'],
  examples:[
   {key:'library',en:'I used to study at the library on weekends.',uk:'I used to study at the library at weekends.',
    ar:'كنت أدرس في المكتبة في عطلات نهاية الأسبوع.',source:cambridgeGrammar},
   {key:'walk',en:'We used to walk home together.',ar:'كنا نعود إلى المنزل مشيًا معًا.'},
   {key:'dark',en:'I didn’t use to drive after dark.',ar:'لم أكن أعتاد القيادة بعد حلول الظلام.'}
  ]
 },
 {
  id:'accustomed',constructions:['accustomed'],
  comparison:['Be used to تصف حالة الاعتياد. Get used to تصف التأقلم تدريجيًا.',
   'Be used to describes being familiar with something. Get used to describes becoming familiar with it.'],
  caution:['To هنا حرف جر. يمكن أن يتبعه اسم، أو ضمير، أو فعل بصيغة ‎-ing.',
   'To is a preposition here. Follow it with a noun, a pronoun, or an -ing form.'],
  examples:[
   {key:'noise',en:'I’m used to the noise near the station.',ar:'أنا معتاد على الضجيج قرب المحطة.'},
   {key:'early',en:'She’s getting used to waking up early.',ar:'إنها تعتاد تدريجيًا على الاستيقاظ مبكرًا.'},
   {key:'commute',en:'It took me a month to get used to the commute.',ar:'استغرقت شهرًا لأعتاد التنقّل اليومي.'}
  ]
 },
 {
  id:'desire',constructions:['infinitive','statement'],cue:/\bwant(?:s|ed)? to\b|(?:\bwould|['’]d) like to\b/i,
  comparison:['Want to تعبر عن رغبة مباشرة. Would like to ألطف عند التعبير عن رغبتك أمام شخص آخر.',
   'Want to states a desire directly. Would like to is softer when expressing a wish to someone else.'],
  caution:['تأتي صيغة الفعل الأساسية بعد to. يتغيّر want إلى wants مع he أو she.',
   'Use the base verb after to. Want becomes wants with he or she.'],
  examples:[
   {key:'apply',en:'I’d like to apply for the position.',ar:'أودّ التقدّم للوظيفة.'},
   {key:'practice',en:'She wants to practice speaking before the interview.',uk:'She wants to practise speaking before the interview.',
    ar:'تريد أن تتدرّب على التحدث قبل المقابلة.',source:cambridgeWord('practise')}
  ]
 },
 {
  id:'directions',constructions:['indirect-question','polite-request','wh-question'],cue:/^(?:(?:do you know|could you tell me|can you (?:tell|show) me) (?:where|how)|where (?:is|are|can))\b/i,
  comparison:['في السؤال المباشر نقول Where is it? وداخل السؤال الأطول نقول Do you know where it is?',
   'Ask Where is it? directly. In the longer question, use Do you know where it is?'],
  caution:['تأتي is بعد الفاعل في الجزء الداخلي. إن كانت كلمة السؤال هي الفاعل، يكفي أن يتبعها الفعل.',
   'Put is after the subject in the embedded clause. When the question word is itself the subject, the verb can follow it directly.'],
  examples:[
   {key:'lift',en:'Do you know where the elevator is?',uk:'Do you know where the lift is?',ar:'هل تعرف أين المصعد؟',
    source:cambridgeWord('elevator')},
   {key:'sidewalk',en:'Could you tell me where the sidewalk ends?',uk:'Could you tell me where the pavement ends?',
    ar:'هل يمكنك إخباري أين ينتهي رصيف المشاة؟',source:cambridgeWord('sidewalk')},
   {key:'entrance',en:'Do you know how to get to the main entrance?',ar:'هل تعرف كيف أصل إلى المدخل الرئيسي؟'}
  ]
 },
 {
  id:'impression',constructions:['perception'],cue:/\b(?:look|looks|looked|sound|sounds|sounded|seem|seems|seemed)\b/i,
  comparison:['تأتي الصفة مباشرة في You sound tired. وتأتي like في You sound like your sister عندما تصف الشبه.',
   'Use an adjective directly in You sound tired. Use like in You sound like your sister to describe a resemblance.'],
  examples:[
   {key:'fresh',en:'The bread looks fresh.',ar:'يبدو الخبز طازجًا.'},
   {key:'idea',en:'That sounds like a good idea.',ar:'يبدو ذلك فكرةً جيدة.'},
   {key:'busy',en:'The shop looks busy this morning.',ar:'يبدو المتجر مزدحمًا هذا الصباح.'}
  ]
 },
 {
  id:'time-clause',constructions:['time-connection'],cue:/\bas soon as\b/i,
  comparison:['As soon as تعني فور حدوث الفعل. Until تعني استمرار شيء حتى نقطة زمنية.',
   'As soon as places one action immediately after another. Until marks the endpoint of a continuing action.'],
  caution:['إذا كان الحدث مستقبليًا، نستخدم عادةً المضارع بعد as soon as، مثل as soon as I arrive.',
   'For a future event, normally use the present form after as soon as, as in as soon as I arrive.'],
  examples:[
   {key:'call',en:'I’ll call you as soon as I get home.',ar:'سأتصل بك حالما أصل إلى البيت.'},
   {key:'rain',en:'We left as soon as the rain stopped.',ar:'غادرنا فور توقف المطر.'}
  ]
 },
 {
  id:'recent-event',constructions:['perfect','yes-no-question','future-intention'],cue:/\b(?:already|yet|just)\b/i,
  comparison:['مع already وyet، يُسمع الماضي البسيط كثيرًا في الأمريكية. ويشيع المضارع التام في البريطانية في سياقات النتيجة الحالية.',
   'With already and yet, the simple past is often heard in American English. The present perfect is common in British English when the result matters now.'],
  caution:['عند ذكر وقت ماضٍ انتهى مثل yesterday، استخدم الماضي البسيط في هذا البناء.',
   'Use the simple past in this construction when you give a finished past time such as yesterday.'],
  examples:[
   {key:'send',en:'Did you send the form yet?',uk:'Have you sent the form yet?',ar:'هل أرسلت الاستمارة حتى الآن؟',source:cambridgeGrammar,
    pair:['recent-yet','construction','Did you send','Have you sent','هل أرسلت حتى الآن؟','PHRASE']},
   {key:'book',en:'I already booked the appointment.',uk:'I’ve already booked the appointment.',ar:'لقد حجزت الموعد بالفعل.',
    source:cambridgeGrammar,pair:['recent-already','construction','I already booked','I’ve already booked','لقد حجزت بالفعل','PHRASE']}
  ]
 },
 {
  id:'question-tag',constructions:['imperative'],cue:/, will you\?$/i,
  comparison:['قد تلطف will you الطلب بصوت هادئ. وقد تُظهر نفاد الصبر إذا قيلت بحدّة.',
   'A gentle will you can soften the request. A sharp tone can sound impatient.'],
  caution:['صيغة Could you…? خيار عملي لطلب مهذب من شخص لا تعرفه.',
   'Could you…? is a useful polite option when speaking to someone you do not know.'],
  examples:[
   {key:'keys',en:'Leave the keys on the counter, will you?',ar:'اترك المفاتيح على سطح المطبخ، حسنًا؟'},
   {key:'lights',en:'Turn off the lights before you leave, will you?',ar:'أطفئ الأضواء قبل أن تغادر، حسنًا؟'}
  ]
 },
 {
  id:'cause',constructions:['reason-result'],cue:/\bbecause\b/i,
  comparison:['بعد because تأتي جملة، مثل because it was raining. وبعد because of يأتي اسم أو عبارة اسمية، مثل because of the rain.',
   'Because takes a clause, as in because it was raining. Because of takes a noun phrase, as in because of the rain.'],
  examples:[
   {key:'delay',en:'We left early because the roads were icy.',ar:'غادرنا مبكرًا لأن الطرق كانت مغطاة بالجليد.'},
   {key:'fog',en:'The flight was delayed because of thick fog.',ar:'تأخرت الرحلة بسبب ضباب كثيف.'}
  ]
 },
 {
  id:'reported-question',constructions:['reported-question'],
  comparison:['انقل سؤال نعم أو لا بـ if أو whether. وعند نقل سؤال عن معلومة، احتفظ بكلمة السؤال مثل where أو why.',
   'Use if or whether to report a yes/no question. Keep the question word, such as where or why, when reporting an information question.'],
  caution:['رتّب الجملة المنقولة ترتيب الخبر. وتناسب whether عبارة or not إذا جاءت بعدها مباشرة.',
   'Use statement word order in the reported clause. Use whether if or not comes immediately after the connector.'],
  examples:[
   {key:'open',en:'She asked whether or not the pharmacy was open.',ar:'سألت هل كانت الصيدلية مفتوحة أم لا.'},
   {key:'keys',en:'He asked where I had left the keys.',ar:'سألني أين تركت المفاتيح.'}
  ]
 },
 {
  id:'stop-ing',constructions:['gerund'],cue:/\bstop(?:ped|s)? \w+ing\b/i,
  comparison:['Stop talking تعني التوقف عن الكلام. Stop to talk تعني التوقف عن فعل آخر من أجل الكلام.',
   'Stop talking means to stop speaking. Stop to talk means to pause another activity in order to speak.'],
  examples:[
   {key:'rain',en:'It stopped raining just before lunch.',ar:'توقف المطر قبيل الغداء.'},
   {key:'desk',en:'Please stop tapping on the desk.',ar:'أرجوك توقف عن النقر على المكتب.'}
  ]
 },
 {
  id:'up-all-night',constructions:['statement'],cue:/\bup all night\b/i,
  comparison:['Be up تعني أن تكون مستيقظًا في هذا السياق. Get up يصف لحظة النهوض من السرير.',
   'Be up means to be awake here. Get up describes leaving the bed.'],
  examples:[
   {key:'baby',en:'We were up all night with the baby.',ar:'ظلِلنا مستيقظين طوال الليل مع الطفل.'},
   {key:'flight',en:'I was up all night waiting for my flight.',ar:'بقيت مستيقظًا طوال الليل أنتظر رحلتي.'}
  ]
 }
];

module.exports=families;
