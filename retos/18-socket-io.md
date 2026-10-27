# 18 · Añade avisos en tiempo real

**Tu misión:** Conecta los dos navegadores a una sala de Socket.IO para recibir avisos cuando cambia la partida. Las acciones seguirán pasando por la API HTTP ya probada.

**Antes:** El [reto 17](17-turnos-concurrencia.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Eventos, conexión autenticada, salas y transporte en tiempo real.

## Trabajo por bloques

1. Instala socket.io y conecta Express y Socket.IO al mismo servidor HTTP. Configura el origen permitido también en Socket.IO.

2. Verifica JWT al conectar. Para suscribirse a una partida, comprueba en DB que el usuario pertenece a ella; conocer el ID no basta. Define qué pasa si el token caduca durante la conexión.

3. Tras guardar y confirmar una operación HTTP, emite game:updated a la sala autorizada con ID y versión. El cliente vuelve a consultar el estado público; no envíes soluciones ni filas internas. Documenta eventos en docs/eventos.md.

## Comprueba tu entrega

- [x] Token ausente o inválido no permite conexión autenticada; la expiración obliga a renovar sesión.
- [x] Un usuario ajeno no puede suscribirse a la sala y no recibe eventos de esa partida.
- [x] Entrar, iniciar, responder y finalizar avisa a los participantes después del commit.
- [x] Una operación fallida no emite un aviso de éxito.
- [x] Dos clientes reciben cambios sin recargar; no reciben soluciones ni información sensible.
- [x] Swagger sigue probando las acciones HTTP; eventos tienen nombre, payload, autorización y errores en su documento propio.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Qué diferencia hay entre una ruta HTTP y un evento? ¿Por qué no se emite antes de guardar la transacción?

## Pistas

La sala de Socket.IO es un canal de mensajes; la partida y sus participantes viven en PostgreSQL. No dupliques las reglas del servicio en los sockets.

## Documentación

- [Salas Socket.IO](https://socket.io/docs/v4/rooms/)
- [Middleware Socket.IO](https://socket.io/docs/v4/middlewares/)

## Registro de entrega y revisión

Estado: **Entregado (pendiente de revisión del tutor)**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: listo para revisión (rama `reto/18-socket-io`).
- Prueba correcta (petición/acción y resultado): conexión con token válido + `join:game` → `joined:game`; `POST /api/games/:id/start` → ambos clientes reciben `game:updated` sin recargar; `POST /api/games/:id/answers` emite tras commit; `GET /api/games/:id` confirma estado real.
- Prueba inválida o fallo (petición/acción y resultado): token ausente/inválido → conexión rechazada; usuario ajeno → `error:game` y no se une a la sala; operación HTTP fallida → no se emite `game:updated`.
- Comandos y resultados: `npm run typecheck` ✅, `npm run build` ✅, `npm test` ✅ (93/93), `npm run dev` ✅.
- Dudas o correcciones: caducidad de token durante la conexión documentada en `docs/eventos.md` (validación solo en handshake; renovar reconectando). Se corrigió dependencia circular de arranque (`initSockets(server)` tras `createServer`) y se añadió respuesta 500 si `io` no está inicializado.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 17](17-turnos-concurrencia.md) · [Reto 19](19-reconexion.md)
