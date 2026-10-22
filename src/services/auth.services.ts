import argon2 from "argon2";

import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/* Creamos un usuario nuevo a partir de un email y una contraseña. */
export async function registerUser(email: string, password: string) {
  const passwordHash = await argon2.hash(password);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
      },
    });
    return user;
  } catch (error) {
    /* La restricción P2002, es una restricción única en BD
     cubre que al pedir 2 registros a la vez, haya duplicados 2 emails,
     el servicio lo comprueba antes, pero la BBDD lo rechaza */
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }
    throw error; // hace que cualquier otro error suba como 500
  }
}

/* Función que busca el email y verifica la contraseña contra el hash, 
si la contraseña es incorrecta o el email no existe, devolvemos null; nunca el hash */

// Esta función busca al usuario y comprueba que la contraseña es correcta.
export async function loginUser(email: string, password: string) {
  // Buscamos el usuario por email en la BBDD
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Si el email no existe, no podemos iniciar sesión.
  if (!user) {
    return null;
  }

  // Comprobamos la contraseña recibida con el hash guardado.
  const passwordIsValid = await argon2.verify(user.passwordHash, password);

  // Si la contraseña no coincide, rechazamos el inicio de sesión.
  if (!passwordIsValid) {
    return null;
  }

  // Si los datos son válidos, devolvemos solo los datos públicos, nunca el hash.
  return {
    id: user.id,
    email: user.email,
  };
}

/* Devuelve los datos públicos de un usuario por su id, o null si ya no existe.
   Se usa en GET /api/me: la consulta a la base vive aquí, no en el controlador. */
export async function getPublicUserById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
}
