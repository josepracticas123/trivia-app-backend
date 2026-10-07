// Cargamos las variables del archivo .env
import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Ubicación de nuestro esquema de Prisma
  schema: "prisma/schema.prisma",

  // Carpeta donde Prisma guardará las migraciones
  migrations: {
    path: "prisma/migrations",
  },

  // URL de conexión a PostgreSQL
  datasource: {
    url: env("DATABASE_URL"),
  },
});