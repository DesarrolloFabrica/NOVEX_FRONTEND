import { describe, expect, it } from 'vitest'
import {
  initialOperationalCardsState,
  operationalCardsReducer,
} from '@/modules/operational-cards/state/operationalCards.reducer'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'

const OVERVIEW: OperationalOverview = {
  directionStatus: 'CRITICO',
  generatedAt: '2026-09-02T14:50:27.703Z',
  totals: { critical: 7, alert: 1, stable: 7 },
  coordinations: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      code: 'coord-general',
      name: 'Coordinación General',
      shortName: 'General',
      color: '#28C8F4',
      displayOrder: 1,
      status: 'ESTABLE',
      activeProblemsCount: 0,
      criticalCount: 0,
      affectedCoordinationCount: 0,
    },
  ],
  analystRegistry: {
    status: 'ESTABLE',
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
  },
}

describe('operationalCardsReducer', () => {
  it('arranca en idle sin overview', () => {
    expect(initialOperationalCardsState).toEqual({
      level0: 'idle',
      overview: null,
      errorMessage: null,
    })
  })

  it('idle -> loading', () => {
    const state = operationalCardsReducer(initialOperationalCardsState, {
      type: 'LOAD_OVERVIEW',
    })
    expect(state.level0).toBe('loading')
    expect(state.overview).toBeNull()
  })

  it('loading -> ready conserva el overview recibido', () => {
    const loading = operationalCardsReducer(initialOperationalCardsState, {
      type: 'LOAD_OVERVIEW',
    })
    const ready = operationalCardsReducer(loading, {
      type: 'LOAD_OVERVIEW_SUCCESS',
      overview: OVERVIEW,
    })

    expect(ready.level0).toBe('ready')
    expect(ready.overview).toBe(OVERVIEW)
    expect(ready.errorMessage).toBeNull()
  })

  it('loading -> error guarda el mensaje', () => {
    const loading = operationalCardsReducer(initialOperationalCardsState, {
      type: 'LOAD_OVERVIEW',
    })
    const failed = operationalCardsReducer(loading, {
      type: 'LOAD_OVERVIEW_ERROR',
      message: 'Sin conexión',
    })

    expect(failed.level0).toBe('error')
    expect(failed.errorMessage).toBe('Sin conexión')
  })

  it('un error NO fabrica un estado saludable sintético', () => {
    const ready = operationalCardsReducer(initialOperationalCardsState, {
      type: 'LOAD_OVERVIEW_SUCCESS',
      overview: OVERVIEW,
    })
    const failed = operationalCardsReducer(ready, {
      type: 'LOAD_OVERVIEW_ERROR',
      message: 'HTTP 500',
    })

    // Ni ESTABLE, ni totals en cero, ni coordinations vacías haciéndose pasar
    // por datos: el overview se descarta y el nivel queda en error.
    expect(failed.overview).toBeNull()
    expect(failed.level0).toBe('error')
    expect(failed.level0).not.toBe('ready')
  })

  it('un reintento tras error vuelve a loading y limpia el mensaje', () => {
    const failed = operationalCardsReducer(initialOperationalCardsState, {
      type: 'LOAD_OVERVIEW_ERROR',
      message: 'HTTP 500',
    })
    const retry = operationalCardsReducer(failed, { type: 'LOAD_OVERVIEW' })

    expect(retry.level0).toBe('loading')
    expect(retry.errorMessage).toBeNull()
  })
})
