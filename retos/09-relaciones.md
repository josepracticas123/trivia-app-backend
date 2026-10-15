# 09 · Relaciona preguntas, opciones y categorías

**Tu misión:** Separa las opciones y las categorías en tablas relacionadas. Conserva una respuesta pública sencilla para el futuro frontend.

**Antes:** El [reto 08](08-rutas-controladores-servicios.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Relaciones, claves foráneas, transacciones y evolución del esquema.

## Trabajo por bloques

1. Crea Category y Option; cada pregunta pertenece a una categoría y tiene cuatro opciones ordenadas. La opción correcta es un dato interno.

2. Prepara una migración que conserve las preguntas existentes y transforme las opciones. Si necesita SQL o varios pasos, hazlo con el tutor sobre una copia de desarrollo.

3. Añade GET /api/categories y adapta el CRUD a categoryId. Crear o sustituir opciones debe hacerse como una operación completa. Actualiza seed y Swagger.

## Comprueba tu entrega

- [x] Las tablas y relaciones se pueden explicar y las referencias inválidas dan 400 sin crear datos incompletos.
- [x] La migración conserva las preguntas y sus soluciones; está ensayada antes de aplicarla.
- [x] Cada pregunta tiene cuatro opciones distintas y exactamente una correcta.
- [x] Una edición fallida no deja opciones borradas o a medio crear.
- [x] Eliminar una pregunta no deja opciones huérfanas; lista y detalle mantienen un contrato documentado sin revelar la solución.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Por qué una clave foránea evita referencias rotas? ¿Qué debe pasar si falla la tercera de cuatro opciones?

## Pistas

La representación de la DB puede cambiar sin exigir al frontend que conozca todas las tablas. Documenta también qué datos de entrada cambian.

## Documentación

- [Relaciones en Prisma](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations)
- [Transacciones](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)

## Registro de entrega y revisión

Estado inicial: **Pendiente**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: pendiente de crear el commit y abrir el PR hacia `develop`.
- Prueba correcta (petición/acción y resultado): `POST /api/questions` con `categoryId: 1` respondió 201; `PUT /api/questions/17` respondió 200 y actualizó categoría y opciones; `DELETE /api/questions/17` respondió 204.
- Prueba inválida o fallo (petición/acción y resultado): POST y PUT con `categoryId: 999999` respondieron 400 `VALIDATION_ERROR`, sin crear ni modificar preguntas. Al consultar después de la eliminación, `GET /api/questions/17` respondió 404 `QUESTION_NOT_FOUND`.
- Comandos y resultados: `npm.cmd run db:migrate:status` encontró 3 migraciones y el esquema actualizado; el seed ejecutado dos veces no creó duplicados en la segunda ejecución; `npm.cmd run typecheck` y `npm.cmd run build` terminaron correctamente.
- Dudas o correcciones: duda resuelta sobre el estado de Prisma: las migraciones y el esquema de desarrollo están actualizados. Se corrigieron la URL `/api/categories` y la indentación YAML del ejemplo PUT en Swagger.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 08](08-rutas-controladores-servicios.md) · [Reto 10](10-registro.md)
