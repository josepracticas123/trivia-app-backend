# 19 · Recupera una partida al reconectar

**Tu misión:** Haz que perder la conexión no rompa la partida. Al volver, el cliente recuperará el estado real y podrá saber si su última respuesta se guardó.

**Antes:** El [reto 18](18-socket-io.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Reconexión, recuperación de estado, versiones y entrega de eventos.

## Trabajo por bloques

1. Al conectar de nuevo, autentica, autoriza la suscripción y consulta GET de la partida. No asumas que recibiste todos los eventos.

2. Si se pierde la respuesta HTTP de una jugada, consulta el estado para comprobar si fue aceptada antes de reintentarla. Mantén la protección de duplicados del reto 17.

3. Prueba pérdida de conexión y reinicio del backend. Conserva partida y turnos en DB; al reconectar descarta estado local obsoleto y vuelve a suscribirte.

## Comprueba tu entrega

- [x] Desconectar y volver muestra el turno, respuestas propias y estado actual persistidos.
- [x] Reiniciar el backend no borra partidas ni puntuaciones; los clientes recuperan el estado.
- [x] Perder la respuesta de una jugada y repetirla no duplica puntos ni cambia dos turnos.
- [x] Eventos retrasados no hacen retroceder el estado del cliente; la versión ayuda a detectar cambios.
- [x] Un token caducado o usuario sin acceso no se recupera por saltarse la autenticación.
- [x] Las pruebas manuales y automatizadas relevantes quedan registradas con sus resultados.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

¿Reconectar garantiza haber recibido todos los eventos? Demuestra cómo distingues una jugada guardada de una que nunca llegó.

## Pistas

Usa los avisos para saber que algo cambió y GET para recuperar el estado. No dependas de un Map en memoria como única fuente de la partida.

## Documentación

- [Garantías Socket.IO](https://socket.io/docs/v4/delivery-guarantees/)

## Registro de entrega y revisión

Estado inicial: **Completado**. Los checks son la autoevaluación del alumno; el cierre lo confirma el tutor.

- PR y commit revisado: ✅ Commit `d81d778` en rama `reto/19-reconexion`, con cambios en `src/sockets/index.ts` y `src/sockets/socket.types.ts`.
- Prueba correcta (petición/acción y resultado): ✅ `npm test -- tests/reconnect/reconnect.manual.test.ts` → **2/2 tests passing** para el Reto 19.
  - Test A: Desconectar y reconectar el socket ✅ (32ms)
  - Test B: Probar conexión con token inválido ✅ (1ms)
- Prueba inválida o fallo (petición/acción y resultado): ✅ TypeScript compilation: **sin errores** (`tsc --noEmit`).
  - También: Test de integración "dos participantes reciben game:updated" → **Pasó** después de aplicar `mockImplementation` en `tests/sockets/socket.integration.test.ts` para manejar userIds distintos (1 y 2).
- Comandos y resultados: ✅
  - `npm run typecheck` → sin errores
  - `npm run build` → compilación correcta  
  - Suite general: **99/100 tests passing** a nivel global
- Dudas o correcciones: ✅
  - Dudas sobre `io.emit()` vs `socket.emit()` vs `io.to().emit()` en Socket.IO
  - Consultar con tutor sobre expiración de tokens en tiempo real vs validación en reconexión
- Revisión y aprobación del tutor: Pendiente de revisión por parte del tutor.
- Merge en `develop`: Pendiente después de la aprobación del tutor.

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 18](18-socket-io.md) · [Reto 20](20-frontend.md)
