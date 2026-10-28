/* Barrel de los controladores de autenticación de TriviaApp.
   Este archivo reexporta cada controlador desde su fichero correspondiente,
   para que las rutas importen desde un solo lugar.
   Flujo: registerController (registro) → loginController (inicio de sesión) → meController (usuario actual). */
export { registerController } from "./auth.register.js";
export { loginController } from "./auth.login.js";
export { meController } from "./auth.me.js";
