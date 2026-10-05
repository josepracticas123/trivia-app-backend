# 04 · Valida las peticiones

**Tu misión:** Haz que la API rechace datos incorrectos de forma consistente. Los tipos ayudan al programar; Zod comprobará los datos recibidos mientras el servidor funciona.

**Antes:** El [reto 03](03-crud-memoria.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Esquemas, safeParse, datos unknown y respuestas de error.

## Trabajo por bloques

1. Instala Zod y define esquemas en src/schemas/ para body y parámetros. Mantén el contrato del reto anterior.

2. Usa datos validados en las operaciones. Rechaza campos inesperados en creación y edición para que nadie modifique campos internos.

3. Acuerda el formato { error: { code, message } }; añade manejo de JSON mal formado, rutas inexistentes y errores inesperados sin enviar stack traces.

## Comprueba tu entrega

- [x] Texto vacío, opciones repetidas, número incorrecto de opciones y respuesta fuera de rango dan 400.
- [x] Campos extra como id se rechazan y no llegan a la colección.
- [x] Una petición inválida no modifica ningún dato y el servidor sigue atendiendo peticiones.
- [x] JSON mal formado devuelve un error JSON con 400; una ruta desconocida devuelve 404.
- [x] Los errores de la API usan el formato acordado; un fallo interno devuelve 500 sin detalles sensibles.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

Muestra que escribir un tipo para req.body no valida una petición. ¿Qué ventaja tiene trabajar con el resultado de safeParse?

## Pistas

Empieza por un esquema pequeño. El middleware de errores de Express tiene cuatro parámetros; no conviertas todos los errores en 400.

## Documentación

- [Zod: uso básico](https://zod.dev/basics)
- [Errores en Express](https://expressjs.com/en/guide/error-handling.html)

## Registro de entrega y revisión

Estado inicial: **En progreso**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: [PR #4](https://github.com/josepracticas123/trivia-app-backend/pull/4) abierto desde `reto/04-validacion-errores` hacia `develop`. Pendiente de revisión y aprobación del tutor.
- Prueba correcta (petición/acción y resultado): POST de una pregunta válida sin `id` → `201 Created`, generando el `id` desde el servidor. También se comprobó que PUT válido → `200 OK`, DELETE individual → `204 No Content` y GET `/health` → `200 OK`.
- Prueba inválida o fallo (petición/acción y resultado): POST y PUT con campos extra como `id` → `400 VALIDATION_ERROR`. También se probaron opciones repetidas, número incorrecto de opciones y `respuestaCorrecta` fuera de rango, todos con `400 VALIDATION_ERROR`. Un PUT inválido no modifica los datos. DELETE `/api/questions` → `404 ROUTE_NOT_FOUND` y JSON mal formado → `400 INVALID_JSON`.
- Comandos y resultados: `npm run typecheck` → correcto. `npm run build` → correcto. Las pruebas de la API se realizaron con Thunder Client.
- Dudas o correcciones: Se corrigió el esquema de preguntas para que no acepte `id` y se mantuviera `.strict()`. También se eliminó el endpoint de borrado general `DELETE /api/questions`. Se corrigió el nombre del middleware de errores de `erroMiddleware` a `errorMiddleware`. Además, se comprobó el funcionamiento de los errores de JSON mal formado, rutas inexistentes y errores internos.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 03](03-crud-memoria.md) · [Reto 05](05-swagger.md)
