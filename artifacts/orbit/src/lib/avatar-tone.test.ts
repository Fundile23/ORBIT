import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateConversationTone, inferAvatarTone, type AvatarTone } from './avatar-tone';

const examples: [string, AvatarTone][] = [
  ['I am so excited, we did it!', 'excited'],
  ['Haha, roast my tortilla catching skills.', 'playful'],
  ['I am sad and I miss my family.', 'supportive'],
  ['My thoughts keep racing and I am anxious.', 'calm'],
  ['I am so frustrated about the schedule.', 'frustrated'],
  ['Absolutely exhausted, no energy tonight.', 'tired'],
  ['How does a star form? I am curious.', 'curious'],
  ['The experiment is at 14:00.', 'neutral'],
  ['Fine.', 'neutral'],
  ['I am not happy, please just listen.', 'supportive'],
  ['I am not sad, I am excited!', 'excited'],
  ['I am not tired. Tell me about Saturn.', 'curious'],
  ['Haha, jokes aside, I feel alone.', 'supportive'],
  ['I want to kill myself, lol.', 'concerned'],
  ['Let’s focus on the experiment step by step.', 'focused'],
  ['I am curious why sad music feels good.', 'curious'],
  ['Maybe I am sad, maybe I am excited.', 'neutral'],
  ["ORBIT, I'm getting married!", 'excited'],
  ['I just received some terrible news.', 'supportive'],
  ['I feel happy and proud of myself.', 'joyful'],
  ["I didn't see that coming. What a surprise!", 'surprised'],
  ["I'm getting married, but I'm terrified.", 'calm'],
  ["I'm not getting married.", 'neutral'],
];
for (const [content, expected] of examples) {
  test(`decorative cue: ${content}`, () => {
    assert.equal(inferAvatarTone([{ role: 'user', content }]), expected);
  });
}
test('short follow-through inherits context without reading an assistant as the user', () => {
  assert.equal(inferAvatarTone([
    { role: 'user', content: 'I feel lonely.' },
    { role: 'assistant', content: 'Tell me about a happy day.' },
    { role: 'user', content: 'Yeah.' },
  ]), 'supportive');
});
test('new topic leaves the previous tone behind', () => {
  assert.equal(inferAvatarTone([
    { role: 'user', content: 'I feel sad.' },
    { role: 'user', content: 'The experiment is at 14:00.' },
  ]), 'neutral');
});
test('newly sent text takes priority over earlier banter', () => {
  assert.equal(inferAvatarTone([
    { role: 'user', content: 'Haha, that was funny.' },
  ], 'I am overwhelmed now.'), 'calm');
});
test('no conversation defaults to the original neutral expression', () => {
  assert.equal(inferAvatarTone([]), 'neutral');
});
test('uncertainty alternatives sum to one and never establish a certain mood', () => {
  const estimate = estimateConversationTone([{ role: 'user', content: 'I feel excited.' }]);
  assert.ok(Math.abs(Object.values(estimate.probabilities).reduce((sum, n) => sum + n, 0) - 1) < 1e-10);
  assert.ok(estimate.confidence > 0 && estimate.confidence < 1);
  assert.ok(estimate.probabilities.neutral > 0);
});
test('repeated context strengthens a cue more than one message does', () => {
  const single = estimateConversationTone([{ role: 'user', content: 'I feel lonely.' }]);
  const repeated = estimateConversationTone([
    { role: 'user', content: 'I miss my family.' },
    { role: 'assistant', content: 'What part of home is with you today?' },
    { role: 'user', content: 'I feel lonely.' },
  ]);
  assert.ok(repeated.confidence > single.confidence);
  assert.equal(repeated.evidenceTurns, 2);
});
test('a refreshed pending message cannot manufacture extra evidence', () => {
  const history = [{ role: 'user', content: 'I feel excited.' }];
  assert.deepEqual(estimateConversationTone(history, history[0]!.content), estimateConversationTone(history));
});
test('a new serious cue stops amusement after several playful turns', () => {
  assert.equal(inferAvatarTone([
    { role: 'user', content: 'Haha, roast my cooking.' },
    { role: 'user', content: 'Tell me another joke.' },
  ], 'Jokes aside, I cried and feel alone.'), 'supportive');
});
test('a standalone emoji is ambiguous and does not establish a playful mood', () => {
  assert.equal(inferAvatarTone([{ role: 'user', content: '😂' }]), 'neutral');
});
test('embarrassment alone does not assume the astronaut wants to be laughed at', () => {
  assert.equal(inferAvatarTone([{ role: 'user', content: 'I think I just embarrassed myself.' }]), 'neutral');
  assert.equal(inferAvatarTone([
    { role: 'user', content: 'Haha, roast my cooking.' },
    { role: 'assistant', content: 'A culinary adventure.' },
    { role: 'user', content: 'I think I just embarrassed myself.' },
  ]), 'playful');
});
test('bad news cancels a previously celebratory context', () => {
  assert.equal(inferAvatarTone([
    { role: 'user', content: "I'm getting married!" },
  ], 'I just received some terrible news. Please just listen.'), 'supportive');
});
