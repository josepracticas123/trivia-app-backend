# Eventos Socket.IO

Este documento describe los eventos utilizados para notificar cambios de partida en tiempo real. 
Las acciones siguen pasando por la API HTTP. El cliente, tras recibir `game:updated`, debe volver a consultar el estado público con `GET /api/games/:id`. **Nunca** se envían soluciones, respuestas correctas ni información sensible por WebSocket.

## Conexión y autenticación

- **Transporte:** WebSocket (Socket.IO)
- **Autenticación:** Obligatoria en el *handshake*. Se acepta `auth.token` o `query.token`.
- **Cabecera/forma:** `io.connect(url, { auth: { token: "<JWT>" } })`
- **Comprobación:** Se verifica el JWT con `JWT_SECRET`. 
- **Errores al conectar:**
  - `Token de autenticación requerido` -> conexión rechazada
  - `Token inválido o caducado` -> conexión rechazada
- **Caducidad durante la conexión:** Si el token caduca **después** del handshake, la conexión ya queda establecida con el token validado en ese momento. Para acciones futuras se sigue confiando en la autorización por pertenencia a partida (`GamePlayer`). Renovar sesión es responsabilidad del cliente (volver a conectar con un token válido).

## Cliente -> Servidor

### `join:game`
Solicita unirse a la sala de una partida.

- **Payload:** `gameId: number`
- **Autorización:** Debe existir una fila `GamePlayer` para `(userId, gameId)`. **Conocer el ID de la partida NO basta**.
- **Comportamiento:**
  1. Se comprueba pertenencia en base de datos.
  2. Si pertenece -> `socket.join("game:" + gameId)`. Se responde con `joined:game`.
  3. Si NO pertenece -> Se responde con `error:game` y **NO** se une a la sala.
- **Respuestas/errores:**
  - `joined:game` -> `{ gameId: number }`
  - `error:game` -> `{ message: string }` (ej. "No participas en esta partida", "No se pudo unir a la sala")

## Servidor -> Cliente

### `game:updated`
Aviso de que el estado de la partida ha cambiado. Se emite **únicamente tras guardar y confirmar la operación HTTP en base de datos** (después del commit). **Nunca** antes.

- **Destino:** Sala `game:${gameId}` (solo sockets que se hayan unido correctamente con `join:game`).
- **Payload (mínimo y público):**
```json
{
  "id": 1,
  "status": "ACTIVE" | "WAITING" | "FINISHED",
  "turnVersion": 123
}