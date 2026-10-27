import { describe, expect, it } from 'vitest'
import {
  coveredFlowBuckets,
  flujoBucketCoverage,
  flujoCoverageNote,
  flujoCoverageTag,
  formatFlujoDay,
} from '@/modules/operational-cards/charts/flujo-coverage'
import type { OperationalKpiFlowBucket } from '@/modules/operational-cards/types/operational-kpi.types'

function slot(overrides: Partial<OperationalKpiFlowBucket>): OperationalKpiFlowBucket {
  const start = overrides.start ?? '2026-10-05'
  const end = overrides.end ?? '2026-10-11'
  return {
    start,
    end,
    dataEnd: end,
    calendarStart: start,
    calendarEnd: end,
    label: start,
    current: false,
    future: false,
    created: 1,
    closed: 0,
    backlog: 1,
    active: { total: 1, internal: 1, external: 0, internalBreakdown: [], externalBreakdown: [] },
    solved: { total: 0 },
    ...overrides,
  }
}

// Octubre 2026 visto por semanas con corte el 15 oct.
const OCT = [
  slot({ start: '2026-10-01', end: '2026-10-04', calendarStart: '2026-09-28', calendarEnd: '2026-10-04' }),
  slot({ start: '2026-10-05', end: '2026-10-11' }),
  slot({ start: '2026-10-12', end: '2026-10-18', dataEnd: '2026-10-15', current: true }),
  slot({ start: '2026-10-19', end: '2026-10-25', dataEnd: null, future: true, active: null, solved: null }),
  slot({
    start: '2026-10-26',
    end: '2026-10-31',
    calendarStart: '2026-10-26',
    calendarEnd: '2026-11-01',
    dataEnd: null,
    future: true,
    active: null,
    solved: null,
  }),
]

describe('flujo-coverage · tramos con cobertura temporal', () => {
  it('clasifica recortado, completo, en curso y futuro', () => {
    expect(OCT.map(flujoBucketCoverage)).toEqual([
      'clipped',
      'full',
      'in-progress',
      'future',
      'future',
    ])
  })

  it('excluye SOLO los futuros y conserva el orden (prefijo de la respuesta)', () => {
    const covered = coveredFlowBuckets(OCT)
    expect(covered.map((b) => b.start)).toEqual(['2026-10-01', '2026-10-05', '2026-10-12'])
    covered.forEach((b, i) => expect(b).toBe(OCT[i]))
  })

  it('el tramo actual se incluye aunque sea parcial', () => {
    expect(coveredFlowBuckets(OCT).at(-1)?.current).toBe(true)
  })

  it('marcas breves: PARCIAL (recorte de mes), EN CURSO (actual incompleto), ACTUAL (actual completo)', () => {
    expect(OCT.slice(0, 3).map(flujoCoverageTag)).toEqual(['PARCIAL', null, 'EN CURSO'])
    // Último día del tramo = hoy: está completo, sigue siendo el actual.
    expect(flujoCoverageTag(slot({ current: true }))).toBe('ACTUAL')
  })

  it('notas legibles con fechas del contrato, nunca «hoy»', () => {
    expect(flujoCoverageNote(OCT[0])).toBe(
      'Tramo parcial · semana del 28 sep al 4 oct, recortada al mes',
    )
    expect(flujoCoverageNote(OCT[2])).toBe('Tramo en curso · datos hasta el 15 oct')
    expect(flujoCoverageNote(OCT[1])).toBeNull()
    expect(formatFlujoDay('2025-12-31', true)).toBe('31 dic 2025')
  })
})
