import { describe, expect, it } from 'vitest'
import {
  buildAttentionDonutOption,
  buildSeverityBarsOption,
} from '@/modules/operational-cards/charts/DirectorEstadoCompositionCharts'

type WithTooltip = { tooltip?: { trigger?: string; confine?: boolean } }

/*
 * Las celdas de composición recortan su contenido (`overflow: hidden`), así que
 * un tooltip sin `confine` puede salirse del área visible. Mismo criterio que
 * flujo, antigüedad, resolución y aprendizajes.
 */
describe('composición de ESTADO · tooltips', () => {
  it('Severidad confina su tooltip al área de la gráfica', () => {
    const option = buildSeverityBarsOption({
      low: 1,
      medium: 2,
      high: 3,
      critical: 1,
    }) as WithTooltip
    expect(option.tooltip?.trigger).toBe('item')
    expect(option.tooltip?.confine).toBe(true)
  })

  it('Estado de atención confina su tooltip al área de la gráfica', () => {
    const option = buildAttentionDonutOption({ open: 3, inProgress: 2 }) as WithTooltip
    expect(option.tooltip?.trigger).toBe('item')
    expect(option.tooltip?.confine).toBe(true)
  })
})
