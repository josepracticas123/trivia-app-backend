# 12 · Protege las rutas

**Tu misión:** Separa consultas públicas de operaciones privadas. Además de identificar al usuario, comprueba qué acciones puede realizar.

**Antes:** El [reto 11](11-login-jwt.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Middleware, verificación JWT, autenticación, autorización y estados 401 y 403.

## Trabajo por bloques

1. Añade middleware que verifique Bearer JWT, algoritmo permitido, expiración y un sub válido; comprueba que el usuario existe. Añade GET /api/me.

2. Incorpora roles USER y ADMIN con USER por defecto. Registro nunca acepta un rol. El tutor prepara un administrador local por un procedimiento documentado y sin contraseñas en Git.

3. GET de preguntas y categorías es público; POST, PUT y DELETE de preguntas requiere ADMIN. Configura Bearer auth en Swagger y actualiza su seguridad por ruta.

## Comprueba tu entrega

- [x] Sin token, con token alterado o caducado, las rutas privadas dan 401.
- [x] /api/me devuelve solo el usuario autenticado; un ID enviado por el cliente no cambia la identidad.
- [x] USER recibe 403 al modificar preguntas y ADMIN puede completar el CRUD.
- [x] Registrarse enviando role se rechaza y no permite obtener privilegios.
- [x] Los endpoints públicos siguen funcionando sin token y Swagger permite probar ambos tipos.
- [x] Hay pruebas repetibles de un token válido, inválido y un usuario sin permiso.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Por qué iniciar sesión no permite hacer cualquier cosa? Muestra la diferencia entre un 401 y un 403.

401 — Unauthorized
No estás autenticado correctamente.

El servidor no acepta tus credenciales o no has iniciado sesión.

Ejemplo: intentas consultar tu perfil sin un token válido.

403 — Forbidden
Estás autenticado, pero no tienes permiso.

El servidor reconoce tu identidad, pero te impide acceder al recurso.

Ejemplo: un alumno intenta entrar en una función exclusiva del tutor.
## Pistas

Tipa el usuario autenticado en req de forma acotada. No uses as any. No bases permisos en un rol enviado por el cliente.

## Documentación

- [Middleware de Express](https://expressjs.com/en/guide/using-middleware.html)
- [Seguridad OpenAPI](https://swagger.io/docs/specification/v3_0/authentication/bearer-authentication/)

## Registro de entrega y revisión

Estado inicial: **Pendiente**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: PR abierta hacia `develop` desde `reto/12-autenticacion-permisos`; commit base `1322480`. Última revisión del tutor sobre el commit `5fcae49`; las correcciones de esa revisión se suben en la misma rama y el mismo PR.
- Prueba correcta (petición/acción y resultado): Login con un ADMIN → `POST /api/questions` con cuerpo válido → `201` Pregunta creada correctamente. `GET /api/questions` y `GET /api/categories` sin token → `200`. `GET /api/me` con token → `200` con id, email y rol del usuario del token; un `id` enviado por el cliente no cambia la identidad.
- Prueba inválida o fallo (petición/acción y resultado): Tras Authorize → Logout, `POST /api/questions` con cuerpo válido → `401 UNAUTHORIZED` "Falta el token de autenticación", documentado en Swagger (ya no aparece "Undocumented"). Token alterado, caducado o firmado sin `exp` → `401`. Token con `sub` fuera de rango (0, 2147483648 o un valor que excede los enteros seguros) → `401 INVALID_TOKEN` sin consultar la base. Usuario con rol USER autenticado → `403 FORBIDDEN`. Registro enviando `role: "ADMIN"` → `400 VALIDATION_ERROR` y el usuario se crea como USER.
- Comandos y resultados: `npm test` → 18 tests superados en 4 archivos (middleware de auth, controlador de auth, rutas de categorías y rutas de preguntas). `npm run typecheck` → sin errores. `npm run build` → compilación correcta. Verificación en Swagger de las respuestas documentadas: POST 201/400/401/403/500, PUT 200/400/401/403/404/500, DELETE 204/400/401/403/404/500.
- Dudas o correcciones: Segunda revisión del tutor sobre el commit `5fcae49`: pidió exigir `exp` en el token, validar el rango de `sub` (1..2147483647) antes de consultar Prisma y, como mejora opcional, tipar `res.locals`. Los tres puntos se aplicaron en esta misma rama con pruebas nuevas (token sin `exp`, `sub` fuera de rango y token válido) y se añadió `src/types/express.d.ts` para tipar `res.locals.userId` sin `any`. Sin incidencias abiertas.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 11](11-login-jwt.md) · [Reto 13](13-partida-individual.md)
