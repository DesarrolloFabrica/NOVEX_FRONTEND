import { describe, expect, it } from 'vitest'
import {
  compareExecutive,
  heatRatio,
  sortDirectionCoordinations,
} from '@/modules/operational-cards/experience/director/director-direction.sort'
import { kpiCoordinationFixture } from '@/modules/operational-cards/experience/director/director-kpi.fixture'

describe('orden ejecutivo DIRECTOR', () => {
  it('prioriza CRÍTICO, luego ALERTA, luego críticos y activos', () => {
    const stableBusy = kpiCoordinationFixture(0, {
      integrityStatus: 'ESTABLE',
      problems: {
        activeCount: 40,
        status: { open: 40, inProgress: 0 },
        severity: { critical: 0, high: 0, medium: 0, low: 40 },
      },
    })
    const alert = kpiCoordinationFixture(1, {
      integrityStatus: 'ALERTA',
      problems: {
        activeCount: 2,
        status: { open: 2, inProgress: 0 },
        severity: { critical: 1, high: 0, medium: 0, low: 1 },
      },
    })
    const criticalA = kpiCoordinationFixture(2, {
      integrityStatus: 'CRITICO',
      problems: {
        activeCount: 3,
        status: { open: 3, inProgress: 0 },
        severity: { critical: 1, high: 0, medium: 0, low: 2 },
      },
    })
    const criticalB = kpiCoordinationFixture(3, {
      integrityStatus: 'CRITICO',
      problems: {
        activeCount: 8,
        status: { open: 8, inProgress: 0 },
        severity: { critical: 2, high: 0, medium: 0, low: 6 },
      },
    })
    const unknown = kpiCoordinationFixture(4, {
      integrityStatus: 'DESCONOCIDO',
      lifePoints: null,
    })

    const ordered = sortDirectionCoordinations(
      [stableBusy, unknown, alert, criticalA, criticalB],
      'executive',
      'desc',
    )
    expect(ordered.map((row) => row.coordination.code)).toEqual([
      criticalB.coordination.code,
      criticalA.coordination.code,
      alert.coordination.code,
      stableBusy.coordination.code,
      unknown.coordination.code,
    ])
    expect(compareExecutive(criticalB, criticalA)).toBeLessThan(0)
  })
})

describe('heatmap por columna', () => {
  it('no compara activos contra críticos: cada escala usa su máximo', () => {
    expect(heatRatio(12, 12)).toBe(1)
    expect(heatRatio(3, 3)).toBe(1)
    expect(heatRatio(3, 12)).toBe(0.25)
    expect(heatRatio(0, 12)).toBe(0)
  })
})
