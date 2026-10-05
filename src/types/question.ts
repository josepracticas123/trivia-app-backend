//La interfaz define la forma que debe tener la pregunta, es decir, los atributos que debe tener y su tipo de dato.
export interface Pregunta{
    id: number;
    enunciado: string;
    opciones: string[];
    respuestaCorrecta: number;
}