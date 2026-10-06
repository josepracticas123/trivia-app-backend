# 06 · Prepara PostgreSQL y Prisma

**Tu misión:** Prepara una base de datos PostgreSQL de desarrollo en Railway y aprende a crear sus tablas mediante migraciones. El backend se ejecutará en tu PC y se conectará a esa base por Internet. Las rutas seguirán usando memoria hasta el siguiente reto.

**Antes:** El [reto 05](05-swagger.md) debe estar aprobado e integrado en develop.

**Aprenderás:** PostgreSQL, DATABASE_URL, ORM, modelos, migraciones y seed.

## Trabajo por bloques

1. Con el tutor, prepara un servicio PostgreSQL en Railway exclusivo para desarrollo y prácticas. Revisa el plan y el coste desde este reto. Para conectarte desde tu PC, usa la conexión externa del servicio: si hace falta, configura Public Access en Settings → Networking. Railway proporciona `DATABASE_PUBLIC_URL`; guarda su valor en tu `.env` local como `DATABASE_URL`. No uses una dirección `railway.internal` desde tu PC. Documenta los pasos sin copiar credenciales reales.

2. Revisa la guía vigente de Prisma con PostgreSQL; instala CLI, cliente y adaptador necesarios con versiones compatibles. Registra los comandos y crea el modelo inicial Question con ID entero, enunciado, opciones y solución.

3. Crea la primera migración y un seed repetible sobre la DB de desarrollo. Si `migrate dev` requiere una base auxiliar (shadow database) y no puede crearla, prepara con el tutor una base vacía separada y configura su URL según la versión de Prisma; nunca uses la DB principal como shadow. Centraliza el cliente en src/lib/. Añade los scripts de DB que realmente funcionan y explica cada uno en el README.

## Comprueba tu entrega

- [x] PostgreSQL está disponible en Railway y Prisma se conecta desde mi PC usando `DATABASE_URL` con la conexión externa.
- [x] La migración está en Git y puede preparar otra base de desarrollo vacía.
- [x] El seed crea al menos cinco preguntas y ejecutarlo dos veces no las duplica.
- [x] Cerrar y volver a abrir la conexión desde mi PC conserva las preguntas guardadas en Railway.
- [x] Las credenciales reales y el cliente generado no se suben; esquema, configuración necesaria y migraciones sí.
- [ ] El README recoge versiones, preparación de Railway, configuración de `.env`, comandos y cómo inspeccionar los datos con Prisma Studio o la vista de datos de Railway.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [ ] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Qué diferencia hay entre el servidor PostgreSQL, Prisma y una migración? Enseña dónde están las tablas y dónde está el historial de cambios.

## Pistas

Necesitas conexión a Internet para trabajar con la DB. En tu PC solo se ejecutan Node, Prisma y el backend; PostgreSQL se ejecuta en Railway. Las opciones de configuración de Prisma cambian entre versiones: usa una sola guía compatible.

La DB de prácticas debe estar separada de producción. El seed y cualquier reset se ejecutan únicamente sobre la base de desarrollo acordada con el tutor. La conexión externa puede generar consumo de red en Railway.

## Documentación

- [Prisma con PostgreSQL](https://docs.prisma.io/docs/prisma-orm/quickstart/postgresql)
- [PostgreSQL en Railway y conexión externa](https://docs.railway.com/databases/postgresql)

## Registro de entrega y revisión

Estado inicial: **Pendiente**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: pendiente.

- Prueba correcta (petición/acción y resultado): completada. PostgreSQL está conectado mediante Railway, Prisma puede acceder a la base de datos y el seed crea las cinco preguntas correctamente.

- Prueba inválida o fallo (petición/acción y resultado): completada. Inicialmente Prisma no podía conectarse porque `DATABASE_URL` utilizaba una dirección privada `railway.internal`, no accesible desde el PC. Se sustituyó por la conexión externa de Railway y la conexión quedó funcionando correctamente.

- Comandos y resultados: completado. `npx prisma migrate status`, `npm run seed`, `npm run typecheck` y `npm run build` se ejecutan correctamente.

- Dudas o correcciones: completado. Se corrigió la URL de conexión de Railway y la configuración del cliente de Prisma 7 para utilizar `@prisma/adapter-pg`. También se comprobó que el seed fuera repetible y no duplicara las preguntas.

- Revisión y aprobación del tutor: pendiente.

- Merge en `develop`: pendiente.
No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 05](05-swagger.md) · [Reto 07](07-crud-persistente.md)
