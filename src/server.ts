import { app } from "./app.js";

// El secreto es obligatorio para firmar los tokens JWT.
// Si falta, detenemos el arranque para evitar usar una configuración insegura.
if (!process.env.JWT_SECRET) {
  throw new Error(
    "Falta JWT_SECRET en las variables de entorno. Configúrala en el archivo .env.",
  );
}
//Validamos que el secreto tenga la longitud mínima (recomendado > 32 caracteres)
if(process.env.JWT_SECRET.length < 32){
  throw new Error(
        "JWT_SECRET debe tener al menos 32 caracteres. Genera uno con: node -e \"console.log(require('node:crypto').randomBytes(32).toString('hex'))\"",
  );
}
// El origen del frontend es obligatorio para configurar CORS correctamente.
if (!process.env.FRONTEND_ORIGIN) {
  throw new Error(
    "Falta FRONTEND_ORIGIN en las variables de entorno. Configúrala en el archivo .env.",
  );
}

// Las variables de entorno son texto: convertimos PORT antes de usarlo.
const port = Number(process.env.PORT ?? 3000);

// Validamos que el puerto sea un número entero dentro del rango permitido.
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT debe ser un número entero entre 1 y 65535");
}

app.listen(port, "0.0.0.0", () => {
  console.log(`TriviaApp Backend disponible en http://localhost:${port}`);
});
