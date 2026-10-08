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
- [ ] Persistencia verificada contra Railway: crear o editar, reiniciar el backend y volver a consultar conserva los cambios.
- [ ] Eliminación verificada contra Railway: eliminar, reiniciar el backend y confirmar que sigue eliminado.
- [x] Un ID inexistente da 404; el fallo de conexión devuelve 500 `INTERNAL_SERVER_ERROR`, no lista vacía ni éxito.
- [x] La validación de ID compartida rechaza valores fuera del rango `1–2147483647` en GET, PUT y DELETE.
- [x] Las respuestas siguen ocultando la solución y el seed está disponible para preparar la práctica.
- [x] `npm run typecheck` y `npm run build` pasan; comprobaciones de rutas realizadas con Thunder Client.
- [ ] He actualizado los registros, completado la descripción del PR y cambiado su base a `develop`, sin hacer merge.

## Demostración al tutor

¿Por qué una consulta necesita await? ¿Por qué reiniciar el backend en tu PC conserva los datos en Railway, pero borrar registros o hacer un reset de la DB los elimina?

## Pistas

Usa los tipos y el autocompletado del cliente generado. No dupliques a mano todos sus tipos ni conviertas resultados mediante as para esconder errores.

## Documentación

- [Consultas CRUD de Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/crud)

## Registro de entrega y revisión

Estado: **Correcciones técnicas comprobadas localmente; revisión pendiente**. El PR y el commit existen. Falta confirmar la persistencia real contra Railway, completar los datos del PR, cambiar su base a `develop` y subir las correcciones a la misma rama.

- PR y commit: rama `reto/07-crud-persistente`, commit `1090c67`; el PR existente debe cambiar su base de `main` a `develop`. Añadir número y enlace al completar su descripción.
- Pruebas correctas (petición/acción y resultado):
  - Thunder Client GET `/api/questions/0` → `400 VALIDATION_ERROR`.
  - Thunder Client GET `/api/questions/2147483648` → `400 VALIDATION_ERROR`.
  - Thunder Client GET `/api/questions/2147483647` → `404 QUESTION_NOT_FOUND`; ID dentro del rango, pero inexistente.
  - Thunder Client GET `/api/questions/1` → `200`; respuesta sin `respuestaCorrecta`.
  - Thunder Client PUT `/api/questions/0` con body válido → `400 VALIDATION_ERROR`; no se modificaron datos.
  - Thunder Client DELETE `/api/questions/2147483648` → `400 VALIDATION_ERROR`; no se eliminaron datos.
  - Pruebas locales anteriores de POST (`201`), PUT (`200`) y DELETE (`204`) quedaron anotadas; las verificaciones con consultas simuladas no demuestran persistencia real en Railway.
- Pruebas inválidas/fallos:
  - GET con ID no numérico → `400`.
  - GET y PUT con ID numérico inexistente → `404`; PUT responde `QUESTION_NOT_FOUND`.
  - Con una URL de PostgreSQL temporalmente inválida, GET de lista → `500 INTERNAL_SERVER_ERROR`, no éxito ni lista vacía. Prueba HTTP local; no se modificó `.env`.
- Comandos y resultados: `npm run typecheck` → correcto; `npm run build` → correcto.
- Persistencia tras reiniciar el backend contra la base real de Railway: pendiente de documentar con la acción realizada y el resultado observado.
- Dudas o correcciones: cambiar la base del PR a `develop`, actualizar su descripción, subir las correcciones y confirmar persistencia real.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 06](06-postgres-prisma.md) · [Reto 08](08-rutas-controladores-servicios.md)
