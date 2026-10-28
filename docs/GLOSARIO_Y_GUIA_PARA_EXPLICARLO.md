# Glosario y Guía para Explicar la API

Guía de estudio para un desarrollador junior que necesita comprender y explicar el backend de la Trivia App. Todos los conceptos están basados en el código real del repositorio.

---

## 1. Glosario de conceptos técnicos

| Concepto | Qué es | Ejemplo en el proyecto |
|---|---|---|
| Endpoint | Una URL específica que expone la API para realizar una acción. | `POST /api/auth/login`, `GET /api/questions/:id` |
| Ruta (Route) | Definición en Express que asocia un método HTTP y una URL a un controlador. | `gameRouter.post("/:id/answers", authMiddleware, answerController)` en `src/routes/games.routes.ts` |
| Controlador | Función que recibe la petición HTTP, procesa la entrada, llama al servicio y envía la respuesta. | `answerController` en `src/controllers/game.answer.ts` |
| Servicio | Función que contiene la lógica de negocio y accede a la base de datos. No sabe nada de HTTP. | `submitAnswer` en `src/services/game.mutations.ts` |
| Middleware | Función que se ejecuta entre la llegada de la petición y el controlador. | `authMiddleware` valida el JWT antes de que llegue al controlador |
| Esquema Zod | Definición de validación de datos que asegura que el cuerpo o los parámetros tienen el formato esperado. | `loginSchema` en `src/schemas/login.schema.ts` valida email y contraseña |
| Prisma | ORM que permite consultar y escribir en PostgreSQL usando TypeScript. | `prisma.user.findUnique(...)`, `prisma.game.create(...)` |
| PrismaClient | Instancia del cliente de Prisma usada para hacer consultas a la base de datos. | Exportada desde `src/lib/prisma.ts` como `prisma` |
| JWT | Token firmado que se usa para autenticar al usuario sin sesión en el servidor. | Generado en `src/controllers/auth.login.ts`, verificado en `src/middlewares/auth.middleware.ts` |
| Argon2 | Algoritmo de hash seguro para contraseñas. | `argon2.hash()` y `argon2.verify()` en `src/services/auth.services.ts` |
| Control de versión optimista | Técnica para evitar conflictos cuando dos peticiones modifican el mismo dato. | Campo `turnVersion` en el modelo `Game` de `prisma/schema.prisma` |
| Transacción Serializable | Nivel de aislamiento de BD que garantiza consistencia ante concurrencia. | `prisma.$transaction(..., { isolationLevel: "Serializable" })` en `submitAnswer` |
| Socket.IO | Librería para comunicación en tiempo real (WebSockets) entre cliente y servidor. | `src/sockets/index.ts` configura el servidor y emite `game:updated` |
| reconexión | Flujo en el que el cliente vuelve a autenticar el socket, emite `join:game` y consulta el estado por HTTP. | `docs/eventos.md` |
| CORS | Mecanismo que permite o restringe peticiones desde otros dominios. | Configurado en `src/app.ts` con `origin: process.env.FRONTEND_ORIGIN` |
| Swagger / OpenAPI | Estándar para documentar APIs REST. Swagger UI es la interfaz web. | `src/docs/swagger.ts` genera el documento; `/docs` muestra la UI |

## 2. Decisiones de diseño deducibles del código

| Decisión | Evidencia en el código | Razón probable |
|---|---|---|
| Validación con Zod en el controlador | Cada controlador llama a `schema.safeParse(req.body)` antes de usar los datos. | Fallar rápido y no enviar datos inválidos al servicio o base de datos. |
| Servicios sin conocimiento de HTTP | Los servicios reciben parámetros simples y no usan `req` ni `res`. | Separar la lógica de negocio del transporte HTTP; más fácil de probar. |
| Respuesta pública sin solución | `getGameController` mapea manualmente los campos y nunca envía `solution` ni `questionId`. | Evitar filtrar la respuesta correcta al cliente. |
| Control de versión con `turnVersion` | El modelo `Game` tiene `turnVersion` y `submitAnswer` lo usa en el `WHERE` de `updateMany`. | Detectar conflictos cuando dos jugadores responden casi al mismo tiempo. |
| Reintentos ante conflicto | `submitAnswer` reintenta hasta 3 veces si hay `VERSION_CONFLICT` o `P2034`. | Manejar concurrencia de forma automática sin fallar inmediatamente. |
| Puntuación revelada oculta en multijugador | `getGameById` solo cuenta aciertos cuando ambos jugadores respondieron la ronda. | Evitar que el primer jugador sepa si acertó antes de que el segundo responda. |
| Barrels para controladores y servicios | `auth.controller.ts`, `question.controller.ts`, `game.controller.ts` solo reexportan. | Simplificar las importaciones en las rutas; un solo punto de importación por dominio. |

## 3. Diferencias entre las capas y por qué no hacen todas lo mismo

| Capa | Qué hace | Qué NO hace | Por qué |
|---|---|---|---|
| Controlador | Recibe HTTP, valida entrada, llama al servicio, envía respuesta JSON. | No accede directamente a la base de datos, no contiene lógica de negocio compleja. | Es la capa de traducción entre HTTP y el dominio. |
| Servicio | Contiene lógica de negocio, consulta/escribe en la base de datos con Prisma. | No sabe qué es una petición HTTP, no usa `req` ni `res`. | Permite probar la lógica sin servidor HTTP y reutilizarla desde distintos puntos. |
| Middleware | Se ejecuta antes del controlador; puede autenticar, autorizar o manejar errores. | No genera la respuesta final del negocio (solo errores o interrupción). | Permite aplicar lógica transversal (auth, logging, errores) sin repetirla en cada controlador. |

## 4. Preguntas típicas de tutor con respuestas modelo

### Preguntas sobre el arranque

**P1: ¿Cuál es el primer archivo que se ejecuta al arrancar el backend en desarrollo?**

**R:** `src/server.ts`. Es el punto de entrada definido en el script `"dev": "tsx watch --env-file-if-exists=.env src/server.ts"` de `package.json`. Ese archivo importa `app` desde `./app.js`, crea el servidor HTTP con `node:http`, configura Socket.IO, valida variables de entorno y llama a `server.listen()`.

### Preguntas sobre rutas y controladores

**P4: ¿Qué rutas están protegidas por autenticación y cuáles son públicas?**

**R:** Públicas: `GET /`, `GET /api/categories`, `GET /api/questions`, `GET /api/questions/:id`, `GET /api/openapi.json`, `GET /docs`, `POST /api/auth/register`, `POST /api/auth/login`. Protegidas (requieren JWT): `GET /api/me`, `GET /api/me/games`, `POST /api/games`, `POST /api/games/join`, `POST /api/games/:id/start`, `GET /api/games/:id`, `POST /api/games/:id/answers`, `POST /api/questions`, `PUT /api/questions/:id`, `DELETE /api/questions/:id`.

**P5: ¿Qué hace `authMiddleware` y dónde se coloca?**


### Preguntas sobre servicios y base de datos

**P8: ¿Cómo accede el backend a la base de datos?**

**R:** A través de Prisma ORM. Existe una única instancia de `PrismaClient` creada en `src/lib/prisma.ts` usando el adaptador `@prisma/adapter-pg` con la URL de conexión en `DATABASE_URL`. Todos los servicios importan `prisma` desde ese archivo.

**P9: ¿Qué es el control de versión optimista y dónde se implementa?**


### Preguntas sobre validaciones y errores

**P12: ¿Cómo se valida que un ID de URL sea correcto?**

**R:** Con `questionIdSchema` (exportado también como `idParamSchema`) en `src/schemas/question-id.schema.ts`. Valida que sea una cadena de dígitos entre 1 y 2147483647 (rango de PostgreSQL Int). Si falla, el controlador responde 400 con `PARTIDA_ID_INVALIDO` o `PREGUNTA_ID_INVALIDO`.

**P13: ¿Cómo se manejan los errores en la API?**

**R:** Hay dos catálogos: `src/errors/errorCatalog.ts` (errores de negocio) y `src/errors/middlewareCatalog.ts` (errores de middleware). Las funciones `responderError` y `responderMiddlewareError` convierten una clave en una respuesta JSON con estado HTTP y código público. El middleware final `errorMiddleware` captura errores inesperados y responde 500 con mensaje genérico.

**P14: ¿Qué formato tienen las respuestas de error?**

**R:** Siempre `{ error: { code: "<código_publico>", message: "<mensaje>" } }` con el estado HTTP correspondiente. Ejemplo: `{ error: { code: "VALIDATION_ERROR", message: "Los datos enviados no son válidos" } }` con status 400.

### Preguntas sobre Socket.IO y tiempo real


## 5. Cómo explicar la API en cinco minutos

**Guion sugerido:**

1. **(30 segundos) Qué es:** "Es una API REST de trivia construida con Node.js, TypeScript y Express 5. Permite jugar de forma individual o multijugador, gestionar usuarios con JWT y consultar un catálogo de preguntas."

2. **(45 segundos) Cómo arranca:** "El punto de entrada es `src/server.ts`. Se ejecuta con `npm run dev` (tsx watch). Valida variables de entorno (`JWT_SECRET`, `FRONTEND_ORIGIN`, `PORT`), crea el servidor HTTP con `node:http`, configura Socket.IO y empieza a escuchar."

## 6. Lista de cosas que debería saber localizar rápidamente

| Qué buscar | Archivo |
|---|---|
| Punto de entrada del servidor | `src/server.ts` |
| Configuración de Express y rutas montadas | `src/app.ts` |
| Definición de todas las rutas HTTP | `src/routes/*.ts` |
| Lógica de negocio y acceso a BD | `src/services/*.ts` |
| Instancia de PrismaClient | `src/lib/prisma.ts` |
| Esquemas de validación de entrada | `src/schemas/*.ts` |
| Autenticación JWT | `src/middlewares/auth.middleware.ts` |
| Autorización de admin | `src/middlewares/admin.middleware.ts` |
| Catálogos de errores | `src/errors/errorCatalog.ts`, `src/errors/middlewareCatalog.ts` |
| Socket.IO y eventos en tiempo real | `src/sockets/index.ts` |
| Esquema de la base de datos | `prisma/schema.prisma` |
| Migraciones SQL | `prisma/migrations/` |
| Scripts de npm | `package.json` |
| Documentación OpenAPI/Swagger | `src/docs/swagger.ts` y `src/docs/schemas/*.ts` |
| Pruebas unitarias | `tests/**/*.test.ts` (excluyendo integration) |
| Pruebas de integración | `tests/integration/**/*.test.ts` |

## 7. Aspectos pendientes de investigar

- No se ha verificado el despliegue en producción más allá del script `npm run start`.
- El evento `game:updated` se emite correctamente desde `game.join.ts` tras confirmar la unión en la base de datos.
- El archivo `src/types/question.ts` define una interfaz `Pregunta` que no parece estar importada activamente en el código fuente principal.
- Las pruebas de integración requieren una base de datos PostgreSQL real y no se han ejecutado en este análisis.


3. **(60 segundos) Flujo de una petición:** "El cliente envía HTTP. Express pasa por middlewares globales (CORS, JSON), luego el router dirige a un controlador. Si la ruta lo requiere, pasa por `authMiddleware` (JWT) y posiblemente `adminMiddleware`. El controlador valida con Zod, llama a un servicio que usa Prisma para acceder a PostgreSQL, y responde JSON. Los errores van a un middleware centralizado."

4. **(45 segundos) Endpoints clave:** "Autenticación: `POST /api/auth/register` y `POST /api/auth/login`. Preguntas: `GET /api/questions` (público), `POST /api/questions` (solo ADMIN). Partidas: `POST /api/games` (crear), `GET /api/games/:id` (estado), `POST /api/games/:id/answers` (responder). Usuario: `GET /api/me` y `GET /api/me/games`."

5. **(45 segundos) Base de datos y tiempo real:** "Usa PostgreSQL con Prisma ORM. Tiene control de concurrencia con `turnVersion` para respuestas simultáneas. Socket.IO emite `game:updated` tras confirmar operaciones de partida, para notificar en tiempo real sin enviar datos sensibles."

6. **(30 segundos) Dónde tocar para modificar:** "Si cambio una ruta: `src/routes/`. Si cambio la lógica: `src/services/`. Si cambio la validación: `src/schemas/`. Si cambio el manejo de errores: `src/errors/`. La conexión a BD está en `src/lib/prisma.ts`."

**P15: ¿Cómo se autentica un cliente WebSocket?**

**R:** En `src/sockets/index.ts`, el middleware de Socket.IO lee el token de `socket.handshake.auth.token` o `socket.handshake.query.token`, lo verifica con `jwt.verify` usando `JWT_SECRET`, y guarda `socket.data.userId`. Si falta o es inválido, rechaza la conexión.

**P16: ¿Qué evento se emite tras responder una pregunta y qué datos contiene?**

**R:** `game:updated`. Se emite tras confirmar la transacción en la base de datos. Contiene solo datos públicos: `{ id, status, turnVersion }`. Nunca se envían soluciones ni información sensible por WebSocket.

### Preguntas sobre pruebas

**P17: ¿Qué diferencia hay entre las pruebas unitarias y las de integración?**

**R:** Las unitarias (`npm run test`) usan Vitest con mocks de Prisma y servicios; no tocan la base de datos real. Las de integración (`npm run test:integration`) usan una configuración separada, se ejecutan en serie contra una base de datos real (`trivia_test`) y requieren `tests/.env.test`.

**P18: ¿Cómo se prueban las rutas sin base de datos real?**

**R:** Se usan mocks de `vi.mock` para simular los servicios y Prisma. Por ejemplo, en `tests/routes/games.routes.test.ts` se mockea `src/services/game.services.js` y `src/lib/prisma.js`, y se usa `supertest` para hacer peticiones HTTP a un Express mínimo.

**R:** Es una técnica para evitar que dos peticiones simultáneas sobrescriban cambios del otro. Se implementa en el modelo `Game` de `prisma/schema.prisma` con el campo `turnVersion`. En `src/services/game.mutations.ts`, la función `submitAnswer` incluye `turnVersion` en el `WHERE` de `updateMany`; si `count !== 1`, significa que otra petición modificó la partida y se produce un conflicto.

**P10: ¿Qué ocurre si dos jugadores responden la misma pregunta al mismo tiempo en multijugador?**

**R:** La primera respuesta que confirme la transacción incrementa `turnVersion`. La segunda lectura verá una versión diferente, el `WHERE` no coincidirá (`count === 0`), y el servicio reintentará hasta 3 veces. Si sigue fallando, devuelve `CONFLICTO_CONCURRENCIA`. Además, la restricción única `@@unique([gameQuestionId, userId])` en el modelo `Answer` impide que el mismo usuario responda dos veces (error P2002 → `ALREADY_ANSWERED`).

**P11: ¿Por qué en multijugador la puntuación del primer jugador no se revela hasta que responde el segundo?**

**R:** En `src/services/game.queries.ts`, la función `getGameById` solo cuenta como "revelada" una ronda cuando `answeredCount >= 2` (ambos respondieron) o cuando la partida terminó. Así, el primer jugador no sabe si acertó hasta que el segundo también responda.

**R:** Valida el token JWT en la cabecera `Authorization: Bearer <token>`, verifica que el usuario exista en la base de datos y guarda `res.locals.userId`. Se coloca en las rutas que necesitan saber quién es el usuario, antes del controlador. Se define en `src/middlewares/auth.middleware.ts`.

**P6: ¿Por qué `adminMiddleware` debe ir después de `authMiddleware`?**

**R:** Porque `adminMiddleware` lee `res.locals.userId`, que es establecido por `authMiddleware`. Si `authMiddleware` no se ejecutó antes, `res.locals.userId` no estará definido y `adminMiddleware` fallará.

**P7: ¿Qué controlador maneja `POST /api/games/:id/answers` y qué servicio llama?**

**R:** `answerController` en `src/controllers/game.answer.ts`. Llama a `submitAnswer` en `src/services/game.mutations.ts`.


**P2: ¿Qué variables de entorno son obligatorias y qué ocurre si faltan?**

**R:** `JWT_SECRET`, `FRONTEND_ORIGIN` y `DATABASE_URL` (indirectamente, a través de Prisma). `src/server.ts` lanza un error y detiene el arranque si falta `JWT_SECRET` o `FRONTEND_ORIGIN`. `src/lib/prisma.ts` lanza un error si falta `DATABASE_URL`.

**P3: ¿Cómo se inicia el servidor en modo producción?**

**R:** Con `npm run start`, que ejecuta `node --env-file-if-exists=.env dist/server.js`. Requiere haber ejecutado previamente `npm run build` para compilar TypeScript a `dist/`.

| Esquema Zod | Valida que los datos tengan el formato correcto. | No ejecuta lógica de negocio ni accede a la base de datos. | Garantiza que los datos que llegan al servicio son válidos. |
| Ruta | Asocia una URL y método HTTP a un controlador y middlewares. | No contiene lógica de negocio ni validación de datos. | Es la tabla de direccionamiento de la API. |

| Manejo de errores con catálogos | `errorCatalog.ts` y `middlewareCatalog.ts` centralizan códigos y mensajes. | Consistencia en las respuestas de error y fácil mantenimiento. |
| Socket.IO sobre el mismo servidor HTTP | `src/sockets/index.ts` importa `server` de `src/server.ts`. | Reutilizar el mismo puerto y evitar abrir otro servidor. |

| res.locals | Objeto de Express que permite pasar datos entre middlewares y controladores. | `res.locals.userId` guarda el ID del usuario autenticado |
| Barrel | Archivo que solo reexporta funciones desde otros archivos para simplificar importaciones. | `src/controllers/auth.controller.ts` reexporta varios controladores |
| Seed | Script que pobla la base de datos con datos iniciales. | `src/lib/seed.ts` crea 4 categorías y 6 preguntas de ejemplo |
| Migración | Archivo SQL que aplica cambios progresivos al esquema de la base de datos. | Carpeta `prisma/migrations/` con versiones como `20261026120000_reto17_turnos_concurrencia` |
