# Mi cuaderno de backend

Escribe con tus palabras. No copies la documentación ni marques como comprendido algo que solo has utilizado. Las explicaciones se revisarán con el tutor; no sustituyen las pruebas funcionales.

En cada reto anota:

- Qué he construido y qué parte puedo explicar.
- Qué conceptos he usado por primera vez y qué significan.
- Una petición o acción válida y otra inválida: entrada, estado HTTP y resultado.
- Qué error tuve, por qué ocurrió y cómo lo resolví.
- Qué dudas quiero revisar con el tutor.
- PR de entrega y correcciones solicitadas.

## 01 · Arranca tu backend

- Lo que he construido: he añadido la ruta `GET /health`, que devuelve un JSON con `{ "status": "ok" }`. También he comprobado cómo se inicia el servidor desde `server.ts` y cómo `app.ts` configura Express y sus rutas.

- Conceptos y explicación propia: he aprendido la diferencia entre `app.ts` y `server.ts`. `app.ts` configura la aplicación Express y define las rutas, mientras que `server.ts` se encarga de leer y validar el puerto y abrir el servidor con `app.listen()`. También he usado variables de entorno mediante `process.env.PORT`. He entendido que `tsx` permite ejecutar TypeScript durante el desarrollo, mientras que `tsc` comprueba los tipos y genera JavaScript durante el build.

- Pruebas y resultados:
  - Prueba válida: `GET /health` en `http://localhost:3000/health` devuelve estado HTTP `200 OK` y `{"status":"ok"}`.
  - Prueba válida de configuración: cambié `PORT` a `4000` en `.env`, reinicié el servidor y comprobé que `/health` respondía correctamente en el puerto 4000.
  - Prueba inválida: cambié `PORT` a `hola`. El servidor no arrancó y mostró el error `PORT debe ser un número entero entre 1 y 65535`.
  - También comprobé que `npm run typecheck`, `npm run build` y `npm start` funcionan correctamente.

- Error y solución: al principio `npm run dev` no encontraba `tsx` porque las dependencias todavía no estaban instaladas. Lo solucioné ejecutando `npm install`. También aprendí que `.env` no se cargaba cuando todavía no existía y que, en ese caso, el servidor utilizaba el puerto 3000 por defecto. Finalmente comprobé que `.env` está ignorado por Git y que `.env.example` conserva los valores de ejemplo.

- Dudas: quiero revisar con el tutor la diferencia entre ejecutar TypeScript con `tsx` y comprobarlo/generarlo con `tsc`, y por qué es conveniente separar la configuración de Express de la apertura del puerto.

- PR y correcciones: PR del reto 01 hacia `develop`: pendiente de revisión. Correcciones solicitadas: pendientes.

## 02 · Devuelve preguntas

- Lo que he construido:
  - He creado la interfaz `Pregunta` con `id`, `enunciado`, `opciones` y `respuestaCorrecta`.
  - He creado una colección en memoria con 5 preguntas.
  - He creado `GET /api/questions` para listar las preguntas.
  - He creado `GET /api/questions/:id` para obtener una pregunta concreta.
  - Las respuestas públicas solo muestran `id`, `enunciado` y `opciones`, por lo que `respuestaCorrecta` no se expone.

- Conceptos y explicación propia:
  - Una `interface` define la estructura que debe tener un objeto.
  - `Pregunta[]` significa un array de elementos del tipo `Pregunta`.
  - Los parámetros de la URL llegan como texto (`string`), aunque el ID de nuestra pregunta es un `number`. Por eso primero valido el texto y después lo convierto con `Number()`.
  - `find()` busca una pregunta dentro del array y devuelve la pregunta encontrada o `undefined`.
  - `map()` crea un nuevo array transformando los elementos. Lo he utilizado para preparar una versión pública de las preguntas sin `respuestaCorrecta`.
  - `return` dentro de un `if` termina la ejecución de la ruta cuando se produce un error.
  - Los códigos `200`, `400` y `404` indican, respectivamente, respuesta correcta, petición incorrecta y recurso no encontrado.

- Pruebas y resultados:
  - `GET /api/questions` → 200 OK y devuelve las 5 preguntas.
  - `GET /api/questions/1` → 200 OK y devuelve la pregunta con ID 1.
  - `GET /api/questions/hola` → 400 y devuelve `"El ID debe ser un número válido"`.
  - `GET /api/questions/99` → 404 y devuelve `"Pregunta no encontrada"`.
  - Después de consultar una pregunta, `GET /api/questions` sigue devolviendo las 5 preguntas, por lo que la colección no se modifica.
  - `npm run typecheck` → correcto.
  - `npm run build` → correcto.

- Error y solución:
  - Al principio coloqué el `return res.json(...)` dentro del `if (!pregunta)`. Entendí que no debía estar ahí porque el `return` del error termina la función. La respuesta de la pregunta encontrada debe estar fuera del `if`.
  - También entendí que no se puede comparar directamente el ID numérico de la pregunta con el parámetro de la URL sin convertirlo, porque el parámetro llega como `string`.

- Dudas:
  - He entendido la diferencia entre `string` y `number` en los parámetros de una URL y cómo convertirlos.
  - También he entendido la diferencia entre `find()` para buscar un elemento y `map()` para crear un nuevo array a partir de los elementos existentes.

- PR y correcciones:
  - Pendiente de crear el commit, subir la rama y abrir la PR hacia `develop`.
  - La PR se dejará abierta para revisión del tutor y no se hará el merge manualmente.

## 03 · Modifica tus datos

- Lo que he construido: He añadido las operaciones POST, PUT y DELETE para crear, modificar y eliminar preguntas. También he añadido validaciones manuales y un contador para que los IDs no se reutilicen durante la ejecución del servidor.

- Conceptos y explicación propia: He aprendido que POST sirve para crear datos, PUT para sustituir los datos editables de una pregunta y DELETE para eliminarla. También he aprendido que los datos están almacenados en memoria, por lo que se pierden al reiniciar el servidor. Además, he aprendido a validar el `body` antes de extraer sus campos y a comprobar que las opciones sean textos antes de utilizar métodos como `trim()`.

- Pruebas y resultados:
  - POST válido → 201 Created.
  - GET de la pregunta creada → 200 OK y sin mostrar `respuestaCorrecta`.
  - PUT válido → 200 OK.
  - PUT sin body → 400 Bad Request.
  - POST sin body → 400 Bad Request.
  - POST con una opción numérica → 400 Bad Request.
  - POST con una opción `null` → 400 Bad Request.
  - PUT con una opción numérica → 400 Bad Request.
  - PUT con una opción `null` → 400 Bad Request.
  - POST con opciones `"a"` y `" a "` → 400 Bad Request por opciones duplicadas después de quitar los espacios.
  - PUT inválido por opciones duplicadas → 400 Bad Request y la pregunta no cambia al comprobarla posteriormente con GET.
  - DELETE válido → 204 No Content.
  - GET después de eliminar → 404 Not Found.
  - DELETE de un ID inexistente → 404 Not Found.
  - Al eliminar el ID 6 y crear otra pregunta, se asignó el ID 7.
  - Después de reiniciar el servidor, la pregunta creada desapareció y GET devolvió 404.
  - `npm run typecheck` → correcto.
  - `npm run build` → correcto.

- Error y solución: Al principio, un POST o PUT sin body provocaba un error 500 porque `req.body` era `undefined` al intentar extraer sus propiedades. Lo solucioné comprobando primero que el body existe y tiene formato de objeto. También tuve un error 500 cuando una opción era numérica o `null`, porque se intentaba utilizar `trim()` sobre un valor que no era un texto. Lo solucioné comprobando primero que todas las opciones fueran `string`. Además, normalicé las opciones quitando los espacios de los extremos antes de comprobar duplicados.

- Dudas: He entendido mejor la diferencia entre los datos enviados en la URL y los datos enviados en el body. También he entendido por qué es importante validar los datos antes de utilizar métodos propios de un tipo concreto, como `trim()` sobre un `string`.

- PR y correcciones:
  - PR del reto 03 hacia `develop`: [PR #3](https://github.com/josepracticas123/trivia-app-backend/pull/3)
  - Correcciones solicitadas por el tutor: completadas y comprobadas.
  - `npm run typecheck` → correcto.
  - `npm run build` → correcto.
  - Última comprobación: realizada.
  - La PR se mantiene abierta para revisión y merge por parte del tutor.

## 04 · Valida las peticiones

- Lo que he construido: He añadido Zod para validar los datos que llegan a la API en tiempo de ejecución. He creado esquemas para validar las preguntas y los IDs de las preguntas. Las validaciones comprueban que el enunciado no esté vacío, que haya exactamente 4 opciones sin repetir y que la respuesta correcta sea un índice entre 0 y 3. También he rechazado campos inesperados como `id` al crear o modificar preguntas. Además, he añadido middlewares para controlar JSON mal formado, rutas inexistentes y errores internos, usando el formato común `{ error: { code, message } }`.

- Conceptos y explicación propia: TypeScript comprueba los tipos durante el desarrollo, pero no valida los datos que llegan realmente desde una petición HTTP. Por eso utilizo Zod para validar los datos en tiempo de ejecución. `safeParse` comprueba los datos y devuelve un resultado que indica si la validación ha sido correcta. Si es correcta, puedo trabajar con `resultadoValidacion.data`, que contiene los datos ya validados. Si falla, devuelvo un error 400 sin modificar los datos. También he aprendido que `.strict()` permite rechazar campos que no forman parte del esquema, como un `id` enviado desde el cliente.

- Pruebas y resultados:
  - POST con datos correctos y sin `id` → `201 Created`. El servidor genera el `id`.
  - POST con un campo extra como `id` → `400 VALIDATION_ERROR`.
  - PUT con datos correctos y sin `id` en el body → `200 OK`.
  - PUT con un campo extra como `id` → `400 VALIDATION_ERROR`.
  - GET después de un PUT inválido → los datos originales no se modifican.
  - Opciones repetidas → `400 VALIDATION_ERROR`.
  - Número incorrecto de opciones → `400 VALIDATION_ERROR`.
  - `respuestaCorrecta` fuera del rango `0-3` → `400 VALIDATION_ERROR`.
  - JSON mal formado → `400 INVALID_JSON`.
  - Ruta inexistente → `404 ROUTE_NOT_FOUND`.
  - DELETE `/api/questions` → `404 ROUTE_NOT_FOUND`, porque el borrado general ya no existe.
  - DELETE `/api/questions/:id` → `204 No Content`.
  - GET después de eliminar una pregunta → `404 QUESTION_NOT_FOUND`.
  - `/health` sigue respondiendo correctamente → `200 OK`.
  - `npm run typecheck` → correcto.
  - `npm run build` → correcto.

- Error y solución: Al conectar el middleware de errores tuve un error de TypeScript porque el middleware estaba exportado como `erroMiddleware`, mientras que en `app.ts` se intentaba importar como `errorMiddleware`. Lo solucioné haciendo que ambos utilizaran el mismo nombre. También comprobé que el middleware de errores tiene cuatro parámetros cuando corresponde al manejador de errores de Express.

- Dudas: La principal duda que he resuelto en este reto ha sido entender la diferencia entre los tipos de TypeScript y la validación real de una petición HTTP. También he entendido mejor por qué es importante utilizar los datos devueltos por `safeParse` y no confiar directamente en `req.body`.

- PR y correcciones: He trabajado en la rama `reto/04-validacion-errores`, partiendo de `develop`. He realizado las comprobaciones con Thunder Client y he verificado que `npm run typecheck` y `npm run build` funcionan correctamente. He abierto el PR hacia `develop` y lo dejo abierto para que sea revisado por el tutor. Las correcciones realizadas después de la revisión se mantienen en la misma rama y en el mismo PR.

## 05 · Prueba las rutas en Swagger

- Lo que he construido: he documentado la API con Swagger/OpenAPI y he añadido la interfaz Swagger UI en `/docs`. También he añadido el endpoint `/api/openapi.json` para consultar la especificación OpenAPI.

- Conceptos y explicación propia: Swagger permite visualizar y probar las rutas de una API desde el navegador. OpenAPI describe los endpoints, sus parámetros, los datos que reciben y las respuestas que pueden devolver. También he aprendido que la documentación de Swagger no sustituye la validación del backend. Por ejemplo, se ha quitado la restricción `pattern` del parámetro `id` en Swagger para poder enviar valores como `hola`, pero el backend sigue validándolo con Zod y devuelve un `400`.

- Pruebas y resultados:
  - Desde Swagger en desarrollo: `GET /api/questions` → `200`; `POST /api/questions` → `201`; `GET /api/questions/{id}` → `200`; `PUT /api/questions/{id}` → `200`; `DELETE /api/questions/{id}` → `204`; al consultar de nuevo el ID eliminado → `404`.
  - Body válido usado en POST y PUT:
    ```json
    {
      "enunciado": "  UI created question  ",
      "opciones": [" Alpha ", "Beta", "Gamma", "Delta"],
      "respuestaCorrecta": 2
    }
    ```
    El servidor elimina los espacios iniciales/finales y las respuestas públicas no incluyen `respuestaCorrecta`.
  - Casos probados desde Swagger, modificando un único dato respecto al body válido: añadir `id: 999`; cambiar solo `enunciado` a espacios; cambiar solo una opción a espacios; cambiar solo una opción para duplicarla tras limpiar espacios. Cada caso devuelve `400 VALIDATION_ERROR`.
  - `GET /api/questions/hola` desde Swagger → `400 VALIDATION_ERROR`; `GET /api/questions/999` → `404 QUESTION_NOT_FOUND`.
  - JSON mal formado en POST → `400 INVALID_JSON` con el mensaje `El JSON enviado no es válido`.
  - En modo desarrollo y con `npm start`: `/docs` y `/api/openapi.json` → `200`; el documento incluye las operaciones de bienvenida, health, OpenAPI y CRUD. También se comprobó CRUD y los errores 400/404 con el servidor compilado.
  - `npm run typecheck` → correcto.
  - `npm run build` → correcto.

- Error y solución: inicialmente Swagger impedía enviar `hola` como `id` porque el esquema OpenAPI tenía un `pattern` que limitaba el valor antes de enviarlo al servidor. Se eliminó ese `pattern` de la documentación de Swagger, manteniendo la validación real en Zod. Así Swagger puede enviar el valor inválido y comprobar que el backend responde con `400`.

- Dudas: ninguna pendiente en este reto.

- PR y correcciones: [PR #5 hacia `develop`](https://github.com/josepracticas123/trivia-app-backend/pull/5), abierto para revisión del tutor. Se ajustó el esquema de entrada, se documentaron los errores INVALID_JSON e INTERNAL_SERVER_ERROR y se añadió el endpoint OpenAPI a la especificación. La aprobación y el merge siguen pendientes.

## 06 · Prepara PostgreSQL y Prisma

- Lo que he construido:
  En este reto he dejado la base de desarrollo de Railway alineada con el estado actual del repositorio. He configurado Prisma 7 con PostgreSQL, he centralizado el cliente en src/lib/prisma.ts, he definido el modelo Question en prisma/schema.prisma y he validado la inserción de preguntas con el seed de src/lib/seed.ts.

  El modelo contiene `id`, `statement`, `options` y `solution`. `solution` es un índice de base cero (0–3), igual que `respuestaCorrecta` en el contrato de la API.
  El cliente compartido está en `src/lib/prisma.ts`; el seed está en `src/lib/seed.ts`.

- Conceptos y explicación propia:

  schema.prisma define la estructura de la tabla; la migración crea ese esquema en PostgreSQL y queda registrada en la tabla \_prisma_migrations. prisma generate crea el cliente TypeScript para poder consultar la base desde Node, y el seed comprueba si la pregunta ya existe antes de insertarla. La clave del reto era asegurar que el historial de migraciones y la base de desarrollo estaban sincronizados, porque una migración de prueba antigua puede romper la coherencia del proyecto incluso aunque el esquema actual sea correcto.

  `schema.prisma` describe el modelo; una migración contiene SQL versionado que modifica la estructura PostgreSQL. `prisma generate` crea el cliente TypeScript y no cambia la base. El seed inserta datos.
  `PrismaClient` expone las consultas del modelo en TypeScript; `PrismaPg` conecta ese cliente con PostgreSQL usando el driver `pg`.
  El cliente centralizado construye `PrismaClient` con `PrismaPg` y `DATABASE_URL`. Desde el PC se requiere el endpoint público de Railway; la dirección privada `*.railway.internal` se usa para comunicación entre servicios en Railway.

  El seed hace `findFirst` para buscar por `statement`; `await` espera cada consulta, `continue` omite la inserción si ya existe y `$disconnect` cierra el cliente al terminar. Si se cambia el enunciado, la búsqueda ya no lo reconoce y puede insertar otra pregunta. Si se mantienen iguales el enunciado pero se cambian opciones o solución, este seed no actualiza esos campos.

- Pruebas y resultados:

  npx prisma migrate status → tras limpiar la migración de prueba, el historial quedó sincronizado con el estado  actual del repo.
  npm run db:generate → correcto.
  npm run typecheck → correcto.
  npm run build → correcto.
  npm run seed → se ejecutó la primera vez y se comprobó el número de preguntas.
  Segunda ejecución de npm run seed → el total no aumentó, por lo que el seed es idempotente.
  Tras cerrar y volver a conectar con la base, el número de filas siguió igual.
  Resultado real de conteos:
  antes del seed: 0 preguntas
  después de la primera ejecución: 5 preguntas
  después de la segunda ejecución: 5 preguntas
  tras reconectar: 5 preguntas

  El tutor confirmó en el commit revisado que `prisma validate` pasa y que, después de `prisma generate`, `npm run typecheck` y `npm run build` pasan; también confirmó que las rutas y Swagger siguen funcionando.
  En esta actualización también pasaron `npm run db:generate`, `npx prisma validate`, `npm run typecheck` y `npm run build`.
  La base consultada previamente en `production` que ahora se llama postgreSQL tenía la migración inicial aplicada y cero preguntas. Ese resultado no acredita el estado de la base de prácticas ni los conteos del seed.
  Pendiente de registrar con resultados reales en la base de prácticas: conteo inicial, tras cada una de dos ejecuciones de `npm run seed`, y después de cerrar/reabrir la conexión.

- Error y solución:

  Desde el PC, `postgres.railway.internal` no resolvía porque es una dirección privada de Railway. Para el desarrollo local se necesita el dominio/puerto públicos del entorno de prácticas. Prisma 7 también requiere el adaptador `@prisma/adapter-pg` para este cliente.

  La base de práctica conservaba un registro de la migración 20261006122355_test, aunque esa migración ya había sido eliminada del repositorio porque era una prueba que no formaba parte del proyecto final. Eso provocaba que prisma migrate status detectara una divergencia de historial y no dejara validar la base correctamente. Para dejar el reto coherente, eliminé ese registro de la tabla _prisma_migrations y comprobé de nuevo que el historial local y el de la base coincidían con los archivos actuales de prisma/migrations.

- Dudas:

  Ninguna pendiente. La parte importante del reto ha quedado resuelta: el historial de migraciones está sincronizado con el proyecto y el seed ha quedado verificado sobre la base de desarrollo.

- PR y correcciones:

  El PR #7 sigue abierto hacia `develop`. La revisión del tutor sigue pendiente; no empezar el reto 07.

## 07 · Guarda las preguntas de verdad

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 08 · Organiza el backend

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 09 · Relaciona preguntas, opciones y categorías

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 10 · Registra usuarios

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 11 · Inicia sesión

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 12 · Protege las rutas

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 13 · Juega una partida individual

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 14 · Consulta tu historial

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 15 · Prepara las consultas del frontend

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 16 · Crea una partida para dos

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 17 · Juega por turnos mediante HTTP

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 18 · Añade avisos en tiempo real

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 19 · Recupera una partida al reconectar

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 20 · Conecta un frontend mínimo

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 21 · Despliega backend, DB y frontend

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.

## 22 · Entrega y revisión final

- Lo que he construido: pendiente.
- Conceptos y explicación propia: pendiente.
- Pruebas y resultados: pendiente.
- Error y solución: pendiente.
- Dudas: pendiente.
- PR y correcciones: pendiente.
