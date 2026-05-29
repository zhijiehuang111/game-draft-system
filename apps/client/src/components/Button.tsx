import type { ButtonHTMLAttributes, CSSProperties } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "xl";
}

const STYLE: Record<
  Variant,
  { border: string; inner: string; text: string; hoverInner: string }
> = {
  primary: {
    border: "linear-gradient(180deg, #F0E6D2 0%, #C8AA6E 50%, #785A28 100%)",
    inner: "linear-gradient(180deg, #1E2328 0%, #1E2328 100%)",
    text: "#F0E6D2",
    hoverInner: "linear-gradient(180deg, #2A2D34 0%, #0F1B33 100%)",
  },
  secondary: {
    border: "linear-gradient(180deg, #785A28 0%, #463714 100%)",
    inner: "linear-gradient(180deg, #0A1428 0%, #010A13 100%)",
    text: "#A09B8C",
    hoverInner: "linear-gradient(180deg, #0F1B33 0%, #050B17 100%)",
  },
  danger: {
    border: "linear-gradient(180deg, #C8404B 0%, #5C1E20 100%)",
    inner: "linear-gradient(180deg, #1E0709 0%, #0A0303 100%)",
    text: "#F0E6D2",
    hoverInner: "linear-gradient(180deg, #2A0A0E 0%, #150505 100%)",
  },
  ghost: {
    border: "transparent",
    inner: "transparent",
    text: "#A09B8C",
    hoverInner: "rgba(200, 170, 110,0.08)",
  },
};

const PADDING: Record<NonNullable<Props["size"]>, string> = {
  sm: "px-3 py-1.5 text-[11px]",
  md: "px-5 py-2 text-xs",
  lg: "px-8 py-3 text-sm",
  xl: "px-14 py-4 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  style,
  children,
  ...rest
}: Props) {
  const v = STYLE[variant];
  const clip = "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)";

  if (variant === "ghost") {
    return (
      <button
        type="button"
        disabled={disabled}
        {...rest}
        className={`h-label transition-colors hover:text-gold-light disabled:opacity-40 ${PADDING[size]} ${className}`}
        style={{ color: v.text, ...style }}
      >
        {children}
      </button>
    );
  }

  const wrapStyle: CSSProperties = {
    background: v.border,
    clipPath: clip,
    padding: 1,
    opacity: disabled ? 0.45 : 1,
    transition: "filter .15s, transform .15s",
    ["--btn-bg" as string]: v.inner,
    ["--btn-bg-hover" as string]: v.hoverInner,
    color: v.text,
  };
  const innerStyle: CSSProperties = {
    background: "var(--btn-bg)",
    clipPath: clip,
  };

  return (
    <button
      type="button"
      disabled={disabled}
      {...rest}
      className={`relative inline-block ${disabled ? "cursor-not-allowed" : "group cursor-pointer hover:scale-[1.02] active:scale-[0.99]"} ${className}`}
      style={wrapStyle}
    >
      <span
        className={`block text-center font-display font-semibold uppercase tracking-[0.28em] transition-[background,color] duration-200 group-hover:bg-[var(--btn-bg-hover)] ${PADDING[size]}`}
        style={innerStyle}
      >
        {children}
      </span>
    </button>
  );
}
