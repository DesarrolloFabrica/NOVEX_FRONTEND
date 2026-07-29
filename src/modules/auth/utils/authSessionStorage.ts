// Persistencia local de la sesión demo.
// Evita perder el login ante recargas de Vite/HMR o F5.

import type { User } from '@/modules/auth/types/user.types'

const AUTH_SESSION_KEY = 'novex.auth.session.v1'
/** Claves legacy del rebrand Omega → Cunmark -> NOVEX. */
const LEGACY_AUTH_SESSION_KEYS = [
  'cunmark.auth.session.v1',
  'omega.auth.session.v1',
] as const

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<User>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    (candidate.role === 'supervisor' || candidate.role === 'ejecutor') &&
    typeof candidate.onboardingCompleted === 'boolean'
  )
}

function parseUser(raw: string | null): User | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

function clearLegacyAuthSessions(storage: Storage): void {
  for (const key of LEGACY_AUTH_SESSION_KEYS) {
    storage.removeItem(key)
  }
}

export function readAuthSession(): User | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const current = parseUser(storage.getItem(AUTH_SESSION_KEY))
    if (current) return current

    for (const legacyKey of LEGACY_AUTH_SESSION_KEYS) {
      const legacy = parseUser(storage.getItem(legacyKey))
      if (!legacy) continue

      // Migración one-shot: reescribe en la clave nueva y limpia las legacy.
      storage.setItem(AUTH_SESSION_KEY, JSON.stringify(legacy))
      clearLegacyAuthSessions(storage)
      return legacy
    }

    return null
  } catch {
    return null
  }
}

export function writeAuthSession(user: User): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(AUTH_SESSION_KEY, JSON.stringify(user))
    clearLegacyAuthSessions(storage)
  } catch {
    // Ignorar cuotas/privacidad del navegador.
  }
}

export function clearAuthSession(): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(AUTH_SESSION_KEY)
    clearLegacyAuthSessions(storage)
  } catch {
    // Ignorar.
  }
}
