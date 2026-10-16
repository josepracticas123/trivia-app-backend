
# 11 · Inicia sesión

**Tu misión:** Comprueba las credenciales y entrega un token firmado con caducidad. El token permitirá identificar al usuario en los siguientes retos.

**Antes:** El [reto 10](10-registro.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Verificación de hash, firma de JWT, subject y expiración.

## Trabajo por bloques

1. Instala jsonwebtoken y los tipos necesarios. POST /api/auth/login normaliza email igual que registro y comprueba el hash.

2. Configura JWT_SECRET mediante el entorno; si falta, el backend falla al arrancar con un mensaje claro. No incluyas un secreto por defecto.

3. Emite un token de acceso de duración limitada (por ejemplo, una hora) con sub igual al ID del usuario. Devuelve token, duración y usuario público; documenta el contrato.

## Comprueba tu entrega

- [x] Credenciales correctas devuelven 200 y un token firmado con caducidad.
- [x] Email inexistente y contraseña incorrecta dan el mismo mensaje genérico con 401.
- [x] JWT y respuestas no contienen contraseña ni hash.
- [x] JWT_SECRET está solo en el entorno; .env.example explica cómo generarlo sin guardar un secreto real.
- [x] Puedo explicar que el contenido del JWT es legible y que su firma protege frente a modificaciones.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md` y anotado las pruebas.
- [x] He abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Qué acredita la firma? ¿Qué significa exp? ¿Qué diferencia hay entre decodificar un token y verificarlo?

## Pistas

Mantén esta primera versión con token de acceso: al caducar se inicia sesión otra vez. Refresh tokens y recuperación de contraseña quedan fuera de esta entrega.

## Documentación

- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)

## Registro de entrega y revisión

Estado inicial: **Pendiente**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: pendiente.
- Prueba correcta (petición/acción y resultado): `POST /api/auth/login` en Swagger devuelve `200`, un token JWT con duración de 3600 segundos y los datos públicos del usuario.
- Prueba inválida o fallo (petición/acción y resultado): contraseña incorrecta y email inexistente devuelven `401` con el mismo mensaje genérico `El email o contraseña son incorrectos`.
- Comandos y resultados:
  - `npm.cmd test`: 2 pruebas superadas.
  - `npm.cmd run typecheck`: correcto.
  - `npm.cmd run build`: confirmar resultado.
- Dudas o correcciones: durante las pruebas apareció un error `500` por una URL de base de datos mal escrita. Se corrigió `DATABASE_URL` y el login funcionó.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 10](10-registro.md) · [Reto 12](12-autenticacion-permisos.md)
