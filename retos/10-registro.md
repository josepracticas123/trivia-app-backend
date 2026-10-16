# 10 · Registra usuarios

**Tu misión:** Permite crear una cuenta con email y contraseña. Guarda un hash de la contraseña y devuelve únicamente los datos públicos del usuario.

**Antes:** El [reto 09](09-relaciones.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Modelo User, unicidad, normalización y hash con Argon2.

## Trabajo por bloques

1. Instala argon2. Crea User con ID, email único, passwordHash y fecha de creación mediante una migración.

2. POST /api/auth/register recibe email y contraseña: normaliza el email con trim y minúsculas y exige contraseña de al menos 8 caracteres. No recortes ni cambies la contraseña.

3. Devuelve 201 con id y email. Maneja email duplicado como 409, incluso si dos registros llegan a la vez. Documenta la ruta.

## Comprueba tu entrega

- [x] Un registro válido guarda un usuario y un hash, nunca la contraseña original.
- [x] Email inválido, contraseña corta y campos inesperados se rechazan con 400.
- [x] El email normalizado tiene restricción única en la DB y un duplicado da 409.
- [x] Ninguna respuesta o log incluye contraseña o passwordHash.
- [x] Puedo mostrar registro válido, inválido y duplicado desde Swagger.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Qué diferencia hay entre hacer un hash y cifrar? ¿Por qué comprobar el email antes del INSERT no basta para evitar duplicados?

## Pistas

La librería genera la sal. No implementes tu propio algoritmo y no uses hashes rápidos como SHA-256 para contraseñas.

## Documentación

- [node-argon2](https://github.com/ranisalt/node-argon2)

## Registro de entrega y revisión

Estado: **entrega completada, pendiente de revisión**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: PR abierto hacia `develop` desde `reto/10-registro`; pendiente de revisión.

- Prueba correcta (petición/acción y resultado):
  - `POST /api/auth/register` con `{"email":"  Juan@EMAIL.com ","password":"secreta123"}` → `201 Created`, con el email normalizado y únicamente los campos públicos `id` y `email`.
  - Email válido con espacios exteriores y mayúsculas (`"  PruebaOctubre16b@Example.com  "`) → `201 Created`, devolviendo `pruebaoctubre16b@example.com`.
  - Se comprobó que la contraseña original no aparece en la respuesta y que el hash no se expone al cliente.

- Prueba inválida o fallo (petición/acción y resultado):
  - Email malformado `a@b..com` → `400 VALIDATION_ERROR`.
  - Email malformado `.jose@example.com` → `400 VALIDATION_ERROR`.
  - Contraseña inferior a 8 caracteres, incluida una de 6 caracteres → `400 VALIDATION_ERROR`.
  - Campo inesperado, por ejemplo `"admin": true` → `400 VALIDATION_ERROR`.
  - JSON malformado → `400 INVALID_JSON`.
  - Mismo email con distinta grafía (`JUAN@email.com`) → `409 EMAIL_ALREADY_EXISTS`, sin crear un segundo usuario con la misma dirección.

- Comandos y resultados:
  - `npm.cmd run typecheck` y `npm.cmd run build` terminaron correctamente.
  - Las migraciones `add_user` y `fix_user_column` figuran como aplicadas; `prisma migrate status` indicó que el esquema estaba actualizado.
  - La ruta y los esquemas están documentados en `/docs` y se probaron desde Swagger con respuestas `201`, `400` y `409`.

- Dudas o correcciones:
  - Corregí el error tipográfico del modelo (`passwordHas` → `passwordHash`) y regeneré el cliente de Prisma con `npm run db:generate`.
  - Unifiqué el código de error de email duplicado como `EMAIL_ALREADY_EXISTS`.
  - La migración `20261015143436_fix_user_column` se aplicó en Railway el 15/10/2026 a las 16:34:38. Su SQL elimina la columna `passwordHas` y crea `passwordHash`; no renombra la columna ni copia sus datos.
  - Según las fechas comprobadas, el usuario de prueba se creó después de aplicar la migración. Por tanto, el hash de ese usuario no existía previamente en la columna eliminada y no se perdió por este cambio. Esta comprobación se refiere al usuario de prueba y no demuestra por sí sola el estado de todos los registros que pudieran haber existido.
  - No se ha restablecido la base de datos ni se ha eliminado o modificado el historial de migraciones. No se realizarán cambios adicionales en Railway ni se modificará la migración aplicada sin consultar previamente con el tutor.

- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones de código se realizan en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 09](09-relaciones.md) · [Reto 11](11-login-jwt.md)
