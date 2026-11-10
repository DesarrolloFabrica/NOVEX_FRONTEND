/**
 * Destino post-login pendiente (p. ej. restaurar la ruta tras caducidad).
 * Solo memoria de pestaña; no persiste secretos.
 */

export interface PostLoginDestination {
  path: string
  /** Si está definido, solo se restaura cuando el usuario autenticado coincide. */
  userId: string | null
}

let pendingDestination: PostLoginDestination | null = null

export function setPostLoginDestination(
  destination: PostLoginDestination | null,
): void {
  pendingDestination = destination
}

/**
 * Consume el destino si es aplicable al usuario actual.
 * Descarta destinos de otro usuario.
 */
export function takePostLoginDestination(
  currentUserId: string | undefined,
): string | null {
  const value = pendingDestination
  pendingDestination = null
  if (!value) return null
  if (value.userId && value.userId !== currentUserId) return null
  return value.path
}
