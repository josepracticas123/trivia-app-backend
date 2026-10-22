# Pruebas

Pruebas automatizadas con **Vitest** + **Supertest**. Se ejecutan con:

```bash
npm test
```

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
│   ├── games.routes.test.ts
│   └── question.routes.test.ts
├── services/
│   └── game.services.test.ts
└── integration/
    └── acceso-ajeno.test.ts
```

Cada prueba vive en `tests/<carpeta>/`, en la misma subcarpeta que el
código que prueba.

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
  200 con `score` y `nextQuestionId` y **sin las soluciones**.
- `POST /api/games/:id/answers`: 401 sin token, 200 con `isCorrect`,
  `score` y `finished`.

## services/

### `game.services.test.ts`
Prueba la lógica de partidas sin pasar por HTTP.
- `submitAnswer`: flujo completo de 5 respuestas (la puntuación sube y la
  quinta cierra la partida); responder fuera de turno devuelve `WRONG_TURN`
  sin guardar nada; opción de otra pregunta → `CHOICE_NOT_IN_QUESTION`;
  no participante → `NOT_PARTICIPANT`; partida inexistente →
  `GAME_NOT_FOUND`; partida cerrada → `GAME_FINISHED`; un duplicado
  (P2002) → `ALREADY_ANSWERED` y no suma puntos.
- `getGameById`: calcula `score` y `nextQuestionId` en el servidor; el
  `score` solo suma aciertos y `nextQuestionId` es `null` al terminar;
  devuelve `null` si la partida no existe.

## Pruebas de integración (con base de datos real)

Los ficheros de `tests/integration/` **no usan mocks**: se conectan a una
base de datos PostgreSQL real para comprobar reglas que solo tienen sentido
contra la BBDD (por ejemplo, que un usuario no pueda ver la partida de otro).

Se ejecutan aparte, con su propia base de datos:

```bash
npm run test:integration
```

> ⚠️ **Antes de ejecutarlas** hay que tener configurada la base de datos de
> pruebas (ver abajo). Si no, fallarán al conectar. El comando `npm test`
> no necesita nada de esto: funciona con mocks y sin BBDD.

### Qué comprueba `integration/acceso-ajeno.test.ts`

- Un usuario **no** puede ver la partida de otro (403).
- El dueño **sí** puede verla (200), para que la prueba no pase por accidente.
- Un usuario **no** puede responder en la partida de otro (403); el dueño sí (200).
- El historial de un usuario no incluye las partidas de otro.
- Si se elimina la comprobación de participante del controlador, **la
  prueba falla**: es la garantía de que cubre de verdad esa regla.

### Configurar la base de datos de pruebas (una sola vez)

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

   ```
   DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/trivia_test"
   JWT_SECRET="secreto-de-pruebas"
   ```

3. Aplica las migraciones a esa base de datos:

   ```powershell
   $env:DATABASE_URL = (Get-Content tests/.env.test | Select-String "^DATABASE_URL=").Line.Split("=",2)[1].Trim('"'); npx prisma migrate deploy
   ```