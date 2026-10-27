# Trivia App Backend — Guía Principal

> Esta documentación describe **este proyecto concreto**, basada en el código real del repositorio.

## 1. ¿Qué es esta API? (resumen de 5 minutos)

La **Trivia App Backend** es una API REST académica construida con Node.js, TypeScript y Express 5. Sirve como backend de una aplicación de trivia con dos modos de juego: **individual** y **multijugador**. También gestiona usuarios (registro, login con JWT), categorías y preguntas del catálogo, con validación de datos, control de acceso por roles, manejo centralizado de errores y notificaciones en tiempo real mediante Socket.IO. La base de datos es PostgreSQL, accedida a través de Prisma ORM.

## 2. Tecnologías y herramientas utilizadas

| Tecnología | Uso en el proyecto |
|---|---|
| Node.js 24.x | Entorno de ejecución |
| TypeScript | Lenguaje, compilado a ES2022 con NodeNext |
| Express 5 | Framework web y enrutador HTTP |
| Prisma ORM + @prisma/client + @prisma/adapter-pg + pg | Acceso a PostgreSQL |
| zod | Validación de esquemas de entrada |
| argon2 | Hash de contraseñas |
| jsonwebtoken | Generación y verificación de JWT |

## 3. Estructura general del repositorio

```
trivia-app-backend/
├── docs/
├── prisma/schema.prisma
├── prisma/migrations/
├── retos/
├── src/server.ts
├── src/app.ts
├── src/controllers/
├── src/services/
├── src/routes/
├── src/schemas/
├── src/middlewares/
├── src/lib/
├── src/sockets/
├── src/types/
├── src/errors/
├── src/docs/
├── tests/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── vitest.integration.config.ts
└── prisma.config.ts
```

## 4. Punto de entrada de la aplicación

El primer archivo que se ejecuta es **`src/server.ts`**. Cuando se ejecuta `npm run dev`, se usa `tsx watch` sobre `src/server.ts`. Ese archivo:

1. Importa `app` desde `./app.js` (la aplicación Express ya configurada).

## 5. Cómo se inicia en desarrollo

```bash
npm install
cp .env.example .env
# Editar .env y configurar DATABASE_URL, JWT_SECRET y FRONTEND_ORIGIN
npm run db:generate
npm run db:migrate:dev
npm run seed          # opcional: datos iniciales
npm run dev           # arranca con recarga automática en http://localhost:3000
```

Requisitos: Node.js 24.x, PostgreSQL accesible, variables de entorno `JWT_SECRET` (mínimo 32 caracteres) y `FRONTEND_ORIGIN` definidas.

## 7. Componentes principales y responsabilidades

| Carpeta | Responsabilidad |
|---|---|
| Entrada (`server.ts`, `app.ts`) | Arranque del servidor HTTP, configuración de Express, registro de rutas y middlewares. |
| Rutas (`src/routes/*.ts`) | Definen los endpoints HTTP y qué controlador maneja cada uno. |
| Controladores (`src/controllers/*.ts`) | Reciben la petición HTTP, validan entrada, llaman a servicios y envían respuesta JSON. |
| Servicios (`src/services/*.ts`) | Lógica de negocio y acceso a datos mediante Prisma. No saben nada de HTTP. |
| Esquemas (`src/schemas/*.ts`) | Validación de datos de entrada con Zod (cuerpos, parámetros, query params). |
| Middlewares (`src/middlewares/*.ts`) | Autenticación JWT, autorización de admin, manejo de errores JSON, 404 y errores inesperados. |
| Acceso a datos (`src/lib/prisma.ts`) | Instancia única de PrismaClient compartida por toda la aplicación. |
| Errores (`src/errors/*.ts`) | Catálogos de errores de negocio y de middleware, funciones para responder al cliente. |
| Tiempo real (`src/sockets/index.ts`) | Servidor Socket.IO, autenticación por token y eventos `join:game`, `game:updated`. |
| Tipos (`src/types/*.ts`) | Extensiones de TypeScript (Express Locals con `userId`). |
| Documentación API (`src/docs/`) | Especificación OpenAPI y esquemas reutilizables para Swagger UI. |

## 8. Resumen del funcionamiento general

1. El cliente envía una petición HTTP a un endpoint.
2. Express recibe la petición y pasa por middlewares globales: CORS, `express.json()`, captura de JSON mal formado.
3. La ruta correspondiente dirige la petición al controlador correcto.
4. Antes del controlador, pueden ejecutarse middlewares de ruta como `authMiddleware` (valida JWT) o `adminMiddleware` (verifica rol ADMIN).
5. El controlador valida los datos con Zod, llama al servicio y traduce el resultado en una respuesta HTTP.
6. El servicio ejecuta la lógica de negocio y consulta o modifica la base de datos mediante Prisma.
7. Si todo va bien, el cliente recibe una respuesta JSON.
8. Si hay un error, el middleware global devuelve `{ error: { code, message } }` con el estado HTTP apropiado.

Para operaciones de partida, tras confirmar la transacción en la base de datos, el servidor emite `game:updated` por Socket.IO a la sala de la partida.

## 9. Endpoints principales

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| POST | `/api/auth/register` | Registra un nuevo usuario | Público |
| POST | `/api/auth/login` | Inicia sesión y devuelve un JWT | Público |
| GET | `/api/me` | Datos del usuario autenticado | Token JWT |
| GET | `/api/me/games` | Historial de partidas del usuario | Token JWT |
| GET | `/api/categories` | Lista categorías | Público |
| GET | `/api/questions` | Lista paginada de preguntas | Público |
| GET | `/api/questions/:id` | Pregunta por su ID | Público |
| POST | `/api/questions` | Crea una pregunta | Token JWT + ADMIN |
| PUT | `/api/questions/:id` | Actualiza una pregunta | Token JWT + ADMIN |
| DELETE | `/api/questions/:id` | Elimina una pregunta | Token JWT + ADMIN |
| POST | `/api/games` | Crea una partida | Token JWT |
| POST | `/api/games/join` | Se une a una sala multijugador | Token JWT |
| POST | `/api/games/:id/start` | Inicia una partida multijugador | Token JWT (creador) |
| GET | `/api/games/:id` | Estado público de una partida | Token JWT (participante) |
| POST | `/api/games/:id/answers` | Responde a la pregunta en turno | Token JWT (participante) |
| GET | `/api/openapi.json` | Especificación OpenAPI 3.0 | Público |
| GET | `/docs` | Interfaz Swagger UI | Público |
| GET | `/` | Mensaje de bienvenida | Público |

## 10. Variables de entorno necesarias

Definidas en `.env` (plantilla en `.env.example`):

- `PORT` — puerto del servidor (por defecto 3000).
- `DATABASE_URL` — cadena de conexión a PostgreSQL (requerida por Prisma).
- `JWT_SECRET` — secreto para firmar/verificar JWT (mínimo 32 caracteres, obligatorio).
- `FRONTEND_ORIGIN` — origen del frontend para CORS (obligatorio).

**Nunca se incluyen valores secretos en esta documentación ni se sube `.env` a Git.**

## 11. Pruebas automatizadas

- **Pruebas unitarias** (`npm run test`): Vitest con mocks de Prisma y servicios. No tocan la base de datos real.
- **Pruebas de integración** (`npm run test:integration`): configuración separada, en serie, contra una base de datos real (`trivia_test`). Requieren `tests/.env.test`.

## 12. Enlaces a los demás documentos de `docs/`

- [`FLUJO_DE_EJECUCION.md`](./FLUJO_DE_EJECUCION.md) — recorrido paso a paso del arranque y de una petición HTTP real, con ejemplos de endpoints y diagramas Mermaid.
- [`ARCHIVOS_Y_RESPONSABILIDADES.md`](./ARCHIVOS_Y_RESPONSABILIDADES.md) — inventario detallado por archivo: qué hace, qué contiene, quién lo utiliza y qué revisar al modificarlo.
- [`ARQUITECTURA_Y_DEPENDENCIAS.md`](./ARQUITECTURA_Y_DEPENDENCIAS.md) — capas, dependencias entre módulos, flujo de datos y puntos críticos de modificación.
- [`GLOSARIO_Y_GUIA_PARA_EXPLICARLO.md`](./GLOSARIO_Y_GUIA_PARA_EXPLICARLO.md) — glosario de conceptos, preguntas típicas de tutor con respuestas modelo y guía para explicar la API en 5 minutos.

## 13. Limitaciones y aspectos pendientes de investigar

- No se ha verificado el despliegue en producción más allá del script `npm run start`.
- El archivo `.env` no está versionado; no se conocen los valores reales de `DATABASE_URL` ni `JWT_SECRET`.
- Las pruebas de integración requieren una base de datos PostgreSQL real y no se han ejecutado en este análisis.
- El evento `game:updated` se emite correctamente desde `game.join.ts` tras confirmar la unión en la base de datos.
- No se ha encontrado un sistema de colas de tareas, trabajos programados (cron) ni procesos adicionales más allá de Socket.IO.


## 6. Configuración de la base de datos

La conexión se define en **`src/lib/prisma.ts`**: lee `DATABASE_URL` de las variables de entorno, si falta lanza un error, crea un adaptador `PrismaPg` y exporta una instancia de `PrismaClient` compartida por toda la aplicación.

El esquema de datos está en **`prisma/schema.prisma`**. Modelos principales: `user`, `category`, `question`, `option`, `game`, `gamePlayer`, `gameQuestion`, `gameChoice`, `answer`. Las migraciones están en `prisma/migrations/` y se aplican con `npm run db:migrate:dev`.

2. Importa `createServer` de `node:http` y crea un servidor HTTP con `createServer(app)`.
3. Importa `./sockets/index.js` (efecto secundario: configura Socket.IO sobre el mismo servidor HTTP).
4. Valida variables de entorno obligatorias (`JWT_SECRET`, `FRONTEND_ORIGIN`) y detiene el arranque si faltan.
5. Valida que `PORT` sea un entero entre 1 y 65535.
6. Llama a `server.listen(port, "0.0.0.0")` para empezar a recibir peticiones.

| cors | Configuración de CORS |
| socket.io | WebSockets para eventos de partida en tiempo real |
| swagger-jsdoc + swagger-ui-express | Documentación OpenAPI / Swagger UI |
| vitest + supertest | Pruebas unitarias y de integración |
| tsx | Ejecución de TypeScript sin compilación previa |