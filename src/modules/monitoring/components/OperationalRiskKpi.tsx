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
      className="operational-risk-kpi flex min-h-[10.5rem] flex-col"
      style={
        {
          '--risk-card-gap': '0.5rem',
          '--risk-card-radius': '0.25rem',
          '--risk-card-value-size': '1rem',
          '--risk-kpi-gap': '0.625rem',
        } as CSSProperties
      }
      aria-labelledby="operational-risk-heading"
    >
      <header className="shrink-0">
        <p id="operational-risk-heading" className={TEXT_LABEL}>
          Riesgo operativo
        </p>
        <p className="mt-0.5 text-[10px] font-medium tracking-wide text-slate-500">
          Estado general del área
        </p>
      </header>

      <div
        className="flex flex-[5.5] flex-col justify-center gap-[var(--risk-kpi-gap)] py-1"
        style={{ minHeight: 0 }}
      >
        <div className="flex flex-[3] items-center justify-center">
          <TechnicalRiskGauge
            value={health.operationalRiskPercentage}
            level={environmentToRiskLevel(environment)}
            label="Riesgo"
            size={108}
          />
        </div>
        <div className="flex flex-[2] items-end">
          <RiskSummaryCards
            cumplidos={health.fulfilledCount}
            incumplidos={health.breachedCount}
          />
        </div>
      </div>
    </section>
  )
}
