# 07 · Guarda las preguntas de verdad

**Tu misión:** Sustituye la colección en memoria por consultas con Prisma. La API conservará el mismo contrato, pero los cambios sobrevivirán al reinicio.

**Antes:** El [reto 06](06-postgres-prisma.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Consultas del ORM, promesas, async/await y errores de persistencia.

## Trabajo por bloques

1. Reemplaza lectura, creación, actualización y eliminación por consultas a PostgreSQL en la DB de desarrollo de Railway preparada en el reto 06. El backend sigue ejecutándose en tu PC.

2. Mantén las validaciones y respuestas públicas. Usa selección explícita de campos para no enviar la solución.

3. Distingue registro inexistente de fallo de DB. Actualiza Swagger y deja de utilizar la colección local como fuente de datos.

## Comprueba tu entrega

- [ ] Todo el CRUD usa PostgreSQL y respeta los estados HTTP de los retos anteriores.
- [ ] Crear o editar, reiniciar el backend y volver a consultar conserva los cambios.
- [ ] Eliminar sigue eliminado después de reiniciar.
- [ ] Un ID inexistente da 404; un fallo de conexión no se presenta como lista vacía ni como éxito.
- [ ] Las respuestas siguen ocultando la solución y el seed sirve para preparar la práctica.
- [ ] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [ ] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Por qué una consulta necesita await? ¿Por qué reiniciar el backend en tu PC conserva los datos en Railway, pero borrar registros o hacer un reset de la DB los elimina?

## Pistas

Usa los tipos y el autocompletado del cliente generado. No dupliques a mano todos sus tipos ni conviertas resultados mediante as para esconder errores.

## Documentación

- [Consultas CRUD de Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/crud)

## Registro de entrega y revisión

Estado inicial: **Pendiente**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: pendiente.
- Prueba correcta (petición/acción y resultado): pendiente.
- Prueba inválida o fallo (petición/acción y resultado): pendiente.
- Comandos y resultados: pendiente.
- Dudas o correcciones: pendiente.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 06](06-postgres-prisma.md) · [Reto 08](08-rutas-controladores-servicios.md)
