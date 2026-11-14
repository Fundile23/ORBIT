import type { AvatarTone } from './avatar-tone';

export type AvatarActivity = 'idle' | 'listening' | 'thinking' | 'speaking';
export type AvatarExpression = 'relaxed' | 'attentive' | 'thoughtful' | 'animated' | 'amused' | 'empathetic' | 'concerned';
export type PresenceSignals = { writing: boolean; generating: boolean; hasReply: boolean };

/** Lifecycle signals, not timers or randomly selected emotional animations. */
export function getAvatarActivity({ writing, generating, hasReply }: PresenceSignals): AvatarActivity {
  if (generating) return hasReply ? 'speaking' : 'thinking';
  return writing ? 'listening' : 'idle';
}

export function getAvatarExpression(tone: AvatarTone, activity: AvatarActivity): AvatarExpression {
  if (tone === 'concerned') return 'concerned';
  if (tone === 'supportive') return 'empathetic';
  if (activity === 'thinking') return 'thoughtful';
  if (activity === 'listening') return 'attentive';
  if (tone === 'playful' || tone === 'joyful') return 'amused';
  if (activity === 'speaking') return 'animated';
  return 'relaxed';
}

export const AVATAR_ACTIVITY_LABELS: Record<AvatarActivity, string> = {
  idle: 'Here with you',
  listening: 'Listening · text only',
  thinking: 'Thinking',
  speaking: 'Replying',
};
