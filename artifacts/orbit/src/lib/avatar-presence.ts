import type { AvatarTone } from './avatar-tone';

export type AvatarActivity = 'idle' | 'listening' | 'thinking' | 'speaking';
export type AvatarExpression = 'relaxed' | 'attentive' | 'thoughtful' | 'animated' | 'amused' | 'empathetic' | 'concerned' | 'happy' | 'excited' | 'frustrated' | 'surprised' | 'sleepy' | 'curious';
export type AvatarReaction = 'none' | 'celebrate' | 'sparkle' | 'giggle' | 'startle' | 'comfort' | 'tilt' | 'steady';
export type AvatarReactionEvent = { kind: AvatarReaction; key: string };
export type PresenceSignals = { writing: boolean; generating: boolean; hasReply: boolean };

/** Lifecycle signals, not timers or randomly selected emotional animations. */
export function getAvatarActivity({ writing, generating, hasReply }: PresenceSignals): AvatarActivity {
  if (generating) return hasReply ? 'speaking' : 'thinking';
  return writing ? 'listening' : 'idle';
}

export function getAvatarExpression(tone: AvatarTone, activity: AvatarActivity): AvatarExpression {
  if (tone === 'concerned') return 'concerned';
  if (tone === 'supportive') return 'empathetic';
  if (tone === 'frustrated') return 'frustrated';
  if (tone === 'tired') return 'sleepy';
  if (tone === 'excited') return 'excited';
  if (tone === 'surprised') return 'surprised';
  if (activity === 'thinking') return 'thoughtful';
  if (activity === 'listening') return 'attentive';
  if (tone === 'playful') return 'amused';
  if (tone === 'joyful') return 'happy';
  if (tone === 'curious') return 'curious';
  if (activity === 'speaking') return 'animated';
  return 'relaxed';
}

/** One bounded reaction to a submitted turn; never a random ambient emotion. */
export function getAvatarReaction(tone: AvatarTone): AvatarReaction {
  const reactions: Record<AvatarTone, AvatarReaction> = {
    neutral: 'none', joyful: 'sparkle', excited: 'celebrate', playful: 'giggle',
    supportive: 'comfort', calm: 'steady', tired: 'none', curious: 'tilt',
    concerned: 'steady', focused: 'none', frustrated: 'steady', surprised: 'startle',
  };
  return reactions[tone];
}

/** Quiet contexts may move gently, but never replay a celebratory effect. */
export function isAvatarReactionAllowed(tone: AvatarTone, reaction: AvatarReaction): boolean {
  if (reaction === 'none') return false;
  if (['supportive', 'concerned', 'frustrated', 'tired', 'calm', 'focused'].includes(tone)) {
    return reaction === 'comfort' || reaction === 'steady';
  }
  return true;
}
export const AVATAR_ACTIVITY_LABELS: Record<AvatarActivity, string> = {
  idle: 'Here with you',
  listening: 'Listening · text only',
  thinking: 'Thinking',
  speaking: 'Replying',
};
