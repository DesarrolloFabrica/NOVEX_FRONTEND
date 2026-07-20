// Panel ejecutivo de riesgo operativo — gauge técnico + tarjetas de distribución.

import type { CSSProperties } from 'react'
import type {
  AreaHealth,
  EnvironmentStatus,
} from '@/modules/monitoring/types/monitoring.types'
import { RiskSummaryCards } from '@/modules/monitoring/components/RiskSummaryCards'
import {
  TechnicalRiskGauge,
  type RiskLevel,
} from '@/modules/monitoring/components/TechnicalRiskGauge'
import { TEXT_LABEL } from '@/modules/monitoring/constants/monitoringTheme'

interface OperationalRiskKpiProps {
  health: AreaHealth
  environment: EnvironmentStatus
}

function environmentToRiskLevel(environment: EnvironmentStatus): RiskLevel {
  if (environment === 'critical') return 'critical'
  if (environment === 'attention') return 'attention'
  return 'stable'
}

export function OperationalRiskKpi({
  health,
  environment,
}: OperationalRiskKpiProps) {
  return (
    <section
      className="operational-risk-kpi flex flex-col gap-3"
      style={
        {
          '--risk-card-gap': '0.625rem',
          '--risk-card-radius': '0.25rem',
          '--risk-card-value-size': '1rem',
        } as CSSProperties
      }
      aria-labelledby="operational-risk-heading"
    >
      <header className="shrink-0">
        <p id="operational-risk-heading" className={TEXT_LABEL}>
          Riesgo operativo
        </p>
        <p className="mt-0.5 text-[10px] font-medium tracking-wide text-slate-500">
          Incumplido {health.breachedImpact}/{health.totalPossibleImpact} pts del área
        </p>
      </header>

      <div className="flex flex-col items-stretch gap-3">
        <div className="flex items-center justify-center py-1">
          <TechnicalRiskGauge
            value={health.operationalRiskPercentage}
            level={environmentToRiskLevel(environment)}
            label="Riesgo"
            size={108}
          />
        </div>
        <RiskSummaryCards
          cumplidos={health.fulfilledCount}
          incumplidos={health.breachedCount}
        />
      </div>
    </section>
  )
}
