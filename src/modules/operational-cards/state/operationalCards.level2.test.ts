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
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'

/**
 * LEVEL 2: isla flotante del problema. Vive en su propio fichero para no
 * mezclarse con las transiciones de LEVEL 0 y LEVEL 1.
 */

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
  totals: { critical: 1, alert: 0, stable: 2 },
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

const DETAIL: ProblemDetail = {
  id: 'p1',
  title: 'Aulas sin conectividad',
  severity: 'CRITICAL',
  status: 'OPEN',
  slaHealth: 'overdue',
  dueAt: '2026-08-10T10:00:00.000Z',
  summary: 'Resumen real del problema.',
  coordinationName: 'Coordinador Ingenierías',
  createdAt: '2026-08-01T10:00:00.000Z',
  impact: null,
  coordinationCode: 'coord-b2b',
  createdByUserName: 'Autor de prueba',
  canResolve: false,
  resolution: null,
  intelligence: null,
}

function from(
  state: OperationalCardsState,
  ...actions: OperationalCardsAction[]
): OperationalCardsState {
  return actions.reduce(
    (current, action) => operationalCardsReducer(current, action),
    state,
  )
}

/** Estado base: coordinación seleccionada con sus problemas ya cargados. */
function withCoordination(): OperationalCardsState {
  return from(
    initialOperationalCardsState,
    { type: 'LOAD_OVERVIEW_SUCCESS', overview: OVERVIEW },
    { type: 'SELECT_COORDINATION', code: 'coord-ingenierias' },
    { type: 'LOAD_PROBLEMS', code: 'coord-ingenierias' },
    {
      type: 'LOAD_PROBLEMS_SUCCESS',
      code: 'coord-ingenierias',
      problems: [problem('p1'), problem('p2')],
      scope: 'complete',
      generation: 0,
    },
  )
}

const opened = () =>
  from(withCoordination(), { type: 'SELECT_PROBLEM', problemId: 'p1' })

const readyDetail = () =>
  from(
    opened(),
    { type: 'LOAD_DETAIL', problemId: 'p1' },
    { type: 'LOAD_DETAIL_SUCCESS', problemId: 'p1', detail: DETAIL, generation: 0 },
  )

describe('LEVEL 2 · selección del problema', () => {
  it('abrir un problema no cierra la coordinación', () => {
    const state = opened()
    expect(state.selectedProblemId).toBe('p1')
    expect(state.selectedCoordinationCode).toBe('coord-ingenierias')
    expect(state.level1.problems).toHaveLength(2)
  })

  it('elegir otro problema cambia el detalle sin cerrar nada', () => {
    // Contrato invertido en F3. Mientras el detalle era una isla flotante, una
    // segunda fila no podía abrir otra encima y la acción se ignoraba. Con el
    // detalle en su región permanente, pulsar otra fila es mirar otro
    // problema: la selección cambia y LEVEL 2 vuelve a empezar para el nuevo.
    const open = opened()
    const second = operationalCardsReducer(open, {
      type: 'SELECT_PROBLEM',
      problemId: 'p2',
    })

    expect(second.selectedProblemId).toBe('p2')
    expect(second.level2.problemId).toBe('p2')
    expect(second.level2.status).toBe('idle')
    expect(second.level2.detail).toBeNull()
    // La coordinación no se toca: cambiar de problema no retrocede nivel.
    expect(second.selectedCoordinationCode).toBe('coord-ingenierias')
  })

  it('volver a pulsar el problema que ya se mira no reinicia su carga', () => {
    const open = opened()
    const again = operationalCardsReducer(open, {
      type: 'SELECT_PROBLEM',
      problemId: 'p1',
    })

    expect(again).toBe(open)
  })

  it('CLOSE_PROBLEM mantiene la coordinación seleccionada', () => {
    const state = from(opened(), { type: 'CLOSE_PROBLEM' })
    expect(state.selectedProblemId).toBeNull()
    expect(state.level2.detail).toBeNull()
    expect(state.selectedCoordinationCode).toBe('coord-ingenierias')
    expect(state.level1.problems).toHaveLength(2)
  })

  it('tras cerrar se puede abrir otro problema', () => {
    const state = from(
      opened(),
      { type: 'CLOSE_PROBLEM' },
      { type: 'SELECT_PROBLEM', problemId: 'p2' },
    )
    expect(state.selectedProblemId).toBe('p2')
  })

  it('cambiar de coordinación cierra la isla', () => {
    const state = from(opened(), {
      type: 'SELECT_COORDINATION',
      code: 'coord-negocios',
    })
    expect(state.selectedProblemId).toBeNull()
    expect(state.selectedCoordinationCode).toBe('coord-negocios')
  })

  it('volver a la Dirección cierra la isla', () => {
    const state = from(opened(), { type: 'CLEAR_COORDINATION' })
    expect(state.selectedProblemId).toBeNull()
    expect(state.selectedCoordinationCode).toBeNull()
  })
})

describe('LEVEL 2 · detalle', () => {
  it('idle -> loading -> ready', () => {
    const loading = from(opened(), { type: 'LOAD_DETAIL', problemId: 'p1' })
    expect(loading.level2.status).toBe('loading')

    const ready = readyDetail()
    expect(ready.level2.status).toBe('ready')
    expect(ready.level2.detail?.title).toBe('Aulas sin conectividad')
  })

  it('un fallo deja la isla abierta con su mensaje y sin tocar LEVEL 1', () => {
    const state = from(
      opened(),
      { type: 'LOAD_DETAIL', problemId: 'p1' },
      { type: 'LOAD_DETAIL_ERROR', problemId: 'p1', message: 'sin red' },
    )
    expect(state.selectedProblemId).toBe('p1')
    expect(state.level2.status).toBe('error')
    expect(state.level2.errorMessage).toBe('sin red')
    expect(state.level1.problems).toHaveLength(2)
  })

  it('descarta un detalle que llega tras cerrar la isla', () => {
    const state = from(
      opened(),
      { type: 'LOAD_DETAIL', problemId: 'p1' },
      { type: 'CLOSE_PROBLEM' },
      { type: 'LOAD_DETAIL_SUCCESS', problemId: 'p1', detail: DETAIL, generation: 0 },
    )
    expect(state.selectedProblemId).toBeNull()
    expect(state.level2.detail).toBeNull()
    // El trabajo no se tira: queda en caché para la próxima apertura.
    expect(state.detailByProblem['p1']?.detail).toEqual(DETAIL)
  })

  it('descarta un error que llega tras cerrar la isla', () => {
    const state = from(
      opened(),
      { type: 'CLOSE_PROBLEM' },
      { type: 'LOAD_DETAIL_ERROR', problemId: 'p1', message: 'tardío' },
    )
    expect(state.level2.status).toBe('idle')
    expect(state.level2.errorMessage).toBeNull()
  })

  it('reabrir un problema cacheado entra en ready sin recargar', () => {
    const state = from(
      readyDetail(),
      { type: 'CLOSE_PROBLEM' },
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
    )
    expect(state.level2.status).toBe('ready')
    expect(state.level2.detail).toEqual(DETAIL)
  })
})

describe('LEVEL 2 · secciones', () => {
  it('todas las secciones nacen cerradas', () => {
    expect(readyDetail().level2.expanded).toEqual([])
  })

  it('desplegar y cerrar una sección', () => {
    const open = from(readyDetail(), {
      type: 'TOGGLE_SECTION',
      problemId: 'p1',
      section: 'impact',
    })
    expect(open.level2.expanded).toEqual(['impact'])

    const closed = from(open, {
      type: 'TOGGLE_SECTION',
      problemId: 'p1',
      section: 'impact',
    })
    expect(closed.level2.expanded).toEqual([])
  })

  it('varias secciones pueden estar abiertas a la vez', () => {
    const state = from(
      readyDetail(),
      { type: 'TOGGLE_SECTION', problemId: 'p1', section: 'impact' },
      { type: 'TOGGLE_SECTION', problemId: 'p1', section: 'ai' },
    )
    expect(state.level2.expanded).toEqual(['impact', 'ai'])
  })

  it('una sección perezosa carga y queda ready', () => {
    const state = from(
      readyDetail(),
      { type: 'TOGGLE_SECTION', problemId: 'p1', section: 'evidences' },
      { type: 'LOAD_SECTION', problemId: 'p1', section: 'evidences' },
      {
        type: 'LOAD_SECTION_SUCCESS',
        problemId: 'p1',
        section: 'evidences',
        items: [{ id: 'e1' }],
      },
    )
    expect(state.level2.sections.evidences.status).toBe('ready')
    expect(state.level2.sections.evidences.items).toHaveLength(1)
  })

  it('el fallo de una sección no rompe la isla ni las demás', () => {
    const state = from(
      readyDetail(),
      { type: 'TOGGLE_SECTION', problemId: 'p1', section: 'evidences' },
      { type: 'LOAD_SECTION', problemId: 'p1', section: 'evidences' },
      {
        type: 'LOAD_SECTION_ERROR',
        problemId: 'p1',
        section: 'evidences',
        message: 'sin red',
      },
    )
    expect(state.level2.status).toBe('ready')
    expect(state.level2.sections.evidences.status).toBe('error')
    expect(state.level2.sections.timeline.status).toBe('idle')
    expect(state.selectedProblemId).toBe('p1')
  })

  it('cerrar y reabrir una sección conserva lo cargado', () => {
    const state = from(
      readyDetail(),
      { type: 'TOGGLE_SECTION', problemId: 'p1', section: 'timeline' },
      { type: 'LOAD_SECTION', problemId: 'p1', section: 'timeline' },
      {
        type: 'LOAD_SECTION_SUCCESS',
        problemId: 'p1',
        section: 'timeline',
        items: [{ id: 't1' }, { id: 't2' }],
      },
      { type: 'TOGGLE_SECTION', problemId: 'p1', section: 'timeline' },
      { type: 'TOGGLE_SECTION', problemId: 'p1', section: 'timeline' },
    )
    // Sigue en `ready`, así que el efecto de carga no vuelve a pedir nada.
    expect(state.level2.sections.timeline.status).toBe('ready')
    expect(state.level2.sections.timeline.items).toHaveLength(2)
  })

  it('reabrir el problema conserva las secciones ya cargadas', () => {
    const state = from(
      readyDetail(),
      { type: 'TOGGLE_SECTION', problemId: 'p1', section: 'evidences' },
      { type: 'LOAD_SECTION', problemId: 'p1', section: 'evidences' },
      {
        type: 'LOAD_SECTION_SUCCESS',
        problemId: 'p1',
        section: 'evidences',
        items: [{ id: 'e1' }],
      },
      { type: 'CLOSE_PROBLEM' },
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
    )
    expect(state.level2.sections.evidences.status).toBe('ready')
    expect(state.level2.expanded).toEqual([])
  })

  it('descarta una sección que llega tras cerrar la isla', () => {
    const state = from(
      readyDetail(),
      { type: 'TOGGLE_SECTION', problemId: 'p1', section: 'evidences' },
      { type: 'LOAD_SECTION', problemId: 'p1', section: 'evidences' },
      { type: 'CLOSE_PROBLEM' },
      {
        type: 'LOAD_SECTION_SUCCESS',
        problemId: 'p1',
        section: 'evidences',
        items: [{ id: 'e1' }],
      },
    )
    expect(state.level2.sections.evidences.status).toBe('idle')
    expect(state.detailByProblem['p1']?.sections.evidences.status).toBe('ready')
  })
})
