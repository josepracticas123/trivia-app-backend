# Despliegue: Render, PostgreSQL y Vercel

Estado: implementación y evidencias locales; pendiente revisión del tutor.
PR: abierto.

Las URLs públicas verificadas de frontend, backend y Swagger pueden registrarse en este documento. Los valores de conexión y credenciales deben constar solo en la configuración privada de cada plataforma o compartirse por el canal seguro acordado con el tutor.

## Evidencias públicas pendientes

- Frontend: pendiente de completar con la URL pública verificada.
- Backend: pendiente de completar con la URL pública verificada.
- Swagger: pendiente de completar con la URL pública verificada (`<backend>/docs`).
- Commit backend desplegado: pendiente de confirmar.
- Commit frontend desplegado: pendiente de confirmar.
- Comprobaciones públicas (`/health`, Swagger, login y partida de dos personas): pendientes de fecha y resultado verificables.

## Backend en Render

El servicio instala dependencias, compila TypeScript, aplica las migraciones versionadas y arranca la aplicación con estos comandos:

```bash
npm ci
npm run build
npm run db:migrate:deploy
npm start
```

Variables configuradas en Render:

- `DATABASE_URL`: conexión de PostgreSQL de producción.
- `JWT_SECRET`: secreto aleatorio de al menos 32 caracteres.
- `FRONTEND_ORIGIN`: origen HTTPS exacto de Vercel, sin ruta final. Puede contener varios orígenes separados por comas si se necesita mantener desarrollo local.
- `PORT`: lo proporciona Render; no se fija en el código de producción.

La aplicación escucha en `0.0.0.0` y publica `GET /health`. La URL del frontend debe figurar también en `FRONTEND_ORIGIN`, tanto para HTTP/CORS como para Socket.IO.

### Instancias y presencia Socket.IO

El despliegue inicial debe usar **una única instancia** del backend en Render.
La presencia de jugadores se mantiene en memoria y las salas Socket.IO no se
comparten entre réplicas. Antes de aumentar el número de instancias hay que
incorporar un adaptador Socket.IO compartido y almacenamiento de presencia,
por ejemplo mediante Redis, y validar la reconexión y las invitaciones entre
réplicas.

## PostgreSQL y pgAdmin 4

PostgreSQL permanece separado del proceso del backend, por lo que un redeploy o reinicio del servicio web no elimina los datos. Las migraciones de Prisma se aplican con `npm run db:migrate:deploy`; este comando aplica únicamente las migraciones existentes y no crea ni reinicia esquemas como haría `migrate dev` o `reset`.

La conexión desde pgAdmin 4 se realizó desde un equipo externo mediante un servidor registrado aparte. Sus credenciales, host y cadena de conexión son secretos operativos: no deben pegarse en documentación, commits, capturas ni variables `VITE_*`.

Antes de cualquier cambio de esquema en producción: hacer una copia de seguridad desde el proveedor o pgAdmin, verificar que se puede restaurar en una base aislada y solo después ejecutar `npm run db:migrate:deploy`.

### Preflight de la migración histórica de contraseñas

La migración `20261015143436_fix_user_column` sustituye la columna histórica
`passwordHas` por `passwordHash`. Para un primer despliegue en una base vacía no
hay cuentas que conservar. Si se actualiza una base antigua que ya tiene
usuarios, no se debe ejecutar `db:migrate:deploy` directamente: primero hay que
restaurar una copia aislada, comprobar el login de una cuenta existente tras la
migración y preparar una migración de datos específica si fuera necesaria.

Antes de desplegar, registrar si la base objetivo es nueva o si ya contiene
cuentas. Nunca incluir la URL de PostgreSQL ni su contraseña en el repositorio,
Swagger, incidencias o chats.

## Frontend en Vercel

En el proyecto de Vercel se configuran las variables públicas de compilación:

- `VITE_API_URL`: URL HTTPS pública del backend de Render.
- `VITE_SOCKET_URL`: la misma URL base para Socket.IO, salvo que la configuración del frontend requiera otra equivalente.

Estas URLs pueden ser públicas; no se configuran ahí `DATABASE_URL` ni `JWT_SECRET`. Tras cambiar una variable `VITE_*` hay que redeplegar el frontend, porque Vite la incorpora durante el build.

## Comprobación de publicación

1. Abrir `GET /health` en la URL pública del backend y comprobar respuesta correcta.
2. Abrir el frontend de Vercel y completar registro e inicio de sesión.
3. Con dos perfiles de navegador distintos, crear, unirse y completar una partida.
4. Confirmar en DevTools que las peticiones HTTP y Socket.IO proceden del origen de Vercel y no dan error CORS.
5. Reiniciar o redeplegar el backend y comprobar que los datos de PostgreSQL siguen disponibles.

Queda por anotar para la revisión final la fecha, las URLs públicas compartidas con el tutor y la evidencia del recorrido de dos jugadores; no se sustituyen por URLs inventadas en este documento.
