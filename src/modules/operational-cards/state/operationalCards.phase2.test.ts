import { describe, expect, it } from 'vitest'
import {
  initialOperationalCardsState,
  operationalCardsReducer,
  emptyReportDraft,
  reportDraftKey,
  type OperationalCardsAction,
} from '@/modules/operational-cards/state/operationalCards.reducer'
import type { OperationalCardsState } from '@/modules/operational-cards/types/operational-cards.state'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * FASE 2: coherencia entre las dos listas, borradores y escrituras.
 *
 * El reducer es una función pura, así que estas reglas se comprueban sin
 * navegador y sin red: es donde viven de verdad las decisiones de coherencia.
 */

const OVERVIEW = {
  directionStatus: 'ESTABLE',
  generatedAt: '2026-09-16T10:00:00.000Z',
  totals: { critical: 0, alert: 0, stable: 2 },
  coordinations: [
    {
      id: 'uuid-a',
      code: 'coord-b2b',
      name: 'B2B',
      shortName: 'B2B',
      color: '#fff',
      displayOrder: 1,
      status: 'ESTABLE',
      activeProblemsCount: 0,
      criticalCount: 0,
      affectedCoordinationCount: 0,
    },
    {
      id: 'uuid-b',
      code: 'coord-negocios',
      name: 'Negocios',
      shortName: 'Negocios',
      color: '#fff',
      displayOrder: 2,
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
} as unknown as OperationalOverview

const DETAIL = {
  id: 'p1',
  title: 'Problema',
  severity: 'HIGH',
  status: 'OPEN',
  slaHealth: null,
  dueAt: null,
  summary: 'Resumen',
  coordinationName: 'B2B',
  coordinationCode: 'coord-b2b',
  createdByUserName: 'Autor',
  createdAt: '2026-09-01T10:00:00.000Z',
  impact: null,
  intelligence: null,
  canResolve: true,
  resolution: null,
} as ProblemDetail

const DETAIL_RESUELTO = {
  ...DETAIL,
  status: 'CLOSED',
  canResolve: false,
  resolution: {
    learning: 'Faltó un plan de reversión',
    resolvedByUserName: 'Coordinadora',
    resolvedAt: '2026-09-16T12:00:00.000Z',
  },
} as ProblemDetail

function reduce(...actions: OperationalCardsAction[]): OperationalCardsState {
  return actions.reduce(
    (state, action) => operationalCardsReducer(state, action),
    initialOperationalCardsState,
  )
}

const READY: OperationalCardsAction = {
  type: 'LOAD_OVERVIEW_SUCCESS',
  overview: OVERVIEW,
}

describe('panel derecho · modos', () => {
  it('arranca en reposo y seleccionar una carta NO abre el formulario', () => {
    const state = reduce(READY, { type: 'SELECT_COORDINATION', code: 'coord-b2b' })
    expect(state.panelMode).toBe('idle')
  })

  it('«Reportar problema» abre el formulario y suelta el problema abierto', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
      { type: 'OPEN_REPORT_FORM' },
    )
    expect(state.panelMode).toBe('report')
    // Sin esto, la lista central seguiría marcando una fila como activa
    // mientras el panel habla de otra cosa.
    expect(state.selectedProblemId).toBeNull()
  })

  it('seleccionar un problema abre el modo detalle', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
    )
    expect(state.panelMode).toBe('detail')
  })

  it('cambiar de carta no deja el detalle anterior como si fuera de la nueva', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
      { type: 'SELECT_COORDINATION', code: 'coord-negocios' },
    )
    expect(state.selectedProblemId).toBeNull()
    expect(state.panelMode).toBe('idle')
  })
})

describe('coherencia entre las dos listas', () => {
  it('abrir desde «Mis reportes» sincroniza la carta SIN perder el problema', () => {
    /*
     * Es la regla que motivó la acción atómica: SELECT_COORDINATION limpia
     * `selectedProblemId`, así que sincronizar en dos pasos habría borrado el
     * problema que se acababa de abrir.
     */
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      {
        type: 'OPEN_MY_REPORT',
        problemId: 'p9',
        coordinationCode: 'coord-negocios',
      },
    )
    expect(state.selectedCoordinationCode).toBe('coord-negocios')
    expect(state.selectedProblemId).toBe('p9')
    expect(state.panelMode).toBe('detail')
    // La lista central se recarga para la coordinación nueva.
    expect(state.level1.coordinationCode).toBe('coord-negocios')
    expect(state.level1.status).toBe('idle')
  })

  it('un reporte SIN coordinación abre el detalle sin inventar una carta', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      { type: 'OPEN_MY_REPORT', problemId: 'p-huerfano', coordinationCode: null },
    )
    expect(state.selectedProblemId).toBe('p-huerfano')
    expect(state.panelMode).toBe('detail')
    // La selección de cartas NO se toca ni se atribuye a otra área.
    expect(state.selectedCoordinationCode).toBe('coord-b2b')
  })

  it('las dos listas comparten UNA sola selección de problema', () => {
    const desdeCentral = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
    )
    const desdeMisReportes = reduce(
      READY,
      { type: 'OPEN_MY_REPORT', problemId: 'p1', coordinationCode: 'coord-b2b' },
    )
    expect(desdeCentral.selectedProblemId).toBe(
      desdeMisReportes.selectedProblemId,
    )
  })
})

describe('borradores', () => {
  it('el borrador se conserva por coordinación y no se traslada', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      {
        type: 'SET_REPORT_DRAFT',
        key: reportDraftKey('coord-b2b'),
        draft: { title: 'Fallo en B2B' },
      },
      { type: 'SELECT_COORDINATION', code: 'coord-negocios' },
      {
        type: 'SET_REPORT_DRAFT',
        key: reportDraftKey('coord-negocios'),
        draft: { title: 'Fallo en Negocios' },
      },
    )
    expect(state.reportDrafts['coord-b2b'].title).toBe('Fallo en B2B')
    expect(state.reportDrafts['coord-negocios'].title).toBe('Fallo en Negocios')
  })

  it('consultar un problema no pierde el borrador escrito', () => {
    const state = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      {
        type: 'SET_REPORT_DRAFT',
        key: 'coord-b2b',
        draft: { description: 'Texto sin guardar' },
      },
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
      { type: 'OPEN_REPORT_FORM' },
    )
    expect(state.reportDrafts['coord-b2b'].description).toBe('Texto sin guardar')
  })

  it('el aprendizaje se guarda por problema', () => {
    const state = reduce(
      READY,
      { type: 'SET_LEARNING_DRAFT', problemId: 'p1', learning: 'Lección uno' },
      { type: 'SET_LEARNING_DRAFT', problemId: 'p2', learning: 'Lección dos' },
    )
    expect(state.learningDrafts.p1).toBe('Lección uno')
    expect(state.learningDrafts.p2).toBe('Lección dos')
  })

  it('el borrador arranca con severidad MEDIUM', () => {
    expect(emptyReportDraft('2026-09-16T10:00').severity).toBe('MEDIUM')
  })
})

describe('escrituras', () => {
  const enviando = reduce(
    READY,
    { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
    { type: 'SUBMIT_REPORT', targetKey: 'coord-b2b' },
  )

  it('no admite un segundo envío mientras hay uno vivo', () => {
    const segundo = operationalCardsReducer(enviando, {
      type: 'SUBMIT_REPORT',
      targetKey: 'coord-negocios',
    })
    // El estado no cambia: la segunda pulsación no arranca nada.
    expect(segundo).toBe(enviando)
    expect(segundo.submission.targetKey).toBe('coord-b2b')
  })

  it('un fallo conserva el texto escrito', () => {
    const conTexto = operationalCardsReducer(enviando, {
      type: 'SET_REPORT_DRAFT',
      key: 'coord-b2b',
      draft: { title: 'No se perdió' },
    })
    const fallo = operationalCardsReducer(conTexto, {
      type: 'SUBMIT_REPORT_ERROR',
      message: 'La red falló',
    })
    expect(fallo.reportDrafts['coord-b2b'].title).toBe('No se perdió')
    expect(fallo.submission.status).toBe('error')
  })

  it('un reporte confirmado invalida su coordinación y sube la generación', () => {
    const ok = operationalCardsReducer(enviando, {
      type: 'SUBMIT_REPORT_SUCCESS',
      targetKey: 'coord-b2b',
      coordinationCode: 'coord-b2b',
      problemId: 'p-nuevo',
    })
    expect(ok.dataGeneration).toBe(1)
    expect(ok.problemsByCoordination['coord-b2b']).toBeUndefined()
    expect(ok.level1.status).toBe('idle')
    // «Mis reportes» se vuelve a pedir desde la primera página.
    expect(ok.myReports.status).toBe('idle')
    // El usuario seguía en la coordinación de destino: se le abre el detalle.
    expect(ok.selectedProblemId).toBe('p-nuevo')
    expect(ok.panelMode).toBe('detail')
    // Y se pide la reacción del personaje, ya confirmada.
    expect(ok.pendingCharacterReaction).toMatchObject({
      kind: 'report-confirmed',
      coordinationCode: 'coord-b2b',
    })
  })

  it('si el usuario cambió de carta, no se le devuelve por la fuerza', () => {
    const cambiado = operationalCardsReducer(enviando, {
      type: 'SELECT_COORDINATION',
      code: 'coord-negocios',
    })
    const conFormularioAbierto = operationalCardsReducer(cambiado, {
      type: 'OPEN_REPORT_FORM',
    })
    const ok = operationalCardsReducer(conFormularioAbierto, {
      type: 'SUBMIT_REPORT_SUCCESS',
      targetKey: 'coord-b2b',
      coordinationCode: 'coord-b2b',
      problemId: 'p-nuevo',
    })

    // Sigue donde estaba, con el formulario que estaba usando.
    expect(ok.selectedCoordinationCode).toBe('coord-negocios')
    expect(ok.panelMode).toBe('report')
    expect(ok.selectedProblemId).toBeNull()
    // Pero el destino ORIGINAL sí queda invalidado.
    expect(ok.problemsByCoordination['coord-b2b']).toBeUndefined()
    expect(ok.dataGeneration).toBe(1)
  })

  it('descarta una respuesta anterior a la escritura', () => {
    const ok = operationalCardsReducer(enviando, {
      type: 'SUBMIT_REPORT_SUCCESS',
      targetKey: 'coord-b2b',
      coordinationCode: 'coord-b2b',
      problemId: 'p-nuevo',
    })
    // Lista pedida ANTES de crear: reintroduciría la lista sin el problema nuevo.
    const tardia = operationalCardsReducer(ok, {
      type: 'LOAD_PROBLEMS_SUCCESS',
      code: 'coord-b2b',
      problems: [],
      scope: 'complete',
      generation: 0,
    })
    expect(tardia).toBe(ok)
    expect(tardia.problemsByCoordination['coord-b2b']).toBeUndefined()
  })

  it('una resolución confirmada conserva el detalle ya cerrado', () => {
    const base = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
      { type: 'LOAD_DETAIL', problemId: 'p1' },
      { type: 'LOAD_DETAIL_SUCCESS', problemId: 'p1', detail: DETAIL, generation: 0 },
      { type: 'SET_LEARNING_DRAFT', problemId: 'p1', learning: 'Lo aprendido' },
      { type: 'SUBMIT_RESOLUTION', problemId: 'p1' },
    )
    const ok = operationalCardsReducer(base, {
      type: 'SUBMIT_RESOLUTION_SUCCESS',
      problemId: 'p1',
      detail: DETAIL_RESUELTO,
    })

    // El detalle SIGUE a la vista, ya cerrado y con su aprendizaje.
    expect(ok.panelMode).toBe('detail')
    expect(ok.selectedProblemId).toBe('p1')
    expect(ok.level2.detail?.status).toBe('CLOSED')
    expect(ok.level2.detail?.resolution?.learning).toBe(
      'Faltó un plan de reversión',
    )
    // La lista de activos y «Mis reportes» se recargan.
    expect(ok.level1.status).toBe('idle')
    expect(ok.myReports.status).toBe('idle')
    expect(ok.dataGeneration).toBe(1)
    // El borrador de aprendizaje ya se consumió.
    expect(ok.learningDrafts.p1).toBeUndefined()
  })

  it('un fallo al resolver conserva el aprendizaje escrito', () => {
    const base = reduce(
      READY,
      { type: 'SET_LEARNING_DRAFT', problemId: 'p1', learning: 'No se pierde' },
      { type: 'SUBMIT_RESOLUTION', problemId: 'p1' },
    )
    const fallo = operationalCardsReducer(base, {
      type: 'SUBMIT_RESOLUTION_ERROR',
      message: 'Sin red',
    })
    expect(fallo.learningDrafts.p1).toBe('No se pierde')
    expect(fallo.submission.status).toBe('error')
  })
})

describe('reacción del personaje', () => {
  it('se consume una sola vez', () => {
    const conReaccion = reduce(
      READY,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      { type: 'SUBMIT_REPORT', targetKey: 'coord-b2b' },
      {
        type: 'SUBMIT_REPORT_SUCCESS',
        targetKey: 'coord-b2b',
        coordinationCode: 'coord-b2b',
        problemId: 'p-nuevo',
      },
    )
    const id = conReaccion.pendingCharacterReaction!.id
    const consumida = operationalCardsReducer(conReaccion, {
      type: 'CONSUME_CHARACTER_REACTION',
      id,
    })
    expect(consumida.pendingCharacterReaction).toBeNull()

    // Un segundo aviso con el mismo id no reabre nada.
    const otraVez = operationalCardsReducer(consumida, {
      type: 'CONSUME_CHARACTER_REACTION',
      id,
    })
    expect(otraVez.pendingCharacterReaction).toBeNull()
  })
})

describe('«Mis reportes»', () => {
  it('no se recarga al cambiar de carta', () => {
    const cargada = reduce(
      READY,
      { type: 'LOAD_MY_REPORTS', page: 1 },
      {
        type: 'LOAD_MY_REPORTS_SUCCESS',
        generation: 0,
        page: {
          items: [
            {
              id: 'r1',
              title: 'Mi reporte',
              severity: 'HIGH',
              status: 'OPEN',
              coordinationCode: 'coord-negocios',
              coordinationName: 'Negocios',
              createdAt: '2026-09-01T10:00:00.000Z',
              canResolve: false,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      },
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
    )
    // Sigue cargada y con su contenido, aunque la carta sea otra.
    expect(cargada.myReports.status).toBe('ready')
    expect(cargada.myReports.items).toHaveLength(1)
    expect(cargada.myReports.items[0].coordinationCode).toBe('coord-negocios')
  })

  it('la segunda página acumula en lugar de reemplazar', () => {
    const hacerPagina = (page: number, id: string) =>
      ({
        type: 'LOAD_MY_REPORTS_SUCCESS',
        generation: 0,
        page: {
          items: [
            {
              id,
              title: id,
              severity: 'LOW',
              status: 'CLOSED',
              coordinationCode: null,
              coordinationName: null,
              createdAt: '2026-09-01T10:00:00.000Z',
              canResolve: false,
            },
          ],
          total: 2,
          page,
          limit: 20,
        },
      }) as OperationalCardsAction

    const state = reduce(READY, hacerPagina(1, 'r1'), hacerPagina(2, 'r2'))
    expect(state.myReports.items.map((r) => r.id)).toEqual(['r1', 'r2'])
  })
})
