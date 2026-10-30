import { describe, expect, it } from 'vitest'
import {
  decideTourStart,
  getTourProgressKey,
  readLegacyTourHistory,
  readTourProgress,
  TOUR_VERSION,
  writeTourProgress,
  type TourStorage,
} from './tourProgress'

function memoryStorage(initial: Record<string, string> = {}): TourStorage & {
  data: Map<string, string>
} {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

const USER = 'user-1'

describe('decideTourStart', () => {
  it('usuario nuevo: se presenta desde el inicio', () => {
    expect(decideTourStart(USER, memoryStorage())).toEqual({
      status: 'not-started',
      stepIndex: 0,
      shouldPresent: true,
    })
  })

  it('recorrido en curso de la versión actual: reanuda en su paso', () => {
    const storage = memoryStorage()
    writeTourProgress(USER, 'in-progress', 4, storage)
    expect(decideTourStart(USER, storage)).toEqual({
      status: 'in-progress',
      stepIndex: 4,
      shouldPresent: true,
    })
  })

  it('completado o omitido en la versión actual: no se vuelve a presentar', () => {
    for (const outcome of ['completed', 'skipped'] as const) {
      const storage = memoryStorage()
      writeTourProgress(USER, outcome, 7, storage)
      expect(decideTourStart(USER, storage).shouldPresent).toBe(false)
      expect(decideTourStart(USER, storage).status).toBe(outcome)
    }
  })

  it('un registro de otra versión se ignora y el recorrido renovado se presenta', () => {
    const storage = memoryStorage({
      [getTourProgressKey(USER)]: JSON.stringify({
        version: TOUR_VERSION - 1,
        status: 'completed',
        stepIndex: 9,
        updatedAt: '2026-08-04T00:00:00.000Z',
      }),
    })
    expect(decideTourStart(USER, storage)).toEqual({
      status: 'not-started',
      stepIndex: 0,
      shouldPresent: true,
    })
  })

  it('un registro dañado se trata como ausente', () => {
    const storage = memoryStorage({ [getTourProgressKey(USER)]: '{no json' })
    expect(readTourProgress(USER, storage)).toBeNull()
    expect(decideTourStart(USER, storage).shouldPresent).toBe(true)
  })
})

describe('historial del tutorial anterior', () => {
  it('no se reescribe ni se borra al decidir o registrar el renovado', () => {
    const legacyKey = `novex.onboarding.v2.${USER}`
    const storage = memoryStorage({ [legacyKey]: 'completed' })

    decideTourStart(USER, storage)
    writeTourProgress(USER, 'in-progress', 2, storage)
    writeTourProgress(USER, 'completed', 9, storage)

    expect(storage.data.get(legacyKey)).toBe('completed')
    expect(readLegacyTourHistory(USER, storage)).toBe('completed')
  })

  it('reconoce un progreso en curso del tutorial anterior sin interpretarlo como decisión', () => {
    const storage = memoryStorage({ [`novex.onboarding.v2.${USER}`]: '3' })
    expect(readLegacyTourHistory(USER, storage)).toBe('in-progress')
    expect(decideTourStart(USER, storage).shouldPresent).toBe(true)
  })

  it('sin historial devuelve null', () => {
    expect(readLegacyTourHistory(USER, memoryStorage())).toBeNull()
  })
})

describe('writeTourProgress', () => {
  it('guarda la versión, el estado y un índice entero no negativo', () => {
    const storage = memoryStorage()
    writeTourProgress(USER, 'in-progress', -3.7, storage, new Date('2026-08-04T10:00:00Z'))
    expect(readTourProgress(USER, storage)).toEqual({
      version: TOUR_VERSION,
      status: 'in-progress',
      stepIndex: 0,
      updatedAt: '2026-08-04T10:00:00.000Z',
    })
  })

  it('aísla a cada usuario', () => {
    const storage = memoryStorage()
    writeTourProgress('user-a', 'completed', 1, storage)
    expect(readTourProgress('user-b', storage)).toBeNull()
  })

  it('codifica el identificador en la clave', () => {
    expect(getTourProgressKey('a/b c')).toBe('novex.onboarding.v3.a%2Fb%20c')
  })
})
