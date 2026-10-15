import {Router} from "express";
import { registerController } from "../controllers/auth.controller.js";

//Router agrupado bajo
export const authRouter = Router();

//Crea una cuenta
authRouter.post("/register", registerController);
