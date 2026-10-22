# 15 · Prepara las consultas del frontend

**Tu misión:** Permite consultar preguntas e historial por páginas y configura qué frontend podrá llamar al backend desde un navegador.

**Antes:** El [reto 14](14-historial.md) debe estar aprobado e integrado en develop.

**Aprenderás:** Query params, paginación, búsqueda y CORS.

## Trabajo por bloques

1. Define page y pageSize con valores por defecto 1 y 10, y máximo 50. Devuelve items, total, page y pageSize. Añade búsqueda y categoryId al listado de preguntas.

2. Usa orden estable con ID como desempate y los mismos filtros en listado y total. Pagina también /api/me/games.

3. Instala cors y configura FRONTEND_ORIGIN con el origen del frontend local. Actualiza ejemplos, parámetros y esquemas de Swagger.

## Comprueba tu entrega

- [x] Parámetros incorrectos dan 400 y una página sin elementos devuelve items vacío con metadatos coherentes.
- [x] Búsqueda y categoría afectan tanto a items como a total; el orden es estable.
- [x] Historial sigue limitado al usuario autenticado aunque se cambie la paginación.
- [x] Peticiones del navegador desde el origen permitido funcionan, incluido el preflight de Authorization.
- [x] Puedo explicar que CORS no sustituye a JWT ni bloquea por sí solo a clientes como curl.
- [x] `npm run typecheck` y `npm run build` pasan; he comprobado que lo anterior sigue funcionando.
- [x] He actualizado `APRENDIZAJE.md`, anotado las pruebas y abierto el PR hacia `develop` sin hacer merge.

## Demostración al tutor

Compara dos páginas y una consulta filtrada. ¿Por qué el total debe usar los mismos filtros?

## Pistas

No cargues todas las filas para paginarlas en JavaScript. FRONTEND_ORIGIN incluye protocolo y puerto, sin rutas.

## Documentación

- [Paginación Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)
- [cors](https://github.com/expressjs/cors)

## Registro de entrega y revisión

Estado inicial: **Completado** (pendiente de revisión del tutor).

- PR y commit revisado: Rama `reto/15-filtros-paginacion-cors` → PR hacia `develop` (sin merge). Commits: paginación y filtros en preguntas e historial, CORS con `FRONTEND_ORIGIN`, validación de `FRONTEND_ORIGIN` al arranque, límites `.max()` en campos de texto, acotado de `page` y `search` vacío ignorado.
- Prueba correcta (petición/acción y resultado): `GET /api/questions?page=999&pageSize=10` → 200 `{ items: [], total: 6, page: 999, pageSize: 10 }`. `GET /api/me/games?page=1&pageSize=5` con Bearer token → 200 `{ items: [], total: 0, page: 1, pageSize: 5 }`. Preflight CORS responde con `Access-Control-Allow-Origin` y `Access-Control-Allow-Credentials: true`.
- Prueba inválida o fallo (petición/acción y resultado): `page=0`, `page=uno`, `pageSize=51` → 400 `VALIDATION_ERROR`. Página sin elementos devuelve `items` vacío con metadatos coherentes.
- Comandos y resultados: `npm run typecheck` → sin errores; `npm run build` → sin errores; `npm test` → 63 tests superados (8 archivos); `npm run test:integration` → 9 tests superados (2 archivos). Correcciones del tutor aplicadas y verificadas.
- Dudas o correcciones: `search` vacío se ignora (no filtra); `page` acotado a 1000; límites `.max()` añadidos a campos de texto. Rate limiting y auditoría de dependencias quedan pendientes de consultar con el tutor.
- Revisión y aprobación del tutor: pendiente.
- Merge en `develop`: pendiente (no hacer merge hasta aprobación del tutor).

No empieces el siguiente reto hasta que este PR esté aprobado e integrado. Las correcciones van en la misma rama y el mismo PR.

[Volver al README](../README.md) · [Reto 14](14-historial.md) · [Reto 16](16-sala-dos-jugadores.md)
