// Panel ejecutivo de riesgo operativo — donut + tarjetas de distribución.

import type { CSSProperties } from 'react'
import type { AreaHealth, EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { RiskDonut } from '@/modules/monitoring/components/RiskDonut'
import { RiskSummaryCards } from '@/modules/monitoring/components/RiskSummaryCards'
import { TEXT_LABEL } from '@/modules/monitoring/constants/monitoringTheme'

interface OperationalRiskKpiProps {
  health: AreaHealth
  environment: EnvironmentStatus
}

export function OperationalRiskKpi({ health, environment }: OperationalRiskKpiProps) {
  return (
    <section
      className="operational-risk-kpi flex min-h-[10.5rem] flex-col"
      style={
        {
          '--risk-donut-size': '6.75rem',
          '--risk-donut-stroke': '9px',
          '--risk-donut-value-size': '1.35rem',
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
          <RiskDonut
            percentage={health.operationalRiskPercentage}
            environment={environment}
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
