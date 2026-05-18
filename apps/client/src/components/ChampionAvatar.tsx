import { useAppStore } from '../stores/index.js';

interface Props {
  championId: string;
  size?: number;
  showName?: boolean;
  className?: string;
}

export function ChampionAvatar({ championId, size = 64, showName = true, className = '' }: Props) {
  const champion = useAppStore((s) => s.champions[championId]);
  const label = champion?.name ?? championId;
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <img
        src={champion?.imageUrl ?? ''}
        alt={label}
        width={size}
        height={size}
        className="rounded bg-slate-700"
      />
      {showName && <span className="text-xs text-slate-300">{label}</span>}
    </div>
  );
}
