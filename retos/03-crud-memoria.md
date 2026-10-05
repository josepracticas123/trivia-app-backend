# 03 · Modifica tus datos

**Tu misión:** Añade creación, edición y eliminación de preguntas. Por primera vez una petición cambiará los datos que devuelve tu backend.

**Antes:** El [reto 02](02-listar-preguntas.md) debe estar aprobado e integrado en develop.

**Aprenderás:** POST, PUT, DELETE, cuerpo JSON, validación básica y estados 201 y 204.

## Trabajo por bloques

1. POST /api/questions crea una pregunta con un ID asignado por el servidor; el cliente no elige el ID.

2. PUT /api/questions/:id sustituye todos los campos editables: enunciado, opciones y respuestaCorrecta. DELETE elimina una pregunta.

3. Comprueba manualmente texto no vacío, cuatro opciones no vacías y distintas, e índice correcto. En el siguiente reto sustituirás estas comprobaciones por Zod.

## Comprueba tu entrega

- [x] POST válido devuelve 201 y permite consultar la pregunta nueva sin revelar la solución.
- [x] Los IDs no se repiten aunque elimine y vuelva a crear preguntas.
- [x] PUT válido devuelve 200; una petición incompleta o inválida devuelve 400 sin cambios parciales.
- [x] DELETE devuelve 204 sin cuerpo y el siguiente GET devuelve 404.
- [x] PUT y DELETE de un ID inexistente devuelven 404; los datos desaparecen al reiniciar y sé explicar por qué.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

Enseña una petición por método y explica qué se envía en la URL y qué se envía en el body.

## Pistas

Usa una herramienta HTTP o curl. Define una única colección compartida: crear y consultar deben usar los mismos datos.

## Documentación

- [API de Express](https://expressjs.com/en/5x/api.html)

## Registro de entrega y revisión

Estado inicial: **Pendiente**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: [PR #3](https://github.com/josepracticas123/trivia-app-backend/pull/3).
- Prueba correcta (petición/acción y resultado): POST válido devuelve 201; PUT válido devuelve 200; DELETE válido devuelve 204 y el GET posterior devuelve 404.
- Prueba inválida o fallo (petición/acción y resultado): POST y PUT sin body devuelven 400; POST y PUT con una opción numérica o `null` devuelven 400; las opciones `"a"` y `" a "` se consideran duplicadas; un PUT rechazado no modifica los datos de la pregunta.
- Comandos y resultados: `npm run typecheck` y `npm run build` ejecutados correctamente, sin errores.
- Dudas o correcciones: Al hacer una petición POST o PUT sin body, `req.body` era `undefined` y provocaba un error 500. Lo solucioné validando primero que el body existe y tiene formato de objeto. También comprobé que las opciones fueran textos antes de utilizar `trim()`, evitando errores con valores numéricos o `null`. Además, normalicé las opciones antes de comprobar duplicados.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 02](02-listar-preguntas.md) · [Reto 04](04-validacion-errores.md)
