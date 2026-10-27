import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * El detalle del problema no toca IA: la apertura pide solo la situación, el
 * impacto sale de lo que registraron personas y la cronología descarta los
 * eventos del circuito de IA.
 */

const {
  fetchSituation,
  fetchSituationTimeline,
  fetchSituationEvidences,
  loadAnalysis,
  fetchSituationRecommendations,
} = vi.hoisted(() => ({
  fetchSituation: vi.fn(),
  fetchSituationTimeline: vi.fn(),
  fetchSituationEvidences: vi.fn(),
  loadAnalysis: vi.fn(),
  fetchSituationRecommendations: vi.fn(),
}))

vi.mock('@/modules/api/situations.api', () => ({ fetchSituation }))
vi.mock('@/modules/api/timeline.api', () => ({ fetchSituationTimeline }))
vi.mock('@/modules/api/evidences.api', () => ({ fetchSituationEvidences }))
vi.mock('@/modules/services/situationAnalysis.service', () => ({
  loadAnalysis,
}))
vi.mock('@/modules/api/recommendations.api', () => ({
  fetchSituationRecommendations,
}))

const {
  fetchProblemDetail,
  fetchProblemEvidences,
  fetchProblemTimeline,
  toProblemDetail,
} =
  await import('@/modules/operational-cards/services/problem-detail.service')

const SITUATION = {
  id: 'p1',
  title: 'Entrega de notas retrasada',
  description: 'Faltan las notas del corte 2.\nAfecta el cierre de ciclo.',
  reportKind: 'INTER_COORDINATION',
  coordinationId: 'c1',
  coordinationCode: 'coord-b2b',
  coordinationName: 'B2B',
  affectedCoordinationCode: 'coord-negocios',
  affectedCoordinationName: 'Negocios',
  affectedProcess: 'Cierre académico',
  pendingDelivery: 'Planilla de notas',
  createdByUserId: 'u1',
  createdByUserName: 'Autor',
  categoryId: null,
  categoryCode: null,
  categoryName: null,
  severity: 'HIGH',
  status: 'OPEN',
  occurredAt: '2026-09-01T10:00:00.000Z',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  relatedCoordinations: [
    {
      id: 'r2',
      coordinationId: 'c3',
      coordinationCode: 'coord-transversales',
      coordinationName: 'Transversales',
      coordinationShortName: 'TRV',
      displayOrder: 3,
    },
    {
      id: 'r1',
      coordinationId: 'c2',
      coordinationCode: 'coord-negocios',
      coordinationName: 'Negocios',
      coordinationShortName: 'NEG',
      displayOrder: 2,
    },
  ],
} as const

describe('problem-detail.service · sin IA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('abrir un problema pide solo la situación', async () => {
    fetchSituation.mockResolvedValue(SITUATION)

    const detail = await fetchProblemDetail('p1')

    expect(fetchSituation).toHaveBeenCalledWith('p1')
    expect(loadAnalysis).not.toHaveBeenCalled()
    expect(fetchSituationRecommendations).not.toHaveBeenCalled()
    expect(detail.description).toBe(SITUATION.description)
  })

  it('las coordinaciones relacionadas no llegan al detalle; responsable y afectada sí', () => {
    const detail = toProblemDetail(SITUATION as never)

    // No representan un impacto medido: el detalle no las expone.
    expect(detail).not.toHaveProperty('relatedCoordinations')
    expect(detail).not.toHaveProperty('impact')
    expect(detail.coordinationName).toBe('B2B')
    expect(detail.affectedCoordinationName).toBe('Negocios')
  })

  it('la descripción llega íntegra, sin recortar ni deduplicar', () => {
    const legacy =
      'Texto del reporte.\n\n---\nContexto reportado por el usuario:\nNotas adicionales: repetida en las notas.'
    const detail = toProblemDetail({ ...SITUATION, description: legacy } as never)
    expect(detail.description).toBe(legacy)
  })

  it('la cronología descarta los eventos de IA y de recomendaciones', async () => {
    const entry = (id: string, eventType: string) => ({
      id,
      situationId: 'p1',
      userId: null,
      userName: null,
      eventType,
      title: id,
      description: '',
      metadata: null,
      createdAt: '2026-09-01T10:00:00.000Z',
    })
    fetchSituationTimeline.mockResolvedValue({
      situationId: 'p1',
      total: 7,
      items: [
        entry('creado', 'SITUATION_CREATED'),
        entry('analisis', 'AI_ANALYZED'),
        entry('reanalisis', 'AI_REANALYZED'),
        entry('recomendacion', 'RECOMMENDATION_GENERATED'),
        entry('estado', 'STATUS_CHANGED'),
        entry('sla', 'SLA_WARNING'),
        entry('cierre', 'CLOSED'),
      ],
    })

    const items = await fetchProblemTimeline('p1')

    expect(items.map((item) => item.id)).toEqual([
      'creado',
      'estado',
      'sla',
      'cierre',
    ])
  })

  it('una respuesta sin `items` es un error de la sección, no un fallo del panel', async () => {
    // Contrato roto (p. ej. `[]` en lugar de `{ items }`): debe rechazarse para
    // que la vista muestre el error con reintento en vez de romperse.
    fetchSituationEvidences.mockResolvedValue([])
    await expect(fetchProblemEvidences('p1')).rejects.toThrow(
      'formato esperado',
    )
    fetchSituationTimeline.mockResolvedValue({ situationId: 'p1' })
    await expect(fetchProblemTimeline('p1')).rejects.toThrow('formato esperado')
  })
})
