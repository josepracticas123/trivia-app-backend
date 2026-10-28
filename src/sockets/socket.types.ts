// src/sockets/socket.types.ts
import type { Socket } from "socket.io";

export interface SocketData {
  userId: number;
  expirationTimeout?: NodeJS.Timeout;
}

export interface ClientToServerEvents {
  "join:game": (gameId: number | string) => void;
}

export interface ServerToClientEvents {
  "joined:game": (payload: { gameId: number }) => void;
  "error:game": (payload: { message: string }) => void;
  "game:updated": (payload: { id: number; status: string; turnVersion: number }) => void;
}

export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type AppServer = import("socket.io").Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
