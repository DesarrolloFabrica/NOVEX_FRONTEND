import { describe, expect, it } from 'vitest'
import {
  initialOperationalCardsState,
  operationalCardsReducer,
  type OperationalCardsAction,
} from '@/modules/operational-cards/state/operationalCards.reducer'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  CoordinationProblem,
  OperationalCardsState,
} from '@/modules/operational-cards/types/operational-cards.state'

function coordination(code: string, order: number) {
  return {
    id: `00000000-0000-4000-8000-${String(order).padStart(12, '0')}`,
    code,
    name: code,
    shortName: code,
    color: '#28C8F4',
    displayOrder: order,
    status: 'ESTABLE' as const,
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
  }
}

const OVERVIEW: OperationalOverview = {
  directionStatus: 'CRITICO',
  generatedAt: '2026-09-02T14:50:27.703Z',
  totals: { critical: 7, alert: 1, stable: 7 },
  coordinations: [
    coordination('coord-general', 1),
    coordination('coord-ingenierias', 7),
    coordination('coord-negocios', 13),
  ],
  analystRegistry: {
    status: 'ESTABLE',
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
  },
}

function problem(id: string): CoordinationProblem {
  return {
    id,
    title: `Problema ${id}`,
    severity: 'HIGH',
    status: 'OPEN',
    createdAt: '2026-08-01T10:00:00.000Z',
  }
}

/** Aplica una secuencia de acciones desde el estado inicial. */
function reduce(...actions: OperationalCardsAction[]): OperationalCardsState {
  return actions.reduce(
    (state, action) => operationalCardsReducer(state, action),
    initialOperationalCardsState,
  )
}

const READY = { type: 'LOAD_OVERVIEW_SUCCESS', overview: OVERVIEW } as const

describe('operationalCardsReducer · LEVEL 0', () => {
  it('arranca sin overview, sin selección y sin caché', () => {
    expect(initialOperationalCardsState).toEqual({
      overview: null,
      level0: 'idle',
      errorMessage: null,
      selectedCoordinationCode: null,
      hoveredCoordinationCode: null,
      level1: {
        status: 'idle',
        coordinationCode: null,
        problems: [],
        errorMessage: null,
      },
      problemsByCoordination: {},
      selectedProblemId: null,
      level2: {
        status: 'idle',
        problemId: null,
        detail: null,
        errorMessage: null,
        sections: {
          recommendations: { status: 'idle', items: [], errorMessage: null },
          evidences: { status: 'idle', items: [], errorMessage: null },
          timeline: { status: 'idle', items: [], errorMessage: null },
        },
        expanded: [],
      },
      detailByProblem: {},
    })
  })

  it('idle -> loading -> ready', () => {
    const loading = reduce({ type: 'LOAD_OVERVIEW' })
    expect(loading.level0).toBe('loading')

    const ready = reduce({ type: 'LOAD_OVERVIEW' }, READY)
    expect(ready.level0).toBe('ready')
    expect(ready.overview).toBe(OVERVIEW)
  })

  it('un fallo no deja un overview sintético', () => {
    const failed = reduce(
      { type: 'LOAD_OVERVIEW' },
      READY,
      { type: 'LOAD_OVERVIEW_ERROR', message: 'boom' },
    )
    expect(failed.level0).toBe('error')
    expect(failed.overview).toBeNull()
    expect(failed.errorMessage).toBe('boom')
  })

  it('un fallo de LEVEL 0 cancela la selección y LEVEL 1', () => {
    const failed = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
      { type: 'LOAD_OVERVIEW_ERROR', message: 'boom' },
    )
    expect(failed.selectedCoordinationCode).toBeNull()
    expect(failed.level1.status).toBe('idle')
  })
})

describe('operationalCardsReducer · selección', () => {
  it('selecciona una coordinación y deja LEVEL 1 pendiente de carga', () => {
    const state = reduce(READY, {
      type: 'SELECT_COORDINATION',
      code: 'coord-ingenierias',
    })
    expect(state.selectedCoordinationCode).toBe('coord-ingenierias')
    expect(state.level1).toEqual({
      status: 'idle',
      coordinationCode: 'coord-ingenierias',
      problems: [],
      errorMessage: null,
    })
  })

  it('cambia directamente de una coordinación a otra', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
      { type: 'LOAD_PROBLEMS', code: 'coord-ingenierias' },
      { type: 'SELECT_COORDINATION', code: 'coord-negocios' },
    )
    expect(state.selectedCoordinationCode).toBe('coord-negocios')
    expect(state.level1.coordinationCode).toBe('coord-negocios')
    expect(state.level1.problems).toEqual([])
  })

  it('reseleccionar la misma coordinación no reinicia nada', () => {
    const selected = reduce(READY, {
      type: 'SELECT_COORDINATION',
      code: 'coord-ingenierias',
    })
    const again = operationalCardsReducer(selected, {
      type: 'SELECT_COORDINATION',
      code: 'coord-ingenierias',
    })
    expect(again).toBe(selected)
  })

  it('volver a la Dirección limpia selección y LEVEL 1', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
      { type: 'CLEAR_COORDINATION' },
    )
    expect(state.selectedCoordinationCode).toBeNull()
    expect(state.level1.coordinationCode).toBeNull()
    expect(state.overview).toBe(OVERVIEW)
  })

  it('Coordinación General también es seleccionable', () => {
    const state = reduce(READY, {
      type: 'SELECT_COORDINATION',
      code: 'coord-general',
    })
    expect(state.selectedCoordinationCode).toBe('coord-general')
  })

  it('el hover no altera la selección', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
      { type: 'HOVER_COORDINATION', code: 'coord-negocios' },
    )
    expect(state.hoveredCoordinationCode).toBe('coord-negocios')
    expect(state.selectedCoordinationCode).toBe('coord-ingenierias')
  })
})

describe('operationalCardsReducer · LEVEL 1', () => {
  it('loading -> ready con los problemas recibidos', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
      { type: 'LOAD_PROBLEMS', code: 'coord-ingenierias' },
      {
        type: 'LOAD_PROBLEMS_SUCCESS',
        code: 'coord-ingenierias',
        problems: [problem('a'), problem('b')],
      },
    )
    expect(state.level1.status).toBe('ready')
    expect(state.level1.problems).toHaveLength(2)
  })

  it('un fallo de LEVEL 1 no vacía la selección ni finge calma', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
      { type: 'LOAD_PROBLEMS', code: 'coord-ingenierias' },
      {
        type: 'LOAD_PROBLEMS_ERROR',
        code: 'coord-ingenierias',
        message: 'sin red',
      },
    )
    expect(state.selectedCoordinationCode).toBe('coord-ingenierias')
    expect(state.level1.status).toBe('error')
    expect(state.level1.problems).toEqual([])
    expect(state.level1.errorMessage).toBe('sin red')
  })

  it('descarta una respuesta tardía de la coordinación anterior', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
      { type: 'LOAD_PROBLEMS', code: 'coord-ingenierias' },
      { type: 'SELECT_COORDINATION', code: 'coord-negocios' },
      // Llega ahora la respuesta de Ingenierías: no debe pisar Negocios.
      {
        type: 'LOAD_PROBLEMS_SUCCESS',
        code: 'coord-ingenierias',
        problems: [problem('vieja')],
      },
    )
    expect(state.selectedCoordinationCode).toBe('coord-negocios')
    expect(state.level1.coordinationCode).toBe('coord-negocios')
    expect(state.level1.problems).toEqual([])
    // El trabajo no se tira: queda en caché para cuando se vuelva.
    expect(state.problemsByCoordination['coord-ingenierias']).toHaveLength(1)
  })

  it('descarta un error tardío de la coordinación anterior', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
      { type: 'SELECT_COORDINATION', code: 'coord-negocios' },
      {
        type: 'LOAD_PROBLEMS_ERROR',
        code: 'coord-ingenierias',
        message: 'tardío',
      },
    )
    expect(state.level1.status).not.toBe('error')
    expect(state.level1.coordinationCode).toBe('coord-negocios')
  })

  it('volver a una coordinación cacheada entra en ready sin recargar', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
      { type: 'LOAD_PROBLEMS', code: 'coord-ingenierias' },
      {
        type: 'LOAD_PROBLEMS_SUCCESS',
        code: 'coord-ingenierias',
        problems: [problem('a')],
      },
      { type: 'SELECT_COORDINATION', code: 'coord-negocios' },
      { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
    )
    // `ready` directo: el efecto de carga solo actúa sobre `idle`.
    expect(state.level1.status).toBe('ready')
    expect(state.level1.problems).toHaveLength(1)
  })

  it('una coordinación sin problemas queda ready con lista vacía', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-general' },
      { type: 'LOAD_PROBLEMS', code: 'coord-general' },
      { type: 'LOAD_PROBLEMS_SUCCESS', code: 'coord-general', problems: [] },
    )
    expect(state.level1.status).toBe('ready')
    expect(state.level1.problems).toEqual([])
  })

  it('ignora una carga de LEVEL 1 sin selección vigente', () => {
    const state = reduce(READY, {
      type: 'LOAD_PROBLEMS',
      code: 'coord-ingenierias',
    })
    expect(state.level1.status).toBe('idle')
  })
})
