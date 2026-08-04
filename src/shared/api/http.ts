import { readAccessToken } from '@/modules/auth/utils/accessTokenStorage'

const DEFAULT_API_BASE = 'http://localhost:3001/api/v1'

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

export function getApiBaseUrl(): string {
  const fromEnv = (
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
  ) as string | undefined
  return (fromEnv?.replace(/\/$/, '') || DEFAULT_API_BASE).trim()
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
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
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `Error HTTP ${response.status}`
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
