# Archivos y Responsabilidades

Inventario organizado por carpetas y archivos del backend. Todas las rutas son relativas a la raíz del repositorio.

---

## Carpeta raíz del proyecto

### Archivo: `package.json`

- **Responsabilidad:** Manifiesto del proyecto. Define dependencias, scripts de ejecución, versión, nombre y motor de Node.js.
- **Qué contiene:** Scripts `dev`, `typecheck`, `build`, `start`, `db:generate`, `db:migrate:dev`, `db:migrate:status`, `db:studio`, `seed`, `test`, `test:integration`. Dependencias de producción y de desarrollo.
- **Quién lo utiliza:** npm al instalar o ejecutar scripts.
- **A quién utiliza:** Todas las dependencias listadas.
- **Cómo se conecta con el resto:** Los scripts apuntan a archivos de `src/` y `prisma/`. Por ejemplo, `dev` ejecuta `src/server.ts` con `tsx`.
- **Ejemplo de funcionamiento:** `npm run dev` arranca el servidor en modo desarrollo.
- **Qué revisar si quiero modificarlo:** Al añadir una dependencia, actualizar también `package-lock.json`.

### Archivo: `tsconfig.json`

- **Responsabilidad:** Configuración del compilador TypeScript.
- **Qué contiene:** `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `rootDir: src`, `outDir: dist`, `strict: true`, `include: ["src/**/*.ts"]`, `exclude: ["node_modules", "dist"]`.
- **Quién lo utiliza:** `tsc` (typecheck y build).
- **A quién utiliza:** Todos los archivos TypeScript de `src/`.
- **Cómo se conecta con el resto:** Define cómo se compilan los archivos de `src/` a `dist/`.
- **Ejemplo de funcionamiento:** `npm run build` compila todo `src/` en `dist/`.
- **Qué revisar si quiero modificarlo:** Cambiar `module` o `moduleResolution` puede romper las importaciones con extensión `.js`.

### Archivo: `.env.example`

- **Responsabilidad:** Plantilla de variables de entorno. Indica qué variables se necesitan sin revelar valores secretos.
- **Qué contiene:** `PORT=3000`, `DATABASE_URL=`, `JWT_SECRET=`, `FRONTEND_ORIGIN=http://localhost:5173`.
- **Quién lo utiliza:** El desarrollador al configurar el proyecto (se copia a `.env`).
- **A quién utiliza:** `src/server.ts`, `src/app.ts`, `src/lib/prisma.ts`, `src/sockets/index.ts`.
- **Cómo se conecta con el resto:** Las variables se leen con `process.env` en varios archivos.
- **Ejemplo de funcionamiento:** `cp .env.example .env` y editar `.env` con valores reales.
- **Qué revisar si quiero modificarlo:** No incluir valores reales. `.env` está en `.gitignore`.

### Archivo: `.gitignore`

- **Responsabilidad:** Indica a Git qué archivos y carpetas ignorar.
- **Qué contiene:** `node_modules/`, `dist/`, `.env`, `.env.*` (excepto `.env.example`), `coverage/`, `*.log`, `.DS_Store`.
- **Quién lo utiliza:** Git.
- **Cómo se conecta con el resto:** Evita subir dependencias, compilados, secretos y logs.

## Carpeta `prisma/`

### Archivo: `prisma/schema.prisma`

- **Responsabilidad:** Define el modelo de datos de PostgreSQL con Prisma ORM. Es la fuente de verdad de la base de datos.
- **Qué contiene:** Modelos `Category`, `Question`, `Option`, `user`, `Game`, `GamePlayer`, `GameQuestion`, `GameChoice`, `Answer`. Enums `Role` (USER, ADMIN), `GameMode` (INDIVIDUAL, MULTIPLAYER), `GameStatus` (WAITING, ACTIVE, FINISHED). Relaciones entre modelos y restricciones únicas (por ejemplo, `@@unique([gameQuestionId, userId])` en `Answer` para evitar respuestas duplicadas).
- **Quién lo utiliza:** Prisma CLI, `src/lib/prisma.ts`, todos los servicios que usan `prisma`.
- **A quién utiliza:** `@prisma/client` y `@prisma/adapter-pg`.
- **Cómo se conecta con el resto:** Cada servicio importa `prisma` desde `src/lib/prisma.ts` y usa los modelos definidos aquí.
- **Ejemplo de funcionamiento:** `npm run db:migrate:dev` genera migraciones SQL basadas en este esquema.
- **Qué revisar si quiero modificarlo:** Cualquier cambio requiere una nueva migración. Las restricciones únicas afectan directamente a la lógica de negocio.

### Carpeta: `prisma/migrations/`

- **Responsabilidad:** Almacena las migraciones SQL versionadas que evolucionan el esquema de la base de datos.

## Carpeta `src/` — punto de entrada y configuración

### Archivo: `src/server.ts`

- **Responsabilidad:** Punto de entrada de la aplicación. Crea el servidor HTTP, valida la configuración crítica y pone el servidor a escuchar.
- **Qué contiene:** Importa `app` desde `./app.js`, crea `createServer(app)`, importa `./sockets/index.js` (efecto secundario), valida `JWT_SECRET`, `FRONTEND_ORIGIN` y `PORT`, exporta `server` y llama a `server.listen()`.
- **Funciones principales:** Exporta la constante `server`.
- **Quién lo utiliza:** El script `dev` y `start` de `package.json`.
- **A quién utiliza:** `src/app.ts` (la app Express), `src/sockets/index.ts` (Socket.IO).
- **Cómo se conecta con el resto:** Sin `server.ts` no hay servidor HTTP ni Socket.IO. Es el punto de arranque.
- **Ejemplo de funcionamiento:** `npm run dev` ejecuta este archivo con `tsx watch`.
- **Qué revisar si quiero modificarlo:** Las validaciones de entorno son críticas; eliminar la validación de `JWT_SECRET` permitiría arrancar con una configuración insegura.

### Archivo: `src/app.ts`

- **Responsabilidad:** Configuración principal de la aplicación Express. Registra middlewares globales, rutas, Swagger y manejadores de errores.
- **Qué contiene:** Crea `app = express()`, configura CORS, monta Swagger UI en `/docs`, expone `GET /api/openapi.json`, aplica `express.json()`, registra `jsonErrorMiddleware`, registra rutas (`/api/auth`, `/api/questions`, `/api/categories`, `/api/games`, `/api/me`), registra `GET /`, `notFoundMiddleware` y `errorMiddleware`.
- **Funciones principales:** Exporta la constante `app`.

## Carpeta `src/controllers/`

### Archivo: `src/controllers/auth.controller.ts`

- **Responsabilidad:** Barrel (punto de reexportación) de los controladores de autenticación.
- **Qué contiene:** Reexporta `registerController` desde `./auth.register.js`, `loginController` desde `./auth.login.js` y `meController` desde `./auth.me.js`.
- **Quién lo utiliza:** `src/routes/auth.routes.ts`.
- **A quién utiliza:** Los tres archivos de controladores de autenticación.
- **Cómo se conecta con el resto:** Permite que las rutas importen todos los controladores de auth desde un solo archivo.
- **Qué revisar si quiero modificarlo:** Si se añade un nuevo controlador de auth, debe reexportarse aquí.

### Archivo: `src/controllers/auth.login.ts`

- **Responsabilidad:** Controla el inicio de sesión de usuario. Valida credenciales, genera un JWT y devuelve el token con datos públicos del usuario.
- **Qué contiene:** Función `loginController(req, res)`. Valida con `loginSchema`, llama a `loginUser` del servicio, verifica que el usuario exista, firma el JWT con `jsonwebtoken` y responde con `{ token, expiresIn, user }`.
- **Funciones principales:** `loginController(req, res)`.
- **Quién lo utiliza:** `src/controllers/auth.controller.ts` → `src/routes/auth.routes.ts`.
- **A quién utiliza:** `src/services/auth.services.ts` (`loginUser`), `src/schemas/login.schema.ts`, `src/errors/responderError.ts`, `jsonwebtoken`.
- **Cómo se conecta con el resto:** Recibe la petición HTTP, valida, delega en el servicio y responde al cliente.
- **Ejemplo de funcionamiento:** `POST /api/auth/login` con `{ email, password }` devuelve un JWT válido por 1 hora.
- **Qué revisar si quiero modificararlo:** El secreto JWT se lee de `process.env.JWT_SECRET`. El token usa `subject` con el ID del usuario y expira en 1h.

### Archivo: `src/controllers/auth.register.ts`

- **Responsabilidad:** Controla el registro de nuevos usuarios. Valida entrada, llama al servicio para crear el usuario con hash de contraseña y responde 201 o 409.
- **Qué contiene:** Función `registerController(req, res)`. Valida con `registerSchema`, llama a `registerUser` del servicio, si devuelve null responde 409 (`EMAIL_ALREADY_EXISTS`), si todo va bien responde 201 con `{ id, email }`.
- **Funciones principales:** `registerController(req, res)`.
- **Quién lo utiliza:** `src/controllers/auth.controller.ts` → `src/routes/auth.routes.ts`.
- **A quién utiliza:** `src/services/auth.services.ts` (`registerUser`), `src/schemas/register.schema.ts`, `src/errors/responderError.ts`.
- **Cómo se conecta con el resto:** Flujo típico de creación de recurso con validación y manejo de duplicados.
- **Ejemplo de funcionamiento:** `POST /api/auth/register` con email y contraseña válidas crea el usuario y devuelve 201.
- **Qué revisar si quiero modificararlo:** El servicio maneja el error P2002 de Prisma (email duplicado) y devuelve null; el controlador traduce eso a 409.

### Archivo: `src/controllers/auth.me.ts`

- **Responsabilidad:** Devuelve los datos públicos del usuario autenticado.
- **Qué contiene:** Función `meController(_req, res)`. Obtiene `userId` de `res.locals.userId` (puesto por `authMiddleware`), llama a `getPublicUserById` del servicio, si no existe responde 401 (`USER_NOT_FOUND`), si existe responde 200 con `{ user }`.
- **Funciones principales:** `meController(_req, res)`.
- **Quién lo utiliza:** `src/controllers/auth.controller.ts` → `src/routes/me.routes.ts` (ruta `GET /api/me`).
- **A quién utiliza:** `src/services/auth.services.ts` (`getPublicUserById`), `src/errors/responderError.ts`.
- **Cómo se conecta con el resto:** Depende de que `authMiddleware` haya poblado `res.locals.userId` antes.
- **Ejemplo de funcionamiento:** `GET /api/me` con token válido devuelve `{ user: { id, email, role } }`.
- **Qué revisar si quiero modificarlo:** Siempre debe ir después de `authMiddleware` en la ruta, porque necesita `res.locals.userId`.

### Archivo: `src/controllers/question.controller.ts`

- **Responsabilidad:** Barrel de los controladores de preguntas.
- **Qué contiene:** Reexporta `getQuestionsController`, `getQuestionByIdController` desde `./question.get.js`, `createQuestionController` desde `./question.create.js`, `updateQuestionController` desde `./question.update.js`, `deleteQuestionController` desde `./question.delete.js`.
- **Quién lo utiliza:** `src/routes/questions.routes.ts`.
- **A quién utiliza:** Los cinco archivos de controladores de preguntas.
- **Cómo se conecta con el resto:** Permite importar todos los controladores de preguntas desde un solo archivo.
- **Qué revisar si quiero modificarlo:** Al añadir un nuevo controlador de preguntas, reexportarlo aquí.

### Archivo: `src/controllers/question.get.ts`

- **Responsabilidad:** Controladores de lectura de preguntas (listado paginado y detalle por ID).
- **Qué contiene:** `getQuestionsController` y `getQuestionByIdController`.
  - `getQuestionsController`: valida query params con `paginationQuerySchema`, llama a `getQuestions` del servicio, mapea al formato público y responde.
  - `getQuestionByIdController`: valida el ID de la URL con `questionIdSchema`, llama a `getQuestionById` del servicio, si no existe responde 404, si existe responde con los datos públicos.
- **Funciones principales:** `getQuestionsController(req, res)`, `getQuestionByIdController(req, res)`.
- **Quién lo utiliza:** `src/controllers/question.controller.ts` → `src/routes/questions.routes.ts`.
- **A quién utiliza:** `src/services/question.service.ts` (`getQuestions`, `getQuestionById`), `src/schemas/query.schema.ts`, `src/schemas/question-id.schema.ts`, `src/errors/responderError.ts`.
- **Cómo se conecta con el resto:** Endpoints públicos de lectura del catálogo de preguntas.
- **Ejemplo de funcionamiento:** `GET /api/questions?page=1&pageSize=10` devuelve preguntas paginadas. `GET /api/questions/5` devuelve la pregunta con ID 5.
- **Qué revisar si quiero modificarlo:** El mapeo al formato público elimina intencionalmente `solution` y `choices.isCorrect` para no filtrar la respuesta correcta.

### Archivo: `src/controllers/question.create.ts`

- **Responsabilidad:** Controla la creación de preguntas (solo ADMIN autenticado).
- **Qué contiene:** Función `createQuestionController(req, res)`. Valida cuerpo con `questionSchema`, verifica que la categoría exista con `categoryExist`, llama a `createQuestion` del servicio y responde 201 con los datos de la pregunta creada.
- **Funciones principales:** `createQuestionController(req, res)`.
- **Quién lo utiliza:** `src/controllers/question.controller.ts` → `src/routes/questions.routes.ts` (ruta `POST /api/questions` con `authMiddleware` y `adminMiddleware`).
- **A quién utiliza:** `src/services/question.service.ts` (`createQuestion`, `categoryExist`), `src/schemas/question.schema.ts`, `src/errors/responderError.ts`.
- **Cómo se conecta con el resto:** Requiere autenticación y rol ADMIN antes de llegar al controlador.
- **Ejemplo de funcionamiento:** `POST /api/questions` con `{ categoryId, enunciado, opciones, respuestaCorrecta }` crea la pregunta y devuelve 201.
- **Qué revisar si quiero modificararlo:** La validación de categoría existe antes de llamar al servicio para fallar rápido con 400.

### Archivo: `src/controllers/question.update.ts`

- **Responsabilidad:** Controla la actualización de preguntas (solo ADMIN autenticado).
- **Qué contiene:** Función `updateQuestionController(req, res)`. Valida ID de la URL, valida cuerpo, verifica categoría, llama a `updateQuestion` del servicio, si devuelve null responde 404, si existe responde con los datos actualizados.
- **Funciones principales:** `updateQuestionController(req, res)`.
- **Quién lo utiliza:** `src/controllers/question.controller.ts` → `src/routes/questions.routes.ts` (ruta `PUT /api/questions/:id` con `authMiddleware` y `adminMiddleware`).
- **A quién utiliza:** `src/services/question.service.ts` (`updateQuestion`, `categoryExist`), `src/schemas/question.schema.ts`, `src/schemas/question-id.schema.ts`, `src/errors/responderError.ts`.
- **Cómo se conecta con el resto:** Requiere autenticación y rol ADMIN.
- **Ejemplo de funcionamiento:** `PUT /api/questions/5` actualiza la pregunta con ID 5.
- **Qué revisar si quiero modificararlo:** El servicio elimina y recrea las opciones (`deleteMany` + `create`) en lugar de actualizarlas individualmente.


### Archivo: `src/controllers/game.controller.ts`

- **Responsabilidad:** Barrel de los controladores de partidas.
- **Qué contiene:** Reexporta `createGameController`, `getGameController`, `answerController`, `getMyGamesController`, `joinGameController`, `startGameController` desde sus archivos individuales.
- **Quién lo utiliza:** `src/routes/games.routes.ts` y `src/routes/me.routes.ts`.
- **A quién utiliza:** Los seis archivos de controladores de partidas.

### Archivo: `src/controllers/game.create.ts`

- **Responsabilidad:** Controla la creación de partidas (individual o multijugador).
- **Qué contiene:** Función `createGameController(req, res)`. Obtiene `userId` de `res.locals`, valida el body con `createGameSchema`, si es multijugador llama a `createMultiplayerGame`, si es individual llama a `createGame`. Si el servicio devuelve null, responde 409 (`NOT_ENOUGH_QUESTIONS`).
- **Funciones principales:** `createGameController(req, res)`.
- **Quién lo utiliza:** `src/controllers/game.controller.ts` → `src/routes/games.routes.ts` (ruta `POST /api/games` con `authMiddleware`).
- **A quién utiliza:** `src/services/game.services.ts` (`createGame`, `createMultiplayerGame`), `src/schemas/game.schema.ts` (`createGameSchema`), `src/errors/responderError.ts`.
- **Cómo se conecta con el resto:** Requiere autenticación. Para multijugador, crea una sala WAITING con código de invitación.
- **Ejemplo de funcionamiento:** `POST /api/games` con `{ mode: "MULTIPLAYER" }` crea una partida multijugador y devuelve el código de invitación.
- **Qué revisar si quiero modificarlo:** El servicio `createGame` devuelve null si hay menos de 5 preguntas en el catálogo.

### Archivo: `src/controllers/game.get.ts`

- **Responsabilidad:** Devuelve el estado público de una partida a un participante.
- **Qué contiene:** Función `getGameController(req, res)`. Obtiene `userId` de `res.locals`, valida el ID de la URL con `idParamSchema`, llama a `getGameById(gameId, userId)` del servicio, verifica que el usuario sea participante, y responde con el estado público (sin filtrar la solución).
- **Funciones principales:** `getGameController(req, res)`.
- **Quién lo utiliza:** `src/controllers/game.controller.ts` → `src/routes/games.routes.ts` (ruta `GET /api/games/:id` con `authMiddleware`).

### Archivo: `src/controllers/game.answer.ts`

- **Responsabilidad:** Controla el envío de respuestas a una pregunta de partida.
- **Qué contiene:** Función `answerController(req, res)`. Obtiene `userId` de `res.locals`, valida ID de la URL, valida cuerpo con `answerSchema`, llama a `submitAnswer` del servicio, traduce errores del servicio a códigos HTTP, lee el estado fresco de la partida y emite `game:updated` por Socket.IO, responde con el resultado.
- **Funciones principales:** `answerController(req, res)`.
- **Quién lo utiliza:** `src/controllers/game.controller.ts` → `src/routes/games.routes.ts` (ruta `POST /api/games/:id/answers` con `authMiddleware`).
- **A quién utiliza:** `src/services/game.services.ts` (`submitAnswer`), `src/schemas/answer.schema.ts`, `src/schemas/question-id.schema.ts`, `src/errors/responderError.ts`, `src/sockets/index.ts` (`io`), `src/lib/prisma.ts` (`prisma`).
- **Cómo se conecta con el resto:** Tras guardar la respuesta, notifica en tiempo real a los clientes conectados a la sala de la partida.
- **Ejemplo de funcionamiento:** `POST /api/games/7/answers` con `{ gameQuestionId: 12, choiceId: 45 }` registra la respuesta y devuelve si fue correcta.
- **Qué revisar si quiero modificarlo:** La traducción de errores del servicio a códigos HTTP está en un objeto `traduccion` dentro del controlador.

### Archivo: `src/controllers/game.join.ts`

- **Responsabilidad:** Controla que un usuario se una a una sala multijugador con un código de invitación.
- **Qué contiene:** Función `joinGameController(req, res)`. Obtiene `userId` de `res.locals`, valida el código con `joinCodeSchema`, llama a `joinGame` del servicio, si hay error responde con ese error, si todo va bien lee el estado fresco y emite `game:updated` por Socket.IO.
- **Funciones principales:** `joinGameController(req, res)`.
- **Quién lo utiliza:** `src/controllers/game.controller.ts` → `src/routes/games.routes.ts` (ruta `POST /api/games/join` con `authMiddleware`).
- **A quién utiliza:** `src/services/game.services.ts` (`joinGame`), `src/schemas/game.schema.ts` (`joinCodeSchema`), `src/errors/responderError.ts`, `src/sockets/index.ts` (`io`), `src/lib/prisma.ts` (`prisma`).
- **Cómo se conecta con el resto:** Tras unirse a la partida, notifica a los clientes de la sala.
- **Ejemplo de funcionamiento:** `POST /api/games/join` con `{ code: "ABC123" }` une al usuario a esa partida.
- **Qué revisar si quiero modificarlo:** El evento se emite correctamente como `"game:updated"` tras confirmar la unión en la base de datos.

### Archivo: `src/controllers/game.start.ts`

- **Responsabilidad:** Controla que el creador inicie una partida multijugador.
- **Qué contiene:** Función `startGameController(req, res)`. Obtiene `userId` de `res.locals`, valida ID de la URL, llama a `startGame` del servicio, si hay error responde con ese error, si todo va bien emite `game:updated` por Socket.IO y responde con `{ id, status }`.
- **Funciones principales:** `startGameController(req, res)`.
- **Quién lo utiliza:** `src/controllers/game.controller.ts` → `src/routes/games.routes.ts` (ruta `POST /api/games/:id/start` con `authMiddleware`).
- **A quién utiliza:** `src/services/game.services.ts` (`startGame`), `src/schemas/question-id.schema.ts`, `src/errors/responderError.ts`, `src/sockets/index.ts` (`io`).
- **Cómo se conecta con el resto:** Solo el creador de la partida puede iniciarla (verificado en el servicio).
- **Ejemplo de funcionamiento:** `POST /api/games/7/start` inicia la partida 7 si el usuario es el creador.
- **Qué revisar si quiero modificarlo:** El servicio verifica que el usuario sea el creador y que la partida esté en estado WAITING.

### Archivo: `src/controllers/game.history.ts`


## Carpeta `src/routes/`

### Archivo: `src/routes/auth.routes.ts`

- **Responsabilidad:** Define las rutas de autenticación (registro y login).
- **Qué contiene:** `authRouter = Router()`. Rutas: `POST /register` → `registerController`, `POST /login` → `loginController`.
- **Quién lo utiliza:** `src/app.ts` (montado bajo `/api/auth`).
- **A quién utiliza:** `src/controllers/auth.controller.ts` (`registerController`, `loginController`).
- **Cómo se conecta con el resto:** Rutas públicas, sin middleware de autenticación.
- **Ejemplo de funcionamiento:** `POST /api/auth/register` y `POST /api/auth/login`.
- **Qué revisar si quiero modificarlo:** Las rutas son públicas; cualquier middleware de auth añadido aquí afectaría a registro y login.

### Archivo: `src/routes/questions.routes.ts`

- **Responsabilidad:** Define las rutas del catálogo de preguntas.
- **Qué contiene:** `questionRouter = Router()`. Rutas: `GET /` → `getQuestionsController`, `GET /:id` → `getQuestionByIdController`, `POST /` (con `authMiddleware` y `adminMiddleware`) → `createQuestionController`, `PUT /:id` (con `authMiddleware` y `adminMiddleware`) → `updateQuestionController`, `DELETE /:id` (con `authMiddleware` y `adminMiddleware`) → `deleteQuestionController`.
- **Quién lo utiliza:** `src/app.ts` (montado bajo `/api/questions`).
- **A quién utiliza:** `src/controllers/question.controller.ts`, `src/middlewares/auth.middleware.ts`, `src/middlewares/admin.middleware.ts`.
- **Cómo se conecta con el resto:** Las rutas de escritura requieren autenticación y rol ADMIN. Las rutas de lectura son públicas.
- **Ejemplo de funcionamiento:** `GET /api/questions`, `POST /api/questions` (solo ADMIN).
- **Qué revisar si quiero modificarlo:** El orden de middlewares importa: `authMiddleware` antes que `adminMiddleware`.

### Archivo: `src/routes/categories.routes.ts`

- **Responsabilidad:** Define las rutas de categorías.
- **Qué contiene:** `categoryRouter = Router()`. Ruta: `GET /` → `getCategoriesController`.
- **Quién lo utiliza:** `src/app.ts` (montado bajo `/api/categories`).
- **A quién utiliza:** `src/controllers/category.controller.ts` (`getCategoriesController`).
- **Cómo se conecta con el resto:** Endpoint público de lectura.
- **Ejemplo de funcionamiento:** `GET /api/categories`.
- **Qué revisar si quiero modificarlo:** Es una sola ruta GET pública.

### Archivo: `src/routes/games.routes.ts`

- **Responsabilidad:** Define las rutas de partidas.
- **Qué contiene:** `gameRouter = Router()`. Rutas: `POST /` (con `authMiddleware`) → `createGameController`, `POST /join` (con `authMiddleware`) → `joinGameController`, `POST /:id/start` (con `authMiddleware`) → `startGameController`, `GET /:id` (con `authMiddleware`) → `getGameController`, `POST /:id/answers` (con `authMiddleware`) → `answerController`.
- **Quién lo utiliza:** `src/app.ts` (montado bajo `/api/games`).
- **A quién utiliza:** `src/controllers/game.controller.ts`, `src/middlewares/auth.middleware.ts`.
- **Cómo se conecta con el resto:** Todas las rutas requieren autenticación. La ruta `/join` debe ir antes que `/:id` para evitar que Express la interprete como un ID.
- **Ejemplo de funcionamiento:** `POST /api/games`, `GET /api/games/7`, `POST /api/games/7/answers`.

## Carpeta `src/schemas/`

### Archivo: `src/schemas/login.schema.ts`

- **Responsabilidad:** Valida los datos de inicio de sesión con Zod.
- **Qué contiene:** `loginSchema` que valida `email` (trim, toLowerCase, min 1, max 254, formato email) y `password` (min 8, max 128). Usa `.strict()` para rechazar propiedades adicionales.
- **Quién lo utiliza:** `src/controllers/auth.login.ts`.
- **A quién utiliza:** `zod`.
- **Cómo se conecta con el resto:** Se usa con `safeParse` en el controlador; si falla, responde 400 con `VALIDATION_ERROR`.
- **Ejemplo de funcionamiento:** `POST /api/auth/login` con email y contraseña válidos pasa la validación.
- **Qué revisar si quiero modificarlo:** El email se normaliza (minúsculas, sin espacios) antes de validar el formato.

### Archivo: `src/schemas/register.schema.ts`

- **Responsabilidad:** Valida los datos de registro con Zod.
- **Qué contiene:** `registerSchema` que valida `email` (trim, toLowerCase, min 1, max 254, formato email) y `password` (min 8, max 128). Usa `.strict()`.
- **Quién lo utiliza:** `src/controllers/auth.register.ts`.
- **A quién utiliza:** `zod`.
- **Cómo se conecta con el resto:** Se usa con `safeParse` en el controlador; si falla, responde 400 con `VALIDATION_ERROR`.
- **Ejemplo de funcionamiento:** `POST /api/auth/register` con email y contraseña válidos pasa la validación.
- **Qué revisar si quiero modificarlo:** El email se normaliza antes de validar el formato.

### Archivo: `src/schemas/question.schema.ts`

- **Responsabilidad:** Valida los datos de creación/actualización de preguntas con Zod.
- **Qué contiene:** `questionSchema` que valida `categoryId` (número entero 1-2147483647), `enunciado` (string trim, 1-500), `opciones` (array de 4 strings únicas, cada una 1-200), `respuestaCorrecta` (número entero 0-3). Usa `.strict()`.
- **Quién lo utiliza:** `src/controllers/question.create.ts` y `src/controllers/question.update.ts`.
- **A quién utiliza:** `zod`.
- **Cómo se conecta con el resto:** Valida el cuerpo de peticiones POST y PUT de preguntas.
- **Ejemplo de funcionamiento:** `POST /api/questions` con un cuerpo válido pasa la validación.
- **Qué revisar si quiero modificararlo:** Las opciones deben ser exactamente 4 y únicas después del trim.

### Archivo: `src/schemas/answer.schema.ts`

- **Responsabilidad:** Valida los datos de respuesta a una pregunta de partida con Zod.
- **Qué contiene:** `answerSchema` que valida `gameQuestionId` (número entero 1-2147483647) y `choiceId` (número entero 1-2147483647). Usa `.strict()`.
- **Quién lo utiliza:** `src/controllers/game.answer.ts`.
- **A quién utiliza:** `zod`.
- **Cómo se conecta con el resto:** Valida el cuerpo de `POST /api/games/:id/answers`.
- **Ejemplo de funcionamiento:** `POST /api/games/7/answers` con `{ gameQuestionId: 12, choiceId: 45 }` pasa la validación.
- **Qué revisar si quiero modificararlo:** No se permite `isCorrect` ni `score` en el cuerpo; se calculan en el backend.

### Archivo: `src/schemas/game.schema.ts`

- **Responsabilidad:** Valida los datos de creación de partida y código de unión con Zod.
- **Qué contiene:** `createGameSchema` (valida `mode` como enum "INDIVIDUAL" o "MULTIPLAYER", default "INDIVIDUAL") y `joinCodeSchema` (valida `code` de 6 caracteres alfanuméricos sin ambiguos). Ambos usan `.strict()`.
- **Quién lo utiliza:** `src/controllers/game.create.ts` y `src/controllers/game.join.ts`.
- **A quién utiliza:** `zod`.
- **Cómo se conecta con el resto:** Valida el cuerpo de `POST /api/games` y `POST /api/games/join`.
- **Ejemplo de funcionamiento:** `POST /api/games/join` con `{ code: "ABC123" }` pasa la validación.
- **Qué revisar si quiero modificararlo:** El código de invitación excluye caracteres ambiguos (0, 1, I, O).

### Archivo: `src/schemas/query.schema.ts`

- **Responsabilidad:** Valida los query params de paginación y filtros con Zod.
- **Qué contiene:** `paginationQuerySchema` que valida `page` (coerce número, min 1, max 1000, default 1), `pageSize` (coerce número, min 1, max 50, default 10), `search` (string opcional, max 100), `categoryId` (coerce número opcional, min 1, max 2147483647).

## Carpeta `src/middlewares/`

### Archivo: `src/middlewares/auth.middleware.ts`

- **Responsabilidad:** Middleware de autenticación JWT. Valida el token, verifica que el usuario existe en la base de datos y guarda `res.locals.userId` para los siguientes middlewares o controladores.
- **Qué contiene:** Función `authMiddleware(req, res, next)`. Lee `Authorization: Bearer <token>`, verifica la firma con `jwt.verify`, valida que `payload.sub` sea un ID válido, consulta `prisma.user.findUnique` para confirmar que el usuario existe, y guarda `res.locals.userId = usuario.id`.
- **Funciones principales:** `authMiddleware(req, res, next)`.
- **Quién lo utiliza:** `src/routes/auth.routes.ts` (no, las rutas de auth no lo usan), `src/routes/questions.routes.ts`, `src/routes/games.routes.ts`, `src/routes/me.routes.ts`.
- **A quién utiliza:** `src/lib/prisma.ts` (`prisma`), `jsonwebtoken`, `src/errors/responderMiddlewareError.ts`.
- **Cómo se conecta con el resto:** Debe ir antes de cualquier controlador que necesite saber quién es el usuario autenticado. `adminMiddleware` depende de que este middleware haya poblado `res.locals.userId`.
- **Ejemplo de funcionamiento:** `GET /api/me` con `Authorization: Bearer <token válido>` pasa el middleware y llega al controlador con `res.locals.userId` definido.
- **Qué revisar si quiero modificarlo:** El middleware valida que el token tenga `exp` y que `sub` sea un número entero seguro. Si falta `JWT_SECRET`, responde 500.

### Archivo: `src/middlewares/admin.middleware.ts`

- **Responsabilidad:** Middleware de autorización. Comprueba que el usuario autenticado tenga el rol ADMIN.
- **Qué contiene:** Función `adminMiddleware(req, res, next)`. Consulta `prisma.user.findUnique` con `res.locals.userId`, selecciona el rol, si no es ADMIN responde 403 (`NOT_ADMIN`).
- **Funciones principales:** `adminMiddleware(req, res, next)`.
- **Quién lo utiliza:** `src/routes/questions.routes.ts` (rutas de creación, actualización y eliminación de preguntas).
- **A quién utiliza:** `src/lib/prisma.ts` (`prisma`), `src/errors/responderError.ts`.
- **Cómo se conecta con el resto:** Debe ir DESPUÉS de `authMiddleware`, porque necesita `res.locals.userId`.
- **Ejemplo de funcionamiento:** `POST /api/questions` con token de usuario ADMIN pasa; con token de usuario normal responde 403.
- **Qué revisar si quiero modificarlo:** Si se elimina `authMiddleware` de la ruta, `res.locals.userId` no estará definido y el middleware fallará.

### Archivo: `src/middlewares/error.middleware.ts`

- **Responsabilidad:** Middlewares de manejo de errores: captura de JSON mal formado, 404 de ruta no encontrada y error inesperado 500.
- **Qué contiene:**
  - `jsonErrorMiddleware`: captura errores de `express.json()` (payload demasiado grande → 413, JSON inválido → 400).
  - `notFoundMiddleware`: responde 404 (`ROUTE_NOT_FOUND`) para rutas que no coinciden.
  - `errorMiddleware`: último middleware, registra el error en consola y responde 500 con mensaje genérico (`INTERNAL_SERVER_ERROR`).

## Carpeta `src/services/`

### Archivo: `src/services/auth.services.ts`

- **Responsabilidad:** Lógica de negocio de autenticación: registro de usuarios, login y obtención de datos públicos.
- **Qué contiene:**
  - `registerUser(email, password)`: hace hash de la contraseña con `argon2`, crea el usuario con `prisma.user.create`, si hay error P2002 (email duplicado) devuelve null.
  - `loginUser(email, password)`: busca el usuario por email, verifica la contraseña con `argon2.verify`, devuelve `{ id, email }` o null.
  - `getPublicUserById(userId)`: busca el usuario por ID y devuelve `{ id, email, role }` o null.
- **Funciones principales:** `registerUser(email, password)`, `loginUser(email, password)`, `getPublicUserById(userId)`.
- **Quién lo utiliza:** `src/controllers/auth.login.ts`, `src/controllers/auth.register.ts`, `src/controllers/auth.me.ts`.
- **A quién utiliza:** `src/lib/prisma.ts` (`prisma`), `argon2`, `@prisma/client` (`Prisma.PrismaClientKnownRequestError`).
- **Cómo se conecta con el resto:** Es la capa que accede a la base de datos para operaciones de autenticación. No sabe nada de HTTP.
- **Ejemplo de funcionamiento:** `loginUser("juan@email.com", "secreta123")` busca al usuario, verifica el hash y devuelve los datos públicos.
- **Qué revisar si quiero modificarlo:** El hash de contraseña usa argon2. El error P2002 se captura específicamente para emails duplicados.

### Archivo: `src/services/category.services.ts`

- **Responsabilidad:** Lógica de negocio de categorías: lectura de todas las categorías.
- **Qué contiene:** Función `getCategories()`. Consulta `prisma.category.findMany` seleccionando `id` y `name`, ordenado por `name` ascendente.

### Archivo: `src/services/question.service.ts`

- **Responsabilidad:** Barrel de los servicios de preguntas. Reexporta lecturas y escrituras desde sus archivos separados.
- **Qué contiene:** Reexporta `getQuestions`, `getQuestionById`, `categoryExist` desde `./question.queries.js` y `createQuestion`, `updateQuestion`, `deleteQuestion` desde `./question.mutations.js`.
- **Quién lo utiliza:** Controladores de preguntas (`question.get.ts`, `question.create.ts`, `question.update.ts`, `question.delete.ts`).
- **A quién utiliza:** `src/services/question.queries.ts` y `src/services/question.mutations.ts`.
- **Cómo se conecta con el resto:** Permite importar todos los servicios de preguntas desde un solo archivo.
- **Qué revisar si quiero modificarlo:** Al añadir un nuevo servicio de preguntas, reexportarlo aquí.

### Archivo: `src/services/question.queries.ts`

- **Responsabilidad:** Consultas (lecturas) de preguntas y categorías.
- **Qué contiene:**
  - `getQuestions(params)`: consulta paginada con filtro de búsqueda y categoría. Ejecuta `findMany` y `count` en paralelo.
  - `getQuestionById(id)`: busca una pregunta por ID, selecciona solo campos públicos (sin `solution`).
  - `categoryExist(categoryId)`: verifica si existe una categoría por ID.
- **Funciones principales:** `getQuestions(params)`, `getQuestionById(id)`, `categoryExist(categoryId)`.
- **Quién lo utiliza:** `src/services/question.service.ts` (reexportación) → controladores de preguntas.
- **A quién utiliza:** `src/lib/prisma.ts` (`prisma`).
- **Cómo se conecta con el resto:** Capa de acceso a datos para lecturas de preguntas.
- **Ejemplo de funcionamiento:** `getQuestions({ page: 1, pageSize: 10 })` devuelve `{ items, total, page, pageSize }`.
- **Qué revisar si quiero modificarlo:** `getQuestionById` no selecciona `solution` para no filtrar la respuesta correcta.

### Archivo: `src/services/question.mutations.ts`

- **Responsabilidad:** Escrituras (crear, actualizar, borrar) de preguntas.
- **Qué contiene:**
  - `createQuestion(input)`: crea una pregunta con sus opciones y categoría. Mapea `enunciado` a `statement` y `respuestaCorrecta` al campo `isCorrect` de cada opción.
  - `updateQuestion(id, input)`: verifica que existe, actualiza pregunta, categoría y opciones (elimina y recrea opciones), devuelve la pregunta actualizada.
  - `deleteQuestion(id)`: elimina una pregunta por ID, devuelve true si se borró.

### Archivo: `src/services/game.services.ts`

- **Responsabilidad:** Barrel de los servicios de partidas. Reexporta consultas y mutaciones.
- **Qué contiene:** Reexporta `getRandomQuestions`, `getGameById`, `getMyGames` desde `./game.queries.js` y `createGame`, `submitAnswer`, `createMultiplayerGame`, `joinGame`, `startGame` desde `./game.mutations.js`.
- **Quién lo utiliza:** Controladores de partidas (`game.create.ts`, `game.get.ts`, `game.answer.ts`, `game.join.ts`, `game.start.ts`, `game.history.ts`).
- **A quién utiliza:** `src/services/game.queries.ts` y `src/services/game.mutations.ts`.
- **Cómo se conecta con el resto:** Permite importar todos los servicios de partidas desde un solo archivo.
- **Qué revisar si quiero modificarlo:** Al añadir un nuevo servicio de partidas, reexportarlo aquí.

### Archivo: `src/services/game.queries.ts`

- **Responsabilidad:** Consultas (lecturas) de partidas.
- **Qué contiene:**
  - `getRandomQuestions()`: obtiene 5 preguntas aleatorias del catálogo usando SQL nativo (`ORDER BY RANDOM() LIMIT 5`) y luego las recupera con Prisma.
  - `getGameById(gameId, userId?)`: busca una partida por ID con participantes, preguntas, opciones y respuestas. Calcula puntuación revelada, turno actual, siguiente pregunta, etc.
  - `getMyGames(userId, page, pageSize)`: obtiene las partidas del usuario paginadas, calculando la puntuación visible según el modo y estado.
- **Funciones principales:** `getRandomQuestions()`, `getGameById(gameId, userId?)`, `getMyGames(userId, page, pageSize)`.
- **Quién lo utiliza:** `src/services/game.services.ts` (reexportación) → controladores de partidas.

### Archivo: `src/services/game.mutations.ts`

- **Responsabilidad:** Escrituras (crear, modificar) de partidas.
- **Qué contiene:**
  - `generarCodigoUnico()`: genera un código de invitación de 6 caracteres únicos.
  - `createMultiplayerGame(userId)`: crea una partida multijugador en estado WAITING con el creador como jugador 1.
  - `joinGame(userId, code)`: une a un usuario a una sala multijugador con transacción y control de concurrencia.
  - `startGame(gameId, userId)`: inicia una partida multijugador (solo creador).
  - `submitAnswer(gameId, userId, gameQuestionId, choiceId)`: registra una respuesta con transacción Serializable, control de versión optimista (`turnVersion`), reintentos ante conflictos, y cálculo de puntuación y turno siguiente.
  - `createGame(userId)`: crea una partida individual.
- **Funciones principales:** `createMultiplayerGame(userId)`, `joinGame(userId, code)`, `startGame(gameId, userId)`, `submitAnswer(...)`, `createGame(userId)`, `generarCodigoUnico()`.
- **Quién lo utiliza:** `src/services/game.services.ts` (reexportación) → controladores de partidas.
- **A quién utiliza:** `src/lib/prisma.ts` (`prisma`), `src/errors/errorCatalog.ts` (`ERRORES`), `@prisma/client` (`Prisma`), `src/services/game.queries.ts` (`getRandomQuestions`), `src/services/game.types.ts` (tipos y constantes).
- **Cómo se conecta con el rest:** Capa de acceso a datos y lógica de negocio para partidas. Usa transacciones con nivel `Serializable` para control de concurrencia.

## Carpeta `src/lib/`

### Archivo: `src/lib/prisma.ts`

- **Responsabilidad:** Crea y exporta la instancia de PrismaClient compartida por toda la aplicación.
- **Qué contiene:** Lee `DATABASE_URL` de las variables de entorno. Si falta, lanza un error. Crea un adaptador `PrismaPg` (de `@prisma/adapter-pg`) con esa URL. Exporta `prisma = new PrismaClient({ adapter })`.
- **Funciones principales:** Exporta la constante `prisma`.
- **Quién lo utiliza:** Todos los servicios y middlewares que necesitan acceder a la base de datos.
- **A quién utiliza:** `@prisma/client` (`PrismaClient`), `@prisma/adapter-pg` (`PrismaPg`), `process.env.DATABASE_URL`.
- **Cómo se conecta con el rest:** Es el único punto de conexión a la base de datos. Todos los servicios importan `prisma` desde aquí.
- **Ejemplo de funcionamiento:** Cualquier servicio que haga `prisma.user.findUnique()` usa esta instancia.
- **Qué revisar si quiero modificarlo:** Si `DATABASE_URL` no está definida, la aplicación no arranca. Es el único archivo que crea el cliente Prisma.

### Archivo: `src/lib/seed.ts`

- **Responsabilidad:** Script de inicialización de datos de prueba (seed). Crea categorías y preguntas iniciales en la base de datos.
- **Qué contiene:** Arrays de categorías y preguntas con datos de ejemplo. Función `main()` que recorre las categorías y preguntas, las crea si no existen, y desconecta de la base de datos al final.
- **Funciones principales:** `main()` (función async autoejecutable).

## Carpeta `src/errors/`

### Archivo: `src/errors/errorCatalog.ts`

- **Responsabilidad:** Catálogo de errores de negocio. Cada entrada tiene un código interno (clave), un código público (`code`), un estado HTTP (`status`) y un mensaje (`message`).
- **Qué contiene:** Objeto `ERRORES` con entradas como `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `USER_NOT_FOUND`, `NOT_PARTICIPANT`, `NOT_ADMIN`, `GAME_NOT_FOUND`, `QUESTION_NOT_FOUND`, `EMAIL_ALREADY_EXISTS`, `GAME_FINISHED`, `GAME_NOT_ACTIVE`, `SALA_LLENA`, `CONFLICTO_CONCURRENCIA`, `WRONG_TURN`, `ALREADY_ANSWERED`, `NOT_ENOUGH_QUESTIONS`, entre otros.
- **Funciones principales:** No aplica (es un objeto de constantes).
- **Quién lo utiliza:** `src/errors/responderError.ts`, `src/services/game.mutations.ts`, controladores que traducen errores de servicio.
- **A quién utiliza:** Ninguno directamente (es un catálogo de datos).
- **Cómo se conecta con el rest:** `responderError` usa este catálogo para responder al cliente con el código y estado adecuados.
- **Ejemplo de funcionamiento:** `responderError(res, "GAME_NOT_FOUND")` responde 404 con `{ error: { code: "GAME_NOT_FOUND", message: "La partida no existe" } }`.
- **Qué revisar si quiero modificarlo:** El campo `code` es el código público del contrato con el cliente; cambiarlo rompe la API.

### Archivo: `src/errors/middlewareCatalog.ts`

- **Responsabilidad:** Catálogo de errores de middlewares (errores que ocurren antes de llegar al controlador).
- **Qué contiene:** Objeto `ERRORES_MIDDLEWARE` con entradas como `UNAUTHORIZED`, `INVALID_TOKEN`, `TOKEN_INVALID_OR_EXPIRED`, `TOKEN_USER_MISSING`, `PAYLOAD_TOO_LARGE`, `INVALID_JSON`, `ROUTE_NOT_FOUND`, `JWT_SECRET_MISSING`, `INTERNAL_SERVER_ERROR`.
- **Funciones principales:** No aplica (es un objeto de constantes).
- **Quién lo utiliza:** `src/errors/responderMiddlewareError.ts`.
- **A quién utiliza:** Ninguno directamente.
- **Cómo se conecta con el rest:** `responderMiddlewareError` usa este catálogo para responder errores de middleware.
- **Ejemplo de funcionamiento:** `responderMiddlewareError(res, "UNAUTHORIZED")` responde 401 con `{ error: { code: "UNAUTHORIZED", message: "Falta el token de autenticación" } }`.
- **Qué revisar si quiero modificarlo:** Los códigos públicos son el contrato con el cliente.

### Archivo: `src/errors/responderError.ts`

- **Responsabilidad:** Responde un error al cliente usando el catálogo de errores de negocio.
- **Qué contiene:** Función `responderError(res, code)`. Busca la entrada en `ERRORES`, extrae `code` (público), `status` y `message`, y responde con `res.status(status).json({ error: { code, message } })`.
- **Funciones principales:** `responderError(res, code)`.
- **Quién lo utiliza:** Todos los controladores que necesitan responder errores de negocio.
- **A quién utiliza:** `src/errors/errorCatalog.ts` (`ERRORES`).
- **Cómo se conecta con el rest:** Es la función unificada para responder errores de negocio en formato JSON.
- **Ejemplo de funcionamiento:** `responderError(res, "EMAIL_ALREADY_EXISTS")` → 409 con código `EMAIL_ALREADY_EXISTS`.
- **Qué revisar si quiero modificarlo:** El código pasado como argumento debe ser una clave válida de `ERRORES`.

### Archivo: `src/errors/responderMiddlewareError.ts`

## Carpeta `src/sockets/`

### Archivo: `src/sockets/index.ts`

- **Responsabilidad:** Configuración de Socket.IO. Crea el servidor de WebSockets sobre el mismo servidor HTTP, autentica conexiones por JWT y maneja el evento `join:game` para unir sockets a salas de partida.
- **Qué contiene:** Crea `io = new SocketIOServer(server, { cors: { origin: FRONTEND_ORIGIN, credentials: true } })`. Middleware de Socket.IO que verifica el JWT y guarda `socket.data.userId`. Evento `connection` que escucha `join:game` y une el socket a la sala `game:${gameId}` si el usuario participa en esa partida.
- **Funciones principales:** Exporta la instancia `io`.
- **Quién lo utiliza:** `src/server.ts` (importa como efecto secundario), `src/controllers/game.answer.ts`, `src/controllers/game.join.ts`, `src/controllers/game.start.ts` (usan `io` para emitir eventos).
- **A quién utiliza:** `src/server.ts` (el servidor HTTP), `src/lib/prisma.ts` (`prisma`), `jsonwebtoken`, `process.env.JWT_SECRET`, `process.env.FRONTEND_ORIGIN`.

## Carpeta `src/types/`

### Archivo: `src/types/express.d.ts`

- **Responsabilidad:** Extensión de tipos TypeScript para Express. Añade el campo `userId` a `res.locals` para que TypeScript lo conozca sin usar `any`.
- **Qué contiene:** Declaración global `namespace Express { interface Locals { userId: number; } }`.
- **Quién lo utiliza:** TypeScript al compilar cualquier archivo que use `res.locals.userId`.
- **A quién utiliza:** Ninguno en tiempo de ejecución (es solo de tipos).
- **Cómo se conecta con el rest:** Permite que `authMiddleware` asigne `res.locals.userId = usuario.id` sin errores de tipo.
- **Ejemplo de funcionamiento:** `res.locals.userId` es reconocido como `number` en controladores y middlewares.
- **Qué revisar si quiero modificarlo:** Es necesario para tipar correctamente el flujo de autenticación.

### Archivo: `src/types/question.ts`

- **Responsabilidad:** Define la interfaz `Pregunta` para tipar las preguntas del catálogo.

## Carpeta `src/docs/` (OpenAPI/Swagger)

### Archivo: `src/docs/swagger.ts`

- **Responsabilidad:** Genera la especificación OpenAPI 3.0 a partir de los comentarios `@openapi` en `src/app.ts`.
- **Qué contiene:** Configuración de `swagger-jsdoc` con definición OpenAPI, esquemas reutilizables importados de `./schemas/index.js`, y generación del documento leyendo los comentarios en `app.ts` (o `app.js` después del build). Exporta `swaggerSpec`.
- **Funciones principales:** Exporta la constante `swaggerSpec`.
- **Quién lo utiliza:** `src/app.ts` (monta Swagger UI en `/docs` y expone `GET /api/openapi.json`).
- **A quién utiliza:** `src/docs/schemas/index.js` (esquemas reutilizables), `src/app.ts` (comentarios `@openapi`).
- **Cómo se conecta con el rest:** Proporciona la documentación automática de la API en `/docs` y `/api/openapi.json`.
- **Ejemplo de funcionamiento:** `GET /api/openapi.json` devuelve el documento OpenAPI completo. `GET /docs` muestra Swagger UI.
- **Qué revisar si quiero modificarlo:** Los comentarios `@openapi` en `app.ts` son la fuente de la documentación; cambiar rutas requiere actualizar esos comentarios.

### Archivo: `src/docs/schemas/index.ts`

- **Responsabilidad:** Punto de unión de los esquemas OpenAPI reutilizables.
- **Qué contiene:** Importa `authSchemas`, `questionSchemas`, `gameSchemas`, `errorSchemas` y los combina en `swaggerSchemas`.
- **Quién lo utiliza:** `src/docs/swagger.ts`.
- **A quién utiliza:** Los cuatro archivos de esquemas (`auth.ts`, `questions.ts`, `games.ts`, `errors.ts`).
- **Cómo se conecta con el rest:** Permite que `swagger.ts` importe todos los esquemas desde un solo archivo.
- **Qué revisar si quiero modificarlo:** Al añadir un nuevo grupo de esquemas, importarlo y combinarlo aquí.

### Archivo: `src/docs/schemas/auth.ts`

- **Responsabilidad:** Esquemas OpenAPI de autenticación y usuario.
- **Qué contiene:** `authSchemas` con `RegistroEntrada`, `UsuarioPublico`, `UsuarioAutenticado`.
- **Quién lo utiliza:** `src/docs/schemas/index.ts`.
- **A quién utiliza:** `src/docs/swagger.ts` (a través del índice).
- **Cómo se conecta con el rest:** Se usa con `$ref` en los comentarios `@openapi` de las rutas de autenticación.
- **Qué revisar si quiero modificarlo:** Los nombres de los esquemas no se deben cambiar porque los `@openapi` hacen referencia a ellos.

### Archivo: `src/docs/schemas/errors.ts`

- **Responsabilidad:** Esquema OpenAPI del formato de error de la API.
- **Qué contiene:** `errorSchemas` con `Error` (objeto con `error.code` y `error.message`).
- **Quién lo utiliza:** `src/docs/schemas/index.ts`.
- **A quién utiliza:** `src/docs/swagger.ts` (a través del índice).
- **Cómo se conecta con el rest:** Se usa con `$ref: "#/components/schemas/Error"` en las respuestas de error de las rutas.
- **Qué revisar si quiero modificarlo:** El nombre `Error` es referenciado desde los comentarios `@openapi`.

### Archivo: `src/docs/schemas/questions.ts`

- **Responsabilidad:** Esquemas OpenAPI del catálogo de preguntas y categorías.
- **Qué contiene:** `questionSchemas` con `Categoria`, `PreguntaPublica`, `PreguntaInput`, `PreguntasPaginadas`.
- **Quién lo utiliza:** `src/docs/schemas/index.ts`.
- **A quién utiliza:** `src/docs/swagger.ts` (a través del índice).
- **Cómo se conecta con el rest:** Se usa con `$ref` en los comentarios `@openapi` de las rutas de preguntas.
- **Qué revisar si quiero modificarlo:** `PreguntaPublica` no contiene `respuestaCorrecta` (no se filtra al cliente). `PreguntaInput` sí la incluye.

### Archivo: `src/docs/schemas/games.ts`

- **Responsabilidad:** Esquemas OpenAPI de partidas y respuestas.
- **Qué contiene:** `gameSchemas` con `PartidaEstado`, `ResultadoSubmitAnswer`, `PartidaHistorial`, `HistorialPartidas`.
- **Quién lo utiliza:** `src/docs/schemas/index.ts`.
- **A quién utiliza:** `src/docs/swagger.ts` (a través del índice).
- **Cómo se conecta con el rest:** Se usa con `$ref` en los comentarios `@openapi` de las rutas de partidas.
- **Qué revisar si quiero modificarlo:** Los nombres de los esquemas son referenciados desde los comentarios `@openapi` en `app.ts`.

- **Qué contiene:** Interfaz `Pregunta` con campos `id: number`, `enunciado: string`, `opciones: string[]`, `respuestaCorrecta: number`.
- **Quién lo utiliza:** Archivos que necesitan tipar preguntas del catálogo.
- **A quién utiliza:** Ninguno en tiempo de ejecución.
- **Cómo se conecta con el rest:** Es una interfaz de TypeScript para uso interno.
- **Qué revisar si quiero modificarlo:** No parece estar importada activamente en el código actual; puede ser un vestigio o usarse en pruebas.

- **Cómo se conecta con el rest:** Se inicializa al arrancar el servidor. Los controladores de partidas usan `io.to(...).emit("game:updated", ...)` para notificar cambios en tiempo real.
- **Ejemplo de funcionamiento:** Un cliente se conecta con `io.connect(url, { auth: { token: "<JWT>" } })`, emite `join:game` con un `gameId`, y si participa en esa partida, se une a la sala y recibe `joined:game`.
- **Qué revisar si quiero modificarlo:** El evento se emite correctamente como `"game:updated"` tras confirmar la unión en la base de datos.


- **Responsabilidad:** Responde un error al cliente usando el catálogo de errores de middlewares.
- **Qué contiene:** Función `responderMiddlewareError(res, code)`. Busca la entrada en `ERRORES_MIDDLEWARE` y responde con el código, estado y mensaje adecuados.
- **Funciones principales:** `responderMiddlewareError(res, code)`.
- **Quién lo utiliza:** `src/middlewares/auth.middleware.ts`, `src/middlewares/admin.middleware.ts`, `src/middlewares/error.middleware.ts`.
- **A quién utiliza:** `src/errors/middlewareCatalog.ts` (`ERRORES_MIDDLEWARE`).
- **Cómo se conecta con el rest:** Es la función unificada para responder errores de middleware en formato JSON.
- **Ejemplo de funcionamiento:** `responderMiddlewareError(res, "INVALID_TOKEN")` → 401 con código `INVALID_TOKEN`.
- **Qué revisar si quiero modificarlo:** El código pasado como argumento debe ser una clave válida de `ERRORES_MIDDLEWARE`.

- **Quién lo utiliza:** El script `seed` de `package.json` (`tsx src/lib/seed.ts`).
- **A quién utiliza:** `src/lib/prisma.ts` (`prisma`), `dotenv/config`.
- **Cómo se conecta con el rest:** Es un script independiente que usa el cliente Prisma para poblar la base de datos.
- **Ejemplo de funcionamiento:** `npm run seed` crea 4 categorías y 6 preguntas de ejemplo.
- **Qué revisar si quiero modificarlo:** No es parte del runtime de la API; solo se ejecuta manualmente para poblar datos iniciales.

- **Ejemplo de funcionamiento:** `submitAnswer(7, 1, 100, 10)` registra la respuesta del usuario 1 a la pregunta 100 de la partida 7.
- **Qué revisar si quiero modificarlo:** El control de concurrencia usa `turnVersion` en el WHERE de `updateMany`. Si `count !== 1`, hay conflicto y se reintenta hasta 3 veces.

- **A quién utiliza:** `src/lib/prisma.ts` (`prisma`).
- **Cómo se conecta con el resto:** Capa de acceso a datos para lecturas de partidas.
- **Ejemplo de funcionamiento:** `getGameById(7, 1)` devuelve el estado público de la partida 7 para el usuario 1.
- **Qué revisar si quiero modificarlo:** La lógica de puntuación revelada oculta aciertos en multijugador hasta que ambos jugadores respondan.

- **Funciones principales:** `createQuestion(input)`, `updateQuestion(id, input)`, `deleteQuestion(id)`.
- **Quién lo utiliza:** `src/services/question.service.ts` (reexportación) → controladores de preguntas.
- **A quién utiliza:** `src/lib/prisma.ts` (`prisma`), `src/services/question.queries.ts` (`getQuestionById`).
- **Cómo se conecta con el resto:** Capa de acceso a datos para escrituras de preguntas.
- **Ejemplo de funcionamiento:** `createQuestion({ enunciado: "...", opciones: [...], respuestaCorrecta: 0, categoryId: 1 })` crea la pregunta y sus 4 opciones.
- **Qué revisar si quiero modificarlo:** `updateQuestion` usa `deleteMany` + `create` para las opciones, no actualiza individualmente.

- **Funciones principales:** `getCategories()`.
- **Quién lo utiliza:** `src/controllers/category.controller.ts`.
- **A quién utiliza:** `src/lib/prisma.ts` (`prisma`).
- **Cómo se conecta con el resto:** Servicio de solo lectura para el catálogo de categorías.
- **Ejemplo de funcionamiento:** `getCategories()` devuelve `[{ id: 1, name: "Geografía" }, ...]`.
- **Qué revisar si quiero modificarlo:** Es un servicio simple de lectura; no modifica datos.

- **Funciones principales:** `jsonErrorMiddleware(err, req, res, next)`, `notFoundMiddleware(req, res)`, `errorMiddleware(err, req, res, _next)`.
- **Quién lo utiliza:** `src/app.ts` (todos los tres se registran aquí).
- **A quién utiliza:** `src/errors/responderMiddlewareError.ts`.
- **Cómo se conecta con el resto:** `jsonErrorMiddleware` va después de `express.json()`. `notFoundMiddleware` va después de todas las rutas. `errorMiddleware` va al final.
- **Ejemplo de funcionamiento:** Una petición con JSON mal formado recibe 400 con `{ error: { code: "INVALID_JSON", message: "El JSON enviado no es válido" } }`.
- **Qué revisar si quiero modificararlo:** El orden es crítico. `errorMiddleware` debe ser el último en registrarse.

- **Quién lo utiliza:** `src/controllers/question.get.ts` y `src/controllers/game.history.ts`.
- **A quién utiliza:** `zod`.
- **Cómo se conecta con el resto:** Valida query params de `GET /api/questions` y `GET /api/me/games`.
- **Ejemplo de funcionamiento:** `GET /api/questions?page=2&pageSize=20&search=capital` pasa la validación.
- **Qué revisar si quiero modificararlo:** Los valores llegan como string de la URL; `coerce.number()` los convierte a número.

### Archivo: `src/schemas/question-id.schema.ts`

- **Responsabilidad:** Valida que un ID de URL sea un entero positivo dentro del rango de PostgreSQL Int.
- **Qué contiene:** `questionIdSchema` que valida `id` (string que solo contiene dígitos, refinado a número entre 1 y 2147483647). Exporta también `idParamSchema` como alias del mismo esquema.
- **Quién lo utiliza:** `src/controllers/question.get.ts`, `src/controllers/question.update.ts`, `src/controllers/question.delete.ts`, `src/controllers/game.get.ts`, `src/controllers/game.answer.ts`, `src/controllers/game.start.ts`.
- **A quién utiliza:** `zod`.
- **Cómo se conecta con el resto:** Valida parámetros de ruta `:id` en múltiples endpoints.
- **Ejemplo de funcionamiento:** `GET /api/questions/5` pasa la validación; `GET /api/questions/0` o `GET /api/questions/abc` fallan.
- **Qué revisar si quiero modificarlo:** El nombre `questionIdSchema` se usa para preguntas y partidas; `idParamSchema` es un alias para no romper imports existentes.

- **Qué revisar si quiero modificararlo:** Mantener `/join` antes de `/:id` para evitar conflictos de enrutamiento.

### Archivo: `src/routes/me.routes.ts`

- **Responsabilidad:** Define las rutas del usuario autenticado (`/api/me`).
- **Qué contiene:** `meRouter = Router()`. Ruta: `GET /games` (con `authMiddleware`) → `getMyGamesController`.
- **Quién lo utiliza:** `src/app.ts` (montado bajo `/api/me`).
- **A quién utiliza:** `src/controllers/game.controller.ts` (`getMyGamesController`), `src/middlewares/auth.middleware.ts`.
- **Cómo se conecta con el resto:** Requiere autenticación. Devuelve el historial de partidas del usuario.
- **Ejemplo de funcionamiento:** `GET /api/me/games`.
- **Qué revisar si quiero modificarlo:** Siempre requiere `authMiddleware` porque necesita `res.locals.userId`.

- **Responsabilidad:** Devuelve el historial de partidas del usuario autenticado.
- **Qué contiene:** Función `getMyGamesController(req, res)`. Obtiene `userId` de `res.locals`, valida query params con `paginationQuerySchema`, llama a `getMyGames(userId, page, pageSize)` del servicio y responde con `{ items, total, page, pageSize }`.
- **Funciones principales:** `getMyGamesController(req, res)`.
- **Quién lo utiliza:** `src/controllers/game.controller.ts` → `src/routes/me.routes.ts` (ruta `GET /api/me/games` con `authMiddleware`).
- **A quién utiliza:** `src/services/game.services.ts` (`getMyGames`), `src/schemas/query.schema.ts` (`paginationQuerySchema`), `src/errors/responderError.ts`.
- **Cómo se conecta con el resto:** Requiere autenticación. Devuelve partidas paginadas del usuario.
- **Ejemplo de funcionamiento:** `GET /api/me/games?page=1&pageSize=10` devuelve las partidas del usuario paginadas.
- **Qué revisar si quiero modificarlo:** El servicio calcula la puntuación visible según el modo y estado de cada partida.

- **A quién utiliza:** `src/services/game.services.ts` (`getGameById`), `src/schemas/question-id.schema.ts`, `src/errors/responderError.ts`, `prisma` (para lectura adicional del estado).
- **Cómo se conecta con el resto:** El usuario debe ser participante de la partida. Nunca envía `solution` ni `questionId` al cliente.
- **Ejemplo de funcionamiento:** `GET /api/games/7` devuelve el estado de la partida 7 si el usuario autenticado participa en ella.
- **Qué revisar si quiero modificarlo:** El mapeo manual de campos públicos es intencional para evitar filtrar datos sensibles.

- **Cómo se conecta con el resto:** Permite importar todos los controladores de partidas desde un solo archivo.
- **Qué revisar si quiero modificarlo:** Al añadir un nuevo controlador de partidas, reexportarlo aquí.

### Archivo: `src/controllers/question.delete.ts`

- **Responsabilidad:** Controla la eliminación de preguntas (solo ADMIN autenticado).
- **Qué contiene:** Función `deleteQuestionController(req, res)`. Valida ID de la URL, llama a `deleteQuestion` del servicio, si devuelve false responde 404, si se borró responde 204 sin cuerpo.
- **Funciones principales:** `deleteQuestionController(req, res)`.
- **Quién lo utiliza:** `src/controllers/question.controller.ts` → `src/routes/questions.routes.ts` (ruta `DELETE /api/questions/:id` con `authMiddleware` y `adminMiddleware`).
- **A quién utiliza:** `src/services/question.service.ts` (`deleteQuestion`), `src/schemas/question-id.schema.ts`, `src/errors/responderError.ts`.
- **Cómo se conecta con el resto:** Requiere autenticación y rol ADMIN.
- **Ejemplo de funcionamiento:** `DELETE /api/questions/5` borra la pregunta con ID 5 y devuelve 204.
- **Qué revisar si quiero modificararlo:** El servicio usa `deleteMany` y comprueba `result.count > 0`.


### Archivo: `src/controllers/category.controller.ts`

- **Responsabilidad:** Controla la obtención de categorías.
- **Qué contiene:** Función `getCategoriesController(_req, res)`. Llama a `getCategories` del servicio y responde con el JSON de categorías.
- **Funciones principales:** `getCategoriesController(_req, res)`.
- **Quién lo utiliza:** `src/routes/categories.routes.ts`.
- **A quién utiliza:** `src/services/category.services.ts` (`getCategories`).
- **Cómo se conecta con el resto:** Endpoint público sin autenticación.
- **Ejemplo de funcionamiento:** `GET /api/categories` devuelve una lista de categorías ordenadas por nombre.
- **Qué revisar si quiero modificarlo:** Es un controlador simple; cualquier cambio en la respuesta afecta al contrato público.

- **Quién lo utiliza:** `src/server.ts` (importa `app` para crear el servidor HTTP).
- **A quién utiliza:** Todos los routers de `src/routes/`, `src/middlewares/error.middleware.ts`, `src/docs/swagger.ts`.
- **Cómo se conecta con el resto:** Es el punto donde se ensamblan todas las partes de la API HTTP.
- **Ejemplo de funcionamiento:** Al importar `app` desde `server.ts`, se ejecutan todas las configuraciones de este archivo.
- **Qué revisar si quiero modificarlo:** El orden de los middlewares importa. `errorMiddleware` debe ir al final, después de todas las rutas y de `notFoundMiddleware`.

- **Qué contiene:** Carpetas con marcas de tiempo (por ejemplo, `20261015124955_init_reto09`, `20261026120000_reto17_turnos_concurrencia`), cada una con `migration.sql`. También `migration_lock.toml`.
- **Quién lo utiliza:** Prisma CLI al ejecutar `db:migrate:dev` o `db:migrate:status`.
- **Cómo se conecta con el resto:** Cada migración corresponde a un cambio en `schema.prisma`.
- **Ejemplo de funcionamiento:** `npm run db:migrate:dev` aplica las migraciones pendientes a la base de datos.
- **Qué revisar si quiero modificarlo:** No editar migraciones ya aplicadas. Para cambios nuevos, generar una nueva migración con Prisma.


### Archivo: `.nvmrc`

- **Responsabilidad:** Especifica la versión de Node.js requerida.
- **Qué contiene:** `24`.

### Archivo: `prisma.config.ts`

- **Responsabilidad:** Configuración de Prisma (esquema, migraciones y fuente de datos).
- **Qué contiene:** Carga `.env` con `dotenv/config`, define el esquema en `prisma/schema.prisma`, migraciones en `prisma/migrations` y URL desde `DATABASE_URL`.
- **Quién lo utiliza:** CLI de Prisma (`prisma generate`, `prisma migrate`).
- **A quién utiliza:** `prisma/schema.prisma` y `DATABASE_URL`.
- **Cómo se conecta con el resto:** Permite a Prisma encontrar el esquema y la base de datos.
- **Ejemplo de funcionamiento:** `npx prisma generate` usa este archivo para generar el cliente.
- **Qué revisar si quiero modificarlo:** La ruta del esquema y la variable de entorno deben seguir siendo correctas.
