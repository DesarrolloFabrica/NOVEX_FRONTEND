import { describe, expect, it } from 'vitest'
import {
  abbreviateCategory,
  aprendizajesAriaLabel,
  aprendizajesChartHeight,
  APRENDIZAJES_CHART_MIN_HEIGHT,
  buildAprendizajesOption,
} from '@/modules/operational-cards/charts/aprendizajes-option'
import type { LearningCategory } from '@/modules/operational-cards/types/learnings.types'

const cat = (id: string, name: string, count: number, selectable = true): LearningCategory => ({
  id,
  code: id,
  name,
  selectable,
  count,
})

const CATEGORIES = [
  cat('b', 'Biblioteca', 2),
  cat('n', 'Internet', 5),
  cat('a', 'Aulas', 2),
  cat('old', 'Plataforma legado', 1, false),
]

type BarOption = {
  yAxis: { data: string[] }
  series: Array<{ type: string; data: Array<{ value: number }>; label: { show: boolean } }>
  legend?: unknown
  tooltip: { formatter: (params: unknown) => string }
}

describe('APRENDIZAJES POR CATEGORÍA · opción', () => {
  it('una serie de barras, cantidad ↓ · nombre ↑, cifras directas y sin leyenda', () => {
    const option = buildAprendizajesOption(CATEGORIES) as unknown as BarOption
    expect(option.yAxis.data).toEqual(['Internet', 'Aulas', 'Biblioteca', 'Plataforma legado'])
    expect(option.series).toHaveLength(1)
    expect(option.series[0].type).toBe('bar')
    expect(option.series[0].data.map((d) => d.value)).toEqual([5, 2, 2, 1])
    expect(option.series[0].label.show).toBe(true)
    expect(option.legend).toBeUndefined()
  })

  it('incluye todas las categorías recibidas, también las históricas', () => {
    const option = buildAprendizajesOption(CATEGORIES) as unknown as BarOption
    expect(option.yAxis.data).toHaveLength(CATEGORIES.length)
    const tip = option.tooltip.formatter([{ dataIndex: 3 }])
    expect(tip).toContain('Plataforma legado')
    expect(tip).toContain('1 aprendizaje')
    expect(tip).toContain('Categoría histórica')
  })

  it('tooltip con nombre completo y cantidad, escapando HTML', () => {
    const option = buildAprendizajesOption([cat('x', 'Redes <core>', 3)]) as unknown as BarOption
    const tip = option.tooltip.formatter([{ dataIndex: 0 }])
    expect(tip).toContain('Redes &lt;core&gt;')
    expect(tip).toContain('3 aprendizajes')
  })

  it('abrevia nombres largos en límite de palabra (completos en tooltip y aria)', () => {
    expect(abbreviateCategory('Plataformas académicas y sistemas de matrícula')).toBe(
      'Plataformas académicas y…',
    )
    expect(abbreviateCategory('Internet')).toBe('Internet')
    expect(aprendizajesAriaLabel(CATEGORIES)).toBe(
      'Aprendizajes por categoría: Internet, 5 aprendizajes; Aulas, 2 aprendizajes; Biblioteca, 2 aprendizajes; Plataforma legado, 1 aprendizaje.',
    )
  })

  it('el alto crece con las categorías (sin scroll interno de la gráfica)', () => {
    expect(aprendizajesChartHeight(1)).toBe(APRENDIZAJES_CHART_MIN_HEIGHT)
    expect(aprendizajesChartHeight(10)).toBeGreaterThan(aprendizajesChartHeight(4))
  })
})
