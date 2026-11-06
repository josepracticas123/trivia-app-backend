# 22 · Entrega y revisión final

**Tu misión:** Comprueba que otra persona puede arrancar el proyecto y jugar sin depender de tu ordenador. Entrega una API documentada y un recorrido multijugador reproducible.

**Antes:** El [reto 21](21-despliegue.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Pruebas de integración, documentación reproducible y revisión de entrega.

## Trabajo por bloques

1. Desde un clon limpio, sigue el README: dependencias, entorno, DB, migraciones, seed local, compilación y arranque. Corrige instrucciones que no funcionen.

2. Completa pruebas de auth, permisos, preguntas, partidas, concurrencia y recuperación con DB de pruebas. Añade una limitación razonable de intentos de login y tamaño de body antes de la entrega pública; documenta 429 y límites.

3. Revisa Swagger y eventos, ejecuta una partida pública con dos cuentas y prepara una explicación de arquitectura. Deja los PR abiertos para el tutor y registra los merges y la versión publicada cuando se aprueben.

## Comprueba tu entrega

- [x] Un clon limpio arranca con los pasos documentados y sin archivos privados del autor.
- [x] typecheck, build y las pruebas acordadas pasan en una DB independiente.
- [x] Las pruebas cubren acceso ajeno, token inválido/caducado, respuestas simultáneas y puntuación.
- [x] Login tiene límite de intentos comprobado; cuerpos demasiado grandes se rechazan sin romper el servidor.
- [x] Swagger coincide con entradas, salidas, errores y permisos; eventos están documentados.
- [ ] El recorrido público individual y multijugador funciona, incluidos empate, reconexión y reinicio. (pendiente de verificación pública)
- [ ] README identifica URLs, versiones, limitaciones y cómo recuperar el entorno. (URLs y commits desplegados pendientes de verificación)
- [ ] Tutor revisa, aprueba e integra los PR; producción corresponde a main. (pendiente de revisión tutora)
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md` y anotado las pruebas; aprobación, merge y cierre final siguen pendientes del tutor.

## Demostración al tutor

Explica una petición completa, una transacción de turno y un evento. ¿Qué necesitarías cambiar si hubiera varias instancias del backend?

## Pistas

La entrega usa una instancia del backend. Redis, varias réplicas, emparejamiento automático, temporizadores y refresh tokens son ampliaciones; no son requisitos ocultos.

## Documentación

- [Pruebas Node](https://nodejs.org/api/test.html)
- [Despliegue Prisma](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)

## Registro de entrega y revisión

Estado: implementación y evidencias locales pendientes de revisión del tutor.
PR: abierto.
Aprobación, merge, promoción/despliegue final y cierre: pendientes del tutor.

### Evidencia local (04/11/2026)

- Límite de login: fuera del modo desarrollo, `POST /api/auth/login` permite 5 intentos por IP en 15 minutos. El siguiente devuelve HTTP `429`, `error.code: LOGIN_RATE_LIMITED`, el mensaje `Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.` y `Retry-After` con los segundos restantes. El contador es en memoria y solo sirve para una instancia. `npm run dev` desactiva el límite para facilitar las pruebas locales.
- `npm test -- tests/controllers/auth.controller.test.ts` → correcto, 11 tests; cinco intentos inválidos devolvieron 401 y el sexto 429 con `Retry-After > 0`.
- `npm run test:integration -- tests/integration/game.answer.scoring.evidence.test.ts --silent=false` → correcto, 1 test en `trivia_test`, con catálogo y copias en posiciones 1–4. En la última ejecución: `Question 26`, opción correcta `Option 102` (posición 2). Caso correcto: partida 118, `GameQuestion 340` posición 4, solución 2, opción elegida `GameChoice 1214`; HTTP 200 `{ isCorrect: true, score: 1, finished: true }`, `Answer 298` con la opción «4» y score final 1. Caso incorrecto: partida 119, `GameQuestion 345` posición 4, solución 2, opción elegida `GameChoice 1233`; HTTP 200 `{ isCorrect: false, score: 0, finished: true }`, `Answer 303` con la opción «3» y score final 0. Los registros de prueba se limpiaron al finalizar; estos IDs son evidencia local de esta ejecución, no datos permanentes ni de producción.
- `npm run test:integration -- tests/integration/game.mutation.concurrency.test.ts tests/integration/game.turns.concurrency.test.ts` → correcto, 2 archivos y 10 tests; se validaron inicio de sala y turnos multijugador tras compartir la conversión de solución.
- `npm run typecheck` → correcto (`tsc --noEmit`, sin errores).
- `npm run build` → correcto (`tsc`, sin errores).
- Swagger: el 429 y `Retry-After` ya coincidían con el middleware. Se corrigió el body documentado de login para que requiera solo `email` y `password`; el contrato individual de `POST /api/games/:id/answers` ya coincidía con el controlador, por lo que no se modificó.

### Incidente de producción: partida #7

La causa en el código era una conversión de índice: los flujos que copiaban preguntas guardaban `findIndex()` (base cero) en `GameQuestion.solution`, mientras copiaban `GameChoice.position` sin conversión. Para opciones catalogadas 1–4, solución y opciones podían quedar desalineadas. Se corrigieron los tres puntos de copia para guardar la posición de la única opción correcta y se amplió la prueba para usar posiciones 1–4. Esto coincide con la causa que aclaraste.

No se ejecutó ninguna consulta a producción: en esta sesión no hay un canal controlado de solo lectura disponible. Por eso no puedo confirmar los valores efectivos de `GameQuestion` 30, `GameChoice` 119, catálogo, `Answer` ni el body que recibió el endpoint; la atribución de esos registros concretos sigue pendiente de contrastar. No se modifican partidas históricas.

La aprobación del tutor, el merge y el cierre final permanecen pendientes.

Coordinación entre repositorios: este PR de backend queda vinculado al [PR #3 del frontend](https://github.com/josepracticas123/trivia-app-frontend/pull/3). Ambos permanecen abiertos hasta revisar los cambios de puntuación y el manejo del límite de login.

- PR y commit revisado: PR abierto; revisión final y registro de los commits realmente desplegados pendientes del tutor.
- Prueba correcta (petición/acción y resultado): clon limpio, API documentada y pruebas locales (typecheck, build, auth, scoring) correctas; recorrido público pendiente de verificación con tutor.
- Prueba inválida o fallo (petición/acción y resultado): permisos, token inválido/caducado, errores de validación, concurrencia y recuperación comprobados en entorno aislado.
- Comandos y resultados: `npm run typecheck` y `npm run build` pasan; suites acordadas correctas en entorno aislado.
- Dudas o correcciones: documentación de despliegue y recuperación actualizada; secretos excluidos del repositorio.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente (PR abierto, sin merge).

Aprobación, merge, promoción/despliegue final y cierre: pendientes del tutor.

[Volver al README](../README.md) · [Reto 21](21-despliegue.md)
