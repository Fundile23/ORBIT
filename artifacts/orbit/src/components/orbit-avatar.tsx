import { useId } from 'react';
import type { AvatarTone } from '@/lib/avatar-tone';
import { useAvatarExpression } from '@/components/avatar-expression-context';
import { cn } from '@/lib/utils';
import './orbit-avatar.css';

type Props = {
  size?: number;
  thinking?: boolean;
  tone?: AvatarTone;
  className?: string;
  decorative?: boolean;
};

/** ORBIT's companion: a small, friendly planet with its own moon. */
export function OrbitAvatar({ size = 40, thinking, tone, className, decorative = true }: Props) {
  const expression = useAvatarExpression();
  const gradientId = `oa-body-${useId().replace(/:/g, '')}`;
  const effectiveTone = tone ?? expression.tone;
  const effectiveThinking = thinking ?? expression.thinking;
  const faceLabel = effectiveThinking
    ? 'ORBIT is listening thoughtfully'
    : {
        neutral: 'ORBIT has a gentle, neutral expression',
        joyful: 'ORBIT has a softly joyful expression',
        playful: 'ORBIT has a playful expression',
        supportive: 'ORBIT has a gentle, attentive expression',
        calm: 'ORBIT has a calm, reassuring expression',
        tired: 'ORBIT has a softly sleepy expression',
        curious: 'ORBIT has a curious expression',
      }[effectiveTone];

  return (
    <span
      className={cn('orbit-avatar relative inline-flex shrink-0', size >= 40 && 'oa-motion', className)}
      style={{ width: size, height: size }}
      data-tone={effectiveTone}
      data-thinking={effectiveThinking}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : faceLabel}
      aria-hidden={decorative ? true : undefined}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="oa-svg overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id={gradientId} cx="38%" cy="30%" r="72%">
            <stop className="oa-gradient-light" offset="0" />
            <stop className="oa-gradient-mid" offset=".5" />
            <stop className="oa-gradient-deep" offset="1" />
          </radialGradient>
        </defs>
        <g className="oa-orbit">
          <ellipse cx="32" cy="32" rx="29" ry="29" fill="none" stroke="var(--oa-orbit)" strokeOpacity=".42" strokeDasharray="2 5" />
          <circle cx="32" cy="3" r="3.2" fill="var(--oa-moon)" />
        </g>
        <circle className="oa-planet" cx="32" cy="32" r="17" fill={`url(#${gradientId})`} />
        <ellipse cx="26" cy="25" rx="5" ry="3" fill="#ffffff" opacity=".25" />
        <g className="oa-brows" fill="none" stroke="var(--oa-ink)" strokeWidth="1.25" strokeLinecap="round">
          <path className="oa-brow-left" d="M24.5 27q2-1.1 4 .1" />
          <path className="oa-brow-right" d="M35.5 27.1q2-1.2 4-.1" />
        </g>
        <g className="oa-eyes">
          <g className="oa-round-eyes" fill="var(--oa-ink)">
            <circle className="oa-eye-left" cx="26.5" cy="31" r="1.9" />
            <circle className="oa-eye-right" cx="37.5" cy="31" r="1.9" />
          </g>
          <g className="oa-smile-eyes" fill="none" stroke="var(--oa-ink)" strokeWidth="1.65" strokeLinecap="round">
            <path d="M24.6 31q1.9 2.8 3.8 0" />
            <path d="M35.6 31q1.9 2.8 3.8 0" />
          </g>
          <path className="oa-wink" d="M35.6 31q1.9 2.8 3.8 0" fill="none" stroke="var(--oa-ink)" strokeWidth="1.7" strokeLinecap="round" />
          <path className="oa-lids" d="M24.7 30.8q1.8 1.2 3.6 0m7.4 0q1.8 1.2 3.6 0" fill="none" stroke="var(--oa-ink)" strokeWidth="2.1" strokeLinecap="round" />
        </g>
        <g className="oa-mouths" fill="none" stroke="var(--oa-ink)" strokeWidth="1.8" strokeLinecap="round">
          <path className="oa-mouth oa-mouth-neutral" d="M28 36.5q4 2.8 8 0" />
          <path className="oa-mouth oa-mouth-joyful" d="M27 36q5 5.1 10 0" />
          <path className="oa-mouth oa-mouth-playful" d="M28 36.2q3.5 3.6 7 0" />
          <path className="oa-mouth oa-mouth-supportive" d="M28 37q4 2.3 8 0" />
          <path className="oa-mouth oa-mouth-calm" d="M28 36.8q4 2.6 8 0" />
          <path className="oa-mouth oa-mouth-tired" d="M28 37.2q4 1.7 8 0" />
          <path className="oa-mouth oa-mouth-curious" d="M30 36.4q2-1.2 4 0" />
          <path className="oa-mouth oa-mouth-thinking" d="M28 37h8" />
        </g>
        <circle className="oa-blush oa-blush-left" cx="22.5" cy="35.5" r="2" fill="var(--oa-blush)" />
        <circle className="oa-blush oa-blush-right" cx="41.5" cy="35.5" r="2" fill="var(--oa-blush)" />
      </svg>
    </span>
  );
}
