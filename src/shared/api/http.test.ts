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
