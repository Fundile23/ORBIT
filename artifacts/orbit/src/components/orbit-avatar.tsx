import { cn } from '@/lib/utils';

type Props = { size?: number; thinking?: boolean; className?: string; decorative?: boolean };

/** ORBIT's companion: a small, friendly planet with its own moon. */
export function OrbitAvatar({ size = 40, thinking = false, className, decorative = true }: Props) {
  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: size, height: size }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'ORBIT companion'}
      aria-hidden={decorative ? true : undefined}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id="oa-body" cx="38%" cy="30%" r="72%">
            <stop offset="0" stopColor="#d4e9ff" />
            <stop offset=".5" stopColor="#86b8f6" />
            <stop offset="1" stopColor="#7560d4" />
          </radialGradient>
        </defs>
        <g className={thinking ? 'anim-spin-fast' : 'anim-spin-slow'}>
          <ellipse cx="32" cy="32" rx="29" ry="29" fill="none" stroke="#9fc6ff" strokeOpacity=".22" strokeDasharray="2 5" />
          <circle cx="32" cy="3" r="3.2" fill="#c8b8ff" />
        </g>
        <circle cx="32" cy="32" r="17" fill="url(#oa-body)" />
        <ellipse cx="26" cy="25" rx="5" ry="3" fill="#ffffff" opacity=".25" />
        <circle cx="26.5" cy="31" r="1.9" fill="#141a3a" />
        <circle cx="37.5" cy="31" r="1.9" fill="#141a3a" />
        <path d={thinking ? 'M28 37.5h8' : 'M27.5 36.5q4.5 3.6 9 0'} fill="none" stroke="#141a3a" strokeWidth="1.9" strokeLinecap="round" />
        <circle cx="22.5" cy="35.5" r="2" fill="#f2a6c8" opacity=".35" />
        <circle cx="41.5" cy="35.5" r="2" fill="#f2a6c8" opacity=".35" />
      </svg>
    </span>
  );
}
