const FIRST_SITUATION_KEY = 'novex.onboarding.first-situation.v1'

function keyFor(userId: string): string {
  return `${FIRST_SITUATION_KEY}.${userId}`
}

export function rememberOnboardingSituation(
  userId: string | undefined,
  situationId: string,
): void {
  if (!userId) return
  try {
    localStorage.setItem(keyFor(userId), situationId)
  } catch {
    // La navegación inmediata conserva el query aunque el storage no exista.
  }
}

export function readOnboardingSituation(
  userId: string | undefined,
): string | null {
  if (!userId) return null
  try {
    return localStorage.getItem(keyFor(userId))
  } catch {
    return null
  }
}

export function clearOnboardingSituation(userId: string | undefined): void {
  if (!userId) return
  try {
    localStorage.removeItem(keyFor(userId))
  } catch {
    // Sin storage el wizard sigue funcionando en memoria.
  }
}
