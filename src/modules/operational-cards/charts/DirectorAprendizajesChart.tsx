import { useMemo } from 'react'
import { NovexEChart } from '@/modules/operational-cards/charts/NovexChart'
import { NovexChartFrame } from '@/modules/operational-cards/charts/NovexChartFrame'
import {
  aprendizajesAriaLabel,
  aprendizajesChartHeight,
  buildAprendizajesOption,
} from '@/modules/operational-cards/charts/aprendizajes-option'
import type { LearningCategory } from '@/modules/operational-cards/types/learnings.types'

/**
 * APRENDIZAJES POR CATEGORÍA del periodo COMPLETO. No filtra ni se filtra:
 * el filtro de categoría de las fichas no cambia su universo.
 */
export function DirectorAprendizajesChart({
  categories,
}: {
  categories: readonly LearningCategory[]
}) {
  const option = useMemo(() => buildAprendizajesOption(categories), [categories])
  const height = aprendizajesChartHeight(categories.length)

  return (
    <NovexChartFrame className="director-aprendizajes__chart-frame" testId="director-aprendizajes-chart-frame">
      <div className="director-aprendizajes__chart" style={{ height }}>
        <NovexEChart
          option={option}
          ariaLabel={aprendizajesAriaLabel(categories)}
          height={height}
          testId="director-aprendizajes-chart"
        />
      </div>
    </NovexChartFrame>
  )
}
