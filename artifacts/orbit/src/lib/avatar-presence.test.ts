import assert from 'node:assert/strict';
import test from 'node:test';
import { getAvatarActivity, getAvatarExpression } from './avatar-presence';

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
