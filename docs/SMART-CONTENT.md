# Connected visual practice

## Conversation journeys

The approved first batch contains 12 conversations with four dedicated scenes each. The 48 final WebP files live in `public/assets/scenes/conversations/life-*.webp`, each 500 × 300. They were generated with the built-in image tool, one four-frame atlas per conversation. Each frame is fitted into the final dimensions without stretching or removing its people and props.

`production/dialogue-lifecycles.json` contains bilingual goals, stage purposes and inclusive turn ranges. The images and turn bindings are stored in `production/conversation-scenes.json`. Full generation prompts are in `production/dialogue-image-prompts.json`.

The builder validates contiguous stage ranges and complete turn coverage. The client derives the active stage from the current turn in the measured recording, including seeks and resumed playback. The same journey component is used by the conversation catalogue, lesson conversation stage and listening coach. The remaining conversations use their existing player until their dedicated journey is authored.

## Original sentence scenes and open practice

Pattern practice opens `scene-studio`, the Smart photo library. It selects the pattern's original sentence images and recordings. `lab`, Speak from scenes, supports open description and dialogue.

Both use the existing scene registry and viewer. Atlas crops retain their original dimensions. A shared overlay follows the actual rendered crop, including enlarged views. Independent lab and conversation images use their existing 500 × 300 format.

`production/scene-word-maps.json` contains reviewed word positions for 12 original sentence scenes. Coordinates are percentages of the original crop. Other sentence scenes display contextual sentence vocabulary without object coordinates. Existing positioned vocabulary in the independent lab remains available.

## Vocabulary atlas

`npm run build` regenerates `public/vocabulary-index.json` and `public/scene-vocabulary.json`. Inputs include all published course/reference/supplement sentences, conversation turns, independent scene descriptions, illustrated terms, contextual scene examples and the curated phrase list. Personal dialogues saved in a learner's browser stay in that local archive.

Entries have stable IDs derived from spelling and grammatical role. The atlas indexes a word separately when its role changes, for example noun versus verb. Occurrences link to exact source texts, images, pattern IDs and dialogue turns.

Contextual part-of-speech classification uses winkNLP and its small English model during the build, not in the browser. It remains automatic classification requiring editorial review. Reviewed picture labels override their roles. The model and API are documented by the [winkNLP maintainers](https://winkjs.org/wink-nlp/language-models.html).

Arabic word meanings come from `production/vocabulary-glosses.tsv`, role-specific `production/vocabulary-senses.tsv` and reviewed picture vocabulary. An entry without an individual gloss still has the bilingual sentences in which it appears. The corpus is indexed automatically on every build and these editorial files can be extended over time.

Isolated Adam/Bella recordings are preferred when available. Otherwise the atlas can play the measured word interval from an existing sentence or conversation recording. User-written lines use the existing device-voice fallback. This distinction preserves the original measured audio.

## Database relationships

Migration `007_vocabulary_and_journeys.cjs` adds vocabulary entries, sources, occurrences, scene links and conversation stages. The existing seed imports these generated files transactionally and fingerprints them, retaining the established image and dialogue identifiers. Existing editorial notes and external-system links remain managed by their existing tables.
