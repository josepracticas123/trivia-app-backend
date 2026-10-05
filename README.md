# TriviaApp Backend · Aprende backend por retos

Vas a construir una API de preguntas con TypeScript. Empezarás con rutas y datos en memoria; terminarás con usuarios, PostgreSQL, Swagger y partidas para dos jugadores, conectadas a un frontend publicado.

La base está preparada, pero los retos los implementas tú. Trabaja un bloque cada vez, compruébalo y explica lo aprendido. El objetivo es entender lo que construyes, no copiar una aplicación completa.

## Qué vas a construir

- Una API HTTP para consultar y gestionar preguntas con cuatro opciones y una única respuesta correcta.
- Registro y login con email y contraseña; JWT para identificar al usuario y permisos para proteger acciones.
- Partidas individuales y un historial propio persistente.
- Partidas de dos jugadores con código de invitación y cinco preguntas compartidas: responde primero el jugador 1 y después el 2 en cada pregunta, un punto por acierto y ganador o empate al final. La solución se revela solo cuando ambos han respondido esa pregunta.
- Swagger para probar las rutas HTTP y Socket.IO para avisos en tiempo real.
- Backend y PostgreSQL en Railway, frontend React + Vite en otro repo y publicado en Vercel.

Primero funcionará todo por HTTP. Después los sockets avisarán de los cambios. El servidor decide turnos y puntos; PostgreSQL guarda el estado. La primera entrega usa una instancia del backend y no necesita Redis ni varios servidores.

## Herramientas y cuándo aparecen

| Herramienta | Para qué sirve | Cuándo |
| --- | --- | --- |
| Node 24 LTS, npm | Ejecutar el backend e instalar paquetes | Base |
| Express 5 | Rutas, peticiones y respuestas | Base |
| TypeScript y tipos de Node/Express | Detectar errores de tipos | Base |
| tsx | Ejecutar TypeScript y reiniciar al guardar | Base |
| Zod | Validar datos recibidos | 04 |
| swagger-jsdoc, swagger-ui-express | OpenAPI y página para probar la API | 05 |
| PostgreSQL en Railway, Prisma y adaptador compatible | Persistencia, consultas y migraciones | 06 |
| argon2 | Hash de contraseñas | 10 |
| jsonwebtoken | Firmar y verificar JWT | 11 |
| cors | Permitir llamadas desde el frontend en el navegador | 15 |
| Socket.IO | Avisar a los participantes de cambios | 18 |
| React, Vite, socket.io-client | Frontend en su repositorio | 20 |

Añade cada dependencia cuando su reto la necesite y guarda los cambios de `package.json` y `package-lock.json`. No necesitas `npm init`, un generador, Prisma ni una DB para empezar el reto 01.

Desde el reto 06, PostgreSQL se ejecutará en Railway en una DB exclusiva para desarrollo y prácticas. En tu PC ejecutarás Node, Prisma y el backend, conectados a la DB por Internet.

## Primeros pasos

Abre la raíz de este repositorio: la carpeta que contiene este README y `package.json`.

```bash
node --version
npm --version
git status
```

Usa Node **24 LTS** (la versión está indicada en `.nvmrc`). Si utilizas nvm, ejecuta `nvm install` y `nvm use`; si no, instala esa versión por tu método habitual. No necesitas instalar nvm para hacer el proyecto.

En un clon nuevo:

```bash
npm ci
cp .env.example .env
npm run dev
```

Abre <http://localhost:3000/>. Verás un JSON de bienvenida. El servidor se detiene con `Ctrl+C`. `.env` contiene la configuración local; está ignorado por Git. `.env.example` es la referencia compartida y no debe contener secretos reales.

La base **no tiene `/health` todavía**: lo añades en el reto 01. El puerto por defecto es 3000; al cambiar `.env`, reinicia el proceso. No compartas ni subas contraseñas, tokens o archivos `.env`.

### Comandos de la base

| Comando | Qué hace |
| --- | --- |
| `npm ci` | Instala las versiones exactas del lockfile en un clon limpio |
| `npm install paquete` | Añade una dependencia cuando toca; actualiza ambos archivos de paquetes |
| `npm install -D paquete` | Añade una herramienta usada para desarrollar |
| `npm run dev` | Ejecuta TypeScript con tsx, carga `.env` si existe y reinicia al guardar |
| `npm run typecheck` | Comprueba tipos sin generar archivos |
| `npm run build` | Comprueba y compila `src/` a `dist/` |
| `npm start` | Ejecuta `dist/server.js`; necesita una compilación previa |

`tsx` ejecuta el código, pero no sustituye la comprobación de tipos. No hay `lint`, `test` ni scripts de DB todavía: se incorporarán cuando exista una herramienta y una comprobación real detrás. Antes de entregar, ejecuta siempre `typecheck` y `build` y las pruebas que ya se hayan incorporado.

## Estructura y responsabilidades

```text
TriviaApp_Backend/
├── README.md
├── APRENDIZAJE.md
├── retos/                  # Enunciados, checks y revisión
├── docs/                   # Eventos y despliegue cuando aparezcan
├── prisma/                 # Esquema, migraciones y seed desde el reto 06
├── tests/                  # Pruebas importantes cuando se incorporen
├── .github/                # Plantilla de pull request
├── .env.example
├── package.json
├── package-lock.json
├── tsconfig.json
└── src/
    ├── app.ts              # Configuración y montaje de Express
    ├── server.ts           # Abre el puerto; luego compartirá servidor con sockets
    ├── routes/             # Métodos, URLs y middleware de cada ruta
    ├── controllers/        # Entrada y salida HTTP
    ├── services/           # Reglas de negocio y consultas
    ├── middlewares/        # Auth, permisos y errores
    ├── schemas/            # Validaciones de datos recibidos
    ├── types/              # Tipos e interfaces propios
    ├── data/               # Datos en memoria de los primeros retos
    ├── lib/                # Cliente Prisma y configuración compartida
    ├── docs/               # Configuración OpenAPI/Swagger
    └── sockets/            # Conexión, autorización y eventos desde el reto 18
```

Las carpetas pendientes de implementar contienen un `index.ts` mínimo: puedes completarlo o sustituirlo por los archivos del reto correspondiente. No tienes que rellenarlas todas ahora. En los primeros retos puedes trabajar las rutas en `app.ts`; el reto 08 te pide separar responsabilidades con código que ya entiendes.

Usa funciones e interfaces sencillas y aprovecha los tipos inferidos. `strict` está activado para ayudarte. Si un tipo falla, investiga el motivo; no lo ocultes con `any`, `@ts-ignore` ni cambiando las reglas. En ESM, los imports locales llevan `.js` aunque escribas archivos `.ts`: TypeScript los resuelve y el JavaScript compilado conserva imports válidos para Node.

## Cómo trabajamos los retos

1. Confirma que el reto anterior fue aprobado e integrado en `develop`.
2. Lee misión, bloques y checks antes de escribir código. Define dos o tres pasos pequeños.
3. Crea la rama del reto desde `develop` actualizado.
4. Implementa un bloque y compruébalo antes de continuar.
5. Usa las pistas cuando las necesites; lee el apartado enlazado de documentación, no toda la documentación.
6. Marca un check solo después de probarlo. Anota una prueba válida y una inválida con petición, estado HTTP y resultado.
7. Escribe en `APRENDIZAJE.md` lo que has entendido y tus dudas. Cualquier código que incorpores debes poder explicarlo y modificarlo.
8. Ejecuta las comprobaciones, revisa el diff, sube tu rama y abre el PR hacia `develop`.
9. Déjalo abierto para el tutor. Atiende sus correcciones en esa misma rama y espera al merge antes del siguiente reto.

Si llevas 20–30 minutos sin avanzar, pide ayuda indicando qué esperabas, qué ocurrió, el error exacto y lo que has probado. No es necesario terminar varios retos en un día.

## Ramas, PR y revisión

- **`main`: producción.** Recibe versiones revisadas desde `develop` mediante PR.
- **`develop`: desarrollo integrado.** Contiene los retos aprobados por el tutor.
- **`reto/NN-nombre`: trabajo de un único reto.** Nace siempre de `develop` actualizado y su PR se dirige a `develop`.

José no hace cambios directos en `main` o `develop`, no hace merge de sus PR y no empieza el siguiente reto mientras el anterior siga pendiente de revisión o integración.

```text
develop → reto/01-primer-servidor → PR abierto a develop
                                      ↓
                              revisión y correcciones
                                      ↓
                          aprobación y merge del tutor
                                      ↓
                         develop actualizado → reto/02-...

develop → PR de publicación revisado → main → producción
```

### 0. Preparación inicial · tutor

Al preparar esta documentación el repo solo tiene `main`. Primero revisa, guarda y publica esta base; después crea `develop` desde esa versión. Los comandos siguientes parten de una copia limpia con la base ya integrada:

```bash
git switch main
git pull --ff-only origin main
git switch -c develop
git push -u origin develop
```

Si `develop` ya existe, úsala; no intentes crear otra ni sobrescribirla. Configura las reglas de GitHub para exigir PR y revisión en `main` y `develop`, y limita el merge al tutor con las opciones disponibles para el repositorio. No uses force push para preparar el flujo.

### 1. Crear la rama de un reto · alumno

Comprueba primero `git status`: no debe haber cambios pendientes del reto anterior. En un clon donde `develop` aún no existe localmente, haz `git fetch origin` y `git switch --track origin/develop` una sola vez. Después:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c reto/01-primer-servidor
```

Para el siguiente reto, usa su número y nombre. Nunca crees su rama desde la del reto anterior: esperar al merge garantiza que partes de la versión revisada.

### 2. Comprobar y subir el trabajo · alumno

```bash
npm run typecheck
npm run build
git status
git diff
```

Ejecuta también las pruebas incorporadas en los retos posteriores. Selecciona solo los archivos del reto; como ejemplo para el 01:

```bash
git add src/app.ts APRENDIZAJE.md retos/01-primer-servidor.md
git diff --cached
git commit -m "reto 01: añade health y explica el arranque"
git push -u origin reto/01-primer-servidor
```

El ejemplo no obliga a modificar solo esos archivos: incluye todos los cambios necesarios de tu reto, incluido el lockfile si instalaste paquetes. Revisa siempre lo que vas a subir.

### 3. Abrir el PR · alumno

En GitHub selecciona **base: `develop`** y **compare: tu rama del reto**. Título: `Reto 01 · Primer servidor`. Completa la plantilla con lo implementado, comprobaciones y dudas. Solicita revisión al tutor.

**Deja el PR abierto y no pulses Merge.** Un PR con checks marcados está listo para revisión, no cerrado. No lo dirijas a `main`.

### 4. Corregir y aprobar

Si el tutor pide cambios, vuelve a la misma rama, corrige, comprueba, haz commit y push. El mismo PR se actualiza; no abras otro PR ni otra rama para corregir ese reto.

El tutor revisa código y demostración, aprueba y hace merge en `develop`. Si hay conflictos, pide ayuda y resuélvelos conservando los cambios revisados; no reescribas el historial con force push.

### 5. Empezar el siguiente reto

Cuando el tutor confirme que el PR está integrado:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c reto/02-listar-preguntas
```

El tutor confirma el cierre en el registro de revisión y el índice. No hace falta inventar una fecha o marcar un merge antes de que ocurra.

### 6. Publicar una versión · tutor

Al llegar al despliegue, abre un PR de **`develop` hacia `main`**, revisa migraciones y configuración y haz merge tras las comprobaciones. Producción se despliega desde `main`; el alumno continúa trabajando desde `develop`.

El frontend tendrá el mismo flujo en su propio repositorio. En el reto 20 se revisarán los dos PR antes de avanzar.

## Índice de retos

Todos parten como pendientes. **Implementado** significa que el alumno completó su autoevaluación; **pendiente de revisión** significa que el PR está abierto; **cerrado** requiere aprobación e integración del tutor.

| Nº | Reto | Estado |
| --- | --- | --- |
| 01 | [Arranca tu backend](retos/01-primer-servidor.md) | Pendiente |
| 02 | [Devuelve preguntas](retos/02-listar-preguntas.md) | Pendiente |
| 03 | [Modifica tus datos](retos/03-crud-memoria.md) | Pendiente |
| 04 | [Valida las peticiones](retos/04-validacion-errores.md) | Pendiente |
| 05 | [Prueba las rutas en Swagger](retos/05-swagger.md) | Pendiente |
| 06 | [Prepara PostgreSQL y Prisma](retos/06-postgres-prisma.md) | Pendiente |
| 07 | [Guarda las preguntas de verdad](retos/07-crud-persistente.md) | Pendiente |
| 08 | [Organiza el backend](retos/08-rutas-controladores-servicios.md) | Pendiente |
| 09 | [Relaciona preguntas, opciones y categorías](retos/09-relaciones.md) | Pendiente |
| 10 | [Registra usuarios](retos/10-registro.md) | Pendiente |
| 11 | [Inicia sesión](retos/11-login-jwt.md) | Pendiente |
| 12 | [Protege las rutas](retos/12-autenticacion-permisos.md) | Pendiente |
| 13 | [Juega una partida individual](retos/13-partida-individual.md) | Pendiente |
| 14 | [Consulta tu historial](retos/14-historial.md) | Pendiente |
| 15 | [Prepara las consultas del frontend](retos/15-filtros-paginacion-cors.md) | Pendiente |
| 16 | [Crea una partida para dos](retos/16-sala-dos-jugadores.md) | Pendiente |
| 17 | [Juega por turnos mediante HTTP](retos/17-turnos-concurrencia.md) | Pendiente |
| 18 | [Añade avisos en tiempo real](retos/18-socket-io.md) | Pendiente |
| 19 | [Recupera una partida al reconectar](retos/19-reconexion.md) | Pendiente |
| 20 | [Conecta un frontend mínimo](retos/20-frontend.md) | Pendiente |
| 21 | [Despliega backend, DB y frontend](retos/21-despliegue.md) | Pendiente |
| 22 | [Entrega y revisión final](retos/22-entrega-final.md) | Pendiente |

## Entrega y despliegue

Antes de cada PR, los tipos y la compilación deben pasar. Swagger y las pruebas manuales no sustituyen las pruebas automatizadas de permisos y concurrencia que aparecerán después. Las comprobaciones deben indicar qué se ejecutó realmente; un check no es evidencia si no se probó.

Hasta el reto 12, el CRUD todavía no tiene permisos: úsalo solo en desarrollo local. A partir de ahí, registro y login son públicos, las consultas del catálogo son públicas, el CRUD es de ADMIN y partidas e historial exigen sesión y pertenencia.

En el reto 06 se añadirán instrucciones comprobadas para PostgreSQL en Railway, Prisma y sus versiones. Para trabajar desde el PC, el valor de `DATABASE_PUBLIC_URL` de Railway se guarda como `DATABASE_URL` en el `.env` local; las direcciones privadas `railway.internal` se usan entre servicios de Railway. En el 21 se documentarán URLs, variables, migraciones y recuperación. Desarrollo y pruebas no usarán la DB de producción. Los secretos se configuran en el alojamiento; el frontend solo recibe la URL pública de la API.

El despliegue propuesto usa Railway para backend y DB y Vercel para frontend. Revisaremos disponibilidad, costes y planes desde el reto 06 y de nuevo antes del despliegue final: no se presupone alojamiento gratuito permanente. No ejecutes un seed de práctica ni un reset contra producción.

## Fuera del alcance inicial

Emparejamiento automático, temporizadores, chat, recuperación de contraseña, refresh tokens, Redis y varias instancias son ampliaciones posteriores. Al terminar debe funcionar la trivia descrita, con permisos, recuperación y despliegue; no hace falta reproducir todas las funciones de Preguntados.

## Documentación de referencia

- [Express](https://expressjs.com/en/starter/hello-world/).
- [TypeScript](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html).
- [tsx](https://tsx.is/).
- [Prisma con PostgreSQL](https://docs.prisma.io/docs/prisma-orm/quickstart/postgresql).
- [PostgreSQL en Railway y conexión externa](https://docs.railway.com/databases/postgresql).
- [Socket.IO](https://socket.io/docs/v4/).

Empieza por [01 · Arranca tu backend](retos/01-primer-servidor.md) después de que el tutor prepare `develop`.

