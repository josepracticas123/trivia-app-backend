# 13 · Juega una partida individual

**Tu misión:** Crea una partida de cinco preguntas y responde una a una. El backend elegirá las preguntas, comprobará las respuestas y calculará los puntos.

**Antes:** El [reto 12](12-autenticacion-permisos.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Reglas de negocio, estado de partida y datos públicos frente a internos.

## Trabajo por bloques

1. Crea Game, GamePlayer, GameQuestion y Answer mediante migraciones. Usa participantes relacionados incluso en modo individual para poder ampliar después.

2. POST /api/games crea una partida individual privada, GET /api/games/:id devuelve su estado y POST /api/games/:id/answers recibe la pregunta de partida y opción elegida. Devuelve 409 si no hay cinco preguntas disponibles.

3. Guarda el orden y una copia de las preguntas, opciones y soluciones seleccionadas. Cambiar o borrar una pregunta del catálogo no debe alterar una partida existente.

## Comprueba tu entrega

- [x] La partida contiene cinco preguntas sin repetición y pertenece al usuario autenticado.
- [x] La respuesta pública de la partida no revela soluciones de preguntas pendientes.
- [x] El backend verifica que la pregunta corresponde al turno y que la opción pertenece a esa pregunta.
- [x] Cada respuesta correcta suma un punto; el cliente no puede enviar ni modificar su puntuación.
- [x] Responder dos veces no suma dos veces; completar las cinco preguntas finaliza la partida.
- [x] Usuario ajeno recibe 403 y una partida inexistente devuelve 404; Swagger refleja el contrato.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

Juega una partida completa. ¿Por qué guardar una copia de las preguntas evita que una edición del catálogo cambie una partida?

## Pistas

Mantén toda la lógica en servicios. Distingue el ID de la pregunta del catálogo del ID de la pregunta guardada en una partida.

## Documentación

- [Modelado con Prisma](https://www.prisma.io/docs/orm/prisma-schema/data-model/models)

## Registro de entrega y revisión

Estado inicial: **Pendiente**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: realizado.
- Prueba correcta (petición/acción y resultado): `POST /api/games` → `201` con id y estado `ACTIVE`. `GET /api/games/1` con token → `200` con cinco preguntas sin repetición (posiciones 0..4), cuatro opciones cada una y sin `solution`. Partida completa con `POST /api/games/1/answers` → `200` en las cinco respuestas con `isCorrect` y `score` calculados por el servidor (1 hasta 5), y `finished: true` en la quinta (pasa a `FINISHED`).
- Prueba inválida o fallo (petición/acción y resultado): Sin token → `401` "Falta el token de autenticación". Id `99999` → `404 GAME_NOT_FOUND`. Token de un usuario ajeno → `403 FORBIDDEN` "No participas en esta partida". Responder fuera de turno o repetir una respuesta → `409 WRONG_TURN` (no suma dos veces). Opción que pertenece a otra pregunta → `400 CHOICE_NOT_IN_QUESTION`. Body con `isCorrect: true` → `400 VALIDATION_ERROR` (`.strict()` del esquema). Responder con la partida cerrada → `409 GAME_FINISHED`.
- Comandos y resultados: `npm test` → 18 tests superados en 4 archivos (middleware de auth, controlador de auth, rutas de categorías y rutas de preguntas). `npm run typecheck` → sin errores. `npm run build` → compilación correcta. Swagger: documentados y probados desde `/docs` los tres endpoints de partidas (`POST /api/games` 201/401/409, `GET /api/games/{id}` 200/400/401/403/404 y `POST /api/games/{id}/answers` 200/400/401/403/404/409).
- Dudas o correcciones: Correcciones aplicadas en esta rama: typo `GAME_NOT_FOUN` en el tipo de resultado del servicio (TS2820) y `return` final ausente (TS2366); un `}` cerraba el `if` antes del `return` en el controlador; import fantasma `finished` de `stream` metido por el IDE; `resultadoValidacion.succes` sin la `s` (habría devuelto 400 en todas las peticiones); faltaba `.strict()` en `answerSchema` (el test de campo extra devolvía 200 en vez de 400) — añadido y verificado con la prueba repetida; errata `FORBIDEN` → `FORBIDDEN` en el 403 del `GET /api/games/:id`. Sin incidencias abiertas.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 12](12-autenticacion-permisos.md) · [Reto 14](14-historial.md)
