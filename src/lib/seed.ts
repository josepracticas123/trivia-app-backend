import "dotenv/config";

import { prisma } from "./prisma.js";

const questions = [
  {
    statement: "¿Cuál es la capital de España?",
    options: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
    solution: 0,
  },
  {
    statement: "¿Cuánto es 2 + 2?",
    options: ["3", "4", "5", "6"],
    solution: 1,
  },
  {
    statement: "¿Qué planeta es conocido como el planeta rojo?",
    options: ["Venus", "Marte", "Júpiter", "Saturno"],
    solution: 1,
  },
  {
    statement: "¿Cuál es el océano más grande del mundo?",
    options: ["Atlántico", "Índico", "Pacífico", "Ártico"],
    solution: 2,
  },
  {
    statement: "¿Cuántos continentes hay en la Tierra?",
    options: ["5", "6", "7", "8"],
    solution: 2,
  },
];

// Funcion asincrona
async function main() {

  // recorremos todas la spreguntas qu ehay en el array de questions
  for (const question of questions) {

    // Comprobamos que si ya existen
    const existingQuestion = await prisma.question.findFirst({
      where: {
        statement: question.statement,
      },
    });
     // Si existe la pregunta entra en la pregunta
    if (existingQuestion) {
      console.log(`Ya existe: ${question.statement}`);
      continue;
    }
  // Si salta el if, inserta una nueva pregunta utiliazndo los datos de question.
    await prisma.question.create({
      data: question,
    });

    console.log(`Creada: ${question.statement}`);
  }
}

//Capturamos los errores.
main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })

  // Se ejecuta tanto si ha ido bien como si hay un error, y se desconecta con la bbdd.
  .finally(async () => {
    await prisma.$disconnect();
  });
