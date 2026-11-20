# تجربة تعلّم الأنماط بالأغاني

تضم الحزمة 18 مهمة توليد في Gemini. كل ملف نصي جاهز للنسخ ويضم وصف اللحن والكلمات كاملة بالإنجليزية. لكل نمط سطر يذكّر باستخدامه، ثم مثال من المنهج على الجملة التي نريد أن تبقى في الذاكرة. بين المقاطع لازمة قصيرة تتكرر بالنغمة نفسها.

اتبعت ترتيب `patternOrder` ومستويات الأنماط في `public/learning-levels.json`. أخذت الصيغ والأمثلة والترجمات من `public/pilot.json` و`public/expansion-media.json`، واخترت أمثلة مصنّفة في مستوى الأغنية نفسه. يضم كل مسار 8 إلى 12 نمطًا للمحافظة على أغنية من مستوى واحد وترك الصيغ المتقاربة معًا.

## التوليد في Gemini

1. افتح Gemini، وبدّل النموذج إلى **Pro**، ثم اختر **إنشاء موسيقى** من الأدوات وحدّد **Full** ومقطعًا **بغناء**. يصف دليل Google هذا الخيار بأنه يدوم نحو دقيقتين إلى ثلاث دقائق. تستهدف المهام هنا نحو دقيقتين إلى دقيقتين ونصف مع إعطاء الكلمات وقتها. [مساعدة Gemini على الكمبيوتر](https://support.google.com/gemini/answer/16901237?co=GENIE.Platform%3DDesktop&hl=ar)
2. انسخ محتويات ملف الأغنية كاملًا في طلب واحد. تبدأ الكلمات تحت `Lyrics:` وفق صيغة دليل Lyria. يحدد كل ملف الإيقاع والآلات وطريقة أداء الكلمات. [دليل Google DeepMind لكتابة طلبات Lyria](https://deepmind.google/models/lyria/prompt-guide/)
3. نزّل النتيجة بصيغة **MP3** واحفظها باسم ملف المهمة نفسه مع استبدال `.txt` بـ `.mp3`. تعمل هذه التسمية على مطابقة التسجيل بالنص عند المراجعة. [خيارات التنزيل وحدود التوليد في Gemini](https://support.google.com/gemini/answer/16901237?co=GENIE.Platform%3DDesktop&hl=ar)

عند مراجعة التجربة، نسمع هل ظهرت الأمثلة كلها بترتيبها، وهل بقي النطق واضحًا، خصوصًا في الاختصارات والنفي. ثم نجرّب ترديد جملتين من كل أغنية بعد الاستماع. الجداول أدناه مرجع لمطابقة الجمل المسموعة.

## فهرس الأغاني

| رقم | المستوى | الأغنية | الموضوع | الأنماط |
| --- | --- | --- | --- | --- |
| 01 | A1 | [Hello, What's Your Name?](EP-SONG-01-A1-hello-whats-your-name.txt) | التعارف وما حولنا | 10 |
| 02 | A1 | [Please, Can You Help?](EP-SONG-02-A1-please-can-you-help.txt) | الطلب بأدب والسؤال عمّا يوجد | 11 |
| 03 | A1 | [What Do You Need?](EP-SONG-03-A1-what-do-you-need.txt) | الكمية والاحتياج والرغبة والقدرة | 10 |
| 04 | A1 | [Let's Start the Day](EP-SONG-04-A1-lets-start-the-day.txt) | الدعوة والأسئلة وبداية اليوم | 10 |
| 05 | A1 | [Every Day, My Way](EP-SONG-05-A1-every-day-my-way.txt) | العادات اليومية وتكرارها | 11 |
| 06 | A2 | [Choices for Today](EP-SONG-06-A2-choices-for-today.txt) | الاحتياج والواجب والنصيحة والإذن | 10 |
| 07 | A2 | [Come and Join Us](EP-SONG-07-A2-come-and-join-us.txt) | الدعوة واللباقة وأسئلة الروتين | 11 |
| 08 | A2 | [Questions Along the Way](EP-SONG-08-A2-questions-along-the-way.txt) | كيف ولماذا والاختيار وتسلسل الأحداث | 10 |
| 09 | A2 | [Pages from Yesterday](EP-SONG-09-A2-pages-from-yesterday.txt) | سرد الماضي والقرارات والبدايات | 11 |
| 10 | A2 | [Tomorrow on My Mind](EP-SONG-10-A2-tomorrow-on-my-mind.txt) | الوعود والخطط والمواعيد والاحتمال | 11 |
| 11 | A2 | [How I Feel and Why](EP-SONG-11-A2-how-i-feel-and-why.txt) | المشاعر والآراء والسبب والغاية | 12 |
| 12 | B1 | [When the Moment Comes](EP-SONG-12-B1-when-the-moment-comes.txt) | الذكريات والتوقع والتصرف في المستقبل | 11 |
| 13 | B1 | [What We Feel, What We Choose](EP-SONG-13-B1-what-we-feel-what-we-choose.txt) | المشاعر والمواقف والتفضيل | 9 |
| 14 | B1 | [Hear Me Out](EP-SONG-14-B1-hear-me-out.txt) | الانطباع والطلب المهذب والتوضيح | 8 |
| 15 | B1 | [Join the Lines](EP-SONG-15-B1-join-the-lines.txt) | ربط السبب والغاية والتباين والأمثلة | 9 |
| 16 | B1 | [I Wonder Where](EP-SONG-16-B1-i-wonder-where.txt) | السبب والأسئلة غير المباشرة والوصف | 9 |
| 17 | B2 | [Even If the Sky Turns Gray](EP-SONG-17-B2-even-if-the-sky-turns-gray.txt) | المقابلة والإضافة والشرط والأولوية | 8 |
| 18 | B2 | [The Things We Could Have Done](EP-SONG-18-B2-the-things-we-could-have-done.txt) | الذكريات والتمني والافتراض والماضي الأسبق | 9 |

## الكلمات المرجعية ومعرّفات الأنماط

### 01 — A1 — Hello, What's Your Name?

[EP-SONG-01-A1-hello-whats-your-name.txt](EP-SONG-01-A1-hello-whats-your-name.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 113 | My name is + name | My name is Ali. | اسمي علي. |
| 114 | What's + possessive + name? | What's your name? | ما اسمك؟ |
| 103 | I am / I'm + adjective, noun or place | I'm a student. | أنا طالب. |
| 5 | This is + noun | This is my house. | هذا منزلي. |
| 102 | That is + singular noun | That is my house. | ذلك منزلي. |
| 104 | It is / It's + complement | It is cold. | الجو بارد. |
| 9053 | What is + singular noun / this / that? | What is this word? | ما هذه الكلمة؟ |
| 9055 | Who is + person? | Who is at the door? | من عند الباب؟ |
| 105 | I have + noun | I have two books. | لدي كتابان. |
| 107 | I want + noun | I want some water. | أريد بعض الماء. |

### 02 — A1 — Please, Can You Help?

[EP-SONG-02-A1-please-can-you-help.txt](EP-SONG-02-A1-please-can-you-help.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 109 | I'd like + noun | I'd like a sandwich. | أود شطيرة. |
| 4 | Can I + verb? | Can I sit here? | هل يمكنني الجلوس هنا؟ |
| 9050 | Please + base verb / base verb ..., please / Could you + base verb ..., please? | Speak slowly, please. | من فضلك تحدث ببطء. |
| 9037 | Can you + base verb + ... ? | Can you open the window? | هل يمكنك فتح النافذة؟ |
| 9125 | Excuse me + request or polite interruption | Excuse me, where is the library? | عذرًا، أين المكتبة؟ |
| 9054 | Where is + singular person / thing? | Where is the bus stop? | أين موقف الحافلة؟ |
| 117 | There is + singular or uncountable noun | There is a book on the table. | يوجد كتاب على الطاولة. |
| 116 | These are + plural noun | These are my books. | هذه كتبي. |
| 118 | There are + plural noun | There are three chairs here. | توجد ثلاثة كراسٍ هنا. |
| 9066 | Is there + singular / uncountable noun...? | Is there a book on the table? | هل يوجد كتاب على الطاولة؟ |
| 9067 | Are there + plural noun...? | Are there any seats available? | هل توجد مقاعد شاغرة؟ |

### 03 — A1 — What Do You Need?

[EP-SONG-03-A1-what-do-you-need.txt](EP-SONG-03-A1-what-do-you-need.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9069 | How much + uncountable noun...? / How much + be ...? / How much + do/does ... cost? | How much water do you need? | كم ماءً تحتاج؟ |
| 9068 | How many + countable plural noun...? | How many apples do you want? | كم تفاحة تريد؟ |
| 9041 | I need + noun | I need a pencil. | أحتاج قلم رصاص. |
| 1 | I want to + verb | I want to learn English. | أريد تعلّم الإنجليزية. |
| 3 | I'd like to + verb | I'd like to order lunch. | أود طلب الغداء. |
| 9135 | You're welcome + optional friendly reply | You're welcome. I'm happy to help. | على الرحب والسعة. يسعدني المساعدة. |
| 111 | I like + noun or verb-ing | I like reading. | أحب القراءة. |
| 112 | I don't like + noun or verb-ing | I don't like cold weather. | لا أحب الطقس البارد. |
| 9035 | I can + base verb | I can ride a bike. | أستطيع ركوب الدراجة. |
| 9036 | I can't + base verb | I can't hear you clearly. | لا أستطيع سماعك بوضوح. |

### 04 — A1 — Let's Start the Day

[EP-SONG-04-A1-lets-start-the-day.txt](EP-SONG-04-A1-lets-start-the-day.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 6 | Let's + verb | Let's go to the park. | هيا نذهب إلى الحديقة. |
| 9051 | Would you like + noun ... ? | Would you like some tea? | هل ترغب في بعض الشاي؟ |
| 9056 | When is + event / singular subject? | When is your birthday? | متى عيد ميلادك؟ |
| 9058 | How is + person / thing? | How is the weather today? | كيف الطقس اليوم؟ |
| 9064 | Do you + base verb...? | Do you like apples? | هل تحب التفاح؟ |
| 9022 | I go to + مكان | I go to work by bus. | أذهب إلى العمل بالحافلة. |
| 9017 | I wake up + optional time / cause / circumstance | I wake up at six. | أستيقظ الساعة السادسة. |
| 9018 | I get up + optional time / purpose / circumstance | I get up at six thirty. | أنهض من السرير الساعة السادسة والنصف. |
| 9019 | In the morning + جملة / I + فعل + in the morning | In the morning, I drink water. | في الصباح أشرب الماء. |
| 9020 | I brush my teeth + optional time / duration / method | I brush my teeth every morning. | أنظف أسناني كل صباح. |

### 05 — A1 — Every Day, My Way

[EP-SONG-05-A1-every-day-my-way.txt](EP-SONG-05-A1-every-day-my-way.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9021 | I have breakfast + optional time / place / company | I have breakfast at seven. | أتناول الإفطار الساعة السابعة. |
| 9028 | I eat + food / meal + optional time / place / circumstance | I eat an apple after school. | آكل تفاحة بعد المدرسة. |
| 9031 | I + فعل بالمضارع البسيط + every day | I practice English every day. | أمارس الإنجليزية كل يوم. |
| 9032 | subject + verb + at night / At night, + clause | At night, I read a short story. | ليلًا أقرأ قصة قصيرة. |
| 9033 | I go to bed + optional time / circumstance | I go to bed at nine. | أذهب إلى الفراش الساعة التاسعة. |
| 9034 | On weekends + جملة / I + فعل + on weekends | I play football on weekends. | ألعب كرة القدم في عطلة نهاية الأسبوع. |
| 9023 | I usually + الفعل الأساسي | I usually walk to school. | عادةً أمشي إلى المدرسة. |
| 9024 | I always + فعل أساسي | I always say good morning. | أقول صباح الخير دائمًا. |
| 9025 | I often + فعل أساسي | I often go to the library. | أذهب إلى المكتبة كثيرًا. |
| 9026 | I sometimes + فعل أساسي | I sometimes walk to work. | أذهب إلى العمل مشيًا أحيانًا. |
| 9027 | I never + فعل مثبت (بدون don't) | I never skip breakfast. | لا أفوت الإفطار أبدًا. |

### 06 — A2 — Choices for Today

[EP-SONG-06-A2-choices-for-today.txt](EP-SONG-06-A2-choices-for-today.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 106 | I've got + noun | I've got a ticket. | لدي تذكرة. |
| 13 | I need to + verb | I need to catch the bus. | أحتاج إلى اللحاق بالحافلة. |
| 2 | I have to + verb | I have to study for my exam. | عليّ أن أدرس لامتحاني. |
| 9044 | I don't have to + base verb | I don't have to work today. | لست مضطرًا للعمل اليوم. |
| 9045 | I must + base verb | I must wear my seat belt. | يجب عليّ وضع حزام الأمان. |
| 9046 | I should + base verb | I should practice more. | ينبغي أن أتدرب أكثر. |
| 9047 | You should + base verb | You should take a short break. | ينبغي لك أخذ استراحة قصيرة. |
| 9049 | Let me + base verb | Let me help you. | دعني أساعدك. |
| 9039 | Is it okay if + subject + verb ... ? | Is it okay if we sit here? | هل من المقبول إذا جلسنا هنا؟ |
| 9040 | You may + base verb | You may use this computer. | يُسمح لك باستخدام هذا الحاسوب. |

### 07 — A2 — Come and Join Us

[EP-SONG-07-A2-come-and-join-us.txt](EP-SONG-07-A2-come-and-join-us.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9052 | Would you like to + base verb ... ? | Would you like to join us? | هل تود الانضمام إلينا؟ |
| 9126 | Could you please + base verb | Could you please repeat the last sentence? | هل يمكنك إعادة الجملة الأخيرة من فضلك؟ |
| 9129 | May I + base verb | May I come in, please? | هل تسمح لي بالدخول من فضلك؟ |
| 9130 | I'd love to + base verb | I'd love to join the trip. | يسعدني الانضمام إلى الرحلة. |
| 9132 | How about + noun or verb ending in ing | How about meeting at the library? | ما رأيك في اللقاء في المكتبة؟ |
| 9133 | Thank you for + noun or verb ending in ing | Thank you for waiting for me. | شكرًا على انتظاري. |
| 9136 | I'm sorry for + noun or verb ending in ing | I'm sorry for being late today. | أنا آسف على التأخر اليوم. |
| 9137 | That's all right + optional reassuring sentence | That's all right. We can try again. | لا بأس. يمكننا المحاولة مجددًا. |
| 9059 | What do you + base verb...? | What do you do after school? | ماذا تفعل بعد المدرسة؟ |
| 9060 | Where do you + base verb...? | Where do you study English? | أين تدرس الإنجليزية؟ |
| 9061 | When do you + base verb...? | When do you practice English? | متى تمارس الإنجليزية؟ |

### 08 — A2 — Questions Along the Way

[EP-SONG-08-A2-questions-along-the-way.txt](EP-SONG-08-A2-questions-along-the-way.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9057 | Why is + singular subject + adjective? | Why is the bus late? | لماذا الحافلة متأخرة؟ |
| 9062 | Why do you + base verb...? | Why do you study English? | لماذا تدرس الإنجليزية؟ |
| 9063 | How do you + base verb...? | How do you make tea? | كيف تصنع الشاي؟ |
| 9065 | Does + he / she + base verb...? | Does she speak English? | هل تتحدث الإنجليزية؟ |
| 9070 | Which one + auxiliary / verb...? | Which one should I choose? | أي واحد ينبغي أن أختار؟ |
| 9029 | Before I + فعل مضارع، جملة رئيسية | Before I leave, I check my bag. | قبل أن أغادر، أفحص حقيبتي. |
| 9030 | After I + فعل مضارع، جملة رئيسية | After I study, I take a break. | بعد أن أدرس، آخذ استراحة. |
| 9071 | I was + adjective / noun / place | I was at home yesterday. | كنت في المنزل أمس. |
| 9072 | I wasn't + adjective / noun / place | I wasn't tired yesterday. | لم أكن متعبًا أمس. |
| 9073 | Were you + adjective / place / noun? | Were you at school yesterday? | هل كنت في المدرسة أمس؟ |

### 09 — A2 — Pages from Yesterday

[EP-SONG-09-A2-pages-from-yesterday.txt](EP-SONG-09-A2-pages-from-yesterday.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9074 | I went + to + place / I went home | I went to the market yesterday. | ذهبت إلى السوق أمس. |
| 9075 | I didn't + base verb | I didn't see your message. | لم أر رسالتك. |
| 9076 | Did you + base verb? | Did you finish your homework? | هل أنهيت واجبك؟ |
| 9077 | I had + noun | I had a red bicycle as a child. | كانت لدي دراجة حمراء في طفولتي. |
| 9078 | I saw + object | I saw a rainbow after the rain. | رأيت قوس قزح بعد المطر. |
| 9079 | I met + person | I met an old friend at the market. | قابلت صديقًا قديمًا في السوق. |
| 9080 | I bought + noun | I bought bread this morning. | اشتريت خبزًا هذا الصباح. |
| 9081 | I made + noun | I made a paper boat. | صنعت قاربًا من الورق. |
| 9082 | I forgot to + base verb | I forgot to bring my book. | نسيت إحضار كتابي. |
| 9083 | I decided to + base verb | I decided to learn English. | قررت تعلم الإنجليزية. |
| 9084 | I started + verb-ing / to + verb | I started reading a story yesterday. | بدأت قراءة قصة أمس. |

### 10 — A2 — Tomorrow on My Mind

[EP-SONG-10-A2-tomorrow-on-my-mind.txt](EP-SONG-10-A2-tomorrow-on-my-mind.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9089 | I'll + base verb | I'll call you after class. | سأتصل بك بعد الحصة. |
| 9090 | I won't + base verb | I won't be late tomorrow. | لن أتأخر غدًا. |
| 9091 | Will you + base verb + ...? | Will you join us tomorrow? | هل ستنضم إلينا غدًا؟ |
| 9092 | I'm going to + base verb | I'm going to practice English tonight. | سأتدرب على الإنجليزية الليلة. |
| 9093 | I'm not going to + base verb | I'm not going to skip breakfast. | لن أتجاوز وجبة الإفطار. |
| 9094 | Are you going to + base verb + ...? | Are you going to study tonight? | هل تنوي الدراسة الليلة؟ |
| 9095 | I'm planning to + base verb | I'm planning to learn ten new words. | أخطط لتعلم عشر كلمات جديدة. |
| 9096 | I'm meeting + person + future time | I'm meeting my friends at six. | سألتقي أصدقائي عند السادسة. |
| 9097 | The + scheduled event + starts / leaves / opens / begins + at + time | The class starts at nine tomorrow. | تبدأ الحصة غدًا عند التاسعة. |
| 9098 | I hope to + base verb | I hope to learn English well. | آمل تعلم الإنجليزية جيدًا. |
| 9100 | I might + base verb | I might go to the park after lunch. | قد أذهب إلى الحديقة بعد الغداء. |

### 11 — A2 — How I Feel and Why

[EP-SONG-11-A2-how-i-feel-and-why.txt](EP-SONG-11-A2-how-i-feel-and-why.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9107 | I feel + adjective | I feel calm after my walk. | أشعر بالهدوء بعد المشي. |
| 9108 | I'm happy with + noun phrase | I'm happy with my test result. | أنا راضٍ عن نتيجة اختباري. |
| 9109 | I'm worried about + noun or verb ending in ing | I'm worried about missing the bus. | أنا قلق من تفويت الحافلة. |
| 9114 | I'm interested in + noun or verb ending in ing | I'm interested in learning new languages. | أنا مهتم بتعلم لغات جديدة. |
| 9117 | I think + clause | I think this lesson is useful. | أعتقد أن هذا الدرس مفيد. |
| 9121 | I agree with + person or opinion | I agree with your suggestion. | أتفق مع اقتراحك. |
| 9122 | I don't agree with + person or opinion | I don't agree with that idea. | لا أتفق مع تلك الفكرة. |
| 10 | It takes + time + to + verb | It takes ten minutes to get there. | يستغرق الوصول إلى هناك عشر دقائق. |
| 9140 | main clause + because + reason clause | I practice English because I want to travel. | أتدرب على الإنجليزية لأنني أريد السفر. |
| 9142 | reason clause + so + result clause | We were hungry, so we made lunch. | كنا جائعين، لذا أعددنا الغداء. |
| 9145 | action + to + base verb for purpose | I opened the book to check the answer. | فتحت الكتاب للتحقق من الإجابة. |
| 9148 | first clause + but + contrasting clause | The test was hard, but I passed. | كان الاختبار صعبًا، لكنني نجحت. |

### 12 — B1 — When the Moment Comes

[EP-SONG-12-B1-when-the-moment-comes.txt](EP-SONG-12-B1-when-the-moment-comes.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 8 | I used to + verb | I used to walk to school. | كنت أذهب إلى المدرسة مشيًا. |
| 9086 | I was + verb-ing | I was reading at eight o'clock. | كنت أقرأ عند الساعة الثامنة. |
| 9087 | While I was + verb-ing, + past simple | While I was reading, the phone rang. | بينما كنت أقرأ، رن الهاتف. |
| 9088 | When + past simple, + past simple | When I opened the door, I saw a cat. | عندما فتحت الباب، رأيت قطة. |
| 9099 | I expect to + base verb | I expect to arrive before sunset. | أتوقع الوصول قبل الغروب. |
| 9101 | I may + base verb | I may need my umbrella this afternoon. | قد أحتاج إلى مظلتي بعد ظهر اليوم. |
| 9102 | I'll probably + base verb | I'll probably take the early bus. | غالبًا سأستقل الحافلة المبكرة. |
| 9103 | I'm about to + base verb | I'm about to leave the house. | أنا على وشك مغادرة المنزل. |
| 9104 | If + present simple, I'll + base verb | If it rains, I'll stay at home. | إذا أمطرت، فسأبقى في المنزل. |
| 9105 | When + present simple, I'll + base verb | When I get home, I'll call my mother. | عندما أصل إلى المنزل، سأتصل بأمي. |
| 9106 | As soon as + present simple, I'll + base verb | As soon as I finish, I'll help you. | فور أن أنتهي، سأساعدك. |

### 13 — B1 — What We Feel, What We Choose

[EP-SONG-13-B1-what-we-feel-what-we-choose.txt](EP-SONG-13-B1-what-we-feel-what-we-choose.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9110 | I'm proud of + person or achievement | I'm proud of my progress in English. | أنا فخور بتقدمي في الإنجليزية. |
| 9111 | I'm surprised that + clause | I'm surprised that the shop is open. | أنا متفاجئ بأن المتجر مفتوح. |
| 9112 | I'm disappointed that + clause | I'm disappointed that the game was canceled. | أنا محبط لأن المباراة أُلغيت. |
| 9113 | I'm grateful for + noun phrase | I'm grateful for your kindness. | أنا ممتن للطفك. |
| 7 | I feel like + verb-ing | I feel like going for a walk. | أشعر برغبة في التنزه. |
| 9116 | I don't feel like + verb ending in ing | I don't feel like watching TV. | لا أشعر برغبة في مشاهدة التلفاز. |
| 9118 | In my opinion, + clause | In my opinion, we need more practice. | في رأيي، نحتاج إلى مزيد من التدريب. |
| 9119 | I believe + clause | I believe everyone can learn. | أؤمن بأن الجميع يستطيع التعلم. |
| 9120 | I prefer + noun or verb ending in ing + to + alternative | I prefer walking to driving. | أفضل المشي على القيادة. |

### 14 — B1 — Hear Me Out

[EP-SONG-14-B1-hear-me-out.txt](EP-SONG-14-B1-hear-me-out.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9123 | It seems like + clause | It seems like the shop is closed. | يبدو أن المتجر مغلق. |
| 9124 | It sounds like + noun or clause | It sounds like rain outside. | يبدو أن المطر يتساقط في الخارج من صوته. |
| 9127 | Would you mind + verb ending in ing | Would you mind moving your bag? | هل تمانع نقل حقيبتك؟ |
| 9128 | Do you mind if I + present verb | Do you mind if I sit here? | هل تمانع إن جلست هنا؟ |
| 9131 | I'm afraid I can't + base verb | I'm afraid I can't come on Friday. | أخشى أنني لا أستطيع الحضور يوم الجمعة. |
| 9134 | I appreciate + noun or verb ending in ing | I appreciate your patience today. | أقدّر صبرك اليوم. |
| 9138 | Could you clarify + noun or what you mean | Could you clarify what you mean? | هل يمكنك توضيح ما تقصده؟ |
| 9139 | Let me know if + clause | Let me know if the time changes. | أخبرني إذا تغير الموعد. |

### 15 — B1 — Join the Lines

[EP-SONG-15-B1-join-the-lines.txt](EP-SONG-15-B1-join-the-lines.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9141 | main clause + because of + noun or gerund | The bus was late because of traffic. | تأخرت الحافلة بسبب الازدحام. |
| 9143 | reason sentence. That's why + result clause | I missed the bus. That's why I'm late. | فاتتني الحافلة. لهذا السبب تأخرت. |
| 9144 | main clause + so that + subject + can or could + base verb | I write notes so that I can remember more. | أكتب ملاحظات لكي أتذكر المزيد. |
| 9146 | although + subject + verb, main clause | Although she was tired, she kept studying. | رغم أنها كانت متعبة، واصلت الدراسة. |
| 9149 | sentence. However, contrasting sentence | The book is long. However, it is easy to read. | الكتاب طويل. ومع ذلك يسهل قراءته. |
| 9151 | instead of + noun or verb ending in ing | She chose water instead of soda. | اختارت الماء بدلًا من المشروبات الغازية. |
| 9154 | general idea. For example, specific illustration | Healthy habits help us. For example, sleep improves focus. | العادات الصحية تساعدنا. مثلًا، النوم يحسن التركيز. |
| 9155 | general noun + such as + example nouns or phrases | I enjoy fruits such as apples and oranges. | أستمتع بالفواكه مثل التفاح والبرتقال. |
| 9158 | What I mean is + clause | What I mean is we need more practice. | ما أقصده هو أننا نحتاج إلى تدريب أكثر. |

### 16 — B1 — I Wonder Where

[EP-SONG-16-B1-i-wonder-where.txt](EP-SONG-16-B1-i-wonder-where.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9160 | The reason is that + clause | The reason is that the library closes early. | السبب هو أن المكتبة تغلق مبكرًا. |
| 9161 | I wonder if + statement word order | I wonder if the museum is open today. | أتساءل إن كان المتحف مفتوحًا اليوم. |
| 9162 | I wonder how + statement word order | I wonder how this machine works. | أتساءل كيف تعمل هذه الآلة. |
| 9164 | the person who + verb phrase | The person who helped me is my neighbor. | الشخص الذي ساعدني هو جاري. |
| 9165 | the thing or book that + relative clause | The song that we heard was beautiful. | الأغنية التي سمعناها كانت جميلة. |
| 9166 | the place where + subject + verb | She works at the café where we met last summer. | تعمل في المقهى الذي التقينا فيه الصيف الماضي. |
| 9 | I managed to + verb | I managed to finish on time. | تمكنت من الانتهاء في الوقت المحدد. |
| 11 | It's worth + verb-ing | It's worth trying again. | الأمر يستحق المحاولة مرة أخرى. |
| 12 | Do you know where + subject + verb? | Do you know where the station is? | هل تعرف أين تقع المحطة؟ |

### 17 — B2 — Even If the Sky Turns Gray

[EP-SONG-17-B2-even-if-the-sky-turns-gray.txt](EP-SONG-17-B2-even-if-the-sky-turns-gray.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9147 | even though + subject + verb, main clause | Even though it was raining, we went outside. | مع أن المطر كان يهطل، خرجنا. |
| 9150 | while + contrasting clause, main clause | While I enjoy reading, my brother prefers sports. | بينما أستمتع بالقراءة، يفضل أخي الرياضة. |
| 9152 | in addition to + noun or verb ending in ing | In addition to English, I study mathematics. | بالإضافة إلى الإنجليزية، أدرس الرياضيات. |
| 9153 | not only + parallel item + but also + parallel item | He is not only helpful but also patient. | ليس متعاونًا فقط بل صبور أيضًا. |
| 9156 | main clause + unless + present simple condition | We'll go outside unless it rains. | سنخرج ما لم تمطر. |
| 9157 | even if + hypothetical or possible condition | Even if it rains, I'll attend the event. | حتى لو أمطرت، سأحضر الفعالية. |
| 9159 | What matters is + noun or clause | What matters is that we keep trying. | المهم هو أن نواصل المحاولة. |
| 9163 | Could you tell me whether + statement clause | Could you tell me whether the office is open? | هل يمكنك إخباري ما إذا كان المكتب مفتوحًا؟ |

### 18 — B2 — The Things We Could Have Done

[EP-SONG-18-B2-the-things-we-could-have-done.txt](EP-SONG-18-B2-the-things-we-could-have-done.txt)

| معرّف النمط | الصيغة في المنهج | المثال المطلوب غناؤه | الترجمة |
| --- | --- | --- | --- |
| 9167 | the day when + subject + verb | I still think about the day when I started school. | ما زلت أفكر في اليوم الذي بدأت فيه المدرسة. |
| 9168 | I wish I could + base verb | I wish I could play the piano well. | أتمنى لو أستطيع العزف على البيانو جيدًا. |
| 9169 | If I were + imaginary situation, I would + base verb | If I were a teacher, I would make lessons fun. | لو كنت معلمًا، لجعلت الدروس ممتعة. |
| 9170 | If + past perfect, subject + would have + past participle | If I had left early, I would have caught the bus. | لو غادرت مبكرًا، لكنت لحقت بالحافلة. |
| 9171 | I should have + past participle | I should have brought my umbrella. | كان ينبغي أن أحضر مظلتي. |
| 9172 | I could have + past participle | I could have taken the earlier bus. | كان بإمكاني ركوب الحافلة الأسبق. |
| 9173 | I had already + past participle + before past event | I had already eaten when my friend called. | كنت قد تناولت الطعام عندما اتصل صديقي. |
| 9174 | By the time + past simple, past perfect clause | By the time she called, I had finished cooking. | بحلول اتصالها، كنت قد أنهيت الطبخ. |
| 9175 | The + comparative clause, the + comparative clause | We find that the more we practice, the more confident we become. | نجد أنه كلما تدربنا أكثر، أصبحنا أكثر ثقة. |
