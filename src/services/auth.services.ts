import argon2 from "argon2";

import {Prisma} from "@prisma/client"
import {prisma} from "../lib/prisma.js"

/* Creamos un usuario nuevo a partir de un email y una cointraseña*/ 
export async function registerUser(email: string, password: string){
  const passwordHash =await argon2.hash(password);

  try{
    const user = await prisma.user.create({
      data:{
        email,
        passwordHash,
      },
      select:{
        id:true,
        email:true,
      },
    });
    return user;
  }catch(error) {
     /* La restricción P2002, es una restricción única en BD
     cubre que al pedir 2 registros a la vez, haya duplicados 2 emails,
     servicio lo lo comprueba antes pero la BBDD lo rechaza */
     if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"){
      return null;
     }
     throw error;// hace qu ecualquier otro erro suba como 500
  }


}