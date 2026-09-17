import { describe, expect, it } from 'vitest'
import {
  initialOperationalCardsState,
  operationalCardsReducer,
  type OperationalCardsAction,
} from '@/modules/operational-cards/state/operationalCards.reducer'
import type { OperationalCardsState } from '@/modules/operational-cards/types/operational-cards.state'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * CORRESPONDENCIA DE LAS REACCIONES (fase 2.2).
 *
 * El significado funcional vive en el reducer, no en el personaje: aquí se fija
 * que un problema recién aparecido produzca MALESTAR y uno recién resuelto
 * ALIVIO, y que ninguna otra situación produzca reacción alguna.
 */

const coordinacion = (code: string, id: string) => ({
  id,
  code,
  name: code,
  shortName: code,
  color: '#fff',
  displayOrder: 1,
  status: 'ESTABLE',
  activeProblemsCount: 0,
  criticalCount: 0,
  affectedCoordinationCount: 0,
})

const OVERVIEW = {
  directionStatus: 'ESTABLE',
  generatedAt: '2026-09-16T10:00:00.000Z',
  totals: { critical: 0, alert: 0, stable: 2 },
  coordinations: [
    coordinacion('coord-b2b', 'uuid-a'),
    coordinacion('coord-negocios', 'uuid-b'),
  ],
  analystRegistry: {
    status: 'ESTABLE',
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
  },
} as unknown as OperationalOverview

const DETALLE_CERRADO = {
  id: 'p1',
  title: 'Problema',
  severity: 'HIGH',
  status: 'CLOSED',
  slaHealth: null,
  dueAt: null,
  summary: 'Resumen',
  coordinationName: 'B2B',
  coordinationCode: 'coord-b2b',
  createdByUserName: 'Autor',
  createdAt: '2026-09-01T10:00:00.000Z',
  impact: null,
  intelligence: null,
  canResolve: false,
  resolution: {
    learning: 'Lo aprendido',
    resolvedByUserName: 'Coordinadora',
    resolvedAt: '2026-09-16T12:00:00.000Z',
  },
} as ProblemDetail

function reduce(...acciones: OperationalCardsAction[]): OperationalCardsState {
  return acciones.reduce(
    (estado, accion) => operationalCardsReducer(estado, accion),
    initialOperationalCardsState,
  )
}

const LISTO: OperationalCardsAction = {
  type: 'LOAD_OVERVIEW_SUCCESS',
  overview: OVERVIEW,
}

describe('reacción al REPORTE confirmado', () => {
  const tras = reduce(
    LISTO,
    { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
    { type: 'SUBMIT_REPORT', targetKey: 'coord-b2b' },
    {
      type: 'SUBMIT_REPORT_SUCCESS',
      targetKey: 'coord-b2b',
      coordinationCode: 'coord-b2b',
      problemId: 'p-nuevo',
    },
  )

  it('expresa MALESTAR: dispara disapprove', () => {
    expect(tras.pendingCharacterReaction).toMatchObject({
      kind: 'report-confirmed',
      trigger: 'disapprove',
      coordinationCode: 'coord-b2b',
    })
  })

  it('no la pide al pulsar el botón ni al iniciar la petición', () => {
    const enviando = reduce(
      LISTO,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      { type: 'SUBMIT_REPORT', targetKey: 'coord-b2b' },
    )
    expect(enviando.pendingCharacterReaction).toBeNull()
  })

  it('un fallo de validación, permiso, IA o red no produce reacción', () => {
    const fallo = reduce(
      LISTO,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      { type: 'SUBMIT_REPORT', targetKey: 'coord-b2b' },
      { type: 'SUBMIT_REPORT_ERROR', message: 'La IA no respondió' },
    )
    expect(fallo.pendingCharacterReaction).toBeNull()
  })
})

describe('reacción a la RESOLUCIÓN confirmada', () => {
  const base = reduce(
    LISTO,
    { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
    { type: 'SELECT_PROBLEM', problemId: 'p1' },
    { type: 'SUBMIT_RESOLUTION', problemId: 'p1' },
  )

  const tras = operationalCardsReducer(base, {
    type: 'SUBMIT_RESOLUTION_SUCCESS',
    problemId: 'p1',
    detail: DETALLE_CERRADO,
  })

  it('expresa ALIVIO: dispara approve', () => {
    expect(tras.pendingCharacterReaction).toMatchObject({
      kind: 'resolution-confirmed',
      trigger: 'approve',
      coordinationCode: 'coord-b2b',
    })
  })

  it('solo tras persistir el aprendizaje que devuelve el servidor', () => {
    expect(tras.level2.detail?.resolution?.learning).toBe('Lo aprendido')
    expect(tras.level2.detail?.status).toBe('CLOSED')
  })

  it('no la pide al iniciar la petición', () => {
    expect(base.pendingCharacterReaction).toBeNull()
  })

  it('un fallo al resolver no produce reacción y conserva el aprendizaje', () => {
    const conTexto = operationalCardsReducer(base, {
      type: 'SET_LEARNING_DRAFT',
      problemId: 'p1',
      learning: 'No se pierde',
    })
    const fallo = operationalCardsReducer(conTexto, {
      type: 'SUBMIT_RESOLUTION_ERROR',
      message: 'Sin red',
    })
    expect(fallo.pendingCharacterReaction).toBeNull()
    expect(fallo.learningDrafts.p1).toBe('No se pierde')
  })

  it('se atribuye al ÁREA RESPONSABLE aunque el usuario cambie de carta', () => {
    /*
     * Si mientras viajaba la petición el usuario se fue a otra coordinación, el
     * hecho sigue perteneciendo a la responsable del problema: ni se atribuye a
     * la nueva ni se le devuelve a la fuerza a la anterior.
     */
    const cambiado = operationalCardsReducer(base, {
      type: 'SELECT_COORDINATION',
      code: 'coord-negocios',
    })
    const ok = operationalCardsReducer(cambiado, {
      type: 'SUBMIT_RESOLUTION_SUCCESS',
      problemId: 'p1',
      detail: DETALLE_CERRADO,
    })

    expect(ok.pendingCharacterReaction?.coordinationCode).toBe('coord-b2b')
    expect(ok.selectedCoordinationCode).toBe('coord-negocios')
  })
})

describe('conflicto 409 al resolver', () => {
  const base = reduce(
    LISTO,
    { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
    { type: 'SELECT_PROBLEM', problemId: 'p1' },
    { type: 'LOAD_DETAIL', problemId: 'p1' },
    {
      type: 'LOAD_DETAIL_SUCCESS',
      problemId: 'p1',
      detail: { ...DETALLE_CERRADO, status: 'OPEN', resolution: null },
      generation: 0,
    },
    { type: 'SET_LEARNING_DRAFT', problemId: 'p1', learning: 'Mi texto' },
    { type: 'SUBMIT_RESOLUTION', problemId: 'p1' },
  )

  const tras = operationalCardsReducer(base, {
    type: 'SUBMIT_RESOLUTION_CONFLICT',
    problemId: 'p1',
    message: 'El problema ya fue solucionado.',
  })

  it('NO representa una resolución del usuario', () => {
    expect(tras.pendingCharacterReaction).toBeNull()
  })

  it('actualiza lo pertinente: lista, detalle y «Mis reportes»', () => {
    expect(tras.dataGeneration).toBe(base.dataGeneration + 1)
    expect(tras.problemsByCoordination['coord-b2b']).toBeUndefined()
    expect(tras.level1.status).toBe('idle')
    expect(tras.myReports.status).toBe('idle')
    // El detalle obsoleto se descarta y se vuelve a pedir.
    expect(tras.detailByProblem.p1).toBeUndefined()
    expect(tras.level2.status).toBe('idle')
  })

  it('no invita a reenviar algo que ya está cerrado', () => {
    expect(tras.submission.confirmedButStale).toBe(true)
    expect(tras.submission.status).toBe('error')
  })

  it('conserva el texto que el usuario escribió', () => {
    expect(tras.learningDrafts.p1).toBe('Mi texto')
  })
})

describe('idempotencia del evento', () => {
  it('se consume una sola vez, y un refresco no lo repite', () => {
    const conReaccion = reduce(
      LISTO,
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

    // Un refresco posterior del resumen no la resucita.
    const refrescado = operationalCardsReducer(consumida, {
      type: 'LOAD_OVERVIEW_SUCCESS',
      overview: OVERVIEW,
    })
    expect(refrescado.pendingCharacterReaction).toBeNull()
  })

  it('dos operaciones seguidas producen identificadores distintos', () => {
    const primera = reduce(
      LISTO,
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      { type: 'SUBMIT_REPORT', targetKey: 'coord-b2b' },
      {
        type: 'SUBMIT_REPORT_SUCCESS',
        targetKey: 'coord-b2b',
        coordinationCode: 'coord-b2b',
        problemId: 'p1',
      },
    )
    const idUno = primera.pendingCharacterReaction!.id

    const consumida = operationalCardsReducer(primera, {
      type: 'CONSUME_CHARACTER_REACTION',
      id: idUno,
    })
    const segunda = [
      { type: 'SUBMIT_REPORT', targetKey: 'coord-b2b' },
      {
        type: 'SUBMIT_REPORT_SUCCESS',
        targetKey: 'coord-b2b',
        coordinationCode: 'coord-b2b',
        problemId: 'p2',
      },
    ].reduce(
      (e, a) => operationalCardsReducer(e, a as OperationalCardsAction),
      consumida,
    )

    expect(segunda.pendingCharacterReaction!.id).toBeGreaterThan(idUno)
  })
})
