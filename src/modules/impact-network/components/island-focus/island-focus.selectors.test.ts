import { beforeEach, describe, expect, it } from 'vitest'
import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import type { FocusedPropagation } from '@/modules/impact-network/types/impact-network.types'
import {
  setCoordinationCatalog,
  type CoordinationDefinition,
} from '@/modules/impact-network/data/coordination-islands.config'
import {
  isIslandFocusOrigin,
  resolveIslandAffectedBriefing,
  resolveIslandFocusRole,
  resolveIslandStageBriefing,
} from './island-focus.selectors'

const CATALOG: CoordinationDefinition[] = [
  {
    id: 'coord-operaciones-academicas',
    uuid: '1',
    name: 'Coordinador Operaciones Académicas',
    shortName: 'Op. Académicas',
    islandAsset: '/islas/CoordDesarrolloprof.webp',
    color: '#6554C0',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'coord-servicios',
    uuid: '2',
    name: 'Servicios',
    shortName: 'Servicios',
    islandAsset: '/islas/CoordServicios.webp',
    color: '#3DDC97',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'coord-empresarial',
    uuid: '3',
    name: 'Coordinador Empresarial',
    shortName: 'Empresarial',
    islandAsset: '/islas/CoordB2B.webp',
    color: '#5B7CFA',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'coord-general',
    uuid: '4',
    name: 'Coordinación General',
    shortName: 'General',
    islandAsset: '/islas/CoordGeneral.webp',
    color: '#4F8EF7',
    displayOrder: 4,
    isActive: true,
  },
]

const propagation: FocusedPropagation = {
  originCoordinationId: 'coord-operaciones-academicas',
  originName: 'Coordinador Operaciones Académicas',
  affectedCoordinationIds: ['coord-servicios', 'coord-empresarial'],
  affectedNames: [
    'Servicios',
    'Coordinador Empresarial',
  ],
  edges: [],
  propagationOrder: ['coord-servicios', 'coord-empresarial'],
  riskLevel: 'high',
}

beforeEach(() => {
  setCoordinationCatalog(CATALOG)
})

describe('resolveIslandFocusRole', () => {
  it('identifica origen y afectadas', () => {
    expect(resolveIslandFocusRole('coord-operaciones-academicas', propagation)).toBe(
      'origin',
    )
    expect(resolveIslandFocusRole('coord-servicios', propagation)).toBe(
      'affected',
    )
    expect(resolveIslandFocusRole('coord-general', propagation)).toBe('ambient')
  })
})

describe('resolveIslandAffectedBriefing', () => {
  it('usa el motivo del reporte ejecutivo cuando hay match por índice', () => {
    const event = OPERATIONAL_EVENTS.find((item) => item.id === 'evt-001')
    expect(event).toBeDefined()

    const briefing = resolveIslandAffectedBriefing(
      'coord-servicios',
      propagation,
      event!,
    )

    expect(briefing.role).toBe('affected')
    expect(briefing.reason.length).toBeGreaterThan(20)
    expect(briefing.propagationChain).toContain('Coordinador Operaciones Académicas')
  })

  it('no inventa motivo ni acciones cuando no hay reporte ejecutivo', () => {
    const base = OPERATIONAL_EVENTS[0]!
    const event: OperationalEvent = {
      ...base,
      interpretation: base.interpretation
        ? { ...base.interpretation, executiveReport: undefined }
        : null,
    }

    const briefing = resolveIslandAffectedBriefing(
      'coord-empresarial',
      propagation,
      event,
    )

    expect(briefing.reason).toContain('Sin lectura específica')
    expect(briefing.dependencies).toEqual([])
    expect(briefing.suggestedActions).toEqual([])
    expect(briefing.affectationLevel).toBeTruthy()
  })
})

describe('resolveIslandStageBriefing', () => {
  it('resume la isla origen con métricas de riesgo', () => {
    const event = OPERATIONAL_EVENTS.find((item) => item.id === 'evt-001')
    expect(event).toBeDefined()

    const stage = resolveIslandStageBriefing(
      'coord-operaciones-academicas',
      propagation,
      event!,
    )

    expect(stage.role).toBe('origin')
    expect(stage.coordinationName).toContain('Operaciones Académicas')
    expect(stage.topSummary.length).toBeGreaterThan(10)
    expect(stage.metrics.length).toBeGreaterThanOrEqual(2)
  })

  it('resume una isla afectada con cadena de propagación', () => {
    const event = OPERATIONAL_EVENTS.find((item) => item.id === 'evt-001')
    expect(event).toBeDefined()

    const stage = resolveIslandStageBriefing(
      'coord-servicios',
      propagation,
      event!,
    )

    expect(stage.role).toBe('affected')
    expect(stage.statusLabel).toBeTruthy()
    expect(stage.bottomDetail).toContain('Coordinador Operaciones Académicas')
  })
})

describe('isIslandFocusOrigin', () => {
  it('retorna true solo para la isla origen', () => {
    expect(isIslandFocusOrigin('coord-operaciones-academicas', propagation)).toBe(true)
    expect(isIslandFocusOrigin('coord-empresarial', propagation)).toBe(false)
  })
})
