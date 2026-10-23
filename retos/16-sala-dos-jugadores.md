# 16 · Crea una partida para dos

**Tu misión:** Amplía las partidas con modo multijugador: una persona crea una sala y otra entra con un código. Todavía usarás únicamente HTTP.

**Antes:** El [reto 15](15-filtros-paginacion-cors.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Participantes, código de invitación y estados WAITING, ACTIVE y FINISHED.

## Trabajo por bloques

1. Mantén el modo individual. POST /api/games con modo MULTIPLAYER crea una partida WAITING y un código aleatorio único; POST /api/games/join recibe el código.

2. Añade participantes con restricciones únicas por partida y usuario. Rechaza un tercer jugador y decide dentro de una operación atómica quién ocupa la segunda plaza.

3. El creador inicia con POST /api/games/:id/start cuando hay dos jugadores. Asigna cinco preguntas compartidas y establece primer turno y estado ACTIVE.

## Comprueba tu entrega

- [x] Crear una sala vincula al creador y devuelve un código que permite entrar a otro usuario.
- [x] Entrar otra vez no duplica al participante y dos intentos simultáneos no permiten superar dos jugadores.
- [x] Código desconocido, sala llena o ya iniciada producen errores documentados.
- [x] Solo el creador puede iniciar; con un solo participante o partida ya iniciada se rechaza.
- [x] Un usuario que no pertenece a la sala no puede consultar su estado aunque conozca el ID.
- [x] Modo individual e historial siguen funcionando; Swagger describe las nuevas rutas.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

Demuestra creación, entrada y comienzo con dos cuentas. ¿Por qué una comprobación de plazas fuera de una transacción puede fallar?

## Pistas

El código es una invitación para entrar, no un sustituto de la autenticación. Apoya la unicidad con restricciones de DB.

## Documentación

- [Transacciones Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)

## Registro de entrega y revisión

Estado inicial: **Completado** (pendiente de revisión del tutor).

- PR y commit revisado: Rama `reto/16-sala-dos-jugadores` → PR hacia `develop` (sin merge). Commits: migración multijugador (GameMode, WAITING, code, isCreator), servicios createMultiplayerGame/joinGame/startGame, rutas y controladores, Swagger actualizado, APRENDIZAJE.md actualizado.
- Prueba correcta (petición/acción y resultado): Crear sala → 201 `{ id, status: "WAITING", code }`. Unirse con código válido → 200 `{ id, status: "WAITING" }`. Iniciar (creador, 2 jugadores) → 200 `{ id, status: "ACTIVE" }` con 5 preguntas compartidas. GET por ambos participantes → 200 con el mismo estado.
- Prueba inválida o fallo (petición/acción y resultado): Código desconocido → 404 `GAME_NOT_FOUND`. Tercer jugador → 409 `GAME_FINISHED` (sala llena). No creador inicia → 403 `FORBIDDEN`. Solo un jugador inicia → 400 `VALIDATION_ERROR`. Usuario ajeno consulta → 403 `NOT_PARTICIPANT`. Ya iniciada → 409.
- Comandos y resultados: `npm run typecheck` → sin errores; `npm run build` → sin errores; `npm test` → 67 tests superados (9 archivos). Correcciones del tutor aplicadas y verificadas (validación Zod, inicio atómico, errores tipados, Serializable). Pruebas de concurrencia real contra BD local (`tests/services/game.mutation.concurrency.test.ts`): 2 tests superados — dos `joinGame` simultáneos (solo uno entra, el otro recibe `SALA_LLENA`) y dos `startGame` simultáneos (uno inicia, el otro recibe `PARTIDA_YA_INICIADA`).
- Dudas o correcciones: ninguna pendiente. Transacción de join con aislamiento Serializable aplicada y verificada. Validación de entradas con Zod (mode, code, id) aplicada. Inicio atómico con updateMany condicionado aplicado. Errores tipados sin as any aplicados. Swagger de join/start añadido. Errores adicionales corregidos y verificados: `startGame` lanzaba `GAME_ALREADY_STARTED` sin manejo en el `catch` (cambiado a `PARTIDA_YA_INICIADA`); en el test de concurrencia `game.code` tipa como `string | null` (nullable en Prisma), corregido con `game.code!`.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente (no hacer merge hasta aprobación del tutor).

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 15](15-filtros-paginacion-cors.md) · [Reto 17](17-turnos-concurrencia.md)
