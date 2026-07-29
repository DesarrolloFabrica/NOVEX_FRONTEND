const ACCESS_TOKEN_KEY = 'novex.auth.accessToken.v1'
/** Claves legacy del rebrand Cunmark -> NOVEX. */
const LEGACY_ACCESS_TOKEN_KEYS = ['cunmark.auth.accessToken.v1'] as const

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function clearLegacyAccessTokens(storage: Storage): void {
  for (const key of LEGACY_ACCESS_TOKEN_KEYS) {
    storage.removeItem(key)
  }
}

export function readAccessToken(): string | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const token = storage.getItem(ACCESS_TOKEN_KEY)
    if (token && token.length > 0) return token

    for (const legacyKey of LEGACY_ACCESS_TOKEN_KEYS) {
      const legacy = storage.getItem(legacyKey)
      if (!legacy || legacy.length === 0) continue

      storage.setItem(ACCESS_TOKEN_KEY, legacy)
      clearLegacyAccessTokens(storage)
      return legacy
    }

    return null
  } catch {
    return null
  }
}

export function writeAccessToken(token: string): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(ACCESS_TOKEN_KEY, token)
    clearLegacyAccessTokens(storage)
  } catch {
    // Ignorar cuotas/privacidad del navegador.
  }
}

export function clearAccessToken(): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(ACCESS_TOKEN_KEY)
    clearLegacyAccessTokens(storage)
  } catch {
    // Ignorar.
  }
}
