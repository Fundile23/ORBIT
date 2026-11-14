import assert from 'node:assert/strict';
import test from 'node:test';
import { currentAvatarTone, parseAvatarCue } from './avatar-cue';

test('valid cues use semantic AI tones and uncertain cues are neutral', () => {
  assert.deepEqual(parseAvatarCue({ tone: 'supportive', certainty: 'clear' }),
    { tone: 'supportive', certainty: 'clear' });
  assert.deepEqual(parseAvatarCue({ tone: 'excited', certainty: 'uncertain' }),
    { tone: 'neutral', certainty: 'uncertain' });
});

test('invalid cue payloads cannot set arbitrary UI states', () => {
  for (const value of [null, '', [], {}, { tone: 'angry', certainty: 'clear' },
    { tone: 'excited', certainty: 1 }, { tone: '__proto__', certainty: 'clear' }]) {
    assert.equal(parseAvatarCue(value), null);
  }
});

test('AI presentation survives its completed turn, but never a new turn or account', () => {
  const cue = { userId: 'synthetic-a', clientMessageId: 'turn-a', tone: 'supportive' as const };
  assert.equal(currentAvatarTone(cue, 'synthetic-a', 'turn-a'), 'supportive');
  assert.equal(currentAvatarTone(cue, 'synthetic-a', 'turn-b'), 'neutral');
  assert.equal(currentAvatarTone(cue, 'synthetic-b', 'turn-a'), 'neutral');
  assert.equal(currentAvatarTone(cue, 'synthetic-a', undefined), 'neutral');
  assert.equal(currentAvatarTone(null, 'synthetic-a', 'turn-a'), 'neutral');
});
