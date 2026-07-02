// Tests de la persistencia temporal en localStorage. Se usa un localStorage en
// memoria (mock) para no depender de un entorno DOM real.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Commitment } from '@/modules/commitments/types/commitment.types'
import {
  COMMITMENTS_STORAGE_KEY,
  clearStoredCommitments,
  loadStoredCommitments,
  saveStoredCommitments,
} from '@/modules/commitments/utils/commitmentsStorage'

/** localStorage mínimo en memoria que cumple la interfaz Storage. */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
    key: () => null,
    length: 0,
  } as Storage
}

function makeCommitment(id: string): Commitment {
  return {
    id,
    title: `Compromiso ${id}`,
    description: 'desc',
    areaId: 'area-a',
    areaName: 'Área A',
    responsibleName: 'Responsable',
    dueDate: '2026-07-01',
    status: 'Cumplido',
    operationalImpact: 3,
    createdAt: '2026-06-01T00:00:00.000Z',
    history: [],
  }
}

describe('commitmentsStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('guarda y luego carga los mismos compromisos', () => {
    const commitments = [makeCommitment('c1'), makeCommitment('c2')]
    saveStoredCommitments(commitments)
    expect(loadStoredCommitments()).toEqual(commitments)
  })

  it('devuelve null si no hay datos guardados', () => {
    expect(loadStoredCommitments()).toBeNull()
  })

  it('limpia la persistencia con clearStoredCommitments', () => {
    saveStoredCommitments([makeCommitment('c1')])
    clearStoredCommitments()
    expect(loadStoredCommitments()).toBeNull()
  })

  it('ante JSON inválido devuelve null y limpia el storage', () => {
    localStorage.setItem(COMMITMENTS_STORAGE_KEY, 'no-es-json{')
    expect(loadStoredCommitments()).toBeNull()
    // Tras la limpieza, el valor ya no debe existir.
    expect(localStorage.getItem(COMMITMENTS_STORAGE_KEY)).toBeNull()
  })

  it('ante una forma inválida (no array) devuelve null', () => {
    localStorage.setItem(COMMITMENTS_STORAGE_KEY, JSON.stringify({ a: 1 }))
    expect(loadStoredCommitments()).toBeNull()
  })
})
