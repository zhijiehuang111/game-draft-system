import { useEffect, useState } from "react";
import { useAppStore } from "../stores/index.js";

interface Props {
  phaseEndsAt: number;
  className?: string;
}

export function Countdown({ phaseEndsAt, className = "" }: Props) {
  const offset = useAppStore((s) => s.serverOffsetMs);
  const compute = () =>
    Math.ceil(Math.max(0, phaseEndsAt - (Date.now() + offset)) / 1000);
  const [seconds, setSeconds] = useState(compute);

  useEffect(() => {
    const tick = () => {
      const next = Math.ceil(
        Math.max(0, phaseEndsAt - (Date.now() + offset)) / 1000,
      );
      setSeconds((prev) => (prev === next ? prev : next));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phaseEndsAt, offset]);

  return <span className={className}>{seconds}</span>;
}
