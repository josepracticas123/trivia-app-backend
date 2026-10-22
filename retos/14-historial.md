# 14 · Consulta tu historial

**Tu misión:** Recupera las partidas y sus resultados después de cerrar el navegador o reiniciar el servidor. Cada usuario verá solo su historial.

**Antes:** El [reto 13](13-partida-individual.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Consultas por usuario, selección de campos y ordenación.

## Trabajo por bloques

1. Añade GET /api/me/games con partidas, estado, fechas y puntuación, ordenadas de más reciente a más antigua.

2. Devuelve el detalle de una partida propia con su progreso y resultado; las preguntas pendientes siguen ocultando la solución.

3. Añade una comprobación automatizada de acceso ajeno con la herramienta que acordéis y una DB de pruebas separada. Documenta cómo ejecutarla.

## Comprueba tu entrega

- [x] Dos usuarios tienen historiales separados; alterar un ID no da acceso a datos ajenos.
- [x] Reiniciar el backend conserva partidas, respuestas y resultados.
- [x] Una partida iniciada puede recuperarse y continuarse en la pregunta pendiente.
- [x] Historial y detalle usan campos explícitos sin credenciales ni soluciones pendientes.
- [x] La prueba automatizada de autorización falla si se elimina el control de participante y pasa con el control.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

Enseña dos usuarios con distintas partidas. ¿Por qué filtrar en el frontend no protege el historial?

## Pistas

El usuario del filtro sale de la sesión validada, no de un userId arbitrario en el query.

## Documentación

- [Filtrado y ordenación de Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting)

## Registro de entrega y revisión

Estado inicial: **Pendiente**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: PR abierto hacia `develop` sin merge (último commit del reto: `136f3de`).
- Prueba correcta (petición/acción y resultado):
  - `GET /api/me/games` con el token del usuario A devuelve 200 y solo sus partidas (1); con el token de B devuelve 200 y 0 partidas (historiales separados).
  - `GET /api/games/:id` de una partida de A pidiéndola con el token de B → **403** (no participa); con el token de A → 200.
  - Una partida en curso se puede continuar: responder la pregunta de turno devuelve 200 `isCorrect: true, score: 1` y el `GET` avanza de `nextQuestionId 6` a `7`.
  - Reiniciar el backend conserva las partidas: tras parar y arrancar, la partida sigue accesible con el mismo token (200).
- Prueba inválida o fallo (petición/acción y resultado):
  - `GET /api/me/games` sin token → 401; con token inválido o firmado con otro secreto → 401; con algoritmo `none` → 401 `INVALID_TOKEN`.
  - IDs maliciosos en la URL (`-1`, `abc`, `99999999999999999999`, `1.5`, `0`) → 400 (ningún 500).
  - Registro enviando `"role":"ADMIN"` → 400 `VALIDATION_ERROR`.
  - **Test de acceso ajeno**: al comentar la comprobación de participante del controlador, `npm run test:integration` falla (`expected 200 to be 403`); restaurado el código, vuelve a pasar.
- Comandos y resultados:
  - `npm run typecheck` y `npm run build`: sin errores.
  - `npm test`: 56 tests en 6 archivos (con mocks, sin base de datos).
  - `npm run test:integration`: 3 tests en 1 archivo contra la base de pruebas `trivia_test`.
  - Montaje de la base de pruebas: `createdb trivia_test`, `.env.test` con `DATABASE_URL` local, `npx prisma migrate deploy` (5 migraciones aplicadas).
- Dudas o correcciones: pendiente.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 13](13-partida-individual.md) · [Reto 15](15-filtros-paginacion-cors.md)
