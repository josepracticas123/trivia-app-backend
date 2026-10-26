# Pruebas

Pruebas automatizadas con **Vitest** + **Supertest**. La suite habitual se ejecuta con:

```bash
npm test
```

`npm test` usa mocks y **no se conecta a ninguna base de datos**. Las pruebas de
`tests/integration/` se ejecutan aparte con `npm run test:integration`, porque
usan PostgreSQL real y crean/borran datos.

Las comprobaciones manuales de cada reto se anotan en su enunciado y en el PR.

## Estructura

```
tests/
├── controllers/
│   └── auth.controller.test.ts
├── middlewares/
│   └── auth.middleware.test.ts
├── routes/
│   ├── categories.routes.test.ts
│   ├── cors-errors.test.ts
│   ├── games.multiplayer.test.ts
│   ├── games.routes.test.ts
│   ├── question.pagination.test.ts
│   └── question.routes.test.ts
├── services/
│   ├── game.mutation.p2034.test.ts
│   ├── game.services.test.ts
│   └── question.queries.test.ts
├── setup/
│   └── cors.setup.ts
└── integration/          # BBDD real: solo con npm run test:integration
    ├── helpers/
    │   └── db-guard.ts
    ├── acceso-ajeno.test.ts
    ├── db-guard.test.ts
    ├── game.mutation.concurrency.test.ts
    └── game.turns.concurrency.test.ts
```

Cada prueba vive en `tests/<carpeta>/`, en la misma subcarpeta que el
código que prueba. La excepción es `tests/integration/`, que agrupa las
pruebas que necesitan una base de datos real.

## controllers/

### `auth.controller.test.ts`
Prueba el registro y el login (`POST /api/auth/...`).
- `POST /api/auth/login` devuelve 200 y un token con credenciales correctas.
- Mismo mensaje de error para email inexistente y contraseña incorrecta
  (no revela qué campo falla).
- `POST /api/auth/register` rechaza el registro si el cliente envía un rol.

## middlewares/

### `auth.middleware.test.ts`
Prueba la autenticación y la autorización por rol.
- `authMiddleware` devuelve 401 si: falta el token, el token es inválido,
  ha caducado, el usuario del token ya no existe o el token no trae `exp`.
- `authMiddleware` continúa si el token es válido y el usuario existe.
- `adminMiddleware` devuelve 403 si el usuario tiene rol `USER`.

## routes/

### `categories.routes.test.ts`
Prueba el listado de categorías (`GET /api/categories`).
- Es pública: responde sin autenticación.

### `cors-errors.test.ts`
Comprueba que los errores de entrada no pierden las cabeceras CORS.
- JSON malformado → 400 `INVALID_JSON` con `Access-Control-Allow-Origin`.
- Preflight `OPTIONS` de `Authorization` responde con cabeceras CORS.
- Cuerpo mayor de 100 KB → 413 manteniendo las cabeceras CORS.

### `games.multiplayer.test.ts`
Prueba la sala multijugador y los turnos por HTTP con los servicios simulados.
- `POST /api/games` con `mode: "MULTIPLAYER"` → 201 `WAITING` con código;
  un modo inválido → 400 sin llamar al servicio.
- `POST /api/games/join`: código con formato inválido → 400; unión correcta
  → 200; sala llena → 409.
- `POST /api/games/:id/start`: no creador → 403; falta el segundo jugador
  → 400; inicio correcto → 200 `ACTIVE`.
- `POST /api/games/:id/answers`: la primera respuesta de la ronda **no**
  devuelve `isCorrect`, `score`, `results` ni `players`; la segunda revela
  los dos resultados y las puntuaciones.
- `GET /api/games/:id`: devuelve `currentTurn`, `answeredCount` y solo los
  resultados/puntuaciones revelados, sin soluciones.

### `question.pagination.test.ts`
Prueba el contrato paginado del catálogo (`GET /api/questions`).
- Devuelve `items`, `total`, `page` y `pageSize`.
- Una página sin resultados devuelve `items` vacío con metadatos coherentes.
- `search` y `categoryId` se pasan al servicio y afectan a `items`/`total`.
- `categoryId` fuera de rango → 400 `VALIDATION_ERROR` sin llamar al servicio.

### `question.routes.test.ts`
Prueba el catálogo de preguntas (`GET` y `POST /api/questions`).
- `GET /api/questions` es pública: responde aunque no se envíe token.
- `POST /api/questions` devuelve 401 sin token.
- `POST /api/questions` devuelve 403 si un `USER` intenta crear.
- `POST /api/questions` devuelve 201 si un `ADMIN` crea una pregunta válida.

### `games.routes.test.ts`
Prueba los endpoints de partidas (`/api/games`).
- `POST /api/games`: 401 sin token, 201 con `id` y `status`, 409 si no hay
  preguntas suficientes.
- `GET /api/games/:id`: 404 si no existe, 403 si el usuario no participa,
  200 con `score` y `nextQuestionId` y **sin las soluciones**; marca
  `answered: false` en una pregunta pendiente.
- `POST /api/games/:id/answers`: 401 sin token, 200 con `isCorrect`,
  `score` y `finished`.

## services/

### `game.mutation.p2034.test.ts`
Prueba los reintentos ante conflictos de concurrencia (`P2034`) de Prisma.
- `joinGame`: reintenta y completa tras un `P2034`; si el segundo intento
  detecta la sala llena devuelve `SALA_LLENA`; si se agotan los reintentos
  devuelve `CONFLICTO_CONCURRENCIA`.
- `startGame`: reintenta y completa tras un `P2034`; si al reintentar la
  partida ya está activa devuelve `PARTIDA_YA_INICIADA`; si se agotan los
  reintentos devuelve `CONFLICTO_CONCURRENCIA`.

### `game.services.test.ts`
Prueba la lógica de partidas sin pasar por HTTP.
- `submitAnswer` en individual: flujo completo de 5 respuestas (la puntuación
  sube y la quinta cierra la partida); responder fuera de turno devuelve
  `WRONG_TURN` sin guardar nada; opción de otra pregunta →
  `CHOICE_NOT_IN_QUESTION`; no participante → `NOT_PARTICIPANT`; partida
  inexistente → `GAME_NOT_FOUND`; partida cerrada → `GAME_FINISHED`.
- `submitAnswer` en multijugador: el jugador 1 responde primero y su acierto
  no se revela; el jugador 2 no puede adelantarse; al responder el 2 se
  revelan ambos resultados y se avanza de pregunta; reintentar la misma
  respuesta → `ALREADY_ANSWERED`; un duplicado de BBDD (P2002) no suma
  puntos; un conflicto de versión reintenta con el estado nuevo.
- Finalización multijugador: 10 respuestas cierran la partida con ganador;
  si empatan, `winnerUserId` es `null` e `isDraw` es `true`.
- `getGameById`: calcula `score` y `nextQuestionId` en el servidor;
  en multijugador oculta el resultado del primero hasta que responde el
  segundo; `nextQuestionId` es `null` al terminar y devuelve `null` si la
  partida no existe.

### `question.queries.test.ts`
Prueba que `getQuestions` aplica el mismo `where` a `findMany` y a `count`,
tanto con filtros (`search`, `categoryId`) como sin ellos.

## Pruebas de integración (con base de datos real)

Los ficheros de `tests/integration/` **no usan mocks**: se conectan a una
base de datos PostgreSQL real para comprobar reglas que solo tienen sentido
contra la BBDD (por ejemplo, que un usuario no pueda ver la partida de otro,
o que dos operaciones simultáneas no corrompan el estado).

Se ejecutan aparte, con su propia base de datos:

```bash
npm run test:integration
```

> ⚠️ **Antes de ejecutarlas** hay que tener configurada la base de datos de
> pruebas (ver abajo). Si no, fallarán al conectar. El comando `npm test`
> no necesita nada de esto: funciona con mocks y sin BBDD.

Todas las pruebas que crean o borran datos llaman antes a
`asegurarBaseDePruebas()` (`integration/helpers/db-guard.ts`), que aborta si
`DATABASE_URL` no apunta a `trivia_test` en `localhost`. Así no se puede
borrar por error la base de desarrollo o producción.

### Qué comprueba `integration/acceso-ajeno.test.ts`

- Un usuario **no** puede ver la partida de otro (403).
- El dueño **sí** puede verla (200), para que la prueba no pase por accidente.
- Un usuario **no** puede responder en la partida de otro (403); el dueño sí (200).
- El historial de un usuario no incluye las partidas de otro.
- Si se elimina la comprobación de participante del controlador, **la
  prueba falla**: es la garantía de que cubre de verdad esa regla.

### Qué comprueba `integration/game.mutation.concurrency.test.ts`

- La entrada repetida del creador es idempotente: sigue habiendo 1 jugador.
- Dos usuarios nuevos compiten por la última plaza: solo uno entra, el otro
  recibe `SALA_LLENA` y en la BBDD quedan exactamente 2 jugadores.
- Dos `startGame` simultáneos: solo uno inicia la partida y el otro recibe
  `PARTIDA_YA_INICIADA`; se crean exactamente 5 preguntas sin duplicados.
- Prueba la concurrencia real (aislamiento Serializable y reintentos), algo
  que los mocks no pueden reproducir.

### Qué comprueba `integration/game.turns.concurrency.test.ts`

- Solo responde el jugador del turno y el acierto del jugador 1 queda
  oculto hasta que responde el jugador 2 (ni la respuesta ni el `GET` lo
  revelan).
- Una petición ajena no puede responder en la partida.
- Dos respuestas simultáneas del mismo jugador no duplican puntos: una se
  acepta y la otra recibe `ALREADY_ANSWERED`.
- Dos jugadores que responden a la vez dejan la partida coherente, sin
  saltarse turnos ni perder respuestas.
- Diez respuestas cierran la partida con el ganador correcto y no aceptan
  más respuestas; un empate se cierra con `winnerUserId: null` e
  `isDraw: true`.
- Regresión del modo individual: cinco respuestas siguen cerrando la
  partida y sumando puntos.
- Comprueba la concurrencia real con PostgreSQL (control de versión y
  reintentos), algo que los mocks no pueden reproducir.

### Qué comprueba `integration/db-guard.test.ts`

- `asegurarBaseDePruebas` acepta `trivia_test` en `localhost`.
- Rechaza otra base, una base cuyo nombre empieza por `trivia_test`
  (por ejemplo `trivia_test_prod`), una URL vacía, una URL inválida y
  `trivia_test` en un host remoto.

## Configurar la base de datos de pruebas (una sola vez)

Estas pruebas usan una BBDD **independiente y separada** de la de desarrollo.
Nunca apuntes a la base de datos de producción/prácticas: estas pruebas
crean y borran datos.

1. Crea la base de datos `trivia_test` en tu PostgreSQL local:

   ```bash
   createdb trivia_test
   ```

   > En Windows, si `createdb`/`psql` no están en el PATH, usa la ruta completa,
   > por ejemplo: `& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres trivia_test`

2. Crea el fichero `tests/.env.test` (está en `.gitignore`, no se sube) con:

   ```env
   DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/trivia_test"
   JWT_SECRET="secreto-de-pruebas"
   ```

3. Aplica las migraciones a esa base de datos:

   ```powershell
   $env:DATABASE_URL = (Get-Content tests/.env.test | Select-String "^DATABASE_URL=").Line.Split("=",2)[1].Trim('"'); npx prisma migrate deploy
   ```
