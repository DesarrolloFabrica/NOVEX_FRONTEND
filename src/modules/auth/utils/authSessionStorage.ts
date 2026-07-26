// Persistencia local de la sesión demo.
// Evita perder el login ante recargas de Vite/HMR o F5.

import type { User } from '@/modules/auth/types/user.types'

const AUTH_SESSION_KEY = 'omega.auth.session.v1'

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

export function readAuthSession(): User | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeAuthSession(user: User): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(AUTH_SESSION_KEY, JSON.stringify(user))
  } catch {
    // Ignorar cuotas/privacidad del navegador.
  }
}

export function clearAuthSession(): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(AUTH_SESSION_KEY)
  } catch {
    // Ignorar.
  }
}
