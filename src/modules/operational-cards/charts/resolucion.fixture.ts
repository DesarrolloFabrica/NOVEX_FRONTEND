import type {
  OperationalKpiFlowBucket,
  OperationalKpiResolution,
  OperationalKpiResolutionBandKey,
} from '@/modules/operational-cards/types/operational-kpi.types'

const BANDS: ReadonlyArray<{
  key: OperationalKpiResolutionBandKey
  fromHours: number
  toHours: number | null
}> = [
  { key: 'lt-1d', fromHours: 0, toHours: 24 },
  { key: '1-3d', fromHours: 24, toHours: 72 },
  { key: '3-7d', fromHours: 72, toHours: 168 },
  { key: '7-14d', fromHours: 168, toHours: 336 },
  { key: '14-30d', fromHours: 336, toHours: 720 },
  { key: '30d+', fromHours: 720, toHours: null },
]

/**
 * RESOLUCIÓN de prueba DERIVADA de los buckets de flujo: cuadra por
 * construcción con los «Solucionados» (closedCount = solved.total; futuro =
 * null; 0 cierres = sin mediana). `seed` cambia medianas y rangos para que
 * otra carta u otro periodo se lean distinto. Determinista.
 */
export function resolutionFixture(
  flowBuckets: readonly Pick<OperationalKpiFlowBucket, 'start' | 'solved'>[],
  seed = 0,
): OperationalKpiResolution {
  const counts = new Map<OperationalKpiResolutionBandKey, number>(BANDS.map((b) => [b.key, 0]))
  const medians: number[] = []
  const buckets = flowBuckets.map((flow, index) => {
    const n = flow.solved ? flow.solved.total : null
    if (n === null || n === 0) {
      return { start: flow.start, closedCount: n, medianDays: null, p75Days: null }
    }
    const median = Math.round((0.6 + ((index * 7 + seed * 5) % 23) + seed * 0.3) * 10) / 10
    medians.push(median)
    for (let k = 0; k < n; k += 1) {
      const band = BANDS[(k + index + seed) % BANDS.length].key
      counts.set(band, (counts.get(band) ?? 0) + 1)
    }
    return {
      start: flow.start,
      closedCount: n,
      medianDays: median,
      p75Days: Math.round(median * 1.6 * 10) / 10,
    }
  })
  const closedCount = buckets.reduce((sum, b) => sum + (b.closedCount ?? 0), 0)
  const sorted = [...medians].sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  return {
    semantics: 'closed-in-period-duration-since-created',
    closedCount,
    medianDays: closedCount > 0 ? median : null,
    p75Days: closedCount > 0 && median !== null ? Math.round(median * 1.6 * 10) / 10 : null,
    buckets,
    distribution: BANDS.map((band) => ({ ...band, count: counts.get(band.key) ?? 0 })),
  }
}
