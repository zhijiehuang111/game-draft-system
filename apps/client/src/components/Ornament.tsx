import type { CSSProperties } from 'react';

interface Props {
  width?: number;
  className?: string;
  flip?: boolean;
}

/** Decorative LoL-style filigree divider with a centered diamond. */
export function Ornament({ width = 240, className = '', flip = false }: Props) {
  return (
    <svg
      width={width}
      height={14}
      viewBox="0 0 240 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transform: flip ? 'scaleY(-1)' : undefined }}
    >
      <defs>
        <linearGradient id="ornGold" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C8AA6E" stopOpacity="0" />
          <stop offset="0.5" stopColor="#F0E6D2" />
          <stop offset="1" stopColor="#C8AA6E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="7" x2="108" y2="7" stroke="url(#ornGold)" strokeWidth="1" />
      <line x1="132" y1="7" x2="240" y2="7" stroke="url(#ornGold)" strokeWidth="1" />
      <path
        d="M120 1 L127 7 L120 13 L113 7 Z"
        fill="#0A1428"
        stroke="#C8AA6E"
        strokeWidth="1"
      />
      <path d="M120 4 L123 7 L120 10 L117 7 Z" fill="#C8AA6E" />
      <line x1="100" y1="7" x2="106" y2="7" stroke="#C8AA6E" strokeWidth="1.5" />
      <line x1="134" y1="7" x2="140" y2="7" stroke="#C8AA6E" strokeWidth="1.5" />
    </svg>
  );
}

interface CornerProps {
  size?: number;
  className?: string;
  color?: string;
  style?: CSSProperties;
}

/** Small corner bracket; for the full 4-corner frame use CornerFrame. */
export function CornerBracket({ size = 14, className = '', color = '#C8AA6E', style }: CornerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 6 L0 0 L6 0" stroke={color} strokeWidth="1.5" fill="none" />
      <circle cx="1" cy="1" r="1" fill={color} />
    </svg>
  );
}

interface FrameProps {
  size?: number;
  inset?: number;
  color?: string;
}

/** Four corner brackets at the corners of the parent. Parent must be `relative`. */
export function CornerFrame({ size = 14, inset = 8, color = '#C8AA6E' }: FrameProps) {
  const p = `${inset}px`;
  const base = 'absolute pointer-events-none';
  return (
    <>
      <CornerBracket size={size} color={color} className={base} style={{ top: p, left: p }} />
      <CornerBracket size={size} color={color} className={`${base} rotate-90`} style={{ top: p, right: p }} />
      <CornerBracket size={size} color={color} className={`${base} rotate-180`} style={{ bottom: p, right: p }} />
      <CornerBracket size={size} color={color} className={`${base} -rotate-90`} style={{ bottom: p, left: p }} />
    </>
  );
}
