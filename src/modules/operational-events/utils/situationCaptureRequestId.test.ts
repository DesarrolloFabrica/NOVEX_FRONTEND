import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearSituationCapturePersistence,
  readOrCreateSituationCaptureRequestId,
  rotateSituationCaptureRequestId,
} from './situationCaptureDraftStorage'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REQUEST_ID_KEY = 'novex.situationCapture.requestId.v1'

function fakeLocalStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    data,
  }
}

describe('clave de idempotencia del registro en captura', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reutiliza la misma clave entre lecturas, como tras una recarga', () => {
    const storage = fakeLocalStorage()
    vi.stubGlobal('localStorage', storage)

    const first = readOrCreateSituationCaptureRequestId()
    const afterReload = readOrCreateSituationCaptureRequestId()

    expect(first).toMatch(UUID_V4)
    expect(afterReload).toBe(first)
    expect(storage.data.get(REQUEST_ID_KEY)).toBe(first)
  })

  it('una clave guardada que no es UUID v4 se descarta y se genera otra', () => {
    const storage = fakeLocalStorage()
    storage.setItem(REQUEST_ID_KEY, 'no-es-un-uuid')
    vi.stubGlobal('localStorage', storage)

    const key = readOrCreateSituationCaptureRequestId()

    expect(key).toMatch(UUID_V4)
    expect(key).not.toBe('no-es-un-uuid')
  })

  it('rotar genera una clave distinta y la persiste', () => {
    const storage = fakeLocalStorage()
    vi.stubGlobal('localStorage', storage)

    const before = readOrCreateSituationCaptureRequestId()
    const rotated = rotateSituationCaptureRequestId()

    expect(rotated).toMatch(UUID_V4)
    expect(rotated).not.toBe(before)
    expect(readOrCreateSituationCaptureRequestId()).toBe(rotated)
  })

  it('limpiar la persistencia del registro exitoso o de un registro nuevo entrega una clave nueva', () => {
    const storage = fakeLocalStorage()
    vi.stubGlobal('localStorage', storage)

    const before = readOrCreateSituationCaptureRequestId()
    clearSituationCapturePersistence()

    expect(storage.data.has(REQUEST_ID_KEY)).toBe(false)
    expect(readOrCreateSituationCaptureRequestId()).not.toBe(before)
  })

  it('sin almacenamiento disponible, la clave se mantiene en memoria durante la sesión', () => {
    vi.stubGlobal('localStorage', undefined)

    const first = readOrCreateSituationCaptureRequestId()

    expect(first).toMatch(UUID_V4)
    expect(readOrCreateSituationCaptureRequestId()).toBe(first)
  })
})
