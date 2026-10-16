# 12 · Protege las rutas

**Tu misión:** Separa consultas públicas de operaciones privadas. Además de identificar al usuario, comprueba qué acciones puede realizar.

**Antes:** El [reto 11](11-login-jwt.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Middleware, verificación JWT, autenticación, autorización y estados 401 y 403.

## Trabajo por bloques

1. Añade middleware que verifique Bearer JWT, algoritmo permitido, expiración y un sub válido; comprueba que el usuario existe. Añade GET /api/me.

2. Incorpora roles USER y ADMIN con USER por defecto. Registro nunca acepta un rol. El tutor prepara un administrador local por un procedimiento documentado y sin contraseñas en Git.

3. GET de preguntas y categorías es público; POST, PUT y DELETE de preguntas requiere ADMIN. Configura Bearer auth en Swagger y actualiza su seguridad por ruta.

## Comprueba tu entrega

- [ ] Sin token, con token alterado o caducado, las rutas privadas dan 401.
- [ ] /api/me devuelve solo el usuario autenticado; un ID enviado por el cliente no cambia la identidad.
- [ ] USER recibe 403 al modificar preguntas y ADMIN puede completar el CRUD.
- [ ] Registrarse enviando role se rechaza y no permite obtener privilegios.
- [ ] Los endpoints públicos siguen funcionando sin token y Swagger permite probar ambos tipos.
- [ ] Hay pruebas repetibles de un token válido, inválido y un usuario sin permiso.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [ ] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Por qué iniciar sesión no permite hacer cualquier cosa? Muestra la diferencia entre un 401 y un 403.

## Pistas

Tipa el usuario autenticado en req de forma acotada. No uses as any. No bases permisos en un rol enviado por el cliente.

## Documentación

- [Middleware de Express](https://expressjs.com/en/guide/using-middleware.html)
- [Seguridad OpenAPI](https://swagger.io/docs/specification/v3_0/authentication/bearer-authentication/)

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

[Volver al README](../README.md) · [Reto 11](11-login-jwt.md) · [Reto 13](13-partida-individual.md)
