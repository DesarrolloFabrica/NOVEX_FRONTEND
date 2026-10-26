import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, getApiBaseUrl } from './http'

describe('HTTP API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses the same-origin Vite proxy when running locally', () => {
    expect(getApiBaseUrl()).toBe('/api/v1')
  })

  it('turns a low-level fetch failure into an actionable API error', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/auth/me')).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: 'ApiError',
        status: 0,
        message: expect.stringContaining('Inicie NOVEX_BACKEND'),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('expone código y requestId del servidor para soporte', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 409,
            code: 'REGISTRATION_IN_PROGRESS',
            message: 'En proceso.',
            requestId: 'req-42',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    await expect(apiRequest('/situations/x')).rejects.toMatchObject({
      status: 409,
      code: 'REGISTRATION_IN_PROGRESS',
      requestId: 'req-42',
      message: 'En proceso.',
    })
  })

  it('agrega la referencia de soporte a los errores de servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({ message: 'Error interno del servidor.', requestId: 'req-7' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    await expect(apiRequest('/situations/x')).rejects.toMatchObject({
      status: 500,
      requestId: 'req-7',
      message: expect.stringContaining('(Ref: req-7)'),
    })
  })

  it('distingue un tiempo de espera agotado de una caída de red', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockRejectedValue(new DOMException('timed out', 'TimeoutError')),
    )

    await expect(apiRequest('/situations/x')).rejects.toMatchObject({
      status: 0,
      code: 'TIMEOUT',
    })
  })

  it('explains when the local Vite proxy cannot reach the backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 500 })),
    )

    await expect(apiRequest('/auth/me')).rejects.toEqual(
      expect.objectContaining({
        status: 500,
        message: expect.stringContaining('Inicie NOVEX_BACKEND'),
      }),
    )
  })
})
