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
- Prueba correcta (petición/acción y resultado): `POST /api/auth/register` con `{"email":"  Juan@EMAIL.com ","password":"secreta123"}` → `201` con `{ id: 1, email: "juan@email.com" }` (email normalizado). En la DB, `passwordHash` empieza por `$argon2id$...`; la contraseña original no aparece en ninguna respuesta.
- Prueba inválida o fallo (petición/acción y resultado): contraseña de 7 caracteres → `400 VALIDATION_ERROR`; campo inesperado (`nombre`) → `400`; mismo email con distinta grafía (`JUAN@email.com`) → `409 EMAIL_ALREADY_EXISTS` sin crear usuario.
- Comandos y resultados: `npm.cmd run typecheck` y `npm.cmd run build` terminaron correctamente; migraciones `add_user` y `fix_user_column` aplicadas (`prisma migrate status`: up to date); ruta y esquemas visibles en `/docs` y probados desde Swagger (201/400/409).
- Dudas o correcciones: typo en el modelo (`passwordHas` → `passwordHash`) corregido con la migración `fix_user_column`; cliente de Prisma regenerado con `db:generate`; código de error unificado a `EMAIL_ALREADY_EXISTS`.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 09](09-relaciones.md) · [Reto 11](11-login-jwt.md)
