// Permite comprobar si un archivo existe antes de utilizarlo.
import fs from "node:fs";
// Permite obtener la ruta real de un archivo a partir de este módulo.
import { fileURLToPath } from "node:url";
// Librería que genera el documento OpenAPI a partir de los comentarios @openapi.
import swaggerJSDoc from "swagger-jsdoc";
// Los esquemas reutilizables viven en la carpeta schemas/.
import { swaggerSchemas } from "./schemas/index.js";
// Configuración principal de OpenAPI.
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Trivia App API",
    version: "1.0.0",
    description: "Documentación de la API de Trivia App",
  },
  // Esquemas reutilizables por las diferentes rutas de la API.
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    // Los esquemas viven en schemas.ts para no engordar este archivo.
    schemas: swaggerSchemas,
  },
};

// Ruta del archivo TypeScript utilizado durante el desarrollo.
// Desde src/docs/swagger.ts subimos a src/ y buscamos app.ts.
const sourceFile = fileURLToPath(new URL("../app.ts", import.meta.url));
// Ruta del archivo JavaScript generado después de ejecutar npm run build.
// Desde dist/docs/swagger.js subimos a dist/ y buscamos app.js.
const compiledFile = fileURLToPath(new URL("../app.js", import.meta.url));
// Durante el desarrollo utilizamos app.ts.
// Después del build utilizamos app.js.
const appFile = fs.existsSync(sourceFile) ? sourceFile : compiledFile;
// Generamos el documento OpenAPI leyendo los comentarios @openapi
// que existen en app.ts durante desarrollo o app.js después del build.
export const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: [appFile],
});
