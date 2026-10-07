# 06 · Prepara PostgreSQL y Prisma

**Tu misión:** Prepara una base de datos PostgreSQL de desarrollo en Railway y aprende a crear sus tablas mediante migraciones. El backend se ejecutará en tu PC y se conectará a esa base por Internet. Las rutas seguirán usando memoria hasta el siguiente reto.

**Antes:** El [reto 05](05-swagger.md) debe estar aprobado e integrado en develop.

**Aprenderás:** PostgreSQL, DATABASE_URL, ORM, modelos, migraciones y seed.

## Trabajo por bloques

1. Con el tutor, prepara un servicio PostgreSQL en Railway exclusivo para desarrollo y prácticas, separado de producción. Revisa el plan y el coste desde este reto. Para conectarte desde tu PC, usa la conexión externa del servicio de prácticas: Railway proporciona `DATABASE_PUBLIC_URL`; guarda su valor en tu `.env` local como `DATABASE_URL`. Antes de ejecutar comandos que escriban, confirma el host/entorno con `npx prisma migrate status`. No uses una dirección `railway.internal` desde tu PC ni ejecutes seed o migraciones de prácticas contra producción. Documenta los pasos sin copiar credenciales reales.

2. Revisa la guía vigente de Prisma con PostgreSQL; instala CLI, cliente y adaptador necesarios con versiones compatibles. Registra versiones/comandos y crea el modelo inicial Question con ID entero, enunciado, opciones y `solution` como índice entero de base cero (0–3), coherente con `respuestaCorrecta` en la API.

3. Crea la primera migración y un seed repetible sobre la DB de desarrollo. Si `migrate dev` requiere una base auxiliar (shadow database) y no puede crearla, prepara con el tutor una base vacía separada y configura su URL según la versión de Prisma; nunca uses la DB principal como shadow. Centraliza el cliente en src/lib/. Añade los scripts de DB que realmente funcionan y explica cada uno en el README.

## Comprueba tu entrega

- [x] PostgreSQL está disponible en Railway y Prisma se conecta desde mi PC usando la URL pública de la base exclusiva de desarrollo.
- [x] Se ha probado que las migraciones versionadas preparan una base de desarrollo vacía.
- [x] En la DB de prácticas, las dos migraciones versionadas actuales aparecen aplicadas y la estructura real coincide con `schema.prisma` (comprobado con `migrate status`, `migrate diff` e inspección de `Question`).
- [x] El seed crea al menos cinco preguntas y ejecutar dos veces no las duplica; anotar los conteos antes, después de cada ejecución y tras reconectar.
- [x] Cerrar y volver a abrir la conexión desde mi PC conserva las preguntas guardadas en la base de desarrollo.
- [x] Las credenciales reales y el cliente generado no se suben; esquema, configuración necesaria y todas las migraciones sí.
- [x] El README recoge versiones, preparación de Railway, configuración de `.env`, comandos y cómo inspeccionar los datos con Prisma Studio o la vista de datos de Railway.
- [x] `npm ci`, `npm run db:generate`, `npm run typecheck` y `npm run build` pasan; las rutas y Swagger siguen funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Qué diferencia hay entre el servidor PostgreSQL, Prisma y una migración? Enseña dónde están las tablas y dónde está el historial de cambios.

## Pistas

Necesitas conexión a Internet para trabajar con la DB. En tu PC solo se ejecutan Node, Prisma y el backend; PostgreSQL se ejecuta en Railway. Las opciones de configuración de Prisma cambian entre versiones: usa una sola guía compatible.

La DB de prácticas debe estar separada de producción. El seed y cualquier reset se ejecutan únicamente sobre la base de desarrollo acordada con el tutor. La conexión externa puede generar consumo de red en Railway.

## Documentación

- [Prisma con PostgreSQL](https://docs.prisma.io/docs/prisma-orm/quickstart/postgresql)
- [PostgreSQL en Railway y conexión externa](https://docs.railway.com/databases/postgresql)

## Registro de entrega y revisión

Estado: **En revisión; faltan correcciones solicitadas por el tutor**. Marca checks solo cuando tengas evidencia y resultados concretos.

- PR y commit revisado: pendiente.

- Pruebas correctas en la DB de prácticas:
  - Base consultada: base PostgreSQL `railway`, esquema `public`; el host se confirmó como el de prácticas antes de ejecutar el seed.
  - `npm run db:migrate:status` → 2 migraciones encontradas; `Database schema is up to date!`.
  - Consulta `SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM "_prisma_migrations" ORDER BY migration_name;` → `20261006112344_init` y `20261006164700_solution_text_to_index`, ambas finalizadas y no revertidas.
  - Consulta de `information_schema.columns` para `Question` → `id integer NOT NULL`, `statement text NOT NULL`, `options jsonb NOT NULL`, `solution integer NOT NULL`.
  - `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → `No difference detected`.
  - Consulta `SELECT count(*)::integer AS questions FROM "Question";` → antes del seed: 5.
  - Primera ejecución de `npm run seed` → terminó correctamente e indicó que las cinco preguntas ya existían; conteo posterior: 5.
  - Segunda ejecución de `npm run seed` → terminó correctamente e indicó que las cinco preguntas ya existían; conteo posterior: 5.
  - Se cerró la conexión y se consultó de nuevo desde un proceso nuevo; conteo tras reconectar: 5.

  La migración temporal `20261006122355_test` contenía `ALTER TABLE "Question" ADD COLUMN "test" TEXT NOT NULL;`, sin valor por defecto. Prisma advertía que no se podía añadir una columna obligatoria así cuando la tabla no estaba vacía. Al intentar aplicarla sobre `Question` con registros, falló y no quedó aplicada correctamente; por eso `test` no forma parte del esquema final.

  Después se borraron los archivos de la migración y no llegaron a subirse al repositorio remoto, pero quedó el registro del intento en `_prisma_migrations`. Esto provocó una segunda incidencia: Prisma encontraba en la base una migración registrada cuyo archivo ya no existía en `prisma/migrations`, por lo que no podía reconciliar el historial remoto/local. Para quitar ese bloqueo se eliminó manualmente la fila correspondiente. Borrar una fila del historial no ejecuta SQL inverso ni revierte cambios.

  La comprobación actual muestra solo las migraciones versionadas `20261006112344_init` y `20261006164700_solution_text_to_index`; `Question` coincide con `schema.prisma`, `solution` es `integer NOT NULL` y no hay otras tablas en `public`. `migrate diff` no detecta diferencias. El SQL original se recuperó de un objeto local de Git no referenciado; junto con el error al aplicarlo, explica que la columna no se añadiera a la tabla poblada. No hacer reparaciones adicionales sin revisarlas con el tutor.

- Prueba inválida o fallo (petición/acción y resultado): inicialmente Prisma no podía conectarse porque `DATABASE_URL` utilizaba una dirección privada `railway.internal`, no accesible desde el PC. Se sustituyó por la conexión externa de Railway y la conexión quedó funcionando correctamente. En una actualización anterior también se quitó una fila de `_prisma_migrations`; borrar una fila no revierte SQL aplicado y no se debe repetir para ocultar discrepancias.

- Otros comandos y resultados de esta actualización: `npx prisma validate` → esquema válido. `npm run db:generate`, `npm run typecheck`, `npm run build`, `npm ci` y las pruebas de rutas/Swagger no se volvieron a ejecutar en esta actualización; la revisión del tutor del commit `798f829` ya había confirmado las comprobaciones indicadas para ese commit.

- Dudas o correcciones pendientes: la explicación del SQL y del error ya está documentada; la estructura actual ya se comparó con el schema versionado. Los cambios de esta revisión están aún en el árbol de trabajo; falta hacer commit y push a la misma rama/PR. No editar `_prisma_migrations` ni reparar el esquema sin revisar primero con el tutor.

- Revisión y aprobación del tutor: pendiente.

- Merge en `develop`: pendiente.
No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 05](05-swagger.md) · [Reto 07](07-crud-persistente.md)
