// Demostración manual del flujo real de reconexión.
//
// Requiere un servidor en marcha, una partida existente y un JWT del jugador.
// Ejemplo en PowerShell:
// $env:RECONNECT_TOKEN="<JWT>"
// $env:RECONNECT_GAME_ID="7"
// npm test -- tests/reconnect/reconnect.manual.test.ts

import { describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";

// El id de la partida se conserva en el cliente, no en socket.data del servidor.
const gameId = Number(process.env.RECONNECT_GAME_ID);
const token = process.env.RECONNECT_TOKEN;
const baseUrl = process.env.RECONNECT_BASE_URL ?? "http://localhost:3000";
const canRunDemo = Boolean(token) && Number.isInteger(gameId) && gameId > 0;

// Espera un solo evento del socket para no dejar listeners acumulados.
function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

describe.skipIf(!canRunDemo)("Demostración manual: reconexión", () => {
  it("vuelve a entrar en la sala y recupera el estado por HTTP", async () => {
    const socket = io(baseUrl, {
      transports: ["websocket"],
      autoConnect: false,
      auth: { token },
    });

    // Esta función se usa en la conexión inicial y después de reconectar.
    async function subscribeAndLoadGame() {
      const joined = once<{ gameId: number }>(socket, "joined:game");
      socket.emit("join:game", gameId);

      // El servidor ya verificó GamePlayer cuando recibimos joined:game.
      const payload = await joined;
      expect(payload.gameId).toBe(gameId);

      // El estado procede de la API persistida, no de un evento game:state.
      const response = await fetch(`${baseUrl}/api/games/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status).toBe(200);

      return response.json() as Promise<{ id: number }>;
    }

    try {
      const firstConnection = once<void>(socket, "connect");
      socket.connect();
      await firstConnection;
      const firstGame = await subscribeAndLoadGame();
      expect(firstGame.id).toBe(gameId);

      // Al reconectar el servidor recibe un socket nuevo. Repetimos el flujo,
      // sin depender de información almacenada en el socket anterior.
      socket.disconnect();
      const secondConnection = once<void>(socket, "connect");
      socket.connect();
      await secondConnection;
      const recoveredGame = await subscribeAndLoadGame();
      expect(recoveredGame.id).toBe(gameId);
    } finally {
      socket.disconnect();
    }
  });
});
