import { Countdown } from "./Countdown.js";
import { Ornament } from "./Ornament.js";

interface Props {
  title?: string;
  phaseEndsAt: number;
  tone?: "gold" | "hex";
}

const TIMER_COLOR: Record<NonNullable<Props["tone"]>, string> = {
  gold: "#F0E6D2",
  hex: "#0AC8B9",
};

const TIMER_SHADOW: Record<NonNullable<Props["tone"]>, string> = {
  gold: "0 0 24px rgba(200, 170, 110,0.55)",
  hex: "0 0 24px rgba(10, 200, 185,0.55)",
};

export function PhaseHeader({ title, phaseEndsAt, tone = "gold" }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 fade-up">
      <Ornament width={320} />
      <div className="flex flex-col items-center -mt-1">
        <div
          className="numeric font-display leading-none text-[56px] font-bold tracking-[0.04em]"
          style={{
            color: TIMER_COLOR[tone],
            textShadow: TIMER_SHADOW[tone],
          }}
        >
          <Countdown phaseEndsAt={phaseEndsAt} />
        </div>
        {title && (
          <div className="h-display text-[14px] mt-2 tracking-[0.42em]">
            {title}
          </div>
        )}
      </div>
      <Ornament width={320} flip />
    </div>
  );
}
