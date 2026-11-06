# Eventos Socket.IO

Este documento describe los eventos utilizados para notificar cambios de partida en tiempo real, gestionar presencia y tramitar invitaciones.
Las operaciones habituales de partidas siguen pasando por la API HTTP; presencia e invitaciones usan Socket.IO autenticado. Los eventos de partida son avisos: el cliente consulta el historial con `GET /api/me/games` y el estado público con `GET /api/games/:id`. Si se pierde un aviso, el estado recuperado por HTTP al reconectar es la referencia. **Nunca** se envían soluciones, respuestas correctas ni información sensible por WebSocket.

## Conexión y autenticación

- **Transporte:** WebSocket (Socket.IO)
- **Autenticación:** Obligatoria en el *handshake*, exclusivamente mediante `auth.token`. No se aceptan tokens en query string.
- **Cabecera/forma:** `io.connect(url, { auth: { token: "<JWT>" } })`
- **Comprobación:** Se verifica el JWT con `JWT_SECRET`.
- **Errores al conectar:**
  - `Token de autenticación requerido` -> conexión rechazada
  - `Token inválido o caducado` -> conexión rechazada
- **Caducidad durante la conexión:** El servidor valida `exp` en el handshake y programa un temporizador que ejecuta `socket.disconnect(true)` al vencer el token; el cliente debe reconectar con un token válido. Si el socket se desconecta antes de que venza, se libera el temporizador con `clearTimeout`. Mientras tanto, la autorización de salas sigue basándose en `GamePlayer`.

## Cliente -> Servidor

### `presence:request`

Solicita una página de usuarios disponibles, excluyendo al usuario autenticado.
Cada socket puede solicitarla una vez por segundo; las solicitudes adicionales reciben `presence:error` y no desencadenan una consulta de presencia.

- **Payload opcional:** `{ limit?: number, cursor?: number }`.
- `limit` admite de 1 a 100 y por defecto es 50. `cursor` es el último `userId`
  recibido; si se omite, la página empieza por el primer usuario.
- **Respuesta:** `presence:available` con
  `{ items: [{ userId, displayName, status: "AVAILABLE" }], nextCursor }`.
  `nextCursor` es un `userId` numérico o `null` cuando no quedan páginas.
- Los datos son una instantánea: el cliente escucha también `presence:changed`
  y vuelve a pedir una página al reconectar o al cambiar de página.
- Un payload inválido produce `presence:error` con
  `{ message: "La paginación de presencia no es válida" }`; si falla la
  consulta de disponibilidad, se responde con
  `{ message: "No se pudo cargar la presencia" }`.

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

Las conexiones autenticadas se suscriben automáticamente a su sala privada
`user:${userId}`. El cliente no debe emitir ni solicitar unirse a ella.

### `presence:changed`

- **Destino:** todos los sockets conectados.
- **Payload:** `{ userId: number, displayName: string, status: "AVAILABLE" | "IN_GAME" | "OFFLINE" }`.
- Se emite cuando el primer socket de una persona se conecta, cambia su
  disponibilidad o se desconecta su último socket. Varias pestañas cuentan
  como una única presencia; cerrar una de ellas no marca al usuario offline.
- `OFFLINE` solo es un aviso y no aparece en `presence:available`.
- Los participantes de cualquier partida multijugador `WAITING` o `ACTIVE`,
  incluido el creador de una sala `WAITING`, están reservados (`IN_GAME`).
  Las partidas individuales no reservan al usuario.
- Solo se publican el id, el nombre público y el estado. No se envían email,
  token ni datos de partida.

### Invitaciones multijugador

Las invitaciones se envían por Socket.IO autenticado con JWT. Todos los
eventos de invitación se validan en el servidor; el cliente no puede elegir el
emisor. Los acuses de recibo usan `{ ok: true, ... }` o
`{ ok: false, error: string }`.

#### Cliente -> servidor

- `game:invite:send` — `{ receiverId: number }`. Requiere que ambas personas
  estén conectadas y `AVAILABLE`; no permite auto-invitaciones. El acuse
  correcto es `{ ok: true, inviteId, expiresAt }`.
- `game:invite:accept` — `{ inviteId: string }`. Solo puede aceptarla el
  destinatario antes de caducar y si ambas personas siguen disponibles.
- `game:invite:reject` — `{ inviteId: string }`. Solo puede rechazarla el
  destinatario.
- `game:invite:cancel` — `{ inviteId: string }`. Solo puede cancelarla quien
  la envió.

El servidor limita a una invitación saliente pendiente y cinco invitaciones
enviadas por usuario en diez minutos; el destinatario puede tener como máximo
cinco invitaciones entrantes pendientes. No se permiten invitaciones repetidas
entre las mismas dos personas mientras haya una pendiente.
Los errores de negocio del acuse incluyen `SELF_INVITE`,
`USER_NOT_AVAILABLE`, `OUTGOING_INVITE_PENDING`, `INVITE_ALREADY_PENDING`,
`INVITE_RATE_LIMITED`, `TOO_MANY_PENDING_INVITES`, `INVITE_EXPIRED`,
`INVITE_NOT_PENDING`, `INVITE_UNAVAILABLE`, `NOT_INVITE_RECIPIENT`,
`NOT_INVITE_SENDER`, `INVITE_NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT` e
`INTERNAL_ERROR`.

#### Servidor -> cliente

- `game:invite` — al destinatario: `{ inviteId, from: { userId, displayName }, expiresAt }`.
- `game:invite:accepted` — a ambos: `{ inviteId, gameId, status: "WAITING" }`.
- `game:invite:rejected`, `game:invite:cancelled` y `game:invite:expired` —
  a los usuarios implicados: `{ inviteId }`.
- Al aceptar se crea una sala multijugador `WAITING` con ambos participantes.
  Los sockets de ambos usuarios se incorporan a `game:${gameId}` y el flujo
  normal de preparación/inicio continúa con `game:created`/`game:joined`.
  La sala privada no requiere ni expone un código de acceso.
- Las invitaciones caducan a los dos minutos. Si el último socket del emisor o
  del destinatario se desconecta, sus invitaciones pendientes se cancelan y se
  notifica a la otra persona.
- Si un usuario pasa a `IN_GAME`, también se cancelan sus invitaciones
  pendientes y se notifica a las personas implicadas.
- Al conectarse o reconectarse, el servidor reenvía al usuario las invitaciones
  entrantes que sigan pendientes y no hayan caducado.
- La aceptación también invalida las demás invitaciones pendientes asociadas
  a cualquiera de los dos jugadores. Una persona no puede permanecer en más
  de una partida multijugador `WAITING` o `ACTIVE`.

El cliente actualiza la lista de presencia al recibir `presence:changed`. Ante
`game:invite`, muestra aceptar/rechazar y la caducidad; ante cualquier evento
de resultado elimina esa invitación de la interfaz. Ante `game:invite:accepted`,
`game:created` o `game:joined`, consulta `GET /api/me/games` y
`GET /api/games/:id`; estos eventos no contienen el estado completo.

La presencia se mantiene en memoria y presupone una sola instancia de backend.
Para escalar a varias instancias será necesario compartir presencia y el
adaptador de Socket.IO (por ejemplo, con Redis). Las invitaciones sí persisten
en PostgreSQL.

No se implementa todavía el bloqueo de usuarios. Para añadirlo sin alterar el
contrato, se puede crear una relación persistente de bloqueo
`(blockerUserId, blockedUserId)` con clave única y rechazar la invitación si
cualquiera de los dos usuarios ha bloqueado al otro.

### `game:created`

Se emite al usuario creador cuando la API confirma la creación de una partida,
individual o multijugador.

- **Destino:** `user:${userId}` del creador.
- **Payload:** `{ id: number, mode: "INDIVIDUAL" | "MULTIPLAYER", status: "WAITING" | "ACTIVE" | "FINISHED", code: string | null, createdAt: string }`.
- `createdAt` es una fecha ISO 8601. `code` es `null` en modo individual y en
  las salas privadas creadas al aceptar una invitación.
- **Cliente:** Actualiza `GET /api/me/games`; si abre la partida, consulta también `GET /api/games/:id`.

### `game:joined`

Se emite al jugador que solicita unirse después de confirmar la operación en
la base de datos. Si el mismo jugador repite una unión ya completada, el evento
puede repetirse como confirmación idempotente.

- **Destino:** `user:${userId}` del jugador que se unió.
- **Payload:** `{ id: number, status: "WAITING" | "ACTIVE" | "FINISHED", turnVersion: number }`.
- **Cliente:** Actualiza `GET /api/me/games` y consulta `GET /api/games/:id`.

### `game:updated`

Aviso de que una partida cambió. Se emite **únicamente después de confirmar la
operación HTTP en la base de datos**.

- **Destino:** Sala `game:${gameId}` (solo sockets que se hayan unido correctamente con `join:game`).
- **Payload (mínimo y público):** `{ id: number, status: "WAITING" | "ACTIVE" | "FINISHED", turnVersion: number }`.
- **Cambios que notifica:** jugador unido o preparado, sala iniciada, respuesta/turno actualizado y partida finalizada. El mismo evento existente cubre estos cambios.
- **Cliente:** Consulta `GET /api/games/:id` tras cada aviso. Actualiza también `GET /api/me/games` para reflejar participantes/preparación y siempre que `status` sea `FINISHED`. `turnVersion` identifica el estado de juego, pero puede no cambiar al unirse o prepararse un jugador.

### `game:deleted`

Aviso de que el creador eliminó una sala multijugador que seguía en espera.

- **Destino:** Sala `game:${gameId}`. Solo llega a sockets que se hubieran unido
  correctamente mientras aún eran participantes.
- **Cuándo se emite:** Después de que `DELETE /api/games/:id` haya confirmado
  el borrado en base de datos.
- **Payload exacto:** `{ id: number }`.
- **Cliente:** Debe dejar de consultar esa partida, mostrar un mensaje como
  «El creador ha eliminado la sala» y volver a «Mis partidas» actualizando
  `GET /api/me/games`. Si estaba
  desconectado y no recibe el evento, el `GET /api/games/:id` posterior
  devolverá `404`; debe tratarlo igual, sin reintentos infinitos.

### Reconexión

Una reconexión crea un socket nuevo. Por tanto, el servidor no puede recuperar automáticamente datos guardados en `socket.data` del socket anterior, ni recibe automáticamente un evento `reconnect` del cliente.

El cliente conserva el identificador de la partida fuera del socket (por ejemplo, en el estado de la pantalla). En **cada** evento `connect`, tanto inicial como después de reconectar, debe:

1. Conectarse con un JWT válido en el *handshake*.
2. Emitir `join:game` con el id que conserva.
3. Esperar `joined:game`. Este evento confirma que el servidor ha vuelto a comprobar la fila `GamePlayer` y ha unido el socket nuevo a la sala.
4. Solicitar `GET /api/games/:id` con el mismo JWT para recuperar el estado público persistido. El socket no envía ese estado. La respuesta incluye `turnVersion`, que identifica la versión exacta del *snapshot* recuperado.

### Versiones y eventos retrasados

`game:created`, `game:joined`, `game:updated` y `game:deleted` son avisos; sus
payloads no sustituyen al historial ni al estado completo de la partida. No
incluyen preguntas, respuestas correctas, credenciales ni datos privados.

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
