// Importamos PrismaClient, el cliente generado por Prisma.
// Nos permitirá interactuar con nuestra base de datos desde TypeScript.
import { PrismaClient } from "@prisma/client";

// Importamos el adaptador que permite a Prisma comunicarse
// con PostgreSQL utilizando el driver "pg".
import { PrismaPg } from "@prisma/adapter-pg";

// Obtenemos la URL de conexión desde una variable de entorno.
// La URL real está en el archivo .env y no la escribimos aquí.
const connectionString = process.env.DATABASE_URL;

// Si DATABASE_URL no existe, detenemos la aplicación.
// Así evitamos intentar conectarnos a PostgreSQL sin configuración.
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida");
}

// Creamos el adaptador de PostgreSQL utilizando nuestra URL de conexión.
const adapter = new PrismaPg({
  connectionString,

});

// Creamos una instancia de PrismaClient.
// Este será nuestro cliente para trabajar con PostgreSQL.
export const prisma = new PrismaClient({
  adapter,
});