/**
 * Ejecuta trabajo auxiliar que ocurre después de que la mutación principal
 * haya confirmado. Estos fallos no pueden cambiar la respuesta HTTP que
 * representa el estado ya persistido.
 */
export async function runPostCommitEffect<T>(
  operation: string,
  effect: () => Promise<T> | T,
): Promise<T | undefined> {
  try {
    return await effect();
  } catch (error) {
    console.error("Post-commit game effect failed", {
      operation,
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return undefined;
  }
}
