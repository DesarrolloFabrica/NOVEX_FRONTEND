import { readAccessToken } from '@/modules/auth/utils/accessTokenStorage'

const LOCAL_API_BASE = '/api/v1'

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

interface ApiErrorOptions extends ErrorOptions {
  /** Código estable devuelto por el backend (p. ej. REGISTRATION_IN_PROGRESS). */
  code?: string
  /** Identificador de la petición en el servidor, para soporte. */
  requestId?: string
}

export class ApiError extends Error {
  status: number
  code?: string
  requestId?: string

  constructor(message: string, status: number, options?: ApiErrorOptions) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
    this.code = options?.code
    this.requestId = options?.requestId
  }
}

interface ErrorBody {
  message?: string | string[]
  code?: string
  requestId?: string
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

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'TimeoutError'
}

async function readErrorBody(response: Response): Promise<ErrorBody> {
  try {
    return (await response.json()) as ErrorBody
  } catch {
    return {}
  }
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
    if (isTimeoutError(cause)) {
      throw new ApiError(
        'La conexión tardó demasiado en responder. Verifique su red antes de volver a confirmar.',
        0,
        { cause, code: 'TIMEOUT' },
      )
    }
    throw new ApiError(
      import.meta.env.DEV
        ? 'No se pudo conectar con la API local. Inicie NOVEX_BACKEND en el puerto 3001 y vuelva a intentar.'
        : 'No se pudo conectar con la API. Verifique la disponibilidad del backend y su configuración CORS.',
      0,
      { cause, code: 'NETWORK_ERROR' },
    )
  }

  if (!response.ok) {
    const body = await readErrorBody(response)

    let message =
      import.meta.env.DEV &&
      apiBaseUrl === LOCAL_API_BASE &&
      response.status >= 500
        ? 'La API local no está disponible. Inicie NOVEX_BACKEND en el puerto 3001 y vuelva a intentar.'
        : `Error HTTP ${response.status}`
    if (typeof body.message === 'string') message = body.message
    else if (Array.isArray(body.message)) message = body.message.join(', ')

    if (response.status >= 500 && body.requestId) {
      message = `${message} (Ref: ${body.requestId})`
    }

    if (shouldHandleUnauthorized(path, response.status)) {
      unauthorizedHandler?.()
    }

    throw new ApiError(message, response.status, {
      code: body.code,
      requestId: body.requestId,
    })
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export interface ApiDownload {
  blob: Blob
  /** Nombre que propone el servidor (Content-Disposition), si lo envía. */
  filename: string | null
}

/** Extrae el nombre de archivo de una cabecera Content-Disposition. */
export function parseContentDispositionFilename(
  header: string | null,
): string | null {
  if (!header) return null
  const encoded = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''))
    } catch {
      // Cae al nombre simple.
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header)
  return plain ? plain[1].trim() : null
}

/**
 * Descarga binaria autenticada (p. ej. un .xlsx). Mismo manejo de errores y de
 * sesión caducada que `apiRequest`, pero devuelve el cuerpo como Blob.
 */
export async function apiDownload(
  path: string,
  init?: RequestInit,
): Promise<ApiDownload> {
  const accessToken = readAccessToken()
  const apiBaseUrl = getApiBaseUrl()
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    })
  } catch (cause) {
    if (isTimeoutError(cause)) {
      throw new ApiError(
        'La descarga tardó demasiado en responder. Intente de nuevo o acote los filtros.',
        0,
        { cause, code: 'TIMEOUT' },
      )
    }
    throw new ApiError(
      'No se pudo conectar con la API para generar el archivo. Verifique su conexión.',
      0,
      { cause, code: 'NETWORK_ERROR' },
    )
  }

  if (!response.ok) {
    const body = await readErrorBody(response)
    let message = `Error HTTP ${response.status}`
    if (typeof body.message === 'string') message = body.message
    else if (Array.isArray(body.message)) message = body.message.join(', ')
    if (response.status >= 500 && body.requestId) {
      message = `${message} (Ref: ${body.requestId})`
    }
    if (shouldHandleUnauthorized(path, response.status)) {
      unauthorizedHandler?.()
    }
    throw new ApiError(message, response.status, {
      code: body.code,
      requestId: body.requestId,
    })
  }

  return {
    blob: await response.blob(),
    filename: parseContentDispositionFilename(
      response.headers.get('Content-Disposition'),
    ),
  }
}
