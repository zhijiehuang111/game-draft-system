import { io as ioClient } from 'socket.io-client';
import { useAppStore, type AppStore } from '../stores/index.js';
import type { AppSocket } from '../stores/socketSlice.js';

export function connectSocket(): AppSocket {
  const existing = useAppStore.getState().socket;
  if (existing) return existing;

  const socket: AppSocket = ioClient({
    path: '/socket.io',
    withCredentials: true,
  });

  socket.on('connect', () => {
    useAppStore.setState({ socketConnected: true });
    // Re-join room on reconnect if we still have one in state
    const current = useAppStore.getState().currentRoom;
    if (current) socket.emit('room:join', { roomId: current.roomId });
  });
  socket.on('disconnect', () => {
    useAppStore.setState({ socketConnected: false });
  });
  socket.on('connect_error', (err) => {
    console.error('socket connect_error', err.message);
  });

  socket.on('queue:update', (payload) => {
    const next: Partial<AppStore> = { queueSize: payload.size };
    if (payload.position !== undefined) next.inQueue = true;
    useAppStore.setState(next);
  });

  socket.on('room:start', (payload) => {
    useAppStore.setState({
      inQueue: false,
      currentRoom: {
        roomId: payload.roomId,
        phase: 'initial-pick',
        phaseEndsAt: 0,
        serverNow: Date.now(),
        players: [],
        bench: [],
        pendingTrade: null,
        disconnected: {},
      },
    });
    socket.emit('room:join', { roomId: payload.roomId });
  });

  socket.on('room:state', (payload) => {
    useAppStore.getState().setRoomState(payload);
  });

  socket.on('room:phase', (payload) => {
    const apply = useAppStore.getState().applyPhaseChange;
    apply(payload);
  });

  socket.on('trade:incoming', (payload) => {
    useAppStore.setState({ pendingTradeIncoming: payload });
  });

  socket.on('trade:pending', (payload) => {
    useAppStore.setState({ pendingTradeOutgoing: { tradeId: payload.tradeId } });
  });

  socket.on('trade:resolved', () => {
    useAppStore.setState({
      pendingTradeIncoming: null,
      pendingTradeOutgoing: null,
    });
  });

  socket.on('room:result', (results) => {
    useAppStore.setState({ draftResult: results });
  });

  socket.on('room:aborted', (payload) => {
    console.warn('room aborted', payload.reason);
    const partial: Partial<AppStore> = {
      currentRoom: null,
      pendingTradeIncoming: null,
      pendingTradeOutgoing: null,
      draftResult: null,
    };
    useAppStore.setState(partial);
  });

  socket.on('player:disconnected', (payload) => {
    console.info('player disconnected', payload.userId);
  });

  socket.on('player:reconnected', (payload) => {
    console.info('player reconnected', payload.userId);
  });

  socket.on('error', (payload) => {
    console.error('socket error', payload.code, payload.message);
  });

  useAppStore.setState({ socket });
  return socket;
}

export function disconnectSocket(): void {
  const socket = useAppStore.getState().socket;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  useAppStore.setState({ socket: null, socketConnected: false });
}
