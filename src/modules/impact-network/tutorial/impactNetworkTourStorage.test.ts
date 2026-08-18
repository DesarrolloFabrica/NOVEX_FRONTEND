import { describe, expect, it } from 'vitest'
import {
  getImpactNetworkTourStorageKey,
  hasSeenImpactNetworkTour,
  isImpactNetworkTourRole,
  rememberImpactNetworkTour,
} from './impactNetworkTourStorage'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

describe('impactNetworkTourStorage', () => {
  it('habilita el tutorial solo para los tres roles institucionales', () => {
    expect(isImpactNetworkTourRole('ADMIN')).toBe(true)
    expect(isImpactNetworkTourRole('DIRECTOR')).toBe(true)
    expect(isImpactNetworkTourRole('ANALISTA')).toBe(true)
    expect(isImpactNetworkTourRole('COORDINADOR')).toBe(false)
  })

  it.each(['completed', 'skipped'] as const)(
    'recuerda el resultado %s por usuario',
    (outcome) => {
      const storage = new MemoryStorage()

      expect(hasSeenImpactNetworkTour('user-a', storage)).toBe(false)
      rememberImpactNetworkTour('user-a', outcome, storage)

      expect(hasSeenImpactNetworkTour('user-a', storage)).toBe(true)
      expect(hasSeenImpactNetworkTour('user-b', storage)).toBe(false)
    },
  )

  it('ignora datos corruptos o versiones antiguas', () => {
    const storage = new MemoryStorage()
    const key = getImpactNetworkTourStorageKey('user-a')
    storage.setItem(key, '{corrupto')
    expect(hasSeenImpactNetworkTour('user-a', storage)).toBe(false)

    storage.setItem(
      key,
      JSON.stringify({ version: 0, outcome: 'completed', seenAt: '' }),
    )
    expect(hasSeenImpactNetworkTour('user-a', storage)).toBe(false)
  })
})
