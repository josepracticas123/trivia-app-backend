// Router para rutas de autenticación (registro e inicio de sesión).
// Agrupa todas las rutas relacionadas con la cuenta de usuario bajo /api/auth.
// Datos: Entran con email/contraseña, salen con token JWT o mensajes de error.
import { Router } from "express";
// Importamos los controladores de registro e inicio de sesión.
import {
  registerController,
  loginController,
} from "../controllers/auth.controller.js";

// Router agrupado bajo /api/auth
export const authRouter = Router();

// Crea una cuenta
// Recibe datos de registro (email, password), valida y crea el usuario.
// Devuelve 201 con el id y email, o 409 si el email ya existe.
authRouter.post("/register", registerController);

// Permite iniciar sesión con email y contraseña.
// Valida credenciales, genera token JWT y devuelve datos del usuario.
// Devuelve 200 con token, o 401 si las credenciales son inválidas.
authRouter.post("/login", loginController);
