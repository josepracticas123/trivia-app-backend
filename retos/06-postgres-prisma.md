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
- [x] Las migraciones versionadas preparan una base de desarrollo vacía y el historial coincide con `_prisma_migrations`.
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

- Prueba correcta (acción y resultado): pendiente de repetir en la base exclusiva de prácticas y registrar conteos exactos del seed.

- Prueba inválida o fallo (petición/acción y resultado): completada. Inicialmente Prisma no podía conectarse porque `DATABASE_URL` utilizaba una dirección privada `railway.internal`, no accesible desde el PC. Se sustituyó por la conexión externa de Railway y la conexión quedó funcionando correctamente.

- Comandos y resultados: registrar aquí los comandos exactos y sus resultados reales, incluyendo `npm ci` y `npm run db:generate`.

- Dudas o correcciones: aclarar si la migración de prueba llegó a aplicarse y cómo coincide el historial remoto con las migraciones versionadas.

- Revisión y aprobación del tutor: pendiente.

- Merge en `develop`: pendiente.
No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 05](05-swagger.md) · [Reto 07](07-crud-persistente.md)
