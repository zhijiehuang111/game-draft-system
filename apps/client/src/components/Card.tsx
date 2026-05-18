import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`bg-slate-800 border border-slate-700 rounded-lg p-4 ${className}`}
    />
  );
}
