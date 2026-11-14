import { useEffect, useId, useRef, useState } from 'react';
import type { AvatarActivity, AvatarReaction, AvatarReactionEvent } from '@/lib/avatar-presence';
import { getAvatarExpression, isAvatarReactionAllowed } from '@/lib/avatar-presence';
import type { AvatarTone } from '@/lib/avatar-tone';
import { useAvatarExpression } from '@/components/avatar-expression-context';
import { cn } from '@/lib/utils';
import './orbit-avatar.css';

type Props = {
  size?: number;
  activity?: AvatarActivity;
  /** Backwards-compatible adapter: true means thinking; false means idle. */
  thinking?: boolean;
  tone?: AvatarTone;
  reaction?: AvatarReactionEvent | null;
  className?: string;
  decorative?: boolean;
};

/** ORBIT: a small, expressive planet with its own moon. */
export function OrbitAvatar({
  size = 40,
  activity,
  thinking,
  tone,
  reaction,
  className,
  decorative = true,
}: Props) {
  const presence = useAvatarExpression();
  const id = useId().replace(/:/g, '');
  const gradientId = `oa-planet-${id}`;
  const effectiveTone = tone ?? presence.tone;
  const effectiveActivity = activity ?? (thinking === undefined
    ? presence.activity
    : thinking ? 'thinking' : 'idle');
  const expression = getAvatarExpression(effectiveTone, effectiveActivity);
  const event = reaction === undefined ? presence.reaction : reaction;
  const [activeReaction, setActiveReaction] = useState<AvatarReaction>('none');
  const lastReactionKey = useRef(event?.key ?? null);
  const quietToneRef = useRef(effectiveTone);
  quietToneRef.current = effectiveTone;
  const faceLabel = `ORBIT is ${({
    relaxed: 'here with a relaxed expression',
    attentive: 'listening',
    thoughtful: 'thinking',
    animated: 'replying',
    amused: 'looking amused',
    empathetic: 'responding gently',
    concerned: 'responding with care',
    happy: 'looking happy',
    excited: 'looking excited',
    frustrated: 'showing understanding',
    surprised: 'surprised',
    sleepy: 'looking sleepy',
    curious: 'looking curious',
  } as const)[expression]}`;
  const headOnly = size < 80;

  useEffect(() => {
    if (!event || !event.key) { setActiveReaction('none'); return; }
    if (event.key === lastReactionKey.current) return;
    lastReactionKey.current = event.key;
    setActiveReaction(headOnly || !isAvatarReactionAllowed(quietToneRef.current, event.kind) ? 'none' : event.kind);
  }, [event?.key, event?.kind, headOnly]);

  useEffect(() => {
    setActiveReaction((current) => isAvatarReactionAllowed(effectiveTone, current) ? current : 'none');
  }, [effectiveTone]);

  useEffect(() => {
    if (activeReaction === 'none') return;
    const finish = () => setActiveReaction('none');
    const timer = window.setTimeout(finish, 2400);
    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
        finish();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeReaction, event?.key]);

  return (
    <span
      className={cn('orbit-avatar relative inline-flex shrink-0', size >= 80 && 'oa-motion', className)}
      style={{ width: size, height: size }}
      data-tone={effectiveTone}
      data-activity={effectiveActivity}
      data-expression={expression}
      data-reaction={headOnly ? 'none' : activeReaction}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : faceLabel}
      aria-hidden={decorative ? true : undefined}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={cn('oa-svg', headOnly && 'oa-head-icon')}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={gradientId} cx="38%" cy="30%" r="72%">
            <stop className="oa-gradient-light" offset="0" />
            <stop className="oa-gradient-mid" offset=".5" />
            <stop className="oa-gradient-deep" offset="1" />
          </radialGradient>
        </defs>
        <g className="oa-character" key={`character-${event?.key ?? 'rest'}`}>
          <g className="oa-orbit">
            <ellipse cx="32" cy="32" rx="29" ry="29" fill="none" stroke="var(--oa-orbit)" strokeOpacity=".42" strokeDasharray="2 5" />
            <circle className="oa-moon" cx="32" cy="3" r="3.2" fill="var(--oa-moon)" />
          </g>
          <g className="oa-planet-group">
            <circle className="oa-planet" cx="32" cy="32" r="20.5" fill={`url(#${gradientId})`} />
            <ellipse className="oa-sheen" cx="25.5" cy="23.5" rx="6.2" ry="3.6" />
            <g className="oa-face">
              <g className="oa-brows">
                <path className="oa-brow oa-brow-left" d="M24.5 27q2-1.1 4 .1" />
                <path className="oa-brow oa-brow-right" d="M35.5 27.1q2-1.2 4-.1" />
              </g>
              <g className="oa-eyes">
                <g className="oa-round-eyes">
                  <circle className="oa-eye oa-eye-left" cx="26.5" cy="31" r="1.9" />
                  <circle className="oa-eye oa-eye-right" cx="37.5" cy="31" r="1.9" />
                </g>
                <g className="oa-smile-eyes">
                  <path d="M24.6 31q1.9 2.8 3.8 0" />
                  <path d="M35.6 31q1.9 2.8 3.8 0" />
                </g>
                <path className="oa-wink" d="M35.6 31q1.9 2.8 3.8 0" />
                <path className="oa-lids" d="M24.7 30.8q1.8 1.2 3.6 0m7.4 0q1.8 1.2 3.6 0" />
              </g>
              <g className="oa-mouths">
                <path className="oa-mouth oa-mouth-rest" d="M28 36.5q4 2.8 8 0" />
                <path className="oa-mouth oa-mouth-happy" d="M27 36q5 5.1 10 0" />
                <path className="oa-mouth oa-mouth-playful" d="M28 36.2q3.5 3.6 7 0" />
                <path className="oa-mouth oa-mouth-supportive" d="M28 37q4 2.3 8 0" />
                <path className="oa-mouth oa-mouth-calm" d="M28 36.8q4 2.6 8 0" />
                <path className="oa-mouth oa-mouth-tired" d="M28 37.2q4 1.7 8 0" />
                <path className="oa-mouth oa-mouth-curious" d="M30 36.4q2-1.2 4 0" />
                <path className="oa-mouth oa-mouth-concerned" d="M28 37.2q4-1.5 8 0" />
                <path className="oa-mouth oa-mouth-focused" d="M28.5 37h7" />
                <path className="oa-mouth oa-mouth-thinking" d="M28 37h8" />
                <path className="oa-mouth oa-mouth-frustrated" d="M28 37q4-2.3 8 0" />
                <path className="oa-mouth oa-mouth-surprised" d="M32 35.5a1.5 2 0 1 0 0 4a1.5 2 0 1 0 0-4Z" />
                <path className="oa-mouth oa-mouth-speaking" d="M29 36.5q3 3 6 0" />
              </g>
              <circle className="oa-blush oa-blush-left" cx="22.5" cy="35.5" r="2" />
              <circle className="oa-blush oa-blush-right" cx="41.5" cy="35.5" r="2" />
            </g>
          </g>
        </g>
        <g className="oa-effects" key={`effects-${event?.key ?? 'rest'}`} aria-hidden="true">
          <path className="oa-effect oa-effect-star" d="m12 13 1.5 4.5L18 19l-4.5 1.5L12 25l-1.5-4.5L6 19l4.5-1.5Z" />
          <path className="oa-effect oa-effect-star" d="m53 16 1.2 3.5 3.5 1.2-3.5 1.2L53 27l-1.2-3.5-3.5-1.2 3.5-1.2Z" />
          <path className="oa-effect oa-effect-star" d="m49 43 1.5 4.5L55 49l-4.5 1.5L49 55l-1.5-4.5L43 49l4.5-1.5Z" />
          <rect className="oa-effect oa-confetti" x="7" y="34" width="2.4" height="5" rx="1" />
          <rect className="oa-effect oa-confetti" x="55" y="34" width="2.4" height="5" rx="1" />
          <rect className="oa-effect oa-confetti" x="19" y="6" width="2.4" height="4.5" rx="1" />
          <rect className="oa-effect oa-confetti" x="42" y="7" width="2.4" height="4.5" rx="1" />
        </g>
      </svg>
    </span>
  );
}
