# Arquitectura y Dependencias del Backend

Este documento explica cómo está organizado el backend de la Trivia App, cómo se relacionan sus componentes y cuáles son las dependencias entre capas. Toda la información está basada en el código real del repositorio.

---

## 1. Capas o módulos que realmente existen

El backend no sigue una arquitectura de capas estricta y formal (como Clean Architecture), pero se puede identificar una organización funcional clara:

| Capa / Módulo | Archivos | Responsabilidad |
|---|---|---|
| Entrada (HTTP) | `src/server.ts`, `src/app.ts` | Arranque del servidor, configuración de Express, registro de rutas y middlewares globales. |
| Rutas | `src/routes/*.ts` | Definición de endpoints HTTP y asignación de controladores. |
| Controladores | `src/controllers/*.ts` | Recepción de peticiones HTTP, validación de entrada, llamada a servicios y respuesta al cliente. |
| Servicios | `src/services/*.ts` | Lógica de negocio y acceso a datos mediante Prisma. No saben nada de HTTP. |
| Acceso a datos | `src/lib/prisma.ts` | Instancia única de PrismaClient compartida. |
| Esquemas de validación | `src/schemas/*.ts` | Validación de datos de entrada con Zod. |

## 2. Responsabilidad de cada capa

### Entrada (HTTP)
`src/server.ts` es el punto de entrada. Crea el servidor HTTP con `node:http`, valida variables de entorno críticas (`JWT_SECRET`, `FRONTEND_ORIGIN`, `PORT`) y arranca el servidor con `server.listen()`. `src/app.ts` configura la aplicación Express: middlewares globales (CORS, JSON, captura de errores JSON), rutas montadas, Swagger UI y middlewares de error finales.

### Rutas
Cada archivo en `src/routes/` define un `express.Router()` y registra los endpoints para un recurso específico (auth, questions, categories, games, me). Las rutas se montan en `src/app.ts` bajo prefijos como `/api/auth`, `/api/questions`, etc.

### Controladores
Los controladores reciben `req` y `res` de Express. Validan los datos de entrada con esquemas Zod, llaman a las funciones de los servicios y traducen el resultado en respuestas HTTP (código de estado + JSON). No contienen lógica de negocio ni acceso directo a la base de datos.

### Servicios
Los servicios contienen la lógica de negocio y el acceso a datos a través de Prisma. Están organizados por dominio: `auth.services.ts` (autenticación), `category.services.ts` (categorías), `question.service.ts` (barrel de preguntas), `question.queries.ts` (lecturas de preguntas), `question.mutations.ts` (escrituras de preguntas), `game.services.ts` (barrel de partidas), `game.queries.ts` (lecturas de partidas), `game.mutations.ts` (escrituras de partidas). Los servicios no saben nada de HTTP ni de `req`/`res`.

### Acceso a datos
`src/lib/prisma.ts` crea una instancia única de `PrismaClient` con el adaptador `PrismaPg` para PostgreSQL. Todos los servicios importan `prisma` desde este archivo.

### Esquemas de validación
Cada archivo en `src/schemas/` define un esquema Zod para validar cuerpos de petición, parámetros de URL o query params. Los controladores los usan con `safeParse` y responden 400 si fallan.


## 3. Dependencias entre capas (confirmadas en el código)

La siguiente tabla muestra las dependencias directas comprobadas mediante importaciones:

| De (importador) | A (importado) | Tipo de dependencia |
|---|---|---|
| `src/server.ts` | `src/app.ts` | Importación directa de `app` |
| `src/server.ts` | `src/sockets/index.ts` | Importación por efecto secundario |
| `src/app.ts` | `src/routes/*.ts` | Importación de routers |
| `src/app.ts` | `src/middlewares/error.middleware.ts` | Importación de middlewares de error |
| `src/app.ts` | `src/docs/swagger.ts` | Importación de `swaggerSpec` |
| `src/routes/auth.routes.ts` | `src/controllers/auth.controller.ts` | Importación de controladores |
| `src/routes/questions.routes.ts` | `src/controllers/question.controller.ts` | Importación de controladores |
| `src/routes/questions.routes.ts` | `src/middlewares/auth.middleware.ts` | Importación de middleware |
| `src/routes/questions.routes.ts` | `src/middlewares/admin.middleware.ts` | Importación de middleware |
| `src/routes/games.routes.ts` | `src/controllers/game.controller.ts` | Importación de controladores |
| `src/routes/games.routes.ts` | `src/middlewares/auth.middleware.ts` | Importación de middleware |
| `src/routes/me.routes.ts` | `src/controllers/game.controller.ts` | Importación de controladores |
| `src/routes/me.routes.ts` | `src/middlewares/auth.middleware.ts` | Importación de middleware |
| `src/controllers/auth.login.ts` | `src/services/auth.services.ts` | Importación de `loginUser` |
| `src/controllers/auth.register.ts` | `src/services/auth.services.ts` | Importación de `registerUser` |
| `src/controllers/auth.me.ts` | `src/services/auth.services.ts` | Importación de `getPublicUserById` |
| `src/controllers/question.get.ts` | `src/services/question.service.ts` | Importación de funciones de servicio |
| `src/controllers/question.create.ts` | `src/services/question.service.ts` | Importación de `createQuestion`, `categoryExist` |
| `src/controllers/game.answer.ts` | `src/services/game.services.ts` | Importación de `submitAnswer` |
| `src/controllers/game.answer.ts` | `src/sockets/index.ts` | Importación de `io` |
| `src/controllers/game.answer.ts` | `src/lib/prisma.ts` | Importación de `prisma` |
| `src/controllers/game.join.ts` | `src/services/game.services.ts` | Importación de `joinGame` |
| `src/controllers/game.join.ts` | `src/sockets/index.ts` | Importación de `io` |
| `src/controllers/game.join.ts` | `src/lib/prisma.ts` | Importación de `prisma` |
| `src/controllers/game.start.ts` | `src/services/game.services.ts` | Importación de `startGame` |
| `src/controllers/game.start.ts` | `src/sockets/index.ts` | Importación de `io` |
| `src/services/auth.services.ts` | `src/lib/prisma.ts` | Importación de `prisma` |
| `src/services/auth.services.ts` | `@prisma/client` | Importación de `Prisma` |
| `src/services/question.mutations.ts` | `src/lib/prisma.ts` | Importación de `prisma` |
| `src/services/question.mutations.ts` | `src/services/question.queries.ts` | Importación de `getQuestionById` |
| `src/services/game.mutations.ts` | `src/lib/prisma.ts` | Importación de `prisma` |
| `src/services/game.mutations.ts` | `src/errors/errorCatalog.ts` | Importación de `ERRORES` |
| `src/services/game.mutations.ts` | `src/services/game.queries.ts` | Importación de `getRandomQuestions` |
| `src/services/game.mutations.ts` | `src/services/game.types.ts` | Importación de tipos y constantes |
| `src/services/game.queries.ts` | `src/lib/prisma.ts` | Importación de `prisma` |
| `src/middlewares/auth.middleware.ts` | `src/lib/prisma.ts` | Importación de `prisma` |
| `src/middlewares/auth.middleware.ts` | `src/errors/responderMiddlewareError.ts` | Importación de función de respuesta |
| `src/middlewares/admin.middleware.ts` | `src/lib/prisma.ts` | Importación de `prisma` |
| `src/middlewares/admin.middleware.ts` | `src/errors/responderError.ts` | Importación de función de respuesta |
| `src/middlewares/error.middleware.ts` | `src/errors/responderMiddlewareError.ts` | Importación de función de respuesta |
| `src/sockets/index.ts` | `src/server.ts` | Importación de `server` |
| `src/sockets/index.ts` | `src/lib/prisma.ts` | Importación de `prisma` |
| `src/errors/responderError.ts` | `src/errors/errorCatalog.ts` | Importación de `ERRORES` |
| `src/errors/responderMiddlewareError.ts` | `src/errors/middlewareCatalog.ts` | Importación de `ERRORES_MIDDLEWARE` |
| `src/docs/swagger.ts` | `src/docs/schemas/index.ts` | Importación de `swaggerSchemas` |
| `src/docs/schemas/index.ts` | `src/docs/schemas/auth.ts` | Importación de `authSchemas` |

## 4. Dependencias externas (librerías)

| Librería | Uso en el proyecto | Archivos principales que la importan |
|---|---|---|
| `express` | Framework web | `src/app.ts`, `src/routes/*.ts` |
| `@prisma/client` | Cliente ORM | `src/lib/prisma.ts`, `src/services/auth.services.ts` |
| `@prisma/adapter-pg` | Adaptador PostgreSQL para Prisma | `src/lib/prisma.ts` |
| `pg` | Driver de PostgreSQL (usado por adapter-pg) | `src/lib/prisma.ts` (indirecto) |
| `zod` | Validación de esquemas | `src/schemas/*.ts` |
| `argon2` | Hash de contraseñas | `src/services/auth.services.ts` |
| `jsonwebtoken` | JWT (firma y verificación) | `src/controllers/auth.login.ts`, `src/middlewares/auth.middleware.ts`, `src/sockets/index.ts` |
| `cors` | Configuración CORS | `src/app.ts`, `src/sockets/index.ts` |
| `socket.io` | WebSockets en tiempo real | `src/sockets/index.ts` |
| `swagger-jsdoc` | Generación OpenAPI | `src/docs/swagger.ts` |
| `swagger-ui-express` | Interfaz Swagger UI | `src/app.ts` |
| `dotenv` | Carga de variables de entorno | `src/lib/seed.ts`, `prisma.config.ts` |

## 5. Flujo de datos desde la entrada hasta la respuesta

```
1. Cliente envía petición HTTP (o WebSocket)
2. server.ts → createServer(app) → Express recibe la petición
3. Middlewares globales: CORS → express.json() → jsonErrorMiddleware
4. Router (según la ruta) → middlewares de ruta (authMiddleware, adminMiddleware)
5. Controlador: valida con Zod → llama al servicio
6. Servicio: lógica de negocio → Prisma → PostgreSQL
7. Servicio devuelve resultado al controlador
8. Controlador: responde JSON al cliente (o error via middleware)
9. Si es operación de partida: se emite game:updated por Socket.IO
```

### Diagrama Mermaid del flujo de datos

```mermaid
graph TD
    Client[Cliente HTTP] -->|Petición| Server[server.ts: createServer + listen]
    Server --> App[app.ts: configuración Express]
    App --> GlobalMW[Middlewares globales: CORS, JSON, jsonError]
    GlobalMW --> Router[Router: src/routes/*.ts]
    Router --> RouteMW[Middlewares de ruta: auth, admin]
    RouteMW --> Controller[Controlador: src/controllers/*.ts]
    Controller -->|valida con Zod| Schema[src/schemas/*.ts]
    Controller --> Service[Servicio: src/services/*.ts]
    Service --> Prisma[src/lib/prisma.ts: PrismaClient]
    Prisma --> DB[(PostgreSQL)]
    DB --> Prisma
    Prisma --> Service
    Service --> Controller

## 6. Relaciones con la base de datos y servicios externos

### Base de datos PostgreSQL
- **Cliente:** Prisma ORM con el adaptador `@prisma/adapter-pg` y el driver `pg`.
- **Conexión:** Única instancia de `PrismaClient` creada en `src/lib/prisma.ts`, usando `DATABASE_URL` de las variables de entorno.
- **Acceso:** Todos los servicios importan `prisma` desde `src/lib/prisma.ts` y realizan consultas (`findUnique`, `findMany`, `create`, `update`, `delete`, `count`, `$transaction`, `$queryRaw`).
- **Transacciones:** `src/services/game.mutations.ts` usa `prisma.$transaction` con nivel de aislamiento `Serializable` para el envío de respuestas (`submitAnswer`), garantizando consistencia ante concurrencia.
- **Control de versión optimista:** El modelo `Game` tiene un campo `turnVersion` que se incrementa en cada respuesta. El `WHERE` de `updateMany` incluye `turnVersion` para detectar conflictos.

### Servicios externos
No se han identificado servicios externos (APIs de terceros, colas de mensajes, proveedores de email, etc.) en el código. La única integración externa es la base de datos PostgreSQL.

### Socket.IO (tiempo real)
- Usa el mismo servidor HTTP de Express.
- Autenticación por JWT en el handshake.
- Eventos: `join:game` (cliente → servidor), `joined:game`, `error:game`, `game:updated` (servidor → cliente).

## 7. Autenticación y autorización

### Autenticación (JWT)
- **Generación:** `src/controllers/auth.login.ts` firma un JWT con `jsonwebtoken` usando `JWT_SECRET`, con `subject` = ID del usuario y `expiresIn: "1h"`.
- **Verificación:** `src/middlewares/auth.middleware.ts` verifica el token en la cabecera `Authorization: Bearer <token>`. Valida la firma, que `exp` exista y sea finita, que `sub` sea un ID válido, y que el usuario exista en la base de datos.
- **Almacenamiento:** El `userId` se guarda en `res.locals.userId` para uso posterior.
- **Socket.IO:** `src/sockets/index.ts` verifica el JWT en el handshake de la conexión WebSocket.

### Autorización (roles)
- **Roles:** `user.role` puede ser `USER` o `ADMIN` (enum de Prisma).
- **Middleware de admin:** `src/middlewares/admin.middleware.ts` consulta el rol del usuario y responde 403 si no es ADMIN.
- **Uso:** Las rutas de creación, actualización y eliminación de preguntas requieren `authMiddleware` + `adminMiddleware`.

### Autorización por pertenencia a partida
- El controlador `getGameController` verifica que el usuario autenticado sea participante de la partida (`game.players.some(p => p.userId === userId)`).
- El servicio `submitAnswer` verifica que el usuario participe, que sea su turno, y que no haya respondido ya.

## 8. Manejo de errores

### Estrategia

## 9. Puntos donde una modificación puede afectar a otras partes

| Punto de modificación | Áreas afectadas |
|---|---|
| `src/lib/prisma.ts` | Todos los servicios y middlewares que usan `prisma`. |
| `src/schemas/*.ts` | Todos los controladores que validan con esos esquemas. |
| `src/middlewares/auth.middleware.ts` | Todas las rutas que requieren autenticación y `adminMiddleware`. |
| `src/middlewares/admin.middleware.ts` | Rutas de escritura de preguntas (POST, PUT, DELETE). |
| `src/errors/errorCatalog.ts` | Todos los controladores y servicios que usan `responderError`. |
| `src/services/game.mutations.ts` | Controladores de partidas y pruebas de servicios. |
| `src/sockets/index.ts` | Todos los controladores que emiten eventos Socket.IO. |
| `src/app.ts` | Todas las rutas, middlewares globales y Swagger. |
| `src/server.ts` | Todo el arranque de la aplicación. |

### Relaciones inferidas (no verificadas directamente en el código)
- La relación entre `src/types/express.d.ts` y `res.locals.userId` se infiere del uso de `res.locals.userId` en controladores y middlewares, pero el archivo de tipos es lo que permite que TypeScript lo acepte sin errores.
- El orden de middlewares en `src/app.ts` es crítico: `errorMiddleware` debe ir después de todas las rutas y después de `notFoundMiddleware`.

- **Errores de negocio:** Definidos en `src/errors/errorCatalog.ts` con código público, estado HTTP y mensaje. Se responden con `responderError(res, code)`.
- **Errores de middleware:** Definidos en `src/errors/middlewareCatalog.ts`. Se responden con `responderMiddlewareError(res, code)`.
- **Errores inesperados:** Capturados por `errorMiddleware` en `src/middlewares/error.middleware.ts`, que registra el error en consola y responde 500 con mensaje genérico (sin detalles internos).
- **Errores de JSON:** `jsonErrorMiddleware` captura JSON mal formado (400) y payload demasiado grande (413).
- **Rutas no encontradas:** `notFoundMiddleware` responde 404.

### Flujo de errores
1. Error en controlador o servicio → `responderError` o `throw error`.
2. Error en middleware → `responderMiddlewareError` o `next(error)`.
3. Error no capturado → `errorMiddleware` (500).
4. El cliente siempre recibe `{ error: { code, message } }`.

    Controller -->|respuesta JSON| Client
    Controller -->|emit game:updated| SocketIO[src/sockets/index.ts]
    SocketIO -->|WebSocket| Client
    Controller -.->|error| ErrorMW[error.middleware.ts]
    ErrorMW --> Client
```

| `src/docs/schemas/index.ts` | `src/docs/schemas/questions.ts` | Importación de `questionSchemas` |
| `src/docs/schemas/index.ts` | `src/docs/schemas/games.ts` | Importación de `gameSchemas` |
| `src/docs/schemas/index.ts` | `src/docs/schemas/errors.ts` | Importación de `errorSchemas` |

### Middlewares
- `auth.middleware.ts`: valida el token JWT y establece `res.locals.userId`.
- `admin.middleware.ts`: verifica que el usuario tenga rol ADMIN (depende de `authMiddleware`).
- `error.middleware.ts`: `jsonErrorMiddleware` (captura JSON mal formado), `notFoundMiddleware` (404), `errorMiddleware` (500 genérico).

### Errores
`src/errors/errorCatalog.ts` define los errores de negocio con sus códigos públicos y estados HTTP. `src/errors/middlewareCatalog.ts` define los errores de middlewares. `responderError.ts` y `responderMiddlewareError.ts` son funciones helper para responder al cliente.

### Tiempo real
`src/sockets/index.ts` configura Socket.IO sobre el mismo servidor HTTP, autentica conexiones por JWT y maneja el evento `join:game`. Los controladores emiten `game:updated` tras operaciones de partida confirmadas en la base de datos.

| Middlewares | `src/middlewares/*.ts` | Autenticación JWT, autorización de admin, manejo de errores. |
| Errores | `src/errors/*.ts` | Catálogos de errores de negocio y middleware, funciones de respuesta. |
| Tiempo real | `src/sockets/index.ts` | Servidor Socket.IO y eventos WebSocket. |
| Tipos | `src/types/*.ts` | Extensiones de tipos TypeScript. |
| Documentación API | `src/docs/swagger.ts`, `src/docs/schemas/*.ts` | Especificación OpenAPI y Swagger UI. |
