import { app } from "./app.js";

// Las variables de entorno son texto: convertimos PORT antes de usarlo.
const port = Number(process.env.PORT ?? 3000);

// Validamos que el puerto sea un número entero dentro del rango permitido.
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT debe ser un número entero entre 1 y 65535");
}

app.listen(port, "0.0.0.0", () => {
  console.log(`TriviaApp Backend disponible en http://localhost:${port}`);
});
