# 21 · Despliega backend, DB y frontend

**Tu misión:** Publica el proyecto para que dos personas puedan jugar desde sus equipos. El backend y la base de datos estarán en Railway; el frontend en Vercel.

**Antes:** El [reto 20](20-frontend.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Despliegue, entornos, secretos, migraciones de producción y comprobación pública.

## Trabajo por bloques

1. Prepara primero el backend remoto desde develop junto a la DB de desarrollo de Railway usada desde el reto 06. Crea una DB independiente para producción. Revisa con el tutor planes y costes antes de ampliar o contratar servicios.

2. Configura servicio Node persistente compatible con Socket.IO y PostgreSQL independiente; usa build, migración de despliegue y start acordes con la versión de Prisma. Para el backend alojado en Railway, configura `DATABASE_URL` mediante una referencia a la conexión privada del servicio PostgreSQL de su mismo entorno; la conexión externa usada desde el PC queda para desarrollo. Nunca uses migrate dev, reset ni seed de práctica contra producción.

3. Configura frontend, URL pública de API y orígenes permitidos HTTP/socket. Documenta pasos en docs/despliegue.md; prepara un PR develop a main de cada repo y deja la publicación final al tutor.

## Comprueba tu entrega

- [ ] Desarrollo remoto y producción usan DB y secretos separados; main despliega producción y develop no la modifica.
- [ ] Una DB vacía se prepara con migraciones versionadas; hay procedimiento de copia y recuperación antes de cambios de esquema.
- [ ] PORT lo proporciona el alojamiento, la app escucha en 0.0.0.0 y /health permite comprobar disponibilidad.
- [ ] Las variables se configuran en cada alojamiento sin subir secretos al repo ni al bundle del frontend.
- [ ] HTTPS, CORS, Swagger y Socket.IO funcionan con las URLs reales.
- [ ] Reiniciar o desplegar el backend conserva los datos de PostgreSQL.
- [ ] Dos usuarios completan una partida pública después de los merges autorizados; URLs y evidencias quedan registradas.
- [ ] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [ ] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Qué diferencia hay entre desplegar el código y migrar la base de datos? ¿Qué datos perderías con un reset?

## Pistas

La instalación es npm ci, la compilación npm run build y el arranque npm start. Completa el comando de migración según la versión instalada. Volver a código anterior no revierte automáticamente una migración.

## Documentación

- [Express en Railway](https://docs.railway.com/guides/express)
- [PostgreSQL en Railway](https://docs.railway.com/databases/postgresql)
- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite)

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

[Volver al README](../README.md) · [Reto 20](20-frontend.md) · [Reto 22](22-entrega-final.md)
