const ACCESS_TOKEN_KEY = 'cunmark.auth.accessToken.v1'

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readAccessToken(): string | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const token = storage.getItem(ACCESS_TOKEN_KEY)
    return token && token.length > 0 ? token : null
  } catch {
    return null
  }
}

export function writeAccessToken(token: string): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(ACCESS_TOKEN_KEY, token)
  } catch {
    // Ignorar cuotas/privacidad del navegador.
  }
}

export function clearAccessToken(): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    // Ignorar.
  }
}
