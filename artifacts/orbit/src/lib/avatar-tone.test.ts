import assert from 'node:assert/strict';
import test from 'node:test';
import { inferAvatarTone, type AvatarTone } from './avatar-tone';

const examples: [string, AvatarTone][] = [
  ['I am so excited, we did it!', 'joyful'],
  ['Haha, roast my tortilla catching skills.', 'playful'],
  ['I am sad and I miss my family.', 'supportive'],
  ['My thoughts keep racing and I am anxious.', 'calm'],
  ['I am so frustrated about the schedule.', 'calm'],
  ['Absolutely exhausted, no energy tonight.', 'tired'],
  ['How does a star form? I am curious.', 'curious'],
  ['The experiment is at 14:00.', 'neutral'],
  ['Fine.', 'neutral'],
  ['I am not happy, please just listen.', 'supportive'],
  ['I am not sad, I am excited!', 'joyful'],
  ['I am not tired. Tell me about Saturn.', 'curious'],
  ['Haha, jokes aside, I feel alone.', 'supportive'],
  ['I want to kill myself, lol.', 'supportive'],
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
