import { AvatarCueTone, type AvatarCue } from '@workspace/api-client-react';
import type { AvatarTone } from './avatar-tone';

/** Metadata is untrusted presentation data, never a clinical assessment. */
export function parseAvatarCue(value: unknown): AvatarCue | null {
  if (!value || typeof value !== 'object') return null;
  const { tone, certainty } = value as Record<string, unknown>;
  if (typeof tone !== 'string' || !Object.values(AvatarCueTone).includes(tone as AvatarTone)
    || (certainty !== 'clear' && certainty !== 'uncertain')) return null;
  return { tone: certainty === 'clear' ? tone as AvatarTone : 'neutral', certainty };
}

export type TurnAvatarCue = { userId: string; clientMessageId: string; tone: AvatarTone };

/** Reset on accounts, new turns, reloads, and externally advanced conversations. */
export function currentAvatarTone(
  cue: TurnAvatarCue | null, userId: string | null, clientMessageId: string | null | undefined,
): AvatarTone {
  return cue?.userId === userId && cue.clientMessageId === clientMessageId ? cue.tone : 'neutral';
}
