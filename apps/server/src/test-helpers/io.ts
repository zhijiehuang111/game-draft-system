import type { AppIoServer } from "../realtime/io.js";

export interface EmitRecord {
  target: string | null;
  event: string;
  payload: unknown;
}

/**
 * 一個只記錄 emit 的假 Socket.IO server。
 * `io.emit(...)` 記成 target=null,`io.to(room).emit(...)` 記成 target=room。
 */
export function createFakeIo() {
  const emits: EmitRecord[] = [];
  const io = {
    emit: (event: string, payload: unknown) =>
      emits.push({ target: null, event, payload }),
    to: (room: string) => ({
      emit: (event: string, payload: unknown) =>
        emits.push({ target: room, event, payload }),
    }),
  };
  return { io: io as unknown as AppIoServer, emits };
}
