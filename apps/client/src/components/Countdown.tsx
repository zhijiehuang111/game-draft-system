import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/index.js';

interface Props {
  phaseEndsAt: number;
  className?: string;
}

export function Countdown({ phaseEndsAt, className = '' }: Props) {
  const offset = useAppStore((s) => s.serverOffsetMs);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, phaseEndsAt - (Date.now() + offset)),
  );

  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, phaseEndsAt - (Date.now() + offset));
      setRemaining(next);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phaseEndsAt, offset]);

  const seconds = Math.ceil(remaining / 1000);
  return <span className={className}>{seconds}s</span>;
}
