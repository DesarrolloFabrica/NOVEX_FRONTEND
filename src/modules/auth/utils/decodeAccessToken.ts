export interface AccessTokenClaims {
  sub: string
  email: string
  roleId: string
  roleCode: string
  coordinationId: string | null
  permissions: string[]
  status: string
  /** Epoch en segundos (claim estándar `exp`), si el token lo trae. */
  exp: number | null
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const base64 = `${normalized}${padding}`

  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(base64)
  }

  const bufferCtor = (globalThis as { Buffer?: { from(data: string, encoding: string): { toString(enc: string): string } } }).Buffer
  if (bufferCtor) {
    return bufferCtor.from(base64, 'base64').toString('utf8')
  }

  throw new Error('No hay decodificador Base64 disponible.')
}

/** Normaliza coordinación del JWT: null, undefined o string vacío → sin asignación. */
export function normalizeTokenCoordinationId(
  value: unknown,
): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }
  return value
}

/**
 * Lee claims del access token sin validar firma (la validación ocurre en backend).
 * Usado para identidad local, caducidad (`exp`) y fallback de login fresco.
 */
export function decodeAccessTokenClaims(token: string): AccessTokenClaims | null {
  const parts = token.split('.')
  if (parts.length < 2 || !parts[1]) return null

  try {
    const json = decodeBase64Url(parts[1])
    const parsed: unknown = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null

    const candidate = parsed as Partial<AccessTokenClaims> & { exp?: unknown }
    if (
      typeof candidate.sub !== 'string' ||
      typeof candidate.email !== 'string' ||
      typeof candidate.roleId !== 'string' ||
      typeof candidate.roleCode !== 'string' ||
      !Array.isArray(candidate.permissions) ||
      typeof candidate.status !== 'string'
    ) {
      return null
    }

    const coordinationId = normalizeTokenCoordinationId(candidate.coordinationId)
    const exp =
      typeof candidate.exp === 'number' && Number.isFinite(candidate.exp)
        ? candidate.exp
        : null

    return {
      sub: candidate.sub,
      email: candidate.email,
      roleId: candidate.roleId,
      roleCode: candidate.roleCode,
      coordinationId,
      permissions: candidate.permissions.filter(
        (item): item is string => typeof item === 'string',
      ),
      status: candidate.status,
      exp,
    }
  } catch {
    return null
  }
}

/** Instantánea de caducidad del access token en ms epoch, o null si no hay `exp`. */
export function readAccessTokenExpiryMs(token: string): number | null {
  const claims = decodeAccessTokenClaims(token)
  if (!claims || claims.exp === null) return null
  return claims.exp * 1000
}

/** True si el JWT ya venció (con margen opcional). Sin `exp`, no se asume caducado. */
export function isAccessTokenExpired(
  token: string,
  nowMs: number = Date.now(),
  skewMs = 0,
): boolean {
  const expiryMs = readAccessTokenExpiryMs(token)
  if (expiryMs === null) return false
  return nowMs >= expiryMs - skewMs
}
