import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const variantClass: Record<Variant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300',
  secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:bg-slate-100',
  danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`px-4 py-2 rounded font-medium transition-colors ${variantClass[variant]} ${className}`}
    />
  );
}
