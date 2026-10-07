# 07 · Guarda las preguntas de verdad

**Tu misión:** Sustituye la colección en memoria por consultas con Prisma. La API conservará el mismo contrato, pero los cambios sobrevivirán al reinicio.

**Antes:** El [reto 06](06-postgres-prisma.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Consultas del ORM, promesas, async/await y errores de persistencia.

## Trabajo por bloques

1. Reemplaza lectura, creación, actualización y eliminación por consultas a PostgreSQL en la DB de desarrollo de Railway preparada en el reto 06. El backend sigue ejecutándose en tu PC.

2. Mantén las validaciones y respuestas públicas. Usa selección explícita de campos para no enviar la solución.

3. Distingue registro inexistente de fallo de DB. Actualiza Swagger y deja de utilizar la colección local como fuente de datos.

## Comprueba tu entrega

- [x] Todo el CRUD usa PostgreSQL y respeta los estados HTTP de los retos anteriores.
- [x] Crear y reiniciar el backend conserva la pregunta. Editar y volver a consultar devuelve los cambios actualizados.
- [x] Eliminar sigue eliminado después de reiniciar. DELETE devolvió 204 y GET posterior y tras reiniciar devolvió 404.
- [x] Un ID inexistente da 404; el fallo de conexión devuelve 500 `INTERNAL_SERVER_ERROR`, no lista vacía ni éxito.
- [x] Las respuestas siguen ocultando la solución y el seed está disponible para preparar la práctica.
- [x] `npm run typecheck` y `npm run build` pasan; comprobaciones previas de GET, POST, PUT y DELETE realizadas con Swagger.
- [ ] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Por qué una consulta necesita await? ¿Por qué reiniciar el backend en tu PC conserva los datos en Railway, pero borrar registros o hacer un reset de la DB los elimina?

## Pistas

Usa los tipos y el autocompletado del cliente generado. No dupliques a mano todos sus tipos ni conviertas resultados mediante as para esconder errores.

## Documentación

- [Consultas CRUD de Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/crud)

## Registro de entrega y revisión

Estado: **Pruebas y comprobaciones técnicas completadas**. Pendiente únicamente el commit y la apertura del PR por parte del alumno; la aprobación formal corresponde al tutor.

- PR y commit revisado: pendiente; el alumno realizará el commit y abrirá el PR hacia `develop`.
- Pruebas correctas (petición/acción y resultado):
  - Swagger GET de lista y GET por ID válido → respuestas correctas.
  - POST de pregunta temporal → `201`; body con `id`, `enunciado` y `opciones`, sin solución.
  - Tras reiniciar el backend, GET de la pregunta creada → se conservó en PostgreSQL.
  - PUT de la pregunta temporal → `200`; GET posterior devolvió los datos actualizados.
  - DELETE de la pregunta temporal → `204 No Content`; GET posterior y tras reiniciar el backend → `404`.
- Pruebas inválidas/fallos:
  - GET con ID no numérico → `400`.
  - GET y PUT con ID numérico inexistente → `404`; PUT responde `QUESTION_NOT_FOUND`.
  - Con una URL de PostgreSQL temporalmente inválida, GET de lista → `500 INTERNAL_SERVER_ERROR`, no éxito ni lista vacía. Prueba HTTP local; no se modificó `.env`.
- Comandos y resultados: `npm run typecheck` → correcto; `npm run build` → correcto.
- Dudas o correcciones: ninguna pendiente de las pruebas técnicas realizadas.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 06](06-postgres-prisma.md) · [Reto 08](08-rutas-controladores-servicios.md)
