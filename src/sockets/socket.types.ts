// src/sockets/socket.types.ts
import type { Socket } from "socket.io";

export type PresenceStatus = "AVAILABLE" | "IN_GAME";
export type PresenceChangeStatus = PresenceStatus | "OFFLINE";

export interface PresenceUserPayload {
  userId: number;
  displayName: string;
  status: PresenceStatus;
}

export interface PresencePagePayload {
  items: PresenceUserPayload[];
  nextCursor: number | null;
}

export interface GameInviteReceivedPayload {
  inviteId: string;
  from: { userId: number; displayName: string };
  expiresAt: string;
}

export interface GameInviteResultPayload {
  inviteId: string;
  gameId: number;
  status: "WAITING";
}

export type InviteActionResult =
  | { ok: true; inviteId: string; expiresAt?: string; gameId?: number; status?: "WAITING" }
  | { ok: false; error: string };

export interface SocketData {
  userId: number;
  displayName: string;
  presenceStatus: PresenceStatus;
  expirationTimeout?: NodeJS.Timeout;
}

export type GameStatus = "WAITING" | "ACTIVE" | "FINISHED";
export type GameMode = "INDIVIDUAL" | "MULTIPLAYER";

export interface GameCreatedPayload {
  id: number;
  mode: GameMode;
  status: GameStatus;
  code: string | null;
  createdAt: string;
}

export interface GameChangedPayload {
  id: number;
  status: GameStatus;
  turnVersion: number;
}

export interface GameDeletedPayload {
  id: number;
}

export interface ClientToServerEvents {
  "join:game": (gameId: number | string) => void;
  "presence:request": (payload?: { limit?: number; cursor?: number }) => void;
  "game:invite:send": (
    payload: { receiverId: number },
    acknowledge: (result: InviteActionResult) => void,
  ) => void;
  "game:invite:accept": (
    payload: { inviteId: string },
    acknowledge: (result: InviteActionResult) => void,
  ) => void;
  "game:invite:reject": (
    payload: { inviteId: string },
    acknowledge: (result: InviteActionResult) => void,
  ) => void;
  "game:invite:cancel": (
    payload: { inviteId: string },
    acknowledge: (result: InviteActionResult) => void,
  ) => void;
}

export interface ServerToClientEvents {
  "joined:game": (payload: { gameId: number }) => void;
  "error:game": (payload: { message: string }) => void;
  "presence:available": (payload: PresencePagePayload) => void;
  "presence:error": (payload: { message: string }) => void;
  "presence:changed": (payload: Omit<PresenceUserPayload, "status"> & { status: PresenceChangeStatus }) => void;
  /** Refresh GET /api/me/games; fetch GET /api/games/:id if opening this game. */
  "game:created": (payload: GameCreatedPayload) => void;
  /** Refresh GET /api/me/games and GET /api/games/:id for the joining user. */
  "game:joined": (payload: GameChangedPayload) => void;
  /** Fetch GET /api/games/:id; refresh GET /api/me/games for history changes. */
  "game:updated": (payload: GameChangedPayload) => void;
  /** Refresh GET /api/me/games and leave the deleted game's screen. */
  "game:deleted": (payload: GameDeletedPayload) => void;
  "game:invite": (payload: GameInviteReceivedPayload) => void;
  "game:invite:accepted": (payload: GameInviteResultPayload) => void;
  "game:invite:rejected": (payload: { inviteId: string }) => void;
  "game:invite:cancelled": (payload: { inviteId: string }) => void;
  "game:invite:expired": (payload: { inviteId: string }) => void;
}

export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type AppServer = import("socket.io").Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
