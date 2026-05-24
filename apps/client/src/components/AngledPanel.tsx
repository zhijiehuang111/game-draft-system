import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

type Variant = 'gold' | 'bronze' | 'hex' | 'inset' | 'crimson';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  notch?: number;
  inner?: string;
  borderWidth?: number;
  children?: ReactNode;
}

const BORDER: Record<Variant, string> = {
  gold:    'linear-gradient(135deg, #C8AA6E 0%, #F0E6D2 45%, #785A28 100%)',
  bronze:  'linear-gradient(135deg, #785A28 0%, #463714 50%, #785A28 100%)',
  hex:     'linear-gradient(135deg, #0AC8B9 0%, #0AC8B9 45%, #005A82 100%)',
  inset:   'linear-gradient(135deg, #463714 0%, #1E2328 100%)',
  crimson: 'linear-gradient(135deg, #C8404B 0%, #C8404B 45%, #5C1E20 100%)',
};

/**
 * LoL-style notched panel. Uses two stacked clip-paths so the border can be a gradient.
 */
export function AngledPanel({
  variant = 'bronze',
  notch = 14,
  borderWidth = 1,
  inner = '#0A1428',
  className = '',
  style,
  children,
  ...rest
}: Props) {
  const clip = `polygon(${notch}px 0, 100% 0, 100% calc(100% - ${notch}px), calc(100% - ${notch}px) 100%, 0 100%, 0 ${notch}px)`;
  const outerStyle: CSSProperties = {
    background: BORDER[variant],
    clipPath: clip,
    padding: borderWidth,
    ...style,
  };
  const innerStyle: CSSProperties = {
    background: inner,
    clipPath: clip,
    minHeight: '100%',
  };
  return (
    <div {...rest} className={`relative ${className}`} style={outerStyle}>
      <div style={innerStyle}>{children}</div>
    </div>
  );
}
