/* Punto de unión de los esquemas OpenAPI (components.schemas).
   Cada grupo vive en su archivo y aquí se juntan en un solo objeto:
   swagger.ts importa este índice y no sabe que hay varios archivos. */
import { authSchemas } from "./auth.js";
import { questionSchemas } from "./questions.js";
import { gameSchemas } from "./games.js";
import { errorSchemas } from "./errors.js";

export const swaggerSchemas = {
  ...authSchemas,
  ...questionSchemas,
  ...gameSchemas,
  ...errorSchemas,
};
