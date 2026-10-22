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

  `schema.prisma` describe el modelo; una migración contiene SQL versionado que modifica la estructura PostgreSQL y su aplicación se registra en `_prisma_migrations`. `prisma generate` crea el cliente TypeScript y no cambia la base. El seed inserta datos y no cambia el esquema.
  `PrismaClient` expone las consultas del modelo en TypeScript; `PrismaPg` conecta ese cliente con PostgreSQL usando el driver `pg`.
  El cliente centralizado construye `PrismaClient` con `PrismaPg` y `DATABASE_URL`. Desde el PC se requiere el endpoint público de Railway; la dirección privada `*.railway.internal` se usa para comunicación entre servicios en Railway.

  El seed hace `findFirst` para buscar por `statement`; `await` espera cada consulta, `continue` omite la inserción si ya existe y `$disconnect` cierra el cliente al terminar. Si se cambia el enunciado, la búsqueda ya no lo reconoce y puede insertar otra pregunta. Si se mantienen iguales el enunciado pero se cambian opciones o solución, este seed no actualiza esos campos.

- Pruebas y resultados:

  En la base de prácticas confirmada:
  - `npm run db:migrate:status` → 2 migraciones encontradas; `Database schema is up to date!`.
  - Consulta de `_prisma_migrations` → `20261006112344_init` y `20261006164700_solution_text_to_index`; ambas tienen `finished_at` y no están marcadas como revertidas.
  - Consulta de `information_schema.columns` para `Question` → `id integer NOT NULL`, `statement text NOT NULL`, `options jsonb NOT NULL`, `solution integer NOT NULL`.
  - `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → `No difference detected`.
  - Conteos con `SELECT count(*)::integer AS questions FROM "Question"`: antes del seed, 5; después de la primera ejecución de `npm run seed`, 5; después de la segunda ejecución, 5; tras cerrar la conexión y consultar de nuevo, 5. Ambas ejecuciones indicaron que las cinco preguntas ya existían.
  - `npx prisma validate` → esquema válido.

  Según la revisión del tutor del commit `798f829`, `prisma generate`, `npm run typecheck`, `npm run build` y las comprobaciones básicas de rutas y Swagger pasaban. En esta actualización no volví a ejecutar esas pruebas.

- Error y solución:

  Desde el PC, `postgres.railway.internal` no resolvía porque es una dirección privada de Railway. Para el desarrollo local se necesita el dominio/puerto públicos del entorno de prácticas. Prisma 7 también requiere el adaptador `@prisma/adapter-pg` para este cliente.

  La migración temporal `20261006122355_test` intentaba ejecutar `ALTER TABLE "Question" ADD COLUMN "test" TEXT NOT NULL;`, sin valor por defecto. Prisma advertía que añadir esa columna obligatoria no era posible si `Question` ya tenía filas. Como se borró después el registro de la migración y no se conserva la salida original del comando, no se puede confirmar retrospectivamente si llegó a aplicarse; la comprobación actual sí confirma que `test` no forma parte del esquema.

  Después se borraron los archivos de esa migración de VS Code/carpeta y no se subieron al repositorio remoto, mientras el registro del intento seguía en `_prisma_migrations`. Eso produjo una segunda incidencia, distinta del error SQL: Prisma encontraba una migración registrada en la base cuyos archivos ya no estaban en `prisma/migrations` y no podía reconciliar ambos historiales. Para quitar ese bloqueo se borró manualmente de la base la fila correspondiente.

  Borrar esa fila quitó únicamente el registro del historial; no es un mecanismo para revertir SQL. La columna no aparece en la estructura actual: `migrate diff` no detecta diferencias con `schema.prisma`, y `Question` tiene solo las cuatro columnas del modelo. El SQL recuperado confirma que la migración consistía en una única instrucción para añadir `test`; su advertencia explica el posible fallo si se ejecutaba con filas existentes, pero el resultado histórico no se puede verificar ya. Si vuelve a existir una discrepancia, se debe inspeccionar el esquema real y acordar cualquier reparación con el tutor, sin borrar filas del historial para silenciarla.

  Comprobación actual de la base de prácticas: solo están registradas como finalizadas `20261006112344_init` y `20261006164700_solution_text_to_index`; la tabla `Question` existe con las cuatro columnas y tipos descritos arriba, no se detectan diferencias frente a `schema.prisma`, y las únicas tablas del esquema `public` son `Question` y `_prisma_migrations`. El SQL recuperado de la migración de prueba confirma que intentaba añadir `test TEXT NOT NULL`; la estructura actual demuestra que esa columna no existe ahora.

- Dudas:

  La migración intentaba añadir `test TEXT NOT NULL` sin valor por defecto, lo que podía fallar si la tabla ya tenía filas. Al borrarse los archivos dejando el registro se creó una discrepancia de historial; se quitó manualmente esa fila. Como no se conserva el resultado original del intento, no se puede confirmar si llegó a aplicarse; la comparación actual confirma que el esquema está alineado y que `test` no existe ahora. Las correcciones documentales de esta revisión siguen pendientes de commit y push al PR. No hacer cambios de reparación sin acordarlos primero con el tutor.

- PR y correcciones:

  El PR #7 sigue abierto hacia `develop`. La revisión del tutor sigue pendiente; no empezar el reto 07.

## 07 · Guarda las preguntas de verdad

- Lo que he construido:
  He sustituido en `src/app.ts` las operaciones CRUD de preguntas en memoria por consultas Prisma a PostgreSQL. La API conserva los campos públicos `id`, `enunciado` y `opciones`; guarda `respuestaCorrecta` como `solution`, pero no devuelve la solución al cliente.

- Conceptos y explicación propia:
  `async` permite que una ruta espere consultas asíncronas y `await` espera el resultado de PostgreSQL antes de construir la respuesta HTTP. `findMany` lista, `findUnique` busca por ID, `create` inserta, `update` modifica y `deleteMany` elimina y permite revisar `count` para responder 404 si no encontró una fila.

  Prisma Client da acceso tipado al modelo generado; no crea ni modifica tablas por sí mismo. Las migraciones modifican el esquema de la base y el seed inserta datos de práctica. La base persiste aunque se reinicie el backend porque el backend es solo el cliente que se conecta a PostgreSQL; borrar filas o reiniciar/borrar la base sí elimina los datos.

  Las rutas usan `select` para pedir solo los campos públicos. Después convierten `statement` a `enunciado` y `options` a `opciones`, conservando el contrato de la API sin exponer `solution`.

- Pruebas y resultados:
  - `npm run typecheck` → correcto.
  - `npm run build` → correcto.
  - En pruebas locales con consultas simuladas: GET de lista y por ID respondieron correctamente; POST de pregunta temporal → 201 con `id`, `enunciado` y `opciones`, sin solución; PUT → 200; DELETE → 204 y GET posterior → 404.
  - Esas pruebas simuladas no verifican que los cambios persistan en Railway tras reiniciar el backend. La comprobación contra la base real de desarrollo queda pendiente.
  - PUT con ID numérico inexistente → 404 `QUESTION_NOT_FOUND`.
  - Prueba local con `DATABASE_URL` temporal no válida: GET de lista → 500 `INTERNAL_SERVER_ERROR`, no lista vacía ni éxito. No se modificó `.env`.
  - Thunder Client: GET `/api/questions/0` → 400 `VALIDATION_ERROR`.
  - Thunder Client: GET `/api/questions/2147483648` → 400 `VALIDATION_ERROR`.
  - Thunder Client: GET `/api/questions/2147483647` → 404 `QUESTION_NOT_FOUND`; el ID está dentro del rango, pero no existe.
  - Thunder Client: GET `/api/questions/1` → 200; devuelve la pregunta sin `respuestaCorrecta`.
  - Thunder Client: PUT `/api/questions/0` con un body válido → 400 `VALIDATION_ERROR`; no se modificaron datos.
  - Thunder Client: DELETE `/api/questions/2147483648` → 400 `VALIDATION_ERROR`; no se eliminaron datos.
  - Tras las correcciones de validación, `npm run typecheck` → correcto y `npm run build` → correcto.

- Error y solución:
  Durante el cambio de POST quedó código antiguo de memoria duplicado y un cierre de ruta fuera de lugar; se reemplazó la ruta completa por una llamada `prisma.question.create`. Durante PUT, `res.json` tenía propiedades sin envolver en un objeto; se corrigió la sintaxis. En la prueba de conexión, se pegaron comandos de PowerShell en el editor por error; se retiraron de `app.ts` y el typecheck volvió a pasar.

- Dudas:
  Al principio me surgió la duda de cómo distinguir un ID inexistente de un fallo de conexión con la base de datos. Quedó resuelta: el ID inexistente responde 404 y los errores de conexión se propagan al middleware, que responde 500.

- PR y correcciones:
  Rama `reto/07-crud-persistente`; el commit `1090c67` y el PR ya existen. El tutor solicitó cambiar la base del PR a `develop`, corregir la validación del rango del ID, ampliar las pruebas y completar los registros. Correcciones actuales pendientes de subir a la misma rama y PR; aprobación y merge pendientes.

## 08 · Organiza el backend

- Lo que he construido:
  He separado las cinco operaciones del CRUD de preguntas en `src/routes/questions.routes.ts`, `src/controllers/question.controller.ts` y `src/services/question.service.ts`. `app.ts` configura Express, conserva la documentación OpenAPI y monta `questionRouter` bajo `/api/questions`. `server.ts` sigue siendo quien abre el puerto.

- Conceptos y explicación propia:
  Una ruta asocia un método y un camino HTTP con un controlador; por ejemplo, `GET /api/questions/:id` se declara como `questionRouter.get("/:id", getQuestionByIdController)`. El montaje `app.use("/api/questions", questionRouter)` añade el prefijo común. El controlador trabaja con `req` y `res`: valida parámetros o cuerpo, llama al servicio y traduce el resultado a una respuesta HTTP. El servicio recibe datos normales y consulta Prisma, sin importar Express.

  En `GET /api/questions/1`, la petición pasa por el montaje del router, entra en la ruta `/:id`, el controlador valida el ID con Zod y llama a `getQuestionById(1)`. El servicio consulta PostgreSQL con Prisma y devuelve solo `id`, `statement` y `options`; el controlador los presenta como `id`, `enunciado` y `opciones`. Para un evento de Socket.IO se podría reutilizar `getQuestionById(id)`, no el controlador, porque un evento no tiene `req` ni `res`. Esa función no devuelve la solución correcta.

- Pruebas y resultados:
  - `npm.cmd run typecheck` → correcto.
  - `npm.cmd run build` → correcto.
  - Contra el servidor local: `GET /api/questions` → 200; devuelve un array de 5 preguntas con `id`, `enunciado` y `opciones`, sin `respuestaCorrecta`.
  - `GET /api/questions/1` → 200; devuelve `id`, `enunciado` y `opciones`, sin `respuestaCorrecta`.
  - En Swagger, POST `/api/questions` con una pregunta temporal válida → 201; GET por el ID devuelto → 200; PUT con datos válidos → 200 y GET posterior confirma el cambio; DELETE → 204 y GET posterior → 404.
  - `POST /api/questions` con un body inválido → 400 `VALIDATION_ERROR`.
  - `PUT /api/questions/0` con un body válido → 400 `VALIDATION_ERROR`; el ID inválido se rechaza antes de llamar al servicio.
  - `DELETE /api/questions/0` → 400 `VALIDATION_ERROR`; el ID inválido se rechaza antes de llamar al servicio.
  - `GET /docs` → 200 y muestra Swagger UI.
  - `GET /api/openapi.json` → 200; documenta GET y POST en `/api/questions`, y GET, PUT y DELETE en `/api/questions/{id}`.
  - El ciclo CRUD válido se realizó en Swagger contra el servidor de desarrollo. No se repitieron las peticiones HTTP contra `dist`; las pruebas de ejecución de la versión compilada quedan pendientes.

- Error y solución:
  Antes, las rutas y consultas de preguntas estaban concentradas en `app.ts`, mezclando configuración HTTP, validación y acceso a la base de datos. Las fui separando: el router declara endpoints, cada controlador maneja la petición y la respuesta, y el servicio concentra las consultas Prisma. El router se monta con el mismo prefijo `/api/questions` para conservar las URLs públicas.

- Dudas:
  Duda resuelta: si una pregunta no existe, el servicio no necesita conocer HTTP. `getQuestionById` devuelve `null` y el controlador convierte ese resultado en 404 `QUESTION_NOT_FOUND`. Así se mantiene separada la consulta de datos de la respuesta HTTP. No me quedan dudas pendientes sobre este punto.

- PR y correcciones:
  La rama actual es `reto/08-rutas-controladores-servicios`. Los cambios siguen sin commit y no hay una PR abierta para el reto 08. Antes de solicitar revisión, debo ejecutar las pruebas pendientes, completar los checks de autoevaluación del reto con resultados reales, crear el commit y abrir una PR hacia `develop` sin hacer merge.

## 09 · Relaciona preguntas, opciones y categorías

- Lo que he construido:
  - He relacionado cada pregunta con una categoría mediante `categoryId` y con sus opciones mediante el modelo `Option`.
  - He añadido `GET /api/categories`, que devuelve las categorías disponibles con `id` y `name`.
  - He adaptado el CRUD de preguntas para recibir y devolver `categoryId`; las respuestas públicas siguen sin mostrar la opción correcta.
  - He actualizado Swagger con el esquema `Categoria`, el campo `categoryId` y los ejemplos de creación y actualización.

- Conceptos y explicación propia:
  - `categoryId` es una clave foránea: conecta una pregunta con una categoría existente y evita referencias rotas.
  - La relación es de una categoría a muchas preguntas y de una pregunta a muchas opciones. Cada opción guarda su texto, posición e información interna de si es correcta.
  - `onDelete: Cascade` significa que al borrar una pregunta, PostgreSQL borra también sus opciones para no dejar filas huérfanas.
  - El controlador valida primero el formato del `categoryId` con Zod y después consulta si esa categoría existe antes de crear o actualizar. Por eso una categoría inexistente devuelve 400 sin modificar datos.

- Pruebas y resultados (repetidas tras la regeneración de la base, ver "Error y solución"):
  - `GET /api/categories` respondió `200` con las cuatro categorías: Geografía (1), Matemáticas (2), Ciencia (3) e Historia (4).
  - `POST /api/questions` con `categoryId: 2` respondió `201` y devolvió `id`, `enunciado`, `categoryId` y las cuatro opciones, sin `respuestaCorrecta`.
  - El mismo POST con `categoryId: 999999` respondió `400 VALIDATION_ERROR` y el mensaje `La categoría indicada no existe`, sin crear la pregunta.
  - `PUT` sobre la pregunta creada, cambiándola a `categoryId: 3`, respondió `200` y guardó la nueva categoría y las cuatro opciones.
  - `DELETE` respondió `204`; el `GET` posterior respondió `404 QUESTION_NOT_FOUND` y no quedaron opciones huérfanas.
  - `npm.cmd run db:migrate:status` informa `1 migration found` (`20261015124955_init_reto09`) y `Database schema is up to date!`. La base contiene 6 preguntas, 4 categorías y 24 opciones.
  - `npm.cmd run seed` ejecutado dos veces: la segunda reconoció las seis preguntas existentes y no creó duplicados.
  - `npm.cmd run typecheck` y `npm.cmd run build` terminaron correctamente.
  - En el primer envío, sobre la base anterior, ya se probó el CRUD completo con la pregunta ID 17 (PUT 200, DELETE 204, GET 404 y referencias inválidas 400); la lógica del CRUD no cambió con la regeneración.

- Error y solución:
  - La ruta de categorías se montó primero como `/api/categoies`, por lo que Swagger devolvía 404. Corregí la URL a `/api/categories`.
  - El ejemplo YAML del PUT tenía `categoryId` con una indentación distinta del resto de campos. Al alinearlo correctamente Swagger volvió a interpretar la documentación.
  - La primera migración del reto eliminaba las columnas `options` y `solution` sin copiarlas a `Option` y añadía `categoryId` obligatorio sin asignarlo, por lo que fallaba en una base con preguntas del esquema anterior (reproducido por el tutor: `column "categoryId" of relation "Question" contains null values`). Tras comentarlo en el PR, se acordó con el tutor borrar todo y empezar de cero: se eliminaron las carpetas de las tres migraciones, se ejecutó `npx prisma migrate reset --force` (vacía tablas, datos y `_prisma_migrations`), se generó una única migración nueva desde `schema.prisma` con `npx prisma migrate dev --name init_reto09` y se recargaron los datos con `npm run seed`. No se hizo ningún `DELETE` o `TRUNCATE` a mano: la herramienta de Prisma resetea el esquema completo y deja el historial consistente con la base real.
  - En Swagger, `PreguntaInput.categoryId` tenía `maximum: 1` mientras que Zod admite hasta `2147483647`. Alineé ambos límites y lo comprobé con POST y PUT usando categorías existentes (2 y 3).

- Dudas:
  - `prisma migrate status` informa del estado del historial de migraciones; por sí solo no demuestra que los datos se hayan conservado. Las pruebas funcionales registradas comprueban el funcionamiento y los datos nuevos: en la base regenerada hay 6 preguntas, 4 categorías y 24 opciones, y el CRUD responde correctamente vía API. No demuestran conservación de los datos anteriores: en este caso se eliminaron con autorización del tutor.
  - La migración original no conservaba los datos del esquema anterior; se acordó con el tutor regenerar el historial y la base desde cero en lugar de convertir los datos.

- PR y correcciones:
  - PR abierto hacia `develop` desde `reto/09-relaciones` (commit base revisado: `a4216fa`). Tras la primera revisión corregí el límite de `categoryId` en Swagger y el registro del reto, y regeneré el historial de migraciones acordado con el tutor; las correcciones van en la misma rama y el mismo PR. No hago merge ni empiezo el reto 10 hasta la aprobación del tutor.

## 10 · Registra usuarios

- Lo que he construido:
  - Modelo `User` en Prisma (`id`, `email` único, `passwordHash`, `createdAt`) con su migración.
  - Endpoint `POST /api/auth/register`: valida con Zod, normaliza el email (elimina espacios exteriores y convierte a minúsculas), exige una contraseña de al menos 8 caracteres y devuelve únicamente `id` y `email`.
  - Servicio de registro con **Argon2**: genera el hash de la contraseña y guarda el usuario; si el email ya existe, devuelve `null` y el controlador responde con `409 EMAIL_ALREADY_EXISTS`.
  - Validación del formato del email mediante Zod y rechazo de campos adicionales.
  - Documentación Swagger con los esquemas `RegistroEntrada` y `UsuarioPublico`, probada desde `/docs` con respuestas `201`, `400` y `409`.

- Conceptos y explicación propia:
  - **Hash ≠ cifrar**: el hash es una transformación de una sola vía; no se puede recuperar directamente la contraseña original a partir del hash. El cifrado sí permite recuperar el contenido mediante la clave correspondiente. Para almacenar contraseñas se utiliza un algoritmo de hash adecuado.
  - La restricción `@unique` del email en la base de datos es la que evita duplicados de verdad. Comprobar el email antes del `INSERT` no basta porque dos peticiones podrían llegar a la vez (condición de carrera). El servicio interpreta el error `P2002` de Prisma para traducirlo a `409 EMAIL_ALREADY_EXISTS`.
  - Argon2 genera y utiliza una sal, que queda representada en el hash almacenado. No hay que inventar una sal manualmente ni utilizar algoritmos rápidos como SHA-256 para almacenar contraseñas.
  - El email se normaliza con `trim` y minúsculas para que `" Juan@EMAIL.com "` y `"juan@email.com"` se traten como la misma dirección. La contraseña no se modifica.
  - El `select: { id: true, email: true }` del servicio limita los datos devueltos y evita que `passwordHash` se exponga en la respuesta al cliente.

- Pruebas y resultados:
  - Registro válido con `{"email":"  Juan@EMAIL.com ","password":"secreta123"}` → `201 Created`, con el email normalizado y únicamente los campos públicos.
  - Email válido con espacios exteriores y mayúsculas (`"  PruebaOctubre16b@Example.com  "`) → `201 Created`, devolviendo `pruebaoctubre16b@example.com`.
  - Mismo email con otra grafía (`JUAN@email.com`) → `409 EMAIL_ALREADY_EXISTS`; no se crea un segundo usuario con la misma dirección.
  - Email malformado `a@b..com` → `400 VALIDATION_ERROR`.
  - Email malformado `.jose@example.com` → `400 VALIDATION_ERROR`.
  - Contraseña inferior a 8 caracteres, incluida una contraseña de 6 caracteres → `400 VALIDATION_ERROR`.
  - Campo adicional no permitido, por ejemplo `"admin": true` → `400 VALIDATION_ERROR`.
  - JSON malformado → `400 INVALID_JSON`.
  - Respuesta pública comprobada: contiene `id` y `email`, sin exponer la contraseña original ni el hash.
  - `npm.cmd run typecheck` y `npm.cmd run build` terminaron correctamente.

- Error y solución:
  - Escribí `passwordHas` en vez de `passwordHash`. Corregí el esquema de Prisma y generé de nuevo el cliente.
  - La migración `20261015143436_fix_user_column` se aplicó en Railway el 15/10/2026 a las 16:34:38. Al revisar su SQL, comprobé que elimina la columna `passwordHas` y crea `passwordHash`; no renombra la columna ni copia los datos de la anterior.
  - El usuario de prueba se creó después de aplicar la migración. Por tanto, su hash no existía en la columna eliminada antes de la migración y no se perdió el hash de ese usuario por ese cambio. Esta conclusión se limita al usuario de prueba cuya fecha se comprobó.
  - No se ha restablecido la base de datos ni se ha eliminado o modificado el historial de migraciones. Como la migración ya está aplicada en Railway, no se deben modificar las migraciones existentes ni ejecutar nuevas operaciones sobre la base de datos sin consultar previamente con el tutor.
  - `prisma.user` aparecía en rojo porque el cliente de Prisma estaba desactualizado tras el cambio de esquema. Se soluciona con `npm run db:generate` y, si es necesario, reiniciando el servidor de TypeScript de VS Code.
  - El código de error del `409` se unificó a `EMAIL_ALREADY_EXISTS` en el controlador y la documentación.

- Dudas:
  - Diferencia entre hash y cifrado → resuelta: el hash no es reversible directamente; el cifrado permite recuperar el contenido con la clave.
  - Por qué comprobar el email antes del `INSERT` no basta → resuelta mediante la restricción única y el tratamiento del error `P2002`.
  - Cómo verificar un hash → Argon2 permite comprobar una contraseña candidata con `argon2.verify`, sin publicar el hash ni la contraseña en logs o documentación.
  - Cómo actuar ante una migración ya aplicada → no modificar Railway ni el historial de migraciones sin acordar previamente con el tutor el procedimiento adecuado.

- PR y correcciones:
  - PR abierto hacia `develop` desde `reto/10-registro`, pendiente de revisión y aprobación del tutor.
  - No hacer merge ni comenzar el reto 11 hasta recibir la aprobación del tutor.

## 11 · Inicia sesión

- **Lo que he construido:** He creado el endpoint `POST /api/auth/login`. Valida los datos recibidos, comprueba las credenciales y devuelve un token JWT con una duración de una hora y los datos públicos del usuario.

- **Conceptos y explicación propia:**
  - Normalizo el email con Zod: elimino espacios exteriores y convierto el email a minúsculas.
  - Compruebo la contraseña con Argon2, comparándola con el hash guardado en la base de datos.
  - Uso JWT para identificar al usuario sin incluir su contraseña ni su hash en el token.
  - El token contiene el ID del usuario en `sub` y caduca en una hora.
  - `JWT_SECRET` es obligatorio y debe configurarse mediante una variable de entorno.
  - Si el email no existe o la contraseña es incorrecta, devuelvo el mismo error genérico `401 INVALID_CREDENTIALS`.

- **Pruebas y resultados:**
  - Swagger: el login correcto devuelve `200`; las credenciales incorrectas devuelven `401`.
  - Vitest: 2 pruebas superadas.
  - Las pruebas verifican el JWT, el identificador `sub`, la duración y que no se expongan contraseñas ni hashes.
  - `npm.cmd run typecheck`: correcto.
  - `npm.cmd run build`: correcto, si has confirmado que terminó sin errores.

- **Error y solución:** Durante las pruebas manuales apareció un error `500` por una URL de base de datos mal escrita. Corregí la configuración de `DATABASE_URL` y el login funcionó correctamente.

- **Dudas:** Ninguna pendiente por ahora.

- **PR y correcciones:** Pendiente de crear la pull request hacia `develop`. No se debe fusionar todavía.
- **Nota: José**
  Hash de contraseña
  Sirve para almacenar y comprobar contraseñas sin guardarlas directamente.

  Firma del JWT
  Permite detectar cambios y verificar que el token es auténtico.

  Caducidad (exp)
  Limita el tiempo durante el cual se acepta el token.

¿Por qué el contenido del JWT es legible y su firma protege frente a modificaciones?
Un JWT tiene tres partes: cabecera, contenido y firma.

- Contenido legible: el contenido no está cifrado, así que cualquiera que tenga el token puede leer datos como el ID del usuario (sub) y la fecha de caducidad (exp). Por eso nunca debemos guardar contraseñas ni hashes dentro del token.
- Firma: se genera usando el contenido del token y el secreto JWT_SECRET. Cuando el servidor verifica el token, comprueba que la firma sea válida. Si alguien modifica el contenido, la firma ya no coincide y el token se rechaza.
- Caducidad (exp): indica cuándo deja de ser válido el token. En nuestro reto, dura una hora.
- Decodificar y verificar: decodificar permite leer el contenido; verificar comprueba la firma y la caducidad.

## 12 · Protege las rutas

- **Lo que he construido:**
  - Middleware de autenticación JWT para proteger las rutas privadas mediante el encabezado `Authorization: Bearer <token>`.
  - Validación de la firma, el algoritmo permitido (`HS256`), la caducidad, el identificador `sub` y la existencia del usuario en la base de datos.
  - Endpoint `GET /api/me` para consultar la información del usuario autenticado.
  - Sistema de roles `USER` y `ADMIN`, con `USER` como valor predeterminado.
  - Middleware de autorización para restringir la creación, actualización y eliminación de preguntas a usuarios con rol `ADMIN`.
  - Acceso público a las consultas de preguntas y categorías.
  - Configuración de Swagger para documentar la autenticación Bearer y la seguridad de las rutas protegidas.
  - Validación del registro para impedir que el cliente envíe campos adicionales, como `role: "ADMIN"`.

- **Conceptos y explicación propia:**
  - **Autenticación:** verifica quién realiza una petición.
  - **Autorización:** determina qué operaciones puede realizar el usuario autenticado.
  - **JWT:** token firmado que permite autenticar peticiones sin enviar la contraseña en cada solicitud.
  - **Bearer token:** forma de enviar el token en la cabecera `Authorization`.
  - **401 Unauthorized:** indica que faltan credenciales válidas o que el token no es válido.
  - **403 Forbidden:** indica que el usuario autenticado no tiene permisos suficientes.
  - La autenticación y la autorización se comprueban en el servidor; no basta con ocultar opciones en la interfaz.
  - Los permisos se aplican en las rutas protegidas mediante middleware.
  - El registro público debe asignar el rol `USER` en el servidor y no permitir que el cliente se conceda privilegios de administrador.

- **Pruebas y resultados:**
  - `npm test`: **18 tests superados en 4 archivos**.
  - Middleware JWT: pruebas de token ausente, token inválido, token caducado, token sin `exp`, `sub` fuera de rango (0, 2147483648 y un valor que excede los enteros seguros) y usuario inexistente. También una prueba de token válido que continúa y guarda el identificador.
  - Middleware de autorización: prueba de que un usuario `USER` recibe `403 Forbidden` al intentar realizar una operación de administrador.
  - Controlador de autenticación: pruebas de inicio de sesión correcto, credenciales incorrectas y rechazo del registro cuando se envía `role: "ADMIN"`.
  - Rutas de categorías: prueba automatizada que verifica que `GET /api/categories` es pública y devuelve las categorías esperadas. El servicio está simulado para no acceder a la base de datos real.
  - Rutas de preguntas: prueba automatizada de que `GET /api/questions` es pública y devuelve el formato público correcto.
  - Rutas de preguntas protegidas: `POST /api/questions` sin token devuelve `401`; con JWT válido de un `USER` devuelve `403`; con JWT válido de un `ADMIN` crea la pregunta y devuelve `201`.
  - Las pruebas de rutas simulan Prisma y los servicios necesarios, por lo que no dependen de la base de datos real.
  - `npm run typecheck`: finalizado sin errores en la última comprobación realizada.
  - `npm run build`: compilación correcta en la comprobación anterior.
  - Prueba manual de `GET /api/me`: devuelve la información del usuario autenticado.
  - Prueba manual de permisos: un usuario `USER` recibe `403 Forbidden` al intentar crear una pregunta.
  - Pruebas manuales con un usuario `ADMIN`: creación, actualización y eliminación de preguntas realizadas correctamente.

- **Error y solución:**
  - Se comprobó la necesidad de rechazar tokens asociados a usuarios que ya no existen en la base de datos.
  - Se añadió un test que verifica que el middleware devuelve `401 Unauthorized` cuando el usuario del token no existe.
  - Al crear el test de categorías, se detectó que `expect`, `describe` e `it` debían importarse desde `vitest`, no desde `node:test`. Se corrigió el import y las pruebas pasaron correctamente.
  - **Corrección de la segunda revisión del tutor (commit `5fcae49`):** `jwt.verify` solo comprueba la caducidad si el token trae `exp`, por lo que un token firmado sin ese campo era aceptado. Ahora se exige que `exp` exista y sea un número finito, con su prueba (401 sin consultar la base).
  - **Corrección de rango de `sub`:** la regex rechazaba textos, pero permitía valores como `2147483648` que llegaban a la consulta de Prisma. Ahora `sub` se convierte a número y se comprueba que sea un entero seguro entre 1 y 2147483647 antes de tocar la base, con pruebas para `0`, fuera de rango y un valor que excede los enteros seguros.
  - **Mejora de tipado:** se añadió `src/types/express.d.ts` para declarar `res.locals.userId` como `number` mediante declaration merging; TypeScript avisa si se escribe mal el campo o se le asigna un valor que no es un número, sin usar `any` ni casts.
  - El middleware verifica el JWT y consulta al usuario en la base de datos antes de permitir el acceso.

- **Dudas y comprobaciones pendientes:**
  - **¿Puede un usuario registrarse como administrador enviando `role: "ADMIN"`?** Se ha añadido un test que comprueba que el registro devuelve `400` y no llama al servicio de registro cuando se envía ese campo.
  - **¿Puede un usuario normal modificar preguntas?** No. El middleware restringe esas operaciones al rol `ADMIN`; se ha comprobado manualmente que un usuario `USER` recibe `403` y existe un test automatizado para el middleware de autorización.
  - **¿Qué ocurre si el token es inválido, caduca o pertenece a un usuario inexistente?** La petición se rechaza con `401`; estos casos tienen pruebas automatizadas.
  - **¿Se pueden consultar preguntas y categorías sin autenticación?** Sí. Hay pruebas automatizadas para ambas rutas públicas. Las operaciones de escritura de preguntas requieren autenticación y rol `ADMIN`.
  - **¿Cómo se prepara un administrador local?** El procedimiento está documentado en el README: se registra un usuario normal y el tutor modifica su rol localmente en la base de datos, sin guardar contraseñas ni tokens en Git.
  - **¿Cómo se verifica el funcionamiento?** Mediante tests automatizados, chequeo de tipos, compilación y pruebas manuales de autenticación y permisos.

- **PR y correcciones:**
  - **Segunda revisión del tutor** sobre el commit `5fcae49`: pidió exigir `exp` en el token, validar el rango de `sub` antes de consultar Prisma y, como mejora opcional, tipar `res.locals`. Los tres puntos están aplicados en la misma rama, con pruebas nuevas (de 13 a 18) y `npm test`, `npm run typecheck` y `npm run build` en verde tras los cambios.
  - Revisión final de Swagger completada: `POST /api/questions` documenta 201/400/401/403/500, `PUT /api/questions/{id}` 200/400/401/403/404/500 y `DELETE /api/questions/{id}` 204/400/401/403/404/500. Sin token responden 401 y ya no aparece la etiqueta "Undocumented".
  - Comandos finales ejecutados de nuevo tras la revisión de Swagger: `npm test` (13 tests superados en 4 archivos), `npm run typecheck` y `npm run build`, todos correctos.
  - Corrección de mantenimiento en la misma rama: erratas de comentarios en `src/`, solo texto, sin cambios de lógica.
  - Rama `reto/12-autenticacion-permisos` publicada y PR hacia `develop` (commit base `1322480`); las correcciones van en la misma rama y el mismo PR. No fusionar hasta completar la revisión del tutor.

## 13 · Juega una partida individual

- **Lo que he construido:**
  - Migración con los modelos `Game`, `GamePlayer`, `GameQuestion`, `GameChoice`, `Answer` y el enum `GameStatus` (`ACTIVE`/`FINISHED`), con participantes relacionados aunque sea una partida individual para poder ampliar después.
  - Copia congelada de las preguntas: `GameQuestion` guarda el enunciado, la posición y la solución (posición de la opción correcta), y las opciones se copian a `GameChoice`. Editar o borrar una pregunta del catálogo no altera una partida existente.
  - `POST /api/games`: crea la partida con cinco preguntas aleatorias sin repetición, el participante y las copias en una sola transacción; devuelve 409 si hay menos de cinco preguntas en el catálogo.
  - `GET /api/games/:id`: estado público construido campo a campo (nunca `res.json(game)`), con la cadena 400 (id) → 404 (no existe) → 403 (no participas) → 200, y sin exponer `solution`, `questionId` ni respuestas.
  - `POST /api/games/:id/answers`: esquema zod `answerSchema` con `.strict()`, servicio `submitAnswer` con cuatro bloques de comprobaciones (partida y permisos, pregunta y turno, opción perteneciente, cálculo y guardado) y un controlador que traduce cada resultado del servicio a su código HTTP mediante una tabla.
  - Cierre automático: al registrar la quinta respuesta, la misma transacción cambia el estado a `FINISHED` y rellena `finishedAt`.
  - Swagger: schemas `PartidaEstado`, `RespuestaInput` y `RespuestaResultado`, y bloques `@openapi` para los tres endpoints de partidas.
  - Validación de IDs reutilizando el esquema de retos anteriores (corrección de la revisión del tutor): el parámetro `:id` debe ser una cadena de dígitos entre 1 y 2147483647 mediante el alias `idParamSchema`, y `gameQuestionId`/`choiceId` son números enteros en ese mismo rango; todo se valida ANTES de llamar al servicio.
  - Progreso en el `GET /api/games/:id`: el servicio añade `score` (aciertos acumulados) y `nextQuestionId` (pregunta de turno; `null` al terminar), calculados siempre en el servidor a partir de las respuestas guardadas, y Swagger documenta ambos campos.
  - Tests propios de partidas en dos niveles: `games.routes.test.ts` (HTTP con supertest y el servicio simulado) y `game.services.test.ts` (lógica real del servicio contra un Prisma simulado en memoria).

- **Conceptos y explicación propia:**
  - **Reglas de negocio en el servidor:** el cliente solo envía `gameQuestionId` y `choiceId`; el backend decide si es correcta (`choice.position === solution`) y calcula la puntuación. El cliente nunca envía ni modifica puntos.
  - **Datos públicos frente a internos:** `solution` es interno y nunca sale en respuestas; el GET se construye campo a campo para que sea imposible filtrarlo sin darnos cuenta.
  - **ID de catálogo frente a ID de partida:** `questionId` es el original; `gameQuestionId` es la copia que vive dentro de la partida y es la que recibe el endpoint de respuestas.
  - **Turno:** la pregunta en turno es la primera sin responder (posiciones 0..4), por eso se comprueba antes de guardar.
  - **Tipo resultado:** `submitAnswer` devuelve `{ ok: true, ... }` o `{ ok: false, error }` en lugar de lanzar excepciones; el controlador ramifica con `if (!resultado.ok)` y una tabla error → HTTP.
  - **Transacción de Prisma:** guardar la respuesta y cerrar la partida es "todo o nada".
  - **Duplicados:** `@@unique([gameQuestionId])` impide dos respuestas para la misma pregunta; en el uso normal el turno la detecta antes (409 igualmente) y `P2002` es la defensa ante dos peticiones simultáneas (carrera).
  - **`.strict()` de zod:** rechaza campos extra como `isCorrect` o `score`. Aunque los dejara pasar, el controlador solo lee los dos campos y la puntuación la calcula el servidor: defensa en profundidad.
  - **404, 403 y 409 con significado:** 404 = el recurso no existe, 403 = existe y no es tuyo, 409 = el estado actual de la partida no permite esa acción (turno, duplicado o cerrada).
  - **Swagger es un documento, la vista solo lo pinta:** cada bloque `@openapi` aporta una operación, el orden de los bloques es el orden en la vista y los cambios requieren reiniciar el servidor.
  - **Validar el ID es validar una CADENA:** el parámetro de la URL llega como texto; `Number("1e100")` es 10^100 y `Number.isInteger(1e100)` da `true` (no tiene decimales), así que una comprobación débil lo deja pasar hasta que Prisma revienta con un identificador que no cabe en el campo `Int`. El regex `^\d+$` mata decimales y notación exponencial, y el rango `1..2147483647` mata el `0` y lo que no cabe en la base.
  - **Reutilizar sin duplicar reglas:** `idParamSchema` es un alias de `questionIdSchema`; el mismo criterio de ID vale para preguntas y partidas sin copiar código ni romper los imports existentes.
  - **El progreso se calcula, no se guarda:** `score` es contar respuestas con `isCorrect: true` (como máximo una por pregunta) y `nextQuestionId` es la primera pregunta sin respuestas; ambos se derivan en el servidor desde las respuestas ya guardadas, de modo que al recargar la partida el frontend reconstruye el estado sin fiarse de nada enviado por el cliente.
  - **Dos niveles de test, dos mocks:** en `src/routes/` se simula el SERVICIO y se prueban el controlador, las validaciones y la tabla error → HTTP; en `src/services/` se simula PRISMA y se prueba la lógica real del servicio contra una BBDD falsa en memoria. El `it.each` de vitest permite cubrir muchas entradas inválidas sin repetir código.

- **Pruebas y resultados:**
  - `npm run typecheck` y `npm run build`: sin errores.
  - `npm test`: **18 tests superados en 4 archivos** (la parte anterior sigue funcionando).
  - `GET /api/games/1` con token: 200 con cinco preguntas sin repetición (posiciones 0..4), cuatro opciones cada una y sin `solution` en ninguna parte.
  - `GET /api/games/1` sin token: 401. Con id 99999: 404. Con el token de un usuario ajeno: 403.
  - `POST /api/games/1/answers` (7 pruebas manuales desde Swagger):
    1. Acierto a la pregunta 1 → 200 `isCorrect: true, score: 1`.
    2. Responder la pregunta 3 estando en la 1 → 409 `WRONG_TURN`.
    3. Opción que pertenece a otra pregunta → 400 `CHOICE_NOT_IN_QUESTION`.
    4. Repetir la pregunta 1 → 409 (no suma dos veces).
    5. Enviar `isCorrect: true` en el body → 400 `VALIDATION_ERROR` (`.strict()`).
    6. Quinta respuesta → 200 `finished: true, score: 5`.
    7. Responder con la partida cerrada → 409 `GAME_FINISHED`.
  - Swagger refleja el contrato: los tres endpoints de partidas documentados y probados desde `/docs`.
  - **Revisión del tutor — matriz de validación de IDs (24/24 con un script de Node contra el servidor levantado):**
    1. `GET /api/games/{id}` con `1e100`, `0`, `-5`, `1.5` y `2147483648` → 400 `VALIDATION_ERROR` (el `1e100` antes producía un 500 de Prisma).
    2. `GET` con `99999` (válido pero inexistente) → 404 `GAME_NOT_FOUND`; con `1` → 200 (flujo válido intacto).
    3. `POST /api/games/{id}/answers` con esos mismos ids en la URL → 400/404 sin llegar al servicio.
    4. Body con `gameQuestionId` o `choiceId` a `0`, `-5`, `1.5`, `2147483648` y con campo extra `isCorrect` → 400 `VALIDATION_ERROR`.
    5. `gameQuestionId: 99999` en una partida activa → 404 `QUESTION_NOT_IN_GAME`; respuesta válida → 200 (flujo conservado).
  - `npm test` tras las mejoras: **55 tests en 6 archivos** (37 nuevos: 27 de rutas y 10 de servicios); `npm run typecheck` sin errores.
  - Progreso en vivo: `GET /api/games/1` (terminada) → `score: 5, nextQuestionId: null`; `GET /api/games/3` (activa, una respuesta) → `score: 1, nextQuestionId: 12`.
  - Swagger: `/api/openapi.json` refleja `score` y `nextQuestionId` (con `nullable: true`, estilo OpenAPI 3.0) dentro de `PartidaEstado`.

- **Error y solución:**
  - Al pegar el servicio, un typo en el tipo (`GAME_NOT_FOUN`) y la ausencia del `return` final produjeron los errores TS2820 y TS2366; corregidos los dos.
  - TypeScript solo enseñó el error de sintaxis (una `}` de más al final del fichero) hasta que lo arreglé: los errores de sintaxis esconden los de tipos.
  - Un `}` cerraba el `if` antes del `return`, con lo que la traducción de errores quedaba fuera del bloque; movido el cierre y corregido también el typo `messaje`.
  - El IDE insertó solo `import { finished } from "stream"` al escribir `finished`; era un import inútil y se borró.
  - Trampa silenciosa: `resultadoValidacion.succes` (sin la s) habría devuelto 400 en todas las peticiones porque `undefined` se negaba como `true`.
  - El test de "campo prohibido" devolvió 200 en lugar de 400: el comentario decía "sin campos extra" pero faltaba la llamada `.strict()`; añadida y repetida la prueba con 400 correcto.
  - Un token de Swagger caducó y daba 401 con "Falta el token": el curl no llevaba la cabecera `Authorization`; se resolvió volviendo a autorizar con un token nuevo.
  - Corrección de errata: `FORBIDEN` → `FORBIDDEN` en el código de error 403 del `GET /api/games/:id`, igualándolo al del endpoint de respuestas.
  - El revisor reproducía `GET /api/games/1e100` con un 500 de Prisma: la validación antigua (`Number.isInteger`) no limitaba el rango. Sustituida por `idParamSchema.safeParse(req.params)` en ambos controladores y añadido `.max(2147483647)` a los dos campos del body.
  - La primera pasada de la matriz salió 22/24: al aplicar el `.max` al `choiceId` se le olvidó el `.min(1)`, y `0`/`-5` pasaban la validación y llegaban al servicio (409 en vez de 400). Detectado por las pruebas y corregido: los casos límite existen exactamente para esto.
  - Swagger UI bloquea `1e100` en el formulario ("Value must be an integer") porque valida el contrato en el navegador; la prueba se mandó con curl. Además, PowerShell traga las comillas simples del body JSON (`INVALID_JSON`), así que la matriz completa se ejecutó con un script de Node que hizo las 24 peticiones de una vez.
  - En la documentación de Swagger hubo dos erratas de pegado: el `required` nuevo se coló en el de cada opción de `choices` (en vez del de `PartidaEstado`) y la descripción del `400` ocupó el sitio de la descripción principal del GET; intercambiadas a su sitio.
  - Al añadir los campos nuevos al `json` del controlador faltó un `)` en el `map` de preguntas (TS1135): el error de sintaxis apareció en la línea de DESPUÉS del sitio real del problema.

- **Dudas:**
  - **¿Por qué guardar una copia de las preguntas?** Porque `GameQuestion`/`GameChoice` son un snapshot: si mañana se edita o se borra una pregunta del catálogo, la partida en curso conserva su enunciado, sus opciones y su solución tal y como se jugaron.
  - **¿Puede el cliente hacer trampa enviando puntuación?** No: el esquema `.strict()` rechaza los campos extra, el controlador solo pasa los dos ids y el servicio calcula `isCorrect` y `score`.
  - **¿Responder dos veces suma dos puntos?** No: la segunda recibe 409 (el turno ya pasó) y, además, `@@unique([gameQuestionId])` lo impide a nivel de base de datos.
  - **¿El rol ADMIN afecta a las partidas?** No: las rutas de juegos solo usan `authMiddleware`; el `adminMiddleware` está reservado para el CRUD de preguntas.
  - **¿Qué pasa al completar la quinta?** La transacción cambia el estado a `FINISHED` y cualquier respuesta posterior recibe 409 `GAME_FINISHED`.
  - **¿Por qué `score` no está guardado en ninguna tabla?** Porque hoy no hace falta: es el recuento de respuestas con `isCorrect: true` y recalcularlo desde la base garantiza que siempre coincide con la verdad; si algún día hubiera puntos parciales, se podría añadir un campo.
  - **¿Y si el frontend recarga la página en mitad de la partida?** El `GET /api/games/:id` devuelve `score` y `nextQuestionId`, así que el cliente reconstruye el progreso sin adivinar nada, y sigue sin ver las soluciones de las preguntas pendientes.

- **PR y correcciones:**
  - Rama `reto/13-partida-individual` con todo el trabajo del reto; PR hacia `develop` sin hacer merge.
  - Revisión del tutor sobre el commit `2262322`: una corrección necesaria (validación de IDs en URL y body, con el rango completo del `Int`) y dos mejoras propuestas (tests propios de partidas y `score`/`nextQuestionId` en el `GET`); las tres aplicadas en la misma rama y el mismo PR, dejándolo abierto para la siguiente revisión (sin empezar el reto 14).

## 14 · Consulta tu historial

- **Lo que he construido:**
  - `GET /api/me/games`: historial de partidas del usuario autenticado, de la más reciente a la más antigua (`orderBy: { createdAt: "desc" }`) y con `select` explícito de `id`, `status`, `createdAt`, `finishedAt`, `score` (sin credenciales ni soluciones).
  - El usuario sale SIEMPRE de la sesión validada (`res.locals.userId` que deja `authMiddleware`), nunca de un `userId` del query o del body; el filtro `players: { some: { userId } }` limita la consulta a las partidas propias.
  - Router nuevo `src/routes/me.routes.ts` montado en `app.ts` como `app.use("/api/me", meRouter)`, con la cadena `authMiddleware` → controlador (401 si falta el token).
  - Detalle enriquecido en `GET /api/games/:id`: además de `id`, `status`, `score`, `nextQuestionId` y las preguntas con sus opciones, ahora devuelve `createdAt` y `finishedAt`, y cada pregunta lleva `answered` (true si ya tiene respuesta guardada).
  - Prueba automatizada de acceso ajeno (bloque 3) con **Vitest + Supertest contra una base de datos PostgreSQL real** (`trivia_test`), separada de los tests con mocks.
  - Infraestructura de pruebas de integración: `tests/integration/`, `vitest.integration.config.ts`, script `npm run test:integration` (con `--env-file=tests/.env.test`) y `.env.test` propio (en `.gitignore`).
  - Documentación en `tests/README.md`: estructura de carpetas, qué prueba cada fichero y cómo montar y ejecutar la base de datos de pruebas.

- **Conceptos y explicación propia:**
  - **Filtrar en el backend, no en el frontend:** el historial se filtra por el `userId` de la sesión en la consulta a la base. Filtrar en el frontend no protege nada: los datos ya habrían viajado y cualquiera podría pedir los de otro cambiando el id.
  - **`select` explícito frente a `include`:** con `select` declaramos exactamente qué columnas salen, así `passwordHash` no puede colarse. Es el mismo criterio que "nunca `res.json(game)`" del reto 13.
  - **`answered` sin filtrar la solución:** el servicio trae las respuestas con `select: { isCorrect: true }`, así que sabemos SI está respondida (`answers.length > 0`) pero no qué se eligió. Suficiente para que el cliente marque lo hecho y continúe por `nextQuestionId`.
  - **Ordenación y fechas:** `createdAt desc` da el historial en orden natural y `finishedAt: null` distingue las partidas en curso de las terminadas.
  - **Tests con mocks frente a tests de integración:** los 56 tests normales simulan Prisma/servicios porque prueban el controlador y las validaciones; el test de acceso ajeno necesita la base REAL porque la regla que comprueba ("solo el participante") la aplica la consulta a la BBDD.
  - **Base de datos separada:** las pruebas de integración crean y borran datos; por eso usan `trivia_test` en local y jamás la base de prácticas. El `.env.test` es distinto del `.env` y no se sube a Git.
  - **`--env-file` (sin `if-exists`) en el script de integración:** si faltara el `.env.test`, Node falla en vez de caer al `.env` de desarrollo y escribir en la base equivocada.
  - **Un test que vale es un test que falla cuando debe:** la prueba de acceso ajeno se validó eliminando temporalmente la comprobación de participante y viendo que se rompe.

- **Pruebas y resultados:**
  - `npm run typecheck` y `npm run build`: sin errores.
  - `npm test`: **56 tests en 6 archivos** (los de mocks, sin tocar la base de datos).
  - `npm run test:integration`: **3 tests en 1 archivo** contra `trivia_test`.
  - Pruebas manuales con la app levantada (contra `trivia_test`, con curl):
    1. Dos usuarios registrados y logueados; A crea una partida → 201 `ACTIVE`.
    2. `GET /api/me/games` de A → 200 con **1** partida; el de B → 200 con **0** (historiales separados).
    3. B pide la partida de A → **403**; A pide la suya → 200.
    4. El historial solo trae `id, status, createdAt, finishedAt, score`; el detalle no trae `solution` ni `passwordHash`, y sí `answered`.
    5. **Reinicio del backend**: se para el servidor, se vuelve a arrancar y la partida sigue accesible con el mismo token → 200 (`score`, `nextQuestionId` intactos).
    6. **Continuar la partida**: responder la pregunta de turno → 200 `isCorrect: true, score: 1`; el `GET` pasa de `score 0 / nextQuestionId 6` a `score 1 / nextQuestionId 7`.
  - Pruebas de seguridad (12 comprobaciones con curl contra el servidor):
    1. Sin token → 401; token inválido → 401.
    2. Token firmado con **otro secreto** → 401 `INVALID_TOKEN`; token con algoritmo **`none`** → 401 `INVALID_TOKEN`.
    3. `GET` de partida ajena → 403 y `POST .../answers` en partida ajena → 403.
    4. IDs maliciosos (`-1`, `abc`, `99999999999999999999`, `1.5`, `0`) → 400 en todos los casos (ningún 500).
    5. Registro enviando `"role":"ADMIN"` → 400 (el `.strict()` de zod lo rechaza).
    6. Ninguna respuesta contiene `passwordHash`, `password` ni `solution`.
  - Comprobación de que el test sirve: al comentar el `if (!esParticipante)` del controlador, **la prueba de integración falla** (`expected 200 to be 403`); restaurado el código, vuelve a pasar.

- **Error y solución:**
  - Al mover los tests de `src/` a `tests/` no bastó con cambiar los `import`: los `vi.mock("../...")` también llevan ruta relativa, y si no coincide con la del import el mock no se aplica (`vi.mocked(...).mockResolvedValue is not a function`). Corregidas todas las rutas de `vi.mock` a `../../src/...`.
  - Un test de rutas comparaba la respuesta del detalle con `toEqual` (exacta) y se rompió al añadir `createdAt`/`finishedAt`/`answered`: era el propio test avisando de que el contrato cambió. Se actualizó la expectativa (no se debilitó) y se añadió un caso con pregunta pendiente (`answered: false`).
  - `vitest.config.ts` tenía `include: ["tests/**/*.test.ts"]`, que arrastraba también los tests de integración: `npm test` tardaba 8s y se conectaba a la base de datos. Solucionado excluyendo `tests/integration/**`; cada comando hace solo lo suyo.
  - Al probar con curl desde PowerShell, el body JSON llegaba mal y la API devolvía `INVALID_JSON`: las comillas simples de PowerShell no se transmiten bien a `curl.exe`. Se resolvió escribiendo el cuerpo en un fichero y usando `--data-binary "@fichero.json"`.
  - En Windows `psql` no está en el PATH (`CommandNotFoundException`); hubo que usar la ruta completa `"C:\Program Files\PostgreSQL\18\bin\psql.exe"`, y queda anotado en el README.

- **Dudas:**
  - **¿Por qué el historial no puede llevar un `userId` en la URL?** Porque sería trivial pedir el de otro cambiando el número. El id sale de la sesión validada, que es la única fuente de verdad.
  - **¿Por qué no guardar `score` en la tabla `Game`?** Porque es el recuento de respuestas correctas y recalcularlo desde la base garantiza que siempre coincide; si se guardara, podría desincronizarse.
  - **¿Qué diferencia hay entre `answered` y `nextQuestionId`?** `nextQuestionId` es la primera pregunta sin responder (la de turno); `answered` dice, pregunta a pregunta, cuáles ya están hechas, para que el cliente pueda pintar el progreso.
  - **¿Por qué el test de integración no puede usar mocks?** Porque lo que comprueba es que la consulta real a la base respeta el participante; con mocks estaría comprobando mi propia simulación, no el comportamiento del sistema.
  - **¿Por qué no se usa la base de prácticas para las pruebas?** Porque las pruebas crean y borran datos; hacerlo sobre la base real las ensuciaría y podría borrar información de la entrega.

- **PR y correcciones:**
  - Rama `reto/14-historial`; PR hacia `develop` sin hacer merge.
  - La rama incluye, además del reto, la refactorización progresiva autorizada por el tutor (middlewares, schemas OpenAPI por grupos, tipos de partidas, controladores y servicios por ficheros con barrels, y tests movidos a `tests/`), hecha paso a paso con verificación entre pasos.

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
