import { defineConfig } from "vitest/config";

/* Configuración de las pruebas de INTEGRACIÓN.
   Se ejecutan con: npm run test:integration
   Usan una base de datos real (trivia_test) y por eso van aparte de
   vitest.config.ts, que solo ejecuta pruebas con mocks y sin BBDD. */
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    // Las pruebas de integración tocan la BBDD: mejor en serie,
    // sin ficheros en paralelo, para que no se pisen entre ellos.
    fileParallelism: false,
  },
});