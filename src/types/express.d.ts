// Permite a TypeScript conocer el campo userId que guardamos en res.locals.
// Así, si escribimos mal el nombre o le asignamos un valor que no es un
// número, el compilador avisará sin necesidad de any ni casts.
export {};

declare global {
  namespace Express {
    interface Locals {
      userId: number;
    }
  }
}