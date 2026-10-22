// Barrel de los controladores de autenticación: reexporta cada controlador
// desde su fichero para que las rutas sigan importando desde aquí.
export { registerController } from "./auth.register.js";
export { loginController } from "./auth.login.js";
export { meController } from "./auth.me.js";
