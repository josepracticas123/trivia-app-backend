# 09 · Relaciona preguntas, opciones y categorías

**Tu misión:** Separa las opciones y las categorías en tablas relacionadas. Conserva una respuesta pública sencilla para el futuro frontend.

**Antes:** El [reto 08](08-rutas-controladores-servicios.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Relaciones, claves foráneas, transacciones y evolución del esquema.

## Trabajo por bloques

1. Crea Category y Option; cada pregunta pertenece a una categoría y tiene cuatro opciones ordenadas. La opción correcta es un dato interno.

2. Prepara una migración inicial que cree Category, Question y Option desde una base vacía y carga los datos de ejemplo con el seed. Por autorización expresa de Tomás, en este reto se reinició la base de prácticas y su historial tras los cambios manuales que los habían dejado desalineados; se acepta perder los datos anteriores. Comprueba que la nueva migración reproduce el esquema y que repetir el seed no duplica los datos.

3. Añade GET /api/categories y adapta el CRUD a categoryId. Crear o sustituir opciones debe hacerse como una operación completa. Actualiza seed y Swagger.

## Acuerdo del tutor para esta entrega

Tomás autorizó expresamente reiniciar por completo la base de prácticas y regenerar el historial de migraciones para establecer una base consistente. Este acuerdo sustituye el requisito original de transformar y conservar las preguntas anteriores; la pérdida de esos datos de prácticas está aceptada y no bloquea el cierre por sí misma. No implica la aprobación del reto: siguen siendo necesarias las comprobaciones funcionales y la revisión del tutor.

Es una excepción para recuperar este entorno. Desde este punto se conserva la nueva migración inicial y los siguientes cambios se incorporan mediante nuevas migraciones. Borrar tablas, archivos de migración o registros de `_prisma_migrations` no es el procedimiento habitual para resolver discrepancias.

## Comprueba tu entrega

- [x] Las tablas y relaciones se pueden explicar y las referencias inválidas dan 400 sin crear datos incompletos.
- [x] La migración inicial crea las tres tablas y sus relaciones desde una base vacía; el seed carga 4 categorías, 6 preguntas y 24 opciones y no duplica datos al repetirlo (autoevaluación del alumno; ver Registro).
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

Estado: **correcciones de la primera revisión subidas, pendiente de nueva revisión**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: PR abierto hacia `develop` desde `reto/09-relaciones`; el tutor revisó el commit base `a4216fa` y las correcciones van en esta misma rama y este mismo PR.
- Regeneración del historial de migraciones (acordada con el tutor en la revisión): la migración original eliminaba `options` y `solution` sin copiarlas a `Option` y añadía `categoryId` obligatorio sin asignarlo, por lo que fallaba con datos del esquema anterior. Se acordó borrar todo y empezar de cero: se eliminaron las carpetas de las tres migraciones, `npx prisma migrate reset --force` vació las tablas, los datos y `_prisma_migrations`, `npx prisma migrate dev --name init_reto09` generó la migración única `20261015124955_init_reto09` desde `schema.prisma` y `npm run seed` recargó los datos.
- Verificación tras la regeneración: `prisma migrate status` informa "1 migration found" y "Database schema is up to date!"; la base contiene 6 preguntas, 4 categorías y 24 opciones; el seed ejecutado dos veces no creó duplicados.
- Prueba correcta (petición/acción y resultado): `GET /api/categories` → 200 con las cuatro categorías; `POST /api/questions` con `categoryId: 2` → 201; `PUT` de esa misma pregunta con `categoryId: 3` → 200; `DELETE` → 204 y `GET` posterior → 404 `QUESTION_NOT_FOUND`.
- Prueba inválida o fallo (petición/acción y resultado): POST y PUT con `categoryId: 999999` → 400 `VALIDATION_ERROR`, sin crear ni modificar datos.
- Swagger: `PreguntaInput.categoryId` estaba documentado con `maximum: 1` frente al `2147483647` de Zod; se alineó y se comprobó con POST y PUT usando categorías existentes (2 y 3).
- Comandos y resultados: `npm.cmd run typecheck` y `npm.cmd run build` terminaron correctamente.
- Revisión y aprobación del tutor: pendiente de la nueva revisión.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 08](08-rutas-controladores-servicios.md) · [Reto 10](10-registro.md)
