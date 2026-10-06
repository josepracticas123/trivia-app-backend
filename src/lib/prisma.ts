// Importamos PrismaClient, el cliente generado por Prisma.
import { PrismaClient } from "@prisma/client";
// Importamos el adaptador que permite a Prisma comunicarse con PostgreSQL utilizando el driver "pg".
import { PrismaPg } from "@prisma/adapter-pg";

// Obtenemos la URL de conexión desde una variable de entorno osea la URL de postgre sql.
// La URL real está en el archivo .env y no la escribimos aquí.
const connectionString = process.env.DATABASE_URL;

// Si DATABASE_URL no existe, detenemos la aplicación.
// Así evitamos intentar conectarnos a PostgreSQL sin configuración.
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida");
}

// Creamos el adaptador de PostgreSQL utilizando nuestra URL de conexión.
// Es el adaptador qu econecta ese cliente con postgresql mediante el driver de pg
const adapter = new PrismaPg({
  connectionString,

});

// Creamos una instancia de PrismaClient.
// Este será nuestro cliente para trabajar con PostgreSQL.
//realiza  u ofrece las consultas
export const prisma = new PrismaClient({
  adapter,
});