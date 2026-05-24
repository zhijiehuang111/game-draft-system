import { useAppStore } from '../stores/index.js';
import { CircleFrame } from './CircleFrame.js';

interface Props {
  championId: string;
  size?: number;
  showName?: boolean;
  className?: string;
  tone?: 'gold' | 'hex' | 'dim';
  glow?: boolean;
  ring?: number;
}

export function ChampionAvatar({
  championId,
  size = 64,
  showName = true,
  className = '',
  tone = 'gold',
  glow = false,
  ring = 2,
}: Props) {
  const champion = useAppStore((s) => s.champions[championId]);
  const label = champion?.name ?? championId;
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <CircleFrame size={size} tone={tone} glow={glow} ring={ring}>
        {champion?.imageUrl ? (
          <img
            src={champion.imageUrl}
            alt={label}
            width={size}
            height={size}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-void-2" />
        )}
      </CircleFrame>
      {showName && (
        <span className="font-label text-[11px] tracking-[0.08em] text-parchment/85">
          {label}
        </span>
      )}
    </div>
  );
}
