# 08 · Organiza el backend

**Tu misión:** Ahora que tienes una API funcionando, separa sus responsabilidades para que autenticación y partidas puedan crecer sin llenar app.ts.

**Antes:** El [reto 07](07-crud-persistente.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Router, controlador, servicio y separación de responsabilidades.

## Trabajo por bloques

1. Mueve la definición de rutas a src/routes/ y el manejo HTTP a src/controllers/.

2. Mueve las consultas y reglas a src/services/. Los servicios reciben datos normales y no reciben req ni res.

3. Deja configuración y montaje en app.ts, conexión en src/lib/ y apertura del puerto en server.ts. Conserva los esquemas y tipos en sus carpetas.

## Comprueba tu entrega

- [x] app.ts configura y monta rutas; no contiene el CRUD completo.
- [x] Los controladores leen datos validados y construyen respuestas HTTP.
- [x] Los servicios no dependen de Express y centralizan las consultas y reglas.
- [x] Las cinco operaciones CRUD están conectadas al router y Swagger documenta sus endpoints. El ciclo CRUD se completó desde Swagger en desarrollo; `typecheck` y `build` pasan. La ejecución HTTP de `dist` no se comprobó.
- [x] No hay archivos duplicados ni importaciones circulares para mantener el código anterior.
- [x] `npm.cmd run typecheck` y `npm.cmd run build` pasan; las rutas de lectura, las solicitudes inválidas y el ciclo CRUD se comprobaron en desarrollo.
- [x] He actualizado `APRENDIZAJE.md` y anotado las pruebas.
- [ ] He abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

Para `GET /api/questions/1`, Express monta `questionRouter` en `/api/questions`; la ruta `/:id` llama a `getQuestionByIdController`. El controlador valida el ID con `questionIdSchema`, lo convierte a número y llama a `getQuestionById(1)`. El servicio consulta PostgreSQL con Prisma y devuelve `id`, `statement` y `options`; el controlador adapta esos campos al formato público (`id`, `enunciado`, `opciones`) y responde con HTTP 200. Si no hay pregunta, el servicio devuelve `null` y el controlador responde 404. Desde un evento de Socket.IO se podría reutilizar `getQuestionById(id)`, porque el servicio no depende de `req` ni `res`.

## Pistas

Funciones exportadas son suficientes. No hacen falta clases, repositorios genéricos ni inyección de dependencias.

## Documentación

- [Router de Express](https://expressjs.com/en/guide/routing.html)

## Registro de entrega y revisión

Estado: **Implementación, documentación y ciclo CRUD en desarrollo completados; pendiente de abrir la PR y de la revisión del tutor.** La prueba HTTP de la versión compilada queda como comprobación adicional pendiente. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: aún no hay commit ni PR del reto 08. El alumno creará el commit y abrirá la PR hacia `develop`, dejándola abierta para revisión.
- Prueba correcta (petición/acción y resultado):
  - En Swagger, servidor local de desarrollo: `POST /api/questions` con una pregunta temporal válida → 201; devuelve el ID y los campos públicos.
  - `GET /api/questions/{id}` con el ID creado → 200; devuelve los datos públicos sin `respuestaCorrecta`.
  - `PUT /api/questions/{id}` con datos válidos → 200; GET posterior confirma la actualización.
  - `DELETE /api/questions/{id}` → 204; GET posterior → 404, confirmando que la pregunta temporal se eliminó.
  - `GET /api/questions` → 200; devuelve una lista de preguntas con `id`, `enunciado` y `opciones`, sin `respuestaCorrecta`.
  - `GET /docs` → 200; se muestra Swagger UI.
  - `GET /api/openapi.json` → 200; documenta GET y POST en `/api/questions`, y GET, PUT y DELETE en `/api/questions/{id}`.
- Prueba inválida o fallo (petición/acción y resultado):
  - POST `/api/questions` con `{}` → 400 `VALIDATION_ERROR`.
  - PUT `/api/questions/0` con un body válido → 400 `VALIDATION_ERROR`.
  - DELETE `/api/questions/0` → 400 `VALIDATION_ERROR`.
  - Los resultados anteriores corresponden a las pruebas realizadas por el alumno en Swagger; no se registra aquí el ID de la pregunta temporal.
- Comandos y resultados (8 de octubre de 2026):
  - `npm.cmd run typecheck` → correcto.
  - `npm.cmd run build` → correcto.
  - El ciclo CRUD se verificó en el servidor de desarrollo. No se ha iniciado `dist` para repetir las peticiones HTTP contra la versión compilada.
- Dudas o correcciones:
  - No quedan dudas pendientes sobre la responsabilidad de `app.ts`: configura Express y los middlewares globales, conserva endpoints generales como `/health` y `/api/openapi.json`, configura Swagger UI y monta `questionRouter` bajo `/api/questions`. No contiene la lógica del CRUD; el arranque del puerto corresponde a `server.ts`.
  - También quedó claro que el servicio devuelve `null` si no encuentra una pregunta y que el controlador traduce ese resultado a HTTP 404 sin acoplar el servicio a Express.
- Revisión y aprobación del tutor: pendiente; la PR aún no está abierta.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 07](07-crud-persistente.md) · [Reto 09](09-relaciones.md)
