import { io as ioClient } from "socket.io-client";
import { showToast } from "../components/Toast.js";
import { useAppStore, type AppStore } from "../stores/index.js";
import type { AppSocket } from "../stores/socketSlice.js";

export function connectSocket(): AppSocket {
  const existing = useAppStore.getState().socket;
  if (existing) return existing;

  const socket: AppSocket = ioClient({
    path: "/socket.io",
    withCredentials: true,
  });

  socket.on("connect", () => {
    useAppStore.setState({ socketConnected: true });
    // Re-join room on reconnect if we still have one in state
    const current = useAppStore.getState().currentRoom;
    if (current) socket.emit("room:join", { roomId: current.roomId });
  });
  socket.on("disconnect", () => {
    useAppStore.setState({ socketConnected: false });
  });
  socket.on("connect_error", (err) => {
    console.error("socket connect_error", err.message);
  });

  socket.on("queue:update", (payload) => {
    const next: Partial<AppStore> = { queueSize: payload.size };
    if (payload.position !== undefined) next.inQueue = true;
    useAppStore.setState(next);
  });

  socket.on("room:start", (payload) => {
    useAppStore.setState({
      inQueue: false,
      currentRoom: {
        roomId: payload.roomId,
        phase: "initial-pick",
        phaseEndsAt: 0,
        serverNow: Date.now(),
        players: [],
        bench: [],
        pendingTrades: [],
        disconnected: {},
      },
    });
    socket.emit("room:join", { roomId: payload.roomId });
  });

  socket.on("room:state", (payload) => {
    useAppStore.getState().setRoomState(payload);
  });

  socket.on("room:phase", (payload) => {
    const apply = useAppStore.getState().applyPhaseChange;
    apply(payload);
  });

  socket.on("trade:incoming", (payload) => {
    useAppStore.setState({ pendingTradeIncoming: payload });
  });

  socket.on("trade:pending", (payload) => {
    useAppStore.setState({ pendingTradeOutgoing: payload });
  });

  socket.on("trade:resolved", (payload) => {
    const myUserId = useAppStore.getState().user?.id;
    const iWasSender = myUserId === payload.fromUserId;
    const iWasReceiver = myUserId === payload.toUserId;

    const update: Partial<AppStore> = {};
    if (iWasSender) update.pendingTradeOutgoing = null;
    if (iWasReceiver) update.pendingTradeIncoming = null;
    if (Object.keys(update).length > 0) useAppStore.setState(update);

    if (payload.accepted) return;
    if (payload.reason === "cancelled" && iWasReceiver) {
      showToast("Partner cancelled the trade", "info");
    } else if (payload.reason === "timeout" && iWasSender) {
      showToast("Trade timed out", "error");
    } else if (!payload.reason && iWasSender) {
      showToast("Trade declined", "error");
    }
  });

  socket.on("room:result", (results) => {
    useAppStore.setState({ draftResult: results });
  });

  socket.on("room:aborted", (payload) => {
    const partial: Partial<AppStore> = {
      currentRoom: null,
      pendingTradeIncoming: null,
      pendingTradeOutgoing: null,
      draftResult: null,
    };
    useAppStore.setState(partial);
    const message =
      payload.reason === "player-left"
        ? "Opponent offline, room closed"
        : `Room closed (${payload.reason})`;
    showToast(message, "error");
  });

  socket.on("player:disconnected", (payload) => {
    const room = useAppStore.getState().currentRoom;
    if (!room) return;
    useAppStore.setState({
      currentRoom: {
        ...room,
        disconnected: { ...room.disconnected, [payload.userId]: Date.now() },
      },
    });
  });

  socket.on("player:reconnected", (payload) => {
    const room = useAppStore.getState().currentRoom;
    if (!room) return;
    const next = { ...room.disconnected };
    delete next[payload.userId];
    useAppStore.setState({
      currentRoom: { ...room, disconnected: next },
    });
  });

  socket.on("error", (payload) => {
    console.error("socket error", payload.code, payload.message);
    if (payload.code === "room-not-found" || payload.code === "not-in-room") {
      const hadRoom = useAppStore.getState().currentRoom !== null;
      if (hadRoom) {
        useAppStore.setState({
          currentRoom: null,
          pendingTradeIncoming: null,
          pendingTradeOutgoing: null,
          draftResult: null,
        });
        showToast("Room closed", "error");
      }
      return;
    }
    const tradeErrors: Record<string, string> = {
      "has-pending-trade": "You already have a pending trade",
      "target-busy": "Target is already in a trade",
      "no-pending-trade": "Trade no longer pending",
      "not-trade-owner": "Only the requester can cancel",
      "invalid-trade": "Trade no longer valid",
    };
    if (tradeErrors[payload.code]) {
      showToast(tradeErrors[payload.code], "error");
    }
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
