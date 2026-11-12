/**
 * Aviso de sesión inválida/caducada.
 *
 * Sobrevive al clear del token para poder informar en `/login` y, si el mismo
 * usuario vuelve a autenticarse, restaurar la ruta de trabajo. No guarda
 * secretos ni el access token.
 */

export type SessionExpiryReason = 'expired' | 'unauthorized'

export interface SessionExpiryNotice {
  reason: SessionExpiryReason
  message: string
  returnPath: string | null
  userId: string | null
}

const NOTICE_KEY = 'novex.auth.sessionExpiry.v1'

export const SESSION_EXPIRED_MESSAGE =
  'Su sesión caducó. Vuelva a autenticarse para continuar; conservamos temporalmente lo que estaba escribiendo.'

export const SESSION_UNAUTHORIZED_MESSAGE =
  'Su sesión ya no es válida. Vuelva a autenticarse para continuar.'

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

function isNotice(value: unknown): value is SessionExpiryNotice {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SessionExpiryNotice>
  return (
    (candidate.reason === 'expired' || candidate.reason === 'unauthorized') &&
    typeof candidate.message === 'string' &&
    (candidate.returnPath === null || typeof candidate.returnPath === 'string') &&
    (candidate.userId === null || typeof candidate.userId === 'string')
  )
}

export function writeSessionExpiryNotice(notice: SessionExpiryNotice): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(NOTICE_KEY, JSON.stringify(notice))
  } catch {
    // Cuota / modo privado: el aviso solo vive en esta visita.
  }
}

export function readSessionExpiryNotice(): SessionExpiryNotice | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(NOTICE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isNotice(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Lee y elimina el aviso (una sola vez en la pantalla de login). */
export function consumeSessionExpiryNotice(): SessionExpiryNotice | null {
  const notice = readSessionExpiryNotice()
  clearSessionExpiryNotice()
  return notice
}

export function clearSessionExpiryNotice(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(NOTICE_KEY)
  } catch {
    // Ignorar.
  }
}

export function markSessionExpired(input: {
  reason?: SessionExpiryReason
  returnPath?: string | null
  userId?: string | null
}): void {
  const reason = input.reason ?? 'expired'
  writeSessionExpiryNotice({
    reason,
    message:
      reason === 'unauthorized'
        ? SESSION_UNAUTHORIZED_MESSAGE
        : SESSION_EXPIRED_MESSAGE,
    returnPath: input.returnPath ?? null,
    userId: input.userId ?? null,
  })
}

/** Ruta segura de retorno (solo paths internos de la app). */
export function sanitizeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (trimmed.startsWith('/login')) return null
  return trimmed
}
