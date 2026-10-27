import type { Server, Socket } from "socket.io";

export interface ClientToServerEvents {
  "join:game": (gameId: number | string) => void;
}

export interface ServerToClientEvents {
  "joined:game": (payload: { gameId: number }) => void;
  "game:updated": (payload: { id: number; status: string; turnVersion: number }) => void;
  "error:game": (payload: { message: string }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  userId: number;
  expirationTimeout?: ReturnType<typeof setTimeout>;
}

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
