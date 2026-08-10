import { readAccessToken } from '@/modules/auth/utils/accessTokenStorage'

const LOCAL_API_BASE = '/api/v1'

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
  }
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

export function getApiBaseUrl(): string {
  const fromEnv = (
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
  )?.trim()

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '')
  }

  if (import.meta.env.DEV) return LOCAL_API_BASE

  throw new ApiError(
    'La URL del API no está configurada. Defina VITE_API_BASE_URL al construir el frontend.',
    0,
  )
}

function shouldHandleUnauthorized(path: string, status: number): boolean {
  if (status !== 401) return false
  return !path.startsWith('/auth/google') && !path.startsWith('/auth/email')
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const accessToken = readAccessToken()
  const apiBaseUrl = getApiBaseUrl()
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    })
  } catch (cause) {
    throw new ApiError(
      import.meta.env.DEV
        ? 'No se pudo conectar con la API local. Inicie NOVEX_BACKEND en el puerto 3001 y vuelva a intentar.'
        : 'No se pudo conectar con la API. Verifique la disponibilidad del backend y su configuración CORS.',
      0,
      { cause },
    )
  }

  if (!response.ok) {
    let message =
      import.meta.env.DEV &&
      apiBaseUrl === LOCAL_API_BASE &&
      response.status >= 500
        ? 'La API local no está disponible. Inicie NOVEX_BACKEND en el puerto 3001 y vuelva a intentar.'
        : `Error HTTP ${response.status}`
    try {
      const body = (await response.json()) as { message?: string | string[] }
      if (typeof body.message === 'string') message = body.message
      else if (Array.isArray(body.message)) message = body.message.join(', ')
    } catch {
      // ignore parse errors
    }

    if (shouldHandleUnauthorized(path, response.status)) {
      unauthorizedHandler?.()
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
