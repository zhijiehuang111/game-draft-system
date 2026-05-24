import type { CSSProperties, ReactNode } from 'react';

type Tone = 'gold' | 'hex' | 'dim';

interface Props {
  size?: number;
  tone?: Tone;
  ring?: number;
  glow?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const RING: Record<Tone, string> = {
  gold: 'conic-gradient(from 180deg, #785A28, #C8AA6E 25%, #F0E6D2 50%, #C8AA6E 75%, #785A28)',
  hex:  'conic-gradient(from 180deg, #005A82, #0AC8B9 50%, #005A82)',
  dim:  'conic-gradient(from 180deg, #1E2328, #463714 50%, #1E2328)',
};

const GLOW: Record<Tone, string> = {
  gold: '0 0 18px rgba(200, 170, 110, 0.55)',
  hex:  '0 0 18px rgba(10, 200, 185, 0.55)',
  dim:  'none',
};

/** Circular portrait frame with rotating gold/hex ring. */
export function CircleFrame({
  size = 64,
  tone = 'gold',
  ring = 2,
  glow = false,
  children,
  className = '',
  style,
}: Props) {
  return (
    <div
      className={`relative inline-block ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: RING[tone],
        padding: ring,
        boxShadow: glow ? GLOW[tone] : undefined,
        ...style,
      }}
    >
      <div
        className="w-full h-full overflow-hidden bg-void-2"
        style={{ borderRadius: '50%' }}
      >
        {children}
      </div>
    </div>
  );
}
