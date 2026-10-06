import "dotenv/config";

import { prisma } from "./prisma.js";

const questions = [
  {
    statement: "¿Cuál es la capital de España?",
    options: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
    solution: "Madrid",
  },
  {
    statement: "¿Cuánto es 2 + 2?",
    options: ["3", "4", "5", "6"],
    solution: "4",
  },
  {
    statement: "¿Qué planeta es conocido como el planeta rojo?",
    options: ["Venus", "Marte", "Júpiter", "Saturno"],
    solution: "Marte",
  },
  {
    statement: "¿Cuál es el océano más grande del mundo?",
    options: ["Atlántico", "Índico", "Pacífico", "Ártico"],
    solution: "Pacífico",
  },
  {
    statement: "¿Cuántos continentes hay en la Tierra?",
    options: ["5", "6", "7", "8"],
    solution: "7",
  },
];

async function main() {
  for (const question of questions) {
    const existingQuestion = await prisma.question.findFirst({
      where: {
        statement: question.statement,
      },
    });

    if (existingQuestion) {
      console.log(`Ya existe: ${question.statement}`);
      continue;
    }

    await prisma.question.create({
      data: question,
    });

    console.log(`Creada: ${question.statement}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
