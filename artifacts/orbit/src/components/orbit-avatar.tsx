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

/** ORBIT: a little bright-eyed spacecraft creature, built from expressive SVG layers. */
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
  const headGradient = `oa-head-${id}`;
  const bodyGradient = `oa-body-${id}`;
  const wingGradient = `oa-wing-${id}`;
  const bootGradient = `oa-boot-${id}`;
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
        viewBox={headOnly ? '25 0 150 150' : '0 0 200 214'}
        width={size}
        height={size}
        className={cn('oa-svg', headOnly && 'oa-head-icon')}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={headGradient} cx="38%" cy="25%" r="78%">
            <stop className="oa-gradient-light" offset="0" />
            <stop className="oa-gradient-mid" offset=".57" />
            <stop className="oa-gradient-deep" offset="1" />
          </radialGradient>
          <radialGradient id={bodyGradient} cx="35%" cy="20%" r="90%">
            <stop className="oa-gradient-light" offset="0" />
            <stop className="oa-gradient-mid" offset=".56" />
            <stop className="oa-gradient-deep" offset="1" />
          </radialGradient>
          <linearGradient id={wingGradient} x1="0" y1="0" x2="1" y2="1">
            <stop className="oa-wing-light" offset="0" />
            <stop className="oa-wing-deep" offset="1" />
          </linearGradient>
          <linearGradient id={bootGradient} x1="0" y1="0" x2="0" y2="1">
            <stop className="oa-gradient-light" offset="0" />
            <stop className="oa-gradient-deep" offset="1" />
          </linearGradient>
          <filter id={`oa-soft-glow-${id}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.1" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g className="oa-creature" key={`character-${event?.key ?? 'rest'}`}>
        <g className="oa-wings">
          <path className="oa-wing oa-wing-left" d="M49 112C29 104 16 91 12 69c14 7 23 15 28 27-7-19-4-37 8-52 4 20 5 35 2 48 9-17 20-28 34-34-4 23-14 41-31 53Z" fill={`url(#${wingGradient})`} />
          <path className="oa-wing oa-wing-right" d="M151 112c20-8 33-21 37-43-14 7-23 15-28 27 7-19 4-37-8-52-4 20-5 35-2 48-9-17-20-28-34-34 4 23 14 41 31 53Z" fill={`url(#${wingGradient})`} />
          <path className="oa-wing-vein" d="M25 86q16 4 34 23m116-23q-16 4-34 23M32 73q13 9 22 22m114-22q-13 9-22 22" />
          <path className="oa-wing-spark" d="m25 57 2 5 5 2-5 2-2 5-2-5-5-2 5-2zm150 12 2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
        </g>

        <g className="oa-boots" transform="translate(0 14)">
          <path className="oa-flame oa-flame-left" d="M72 168q8 9 3 25l-5-8-3 11q-8-14 5-28Z" />
          <path className="oa-flame oa-flame-right" d="M128 168q-8 9-3 25l5-8 3 11q8-14-5-28Z" />
          <path className="oa-boot" d="M65 154q2-7 12-6h9v15q-5 7-19 1Z" fill={`url(#${bootGradient})`} />
          <path className="oa-boot" d="M114 148h9q10-1 12 6l-2 10q-14 6-19-1Z" fill={`url(#${bootGradient})`} />
          <path className="oa-boot-rim" d="M67 156q10 5 19 0m29 0q9 5 19 0" />
          <path className="oa-boot-glint" d="m70 163 2 3m57-3-2 3" />
        </g>

        <g className="oa-body-group">
          <path className="oa-arm oa-arm-left" d="M66 112q-20 5-29 22-5 9 2 14l8-2q7-10 22-13Z" fill={`url(#${bodyGradient})`} />
          <path className="oa-arm oa-arm-right" d="M134 112q20 5 29 22 5 9-2 14l-8-2q-7-10-22-13Z" fill={`url(#${bodyGradient})`} />
          <path className="oa-hand oa-hand-left" d="M40 139q-7-8-11 0-2 7 4 10l7-2 5 2q5-4 1-9Z" />
          <path className="oa-hand oa-hand-right" d="M160 139q7-8 11 0 2 7-4 10l-7-2-5 2q-5-4-1-9Z" />
          <path className="oa-claw" d="m32 139-2 7m9-6-1 8m129-9 2 7m-9-6 1 8" />
          <path className="oa-leg oa-leg-left" d="M77 145q-7 3-7 13l8 5 9-4v-14Zm46 0q7 3 7 13l-8 5-9-4v-14Z" fill={`url(#${bodyGradient})`} />
          <path className="oa-body" d="M73 99q27-13 54 0 12 7 13 25l-3 30q-2 11-15 14-22 8-44 0-13-4-15-17l-2-27q0-18 12-25Z" fill={`url(#${bodyGradient})`} />
          <path className="oa-body-sheen" d="M75 107q16-10 34-7" />
          <path className="oa-circuit oa-circuit-left" d="M70 112q10 2 14 10l-6 7h-8m14-7 11 1 4 9-9 7v11m-19-4 9-2 6 7m-8-28-8-3m26 3 3-8m-22 34 9-2 3 7" />
          <path className="oa-circuit oa-circuit-right" d="M130 112q-10 2-14 10l6 7h8m-14-7-11 1-4 9 9 7v11m19-4-9-2-6 7m8-28 8-3m-26 3-3-8m22 34-9-2-3 7" />
          <circle className="oa-circuit-node" cx="70" cy="133" r="2.2" />
          <circle className="oa-circuit-node" cx="130" cy="133" r="2.2" />
          <g className="oa-heart-unit" transform="translate(0 16)">
          <path className="oa-heart-halo" d="M100 110c-4-7-15-4-14 4 1 7 14 15 14 15s13-8 14-15c1-8-10-11-14-4Z" />
          <path className="oa-heart" d="M100 112c-4-6-12-3-11 3 1 6 11 12 11 12s10-6 11-12c1-6-7-9-11-3Z" />
          <path className="oa-heart-facet" d="m100 113-5 3 5 10 5-10zm-5 3 5 2 5-2m-5-2v4" />
          <path className="oa-heart-glint" d="m95 115 2-2m10 4 2-2" />
          </g>
          <circle className="oa-body-dot" cx="89" cy="153" r="1.4" />
          <circle className="oa-body-dot" cx="111" cy="148" r="1.1" />
        </g>

        <g className="oa-head">
          <path className="oa-ear oa-ear-left" d="M58 42Q40 36 34 8q20 7 32 25l2 15Z" fill={`url(#${headGradient})`} />
          <path className="oa-ear oa-ear-right" d="M142 42q18-6 24-34-20 7-32 25l-2 15Z" fill={`url(#${headGradient})`} />
          <path className="oa-ear-inner" d="M54 34Q44 26 42 17q11 7 18 16m86 1q10-8 12-17-11 7-18 16" />
          <path className="oa-head-shape" d="M100 13C64 13 43 35 43 68c0 30 22 48 57 48s57-18 57-48c0-33-21-55-57-55Z" fill={`url(#${headGradient})`} />
          <path className="oa-head-highlight" d="M65 35q13-15 32-14m-32 4q4-4 8-5" />
          <g className="oa-freckles">
            <circle cx="87" cy="27" r="1.25" /><circle cx="96" cy="23" r="1.5" /><circle cx="105" cy="25" r="1.25" /><circle cx="114" cy="29" r="1.15" />
            <circle cx="62" cy="76" r="1.4" /><circle cx="138" cy="76" r="1.4" />
          </g>
          <g className="oa-cheek-mark oa-cheek-left">
            <path d="M52 78q8-7 17 0l-4 5q-8 2-13-5Z" />
            <path d="M57 78h8m-5-3 2 7" />
            <circle cx="50" cy="72" r="1.1" />
          </g>
          <g className="oa-cheek-mark oa-cheek-right">
            <path d="M148 78q-8-7-17 0l4 5q8 2 13-5Z" />
            <path d="M143 78h-8m5-3-2 7" />
            <circle cx="150" cy="72" r="1.1" />
          </g>
          <g className="oa-brows">
            <path className="oa-brow oa-brow-left" d="M67 54q8-5 16 0" />
            <path className="oa-brow oa-brow-right" d="M117 54q8-5 16 0" />
          </g>
          <g className="oa-eyes">
            <g className="oa-eye oa-eye-left">
              <ellipse className="oa-eye-rim" cx="75" cy="66" rx="14.5" ry="16.7" />
              <ellipse className="oa-eye-darkrim" cx="75" cy="66" rx="12.1" ry="14.2" />
              <ellipse className="oa-eye-black" cx="75" cy="66" rx="10.4" ry="12.5" />
              <ellipse className="oa-eye-reflect" cx="70.5" cy="60.5" rx="3.4" ry="4.2" />
              <circle className="oa-eye-reflect-small" cx="80.5" cy="70" r="1.5" />
            </g>
            <g className="oa-eye oa-eye-right">
              <ellipse className="oa-eye-rim" cx="125" cy="66" rx="14.5" ry="16.7" />
              <ellipse className="oa-eye-darkrim" cx="125" cy="66" rx="12.1" ry="14.2" />
              <ellipse className="oa-eye-black" cx="125" cy="66" rx="10.4" ry="12.5" />
              <ellipse className="oa-eye-reflect" cx="120.5" cy="60.5" rx="3.4" ry="4.2" />
              <circle className="oa-eye-reflect-small" cx="130.5" cy="70" r="1.5" />
            </g>
            <path className="oa-lid oa-lid-left" d="M60 65q15-20 30 0v-8q-15-13-30 0Z" />
            <path className="oa-lid oa-lid-right" d="M110 65q15-20 30 0v-8q-15-13-30 0Z" />
            <path className="oa-sleep-line" d="M63 67q12 7 24 0m26 0q12 7 24 0" />
          </g>
          <path className="oa-nose" d="M92 84q8-6 16 0-1 6-8 7-7-1-8-7Z" />
          <g className="oa-nostrils">
            <circle cx="96.5" cy="84.5" r="1.1" />
            <circle cx="103.5" cy="84.5" r="1.1" />
          </g>
          <g className="oa-mouths">
            <path className="oa-mouth oa-mouth-rest" d="M88 94q12 6 24 0" />
            <path className="oa-mouth oa-mouth-happy" d="M85 93q15 18 30 0c-2 13-9 18-15 18s-13-5-15-18Z" />
            <path className="oa-mouth oa-mouth-curious" d="M96 96q4-3 8 0" />
            <path className="oa-mouth oa-mouth-concern" d="M88 100q12-8 24 0" />
            <path className="oa-mouth oa-mouth-frustrated" d="M87 100q13-8 26 0" />
            <ellipse className="oa-mouth oa-mouth-surprised" cx="100" cy="100" rx="5.2" ry="7" />
            <path className="oa-mouth oa-mouth-speaking" d="M89 95q11 12 22 0c-3 10-7 12-11 12s-8-2-11-12Z" />
            <path className="oa-mouth-inner" d="M94 101q6 3 12 0" />
          </g>
          <path className="oa-cheek-glow oa-cheek-glow-left" d="M57 91q8-5 15 0" />
          <path className="oa-cheek-glow oa-cheek-glow-right" d="M128 91q8-5 15 0" />
        </g>
        </g>
        <g className="oa-effects" key={`effects-${event?.key ?? 'rest'}`} aria-hidden="true">
          <path className="oa-effect oa-effect-star" d="m30 22 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
          <path className="oa-effect oa-effect-star" d="m168 42 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
          <path className="oa-effect oa-effect-star" d="m151 8 1.5 4.5L157 14l-4.5 1.5L151 20l-1.5-4.5L145 14l4.5-1.5Z" />
          <rect className="oa-effect oa-confetti" x="22" y="66" width="3" height="7" rx="1" />
          <rect className="oa-effect oa-confetti" x="175" y="81" width="3" height="7" rx="1" />
          <rect className="oa-effect oa-confetti" x="45" y="10" width="3" height="6" rx="1" />
          <rect className="oa-effect oa-confetti" x="159" y="23" width="3" height="6" rx="1" />
        </g>
      </svg>
    </span>
  );
}
