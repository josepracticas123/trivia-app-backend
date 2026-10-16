import { Router } from "express";
// Importamos los controladores de registro e inicio de sesión.
import {
  registerController,
  loginController,
} from "../controllers/auth.controller.js";
//Router agrupado bajo
export const authRouter = Router();

//Crea una cuenta
authRouter.post("/register", registerController);

// Permite iniciar sesión con email y contraseña.
authRouter.post("/login", loginController);
