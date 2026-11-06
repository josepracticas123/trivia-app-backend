# Resumen de entrega final

## Estado general

Los retos 21 y 22 tienen implementación y evidencias locales registradas. La revisión del tutor, aprobación, merge, publicación final y cierre siguen pendientes. No se afirma integración ni estado de producción sin evidencia pública verificable.

## Actualizaciones y comprobaciones locales

- El reto 21 documenta el procedimiento de despliegue con Render, PostgreSQL y Vercel.
- El reto 22 incorpora pruebas locales, Swagger y la documentación de entrega.
- La puntuación de partidas nuevas usa la misma posición para `solution` y `GameChoice`; la partida histórica investigada no se modificó.
- `POST /api/auth/login` limita a cinco intentos por IP en 15 minutos fuera del modo desarrollo; el sexto devuelve `429`, `LOGIN_RATE_LIMITED` y `Retry-After`.
- `npm.cmd run typecheck`, `npm.cmd run build`, la prueba de puntuación aislada y la prueba del límite de login se ejecutaron correctamente el 04/11/2026.

## Evidencias pendientes del tutor

- URL pública del frontend: pendiente de completar con la URL verificada.
- URL pública del backend: pendiente de completar con la URL verificada.
- URL pública de Swagger: pendiente de completar con `<backend>/docs` verificado.
- Commit y versión realmente desplegados de frontend y backend: pendientes de confirmar en las plataformas.
- Fecha y resultado de `/health`, Swagger, login y partida pública de dos personas: pendientes de registrar tras la comprobación pública.
- Revisión, aprobación, merge y cierre: pendientes del tutor; el PR permanece abierto.
- Coordinación frontend: [PR #3 de trivia-app-frontend](https://github.com/josepracticas123/trivia-app-frontend/pull/3), vinculado y pendiente de la misma revisión.

## Seguridad

No se versionan credenciales, cadenas de conexión, contraseñas, tokens ni valores de `JWT_SECRET`. Las URLs públicas pueden documentarse cuando estén verificadas; no son secretos.

## Documentos relacionados

- [Aprendizaje](../APRENDIZAJE.md)
- [Guía de despliegue](despliegue.md)
- [Reto 21](../retos/21-despliegue.md)
- [Reto 22](../retos/22-entrega-final.md)
