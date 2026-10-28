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
- **Caducidad durante la conexión:** El servidor valida `exp` en el handshake y programa un temporizador que ejecuta `socket.disconnect(true)` al vencer el token; el cliente debe reconectar con un token válido. Si el socket se desconecta antes de que venza, se libera el temporizador con `clearTimeout`. Mientras tanto, la autorización de salas sigue basándose en `GamePlayer`.

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

### Reconexión

Una reconexión crea un socket nuevo. Por tanto, el servidor no puede recuperar automáticamente datos guardados en `socket.data` del socket anterior, ni recibe automáticamente un evento `reconnect` del cliente.

El cliente conserva el identificador de la partida fuera del socket (por ejemplo, en el estado de la pantalla). En **cada** evento `connect`, tanto inicial como después de reconectar, debe:

1. Conectarse con un JWT válido en el *handshake*.
2. Emitir `join:game` con el id que conserva.
3. Esperar `joined:game`. Este evento confirma que el servidor ha vuelto a comprobar la fila `GamePlayer` y ha unido el socket nuevo a la sala.
4. Solicitar `GET /api/games/:id` con el mismo JWT para recuperar el estado público persistido. El socket no envía ese estado. La respuesta incluye `turnVersion`, que identifica la versión exacta del *snapshot* recuperado.

### Versiones y eventos retrasados

`game:updated` es solo un aviso de que puede haber cambiado una partida. Su
payload no sustituye el estado local ni contiene preguntas, puntuaciones o
respuestas. Al recibirlo, el cliente vuelve a pedir `GET /api/games/:id`.

El cliente conserva la `turnVersion` del último *snapshot* aplicado y solo
renderiza una respuesta HTTP cuya versión sea igual o mayor. Si una respuesta
antigua llega después de otra más reciente, se descarta. Así, un evento
retrasado nunca hace retroceder la interfaz.

Si se pierde la respuesta HTTP al enviar una jugada, el cliente debe consultar
primero el `GET`: si la pregunta aparece como `answered: true` para ese
jugador, no reintenta el `POST /answers`; si sigue pendiente, puede reintentar
la jugada. La base de datos mantiene además la protección contra duplicados.

**Flujo que debe seguir el cliente:**

1. Conserva `gameId` y la última `turnVersion` aplicada fuera del socket.
2. En cada `connect`, emite `join:game` con ese `gameId`.
3. Tras recibir `joined:game`, consulta `GET /api/games/:id` con el JWT.
4. Guarda y muestra el estado solo si la `turnVersion` recibida es igual o mayor
   que la última aplicada.
5. Cuando recibe `game:updated` para esa partida, repite la consulta `GET`; no
   usa el payload del evento como estado de la interfaz.
6. Si se pierde la respuesta de `POST /api/games/:id/answers`, consulta primero
   el `GET` y reintenta únicamente si esa pregunta todavía no figura como
   respondida por el usuario.
