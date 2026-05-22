import { useAppStore } from '../stores/index.js';
import { BenchTradeScreen } from './BenchTradeScreen.js';
import { InitialPickScreen } from './InitialPickScreen.js';
import { LockInScreen } from './LockInScreen.js';

export function RoomScreen() {
  const room = useAppStore((s) => s.currentRoom);
  if (!room) return null;

  switch (room.phase) {
    case 'initial-pick':
      return <InitialPickScreen />;
    case 'bench-trade':
      return <BenchTradeScreen />;
    case 'lock-in':
    case 'done':
      return <LockInScreen />;
    default:
      return null;
  }
}
