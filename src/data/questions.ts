//Usando type traemos una interfaz de otro archivo, en este caso Pregunta.
import type { Pregunta } from "../types/question.js";
//Array de preguntas
export const preguntas: Pregunta[] = [
    {
        id: 1,
        enunciado: "¿Cuál es la capital de Francia?",
        opciones: ["Londres", "Berlín", "París", "Roma"],
        respuestaCorrecta: 2
    },
    {
        id: 2,
        enunciado: "¿Cuál es el planeta más cercano al Sol?",
        opciones: ["Venus", "Mercurio", "Marte", "Júpiter"],
        respuestaCorrecta: 1
    },
    {
        id: 3,
        enunciado: "¿Cuánto es 5 × 6?",
        opciones: ["25", "30", "35", "40"],
        respuestaCorrecta: 1
    },
    {
        id: 4,
        enunciado: "¿Quién escribió Don Quijote de la Mancha?",
        opciones: ["Miguel de Cervantes", "Federico García Lorca", "Pablo Neruda", "Gabriel García Márquez"],
        respuestaCorrecta: 0
    },
    {
        id: 5,
        enunciado: "¿Cuál es el océano más grande del mundo?",
        opciones: ["Atlántico", "Índico", "Pacífico", "Ártico"],
        respuestaCorrecta: 2
    }

];