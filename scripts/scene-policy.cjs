const policy = require('../production/scene-policy.json');

const overrides = {
  'After I exercise, I take a shower.': 'A fully clothed adult in loose long-sleeved exercise clothes holding a folded towel and clean clothes OUTSIDE a closed bathroom door after exercising. No bathing, shower interior, changing or undressing.',
  "I can't swim across the whole lake.": 'A fully clothed adult in loose long-sleeved clothes and full trousers standing safely on a dry lakeside path, gesturing to the far shore and explaining the distance to a same-gender friend. No one in the water.',
  'Can you swim without a float?': 'Two fully clothed same-gender adults, an instructor and learner, talking on a dry deck beside an EMPTY pool; the instructor holds a float as a teaching prop. Loose opaque long sleeves and full trousers; no swimmers or swimwear anywhere.',
  'She plays tennis in addition to swimming.': 'A woman in loose opaque full-coverage sports clothing and hijab holding a tennis racket and a closed sports bag with swimming goggles attached, outside a sports centre. No pool activity or swimwear.',
  'I wonder if the water is warm enough to swim.': 'A fully clothed man in loose long sleeves and full trousers kneeling safely on a dry empty pool deck, testing the water with one hand. No swimmers, swimwear or background people.',
  'Even though the beach was crowded, we found a quiet corner.': 'A modestly dressed Arab family finding a quiet shaded corner of a coastal promenade, with a busier fully clothed crowd far along the promenade and sea beyond. No swimmers, sunbathers, romance or swimwear.',
  'I get up without waking my sister.': 'Two adult sisters in separate beds; one, wearing loose full-coverage clothes and hijab, quietly steps into slippers while the other sleeps under an opaque blanket. No men, shared bed or exposed body.'
};

function risks(sentence) {
  const text = `${sentence.en} ${sentence.scene_description || sentence.scene || ''}`;
  return [
    ['water', /\b(swim\w*|pool|beach|sunbath\w*)\b/i],
    ['private-setting', /\b(bed\w*|pajamas|pyjamas|shower\w*|bathroom|bath\w*|undress\w*)\b/i],
    ['relationship', /\b(couple|kiss\w*|romantic\w*|girlfriend|boyfriend|date night)\b/i],
    ['restricted-prop', /\b(wine|beer|alcohol|nightclub|gambl\w*|pork)\b/i]
  ].filter(([, re]) => re.test(text)).map(([name]) => name);
}

function scene(sentence) {
  const base = overrides[sentence.en] || sentence.scene_description || sentence.scene || sentence.en;
  const flags = risks(sentence);
  const directions = [];
  if (flags.includes('water')) directions.push('Stage the entire scene fully clothed on dry land; empty water, no swimmers, sunbathers or revealing background figures.');
  if (flags.includes('private-setting')) directions.push('Fully clothed in loose opaque long sleeves and full-length garments; blankets cover lower bodies in bed; never depict changing or bathing.');
  if (flags.includes('relationship')) directions.push('Use respectful conversational distance and neutral gestures, no romantic staging or physical intimacy.');
  if (flags.includes('restricted-prop') && !overrides[sentence.en]) throw Error(`Visual staging needs an explicit reviewed override: ${sentence.en}`);
  return [base, ...directions].join(' ');
}

module.exports = { policy, overrides, risks, scene };
