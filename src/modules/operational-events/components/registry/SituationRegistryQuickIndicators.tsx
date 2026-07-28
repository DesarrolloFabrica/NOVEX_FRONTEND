import type { SituationRegistryIndicators } from '@/modules/api/types/situation-registry.types'

interface SituationRegistryQuickIndicatorsProps {
  indicators: SituationRegistryIndicators
}

export function SituationRegistryQuickIndicators({
  indicators,
}: SituationRegistryQuickIndicatorsProps) {
  const chips = [
    { label: 'Con análisis IA', value: indicators.withAnalysis },
    { label: 'Sin análisis', value: indicators.withoutAnalysis },
    { label: 'Reanalizadas', value: indicators.reanalyzed },
    {
      label: 'Con recomendaciones pendientes',
      value: indicators.withPendingRecommendations,
    },
  ]

  return (
    <div className="cunmark-registry-chips" aria-label="Indicadores rápidos">
      {chips.map((chip) => (
        <span key={chip.label} className="cunmark-registry-chips__item">
          <strong>{chip.value}</strong>
          {chip.label}
        </span>
      ))}
    </div>
  )
}
