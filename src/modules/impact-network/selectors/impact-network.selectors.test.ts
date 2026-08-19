import { describe, expect, it } from 'vitest'
import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import {
  IMPACT_PREDICTIONS,
  IMPACT_REPLAYS,
} from '@/modules/impact-network/data/impact-scenarios.mock'
import type {
  ImpactIncident,
  IncidentReplay,
} from '@/modules/impact-network/types/impact-network.types'
import {
  setCoordinationCatalog,
  type CoordinationDefinition,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import {
  aggregateAreaSignals,
  aggregateDependencyTraffic,
  buildReplayFrames,
  buildStarPropagationFrames,
  deriveNetworkStatus,
  filterImpactIncidents,
  mapOperationalEventToImpactIncident,
  placeIncidentSlots,
  prioritizeImpactIncidents,
  selectFocusedPropagation,
  selectOperationalFocus,
  selectReplayFrameAt,
} from '@/modules/impact-network/selectors/impact-network.selectors'

const TEST_CATALOG: CoordinationDefinition[] = [
  {
    id: 'coord-ingenierias',
    uuid: '22222222-2222-2222-2222-222222222222',
    name: 'Coordinador Ingenierías',
    shortName: 'Ingenierías',
    islandAsset: '/islas/CoordGeneral.webp',
    color: '#00B8D9',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'coord-operaciones-academicas',
    uuid: '33333333-3333-3333-3333-333333333333',
    name: 'Coordinador Operaciones Académicas',
    shortName: 'Op. Académicas',
    islandAsset: '/islas/CoordDesarrolloprof.webp',
    color: '#6554C0',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'coord-empresarial',
    uuid: '44444444-4444-4444-4444-444444444444',
    name: 'Coordinador Empresarial',
    shortName: 'Empresarial',
    islandAsset: '/islas/CoordB2B.webp',
    color: '#5B7CFA',
    displayOrder: 3,
    isActive: true,
  },
]


function makeIncident(
  eventId: string,
  overrides: Partial<ImpactIncident> = {},
): ImpactIncident {
  return {
    eventId,
    title: `Situación ${eventId}`,
    status: 'open',
    sourceAreaId: 'technology',
    sourceAreaName: 'Tecnología',
    riskLevel: 'moderate',
    riskScore: 50,
    impactSeverity: 3,
    affectedAreaIds: ['technology', 'registry'],
    affectedAreaNames: ['Tecnología', 'Registro'],
    reportedAt: '2026-07-20T10:00:00.000Z',
    lastUpdateAt: '2026-07-20T10:05:00.000Z',
    active: true,
    expansionState: 'active',
    hasInterpretation: true,
    categoryCode: 'INTERNET',
    categoryName: 'Internet',
    categoryIcon: 'internet',
    ...overrides,
  }
}

describe('mapeo de OperationalEvent', () => {
  it('normaliza el catálogo frontend sin perder la identidad del expediente', () => {
    const event = OPERATIONAL_EVENTS[0]
    expect(event).toBeDefined()
    const incident = mapOperationalEventToImpactIncident(event!)

    expect(incident).toMatchObject({
      eventId: 'evt-001',
      sourceAreaId: 'technology',
      sourceAreaName: 'Tecnología',
      riskLevel: 'critical',
      riskScore: 88,
      impactSeverity: 5,
      active: true,
      expansionState: 'active',
    })
    expect(incident.affectedAreaIds).toEqual([
      'technology',
      'academic-direction',
      'operations',
    ])
    expect(incident.affectedAreaNames).toEqual([
      'Tecnología',
      'Dirección Académica',
      'Operaciones',
    ])
  })

  it('resuelve eventos API por nombres backend aunque sus ids sean UUID', () => {
    const base = OPERATIONAL_EVENTS[0]!
    const backendEvent: OperationalEvent = {
      ...base,
      id: 'backend-event',
      sourceAreaId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sourceAreaName: 'Registro y Control',
      interpretation: {
        ...base.interpretation!,
        affectedAreaIds: [
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        ],
        affectedAreaNames: ['Tecnologia', 'Financiera'],
      },
    }

    expect(mapOperationalEventToImpactIncident(backendEvent)).toMatchObject({
      sourceAreaId: 'registry',
      sourceAreaName: 'Registro',
      affectedAreaIds: ['registry', 'technology', 'finance'],
    })
  })

  it('conserva un evento sin interpretación y no inventa riesgo', () => {
    const base = OPERATIONAL_EVENTS[0]!
    const incident = mapOperationalEventToImpactIncident({
      ...base,
      id: 'without-ai',
      interpretation: null,
      status: 'archived',
    })

    expect(incident.riskLevel).toBeNull()
    expect(incident.riskScore).toBe(0)
    expect(incident.impactSeverity).toBeNull()
    expect(incident.hasInterpretation).toBe(false)
    expect(incident.active).toBe(false)
    expect(incident.expansionState).toBe('closed')
  })
})

describe('filtros, prioridad y estado general', () => {
  const incidents = [
    makeIncident('critical', {
      sourceAreaId: 'registry',
      riskLevel: 'critical',
      riskScore: 94,
      reportedAt: '2026-07-22T23:59:59.999Z',
    }),
    makeIncident('moderate', {
      status: 'monitoring',
      riskLevel: 'moderate',
      riskScore: 50,
      reportedAt: '2026-07-21T12:00:00.000Z',
      expansionState: 'contained',
    }),
    makeIncident('resolved', {
      status: 'resolved',
      riskLevel: 'high',
      riskScore: 80,
      reportedAt: '2026-07-22T08:00:00.000Z',
      active: false,
      expansionState: 'recovering',
    }),
  ]

  it('aplica estado, origen, riesgo y fecha inclusiva sin mutar entradas', () => {
    const before = JSON.stringify(incidents)
    const result = filterImpactIncidents(incidents, {
      statuses: ['open'],
      sourceAreaIds: ['registry'],
      riskLevels: ['critical'],
      reportedFrom: '2026-07-22',
      reportedTo: '2026-07-22',
    })

    expect(result.map((incident) => incident.eventId)).toEqual(['critical'])
    expect(JSON.stringify(incidents)).toBe(before)
  })

  it('incluye eventos exactamente sobre límites ISO y excluye los exteriores', () => {
    const atStart = makeIncident('at-start', {
      reportedAt: '2026-07-22T08:00:00.000Z',
    })
    const atEnd = makeIncident('at-end', {
      reportedAt: '2026-07-22T10:00:00.000Z',
    })
    const before = makeIncident('before', {
      reportedAt: '2026-07-22T07:59:59.999Z',
    })
    const after = makeIncident('after', {
      reportedAt: '2026-07-22T10:00:00.001Z',
    })

    expect(
      filterImpactIncidents([before, atStart, atEnd, after], {
        statuses: [],
        sourceAreaIds: [],
        riskLevels: [],
        reportedFrom: '2026-07-22T08:00:00.000Z',
        reportedTo: '2026-07-22T10:00:00.000Z',
      }).map((incident) => incident.eventId),
    ).toEqual(['at-start', 'at-end'])
  })

  it('prioriza riesgo, severidad, alcance y antigüedad y excluye resueltas', () => {
    const tied = [
      makeIncident('later', {
        riskScore: 90,
        impactSeverity: 4,
        reportedAt: '2026-07-22T12:00:00.000Z',
      }),
      makeIncident('severity', {
        riskScore: 90,
        impactSeverity: 5,
        reportedAt: '2026-07-22T13:00:00.000Z',
      }),
      makeIncident('resolved-top', {
        status: 'resolved',
        riskLevel: 'critical',
        riskScore: 100,
        impactSeverity: 5,
        active: false,
        expansionState: 'recovering',
      }),
    ]

    expect(prioritizeImpactIncidents(tied).map((item) => item.eventId)).toEqual([
      'severity',
      'later',
    ])
    expect(selectOperationalFocus(tied)?.eventId).toBe('severity')
  })

  it('deriva Estable, Atención y Crítico únicamente desde incidentes activos', () => {
    expect(deriveNetworkStatus([])).toBe('stable')
    expect(
      deriveNetworkStatus([
        makeIncident('low', { riskLevel: 'low', riskScore: 20 }),
      ]),
    ).toBe('stable')
    expect(
      deriveNetworkStatus([
        makeIncident('moderate', { riskLevel: 'moderate' }),
      ]),
    ).toBe('attention')
    expect(
      deriveNetworkStatus([
        makeIncident('resolved-critical', {
          status: 'resolved',
          riskLevel: 'critical',
          active: false,
          expansionState: 'recovering',
        }),
      ]),
    ).toBe('stable')
    expect(
      deriveNetworkStatus([
        makeIncident('critical', { riskLevel: 'critical' }),
      ]),
    ).toBe('critical')
  })
})

describe('agregación espacial y de tráfico', () => {
  const primary = makeIncident('primary', {
    sourceAreaId: 'technology',
    affectedAreaIds: ['technology', 'registry'],
    riskScore: 80,
    riskLevel: 'high',
  })
  const overlapping = makeIncident('overlapping', {
    sourceAreaId: 'infrastructure',
    sourceAreaName: 'Infraestructura',
    affectedAreaIds: ['infrastructure', 'technology', 'registry'],
    affectedAreaNames: ['Infraestructura', 'Tecnología', 'Registro'],
    riskScore: 60,
  })

  it('intensifica áreas compartidas y conserva roles del incidente enfocado', () => {
    const prediction = IMPACT_PREDICTIONS['evt-004']
    const combined = aggregateAreaSignals([primary, overlapping], undefined, {
      focusedEventId: 'primary',
      prediction,
    })
    const single = aggregateAreaSignals([primary])
    const technology = combined.find((area) => area.areaId === 'technology')
    const registry = combined.find((area) => area.areaId === 'registry')
    const library = combined.find((area) => area.areaId === 'library')

    expect(technology).toMatchObject({
      activeCount: 2,
      incidentCount: 2,
      maxRisk: 'high',
      maxRiskScore: 80,
      role: 'origin',
    })
    expect(technology?.roles).toEqual(['origin', 'affected'])
    expect(registry?.role).toBe('affected')
    expect(library?.role).toBe('potential')
    expect(technology!.intensity).toBeGreaterThan(
      single.find((area) => area.areaId === 'technology')!.intensity,
    )
  })

  it('deduplica aristas, acumula incidentes y no mezcla predicción con hechos', () => {
    const reachesFinance = makeIncident('finance-path', {
      sourceAreaId: 'technology',
      affectedAreaIds: ['technology', 'finance'],
      riskScore: 70,
      riskLevel: 'high',
    })
    const prediction = IMPACT_PREDICTIONS['evt-004']
    const traffic = aggregateDependencyTraffic(
      [primary, reachesFinance],
      undefined,
      prediction,
    )
    const shared = traffic.find(
      (edge) => edge.dependencyId === 'technology--registry',
    )
    const predicted = traffic.find(
      (edge) => edge.dependencyId === 'technology--library',
    )

    expect(traffic.map((edge) => edge.dependencyId)).toEqual(
      [...new Set(traffic.map((edge) => edge.dependencyId))],
    )
    expect(shared).toMatchObject({
      role: 'actual',
      incidentCount: 2,
      particleCount: 2,
      path: ['technology', 'registry'],
    })
    expect(shared!.strokeWidth).toBeGreaterThan(1.8)
    expect(shared!.strokeWidth).toBeLessThanOrEqual(4.5)
    expect(predicted).toMatchObject({
      role: 'predicted',
      incidentCount: 0,
      particleCount: 0,
    })
  })

  it('una superposición predictiva no altera métricas de las rutas reales', () => {
    const prediction = IMPACT_PREDICTIONS['evt-004']
    const actualOnly = aggregateDependencyTraffic([primary])
    const withPrediction = aggregateDependencyTraffic(
      [primary],
      undefined,
      prediction,
    )
    const realId = 'technology--registry'
    const predictedId = 'technology--library'

    expect(withPrediction.find((edge) => edge.dependencyId === realId)).toEqual(
      actualOnly.find((edge) => edge.dependencyId === realId),
    )
    expect(
      actualOnly.find((edge) => edge.dependencyId === predictedId),
    ).toMatchObject({
      role: 'base',
      incidentIds: [],
      incidentCount: 0,
      intensity: 0,
    })
    expect(
      withPrediction.find((edge) => edge.dependencyId === predictedId),
    ).toMatchObject({
      role: 'predicted',
      incidentIds: [],
      incidentCount: 0,
      particleCount: 0,
    })
  })
})

describe('slots de incidentes y frames del timeline', () => {
  it('asigna como máximo veinte ranuras deterministas y centra el foco', () => {
    const incidents = Array.from({ length: 21 }, (_, index) =>
      makeIncident(`slot-${String(index).padStart(2, '0')}`),
    )
    const first = placeIncidentSlots(incidents)
    const repeated = placeIncidentSlots(incidents)
    const focused = placeIncidentSlots(incidents, undefined, 'slot-05')

    expect(first).toHaveLength(20)
    expect(repeated).toEqual(first)
    expect(new Set(first.map((slot) => JSON.stringify(slot.position))).size).toBe(
      20,
    )
    expect(focused.find((slot) => slot.eventId === 'slot-05')).toMatchObject({
      position: { x: 900, y: 570 },
      focused: true,
      scale: 1,
      opacity: 1,
    })
    expect(
      focused
        .filter((slot) => !slot.focused)
        .every((slot) => slot.opacity === 0.32),
    ).toBe(true)
  })

  it('ordena pasos sin mutar el replay y acumula llegadas sincronizadas', () => {
    const replay: IncidentReplay = {
      eventId: 'timeline',
      traversalDurationMs: 1_000,
      settlementDurationMs: 250,
      steps: [
        {
          id: 'third',
          type: 'area_impacted',
          label: 'Registro afectado',
          at: '2026-07-22T08:37:00.000Z',
          offsetMs: 360_000,
          areaId: 'registry',
          dependencyId: 'technology--registry',
        },
        {
          id: 'first',
          type: 'detected',
          label: 'Problema detectado',
          at: '2026-07-22T08:31:00.000Z',
          offsetMs: 0,
        },
        {
          id: 'second',
          type: 'area_impacted',
          label: 'Tecnología afectada',
          at: '2026-07-22T08:34:00.000Z',
          offsetMs: 180_000,
          areaId: 'technology',
        },
      ],
    }
    const originalOrder = replay.steps.map((step) => step.id)
    const frames = buildReplayFrames(replay)

    expect(frames.map((frame) => frame.currentStep.id)).toEqual([
      'first',
      'second',
      'third',
    ])
    expect(frames.map((frame) => frame.playbackAtMs)).toEqual([0, 1_250, 2_500])
    expect(frames[2]).toMatchObject({
      completedStepIds: ['first', 'second'],
      futureStepIds: [],
      activeAreaIds: ['technology', 'registry'],
      activeDependencyIds: ['technology--registry'],
      complete: true,
    })
    expect(replay.steps.map((step) => step.id)).toEqual(originalOrder)
    expect(selectReplayFrameAt(replay, 1_300)?.currentStep.id).toBe('second')
  })

  it('construye propagación estrella solo desde el origen', () => {
    setCoordinationCatalog(TEST_CATALOG)
    const incident = mapOperationalEventToImpactIncident({
      ...OPERATIONAL_EVENTS[0]!,
      sourceAreaId: 'coord-ingenierias',
      sourceAreaName: 'Coordinador Ingenierías',
      interpretation: {
        ...OPERATIONAL_EVENTS[0]!.interpretation!,
        affectedAreaIds: [
          'coord-operaciones-academicas',
          'coord-empresarial',
        ],
        affectedAreaNames: [
          'Coordinador Operaciones Académicas',
          'Coordinador Empresarial',
        ],
      },
    })
    const propagation = selectFocusedPropagation(
      incident,
      null,
      undefined,
      ['coord-operaciones-academicas', 'coord-empresarial'],
    )
    const frames = buildStarPropagationFrames(
      IMPACT_REPLAYS['evt-001']!,
      'coord-ingenierias',
      propagation?.affectedCoordinationIds as CoordinationId[] ?? [],
    )

    expect(propagation?.originCoordinationId).toBe('coord-ingenierias')
    expect(propagation?.affectedCoordinationIds).toEqual([
      'coord-operaciones-academicas',
      'coord-empresarial',
    ])
    expect(frames[0]?.phase).toBe('origin_pulse')
    expect(frames.at(-1)?.complete).toBe(true)
    expect(
      frames.some((frame) => frame.activeEdgeId?.startsWith('coord-ingenierias-->')),
    ).toBe(true)
  })
})
