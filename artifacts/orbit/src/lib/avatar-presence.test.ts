import assert from 'node:assert/strict';
import test from 'node:test';
import { getAvatarActivity, getAvatarExpression, getAvatarReaction, isAvatarReactionAllowed } from './avatar-presence';

test('interaction state follows focus, request, first delta, completion and interruption', () => {
  assert.equal(getAvatarActivity({ writing: false, generating: false, hasReply: false }), 'idle');
  assert.equal(getAvatarActivity({ writing: true, generating: false, hasReply: false }), 'listening');
  assert.equal(getAvatarActivity({ writing: true, generating: true, hasReply: false }), 'thinking');
  assert.equal(getAvatarActivity({ writing: true, generating: true, hasReply: true }), 'speaking');
  assert.equal(getAvatarActivity({ writing: true, generating: false, hasReply: true }), 'listening');
  assert.equal(getAvatarActivity({ writing: false, generating: false, hasReply: true }), 'idle');
});
test('empathetic and concerned expressions never become amused while replying', () => {
  for (const activity of ['idle', 'listening', 'thinking', 'speaking'] as const) {
    assert.equal(getAvatarExpression('supportive', activity), 'empathetic');
    assert.equal(getAvatarExpression('concerned', activity), 'concerned');
  }
});
test('playfulness does not override actual thinking or listening', () => {
  assert.equal(getAvatarExpression('playful', 'idle'), 'amused');
  assert.equal(getAvatarExpression('playful', 'thinking'), 'thoughtful');
  assert.equal(getAvatarExpression('playful', 'listening'), 'attentive');
  assert.equal(getAvatarExpression('neutral', 'speaking'), 'animated');
});
test('distinct character expressions represent the requested emotional range', () => {
  const examples = [
    ['joyful', 'happy'], ['excited', 'excited'], ['playful', 'amused'],
    ['supportive', 'empathetic'], ['concerned', 'concerned'],
    ['frustrated', 'frustrated'], ['curious', 'curious'],
    ['surprised', 'surprised'], ['tired', 'sleepy'],
  ] as const;
  for (const [tone, expected] of examples) assert.equal(getAvatarExpression(tone, 'idle'), expected);
});
test('special reactions are contextual, with no celebratory movement for distress', () => {
  assert.equal(getAvatarReaction('excited'), 'celebrate');
  assert.equal(getAvatarReaction('joyful'), 'sparkle');
  assert.equal(getAvatarReaction('playful'), 'giggle');
  assert.equal(getAvatarReaction('surprised'), 'startle');
  assert.equal(getAvatarReaction('supportive'), 'comfort');
  for (const tone of ['concerned', 'frustrated', 'calm'] as const) assert.equal(getAvatarReaction(tone), 'steady');
  assert.equal(getAvatarReaction('neutral'), 'none');
});
test('quiet contexts permit comfort but suppress celebration, laughter and startling', () => {
  for (const tone of ['supportive', 'concerned', 'calm', 'frustrated', 'tired', 'focused'] as const) {
    assert.equal(isAvatarReactionAllowed(tone, 'comfort'), true);
    assert.equal(isAvatarReactionAllowed(tone, 'steady'), true);
    for (const reaction of ['celebrate', 'sparkle', 'giggle', 'startle'] as const) {
      assert.equal(isAvatarReactionAllowed(tone, reaction), false);
    }
  }
});
