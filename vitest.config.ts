import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Los tests de integración usan BBDD real y van aparte:
    // se ejecutan con npm run test:integration, no con npm test.
    exclude: ["dist/**", "node_modules/**", "tests/integration/**"],
  },
});