// Capa: utilidades compartidas.
// Responsabilidad: normalizar errores desconocidos a un mensaje legible.
// Evita repetir el patrón "error instanceof Error ? ..." en cada capa async.

export function getErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado.',
): string {
  return error instanceof Error ? error.message : fallback
}
