import {Router} from "express";
import {getQuestionsController,
     getQuestionByIdController,
     createQuestionController,
     updateQuestionController, 
     deleteQuestionController,    
    } from "../controllers/question.controller.js";



export const questionRouter = Router();

/*Mapeamos todas la srutas que teníamos en el archivo de app, para eliminar de 
 aquel archivo las funciones y repartirlas en los diferentes archivos de
 servicios, controlador*/
questionRouter.get("/",getQuestionsController);
questionRouter.get("/:id",getQuestionByIdController);
questionRouter.post("/",createQuestionController);
questionRouter.put("/:id", updateQuestionController);
questionRouter.delete("/:id", deleteQuestionController);