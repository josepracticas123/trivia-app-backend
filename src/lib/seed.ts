import "dotenv/config";
import { prisma } from "./prisma.js";

const categories = ["Geografía", "Matemáticas", "Ciencia", "Historia"];

const questions = [
  {
    statement: "¿Cuál es la capital de España?",
    categoryName: "Geografía",
    options: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
    solution: 0,
  },
  {
    statement: "¿Cuánto es 2 + 2?",
    categoryName: "Matemáticas",
    options: ["3", "4", "5", "6"],
    solution: 1,
  },
  {
    statement: "¿Qué planeta es conocido como el planeta rojo?",
    categoryName: "Ciencia",
    options: ["Venus", "Marte", "Júpiter", "Saturno"],
    solution: 1,
  },
  {
    statement: "¿Cuál es el océano más grande del mundo?",
    categoryName: "Geografía",
    options: ["Atlántico", "Índico", "Pacífico", "Ártico"],
    solution: 2,
  },
  {
    statement: "¿Cuántos continentes hay en la Tierra?",
    categoryName: "Geografía",
    options: ["5", "6", "7", "8"],
    solution: 2,
  },
  {
    statement: "¿En qué año llegó el ser humano a la Luna?",
    categoryName: "Historia",
    options: ["1959", "1969", "1979", "1989"],
    solution: 1,
  },
];

// Funcion asincrona
async function main() {
  //Crearemos la categoría si todavía no existe.
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Recorremos todas las preguntas que hay en el array de questions
  for (const question of questions) {
    // Comprobamos que si ya existen, las preguntas y esperamos la respuesta
    const existingQuestion = await prisma.question.findFirst({
      // buscamos la fregunta con findFirst.
      where: {
        statement: question.statement,
      },
    });
    // Si existe la pregunta entra en la pregunta
    if (existingQuestion) {
      console.log(`Ya existe: ${question.statement}`);
      continue;
    }
    
    const category = await prisma.category.findUnique({
      where: {name: question.categoryName},

    });

    if(!category){
      throw new Error(`No se encontró la categoría: ${question.categoryName}`);
    }

    await prisma.question.create({
      data:{
        statement: question.statement,
        category:{
          connect:{id:category.id},
        },
        choices:{
          create: question.options.map((text, position) => ({
            text,
            position,
            isCorrect: position === question.solution,
          })),
        },
      },
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
