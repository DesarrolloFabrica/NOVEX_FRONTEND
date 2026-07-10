// Distribución compacta de alertas — barras proporcionales al máximo, no ancho completo.

import { CONTEXT_ROW_LABEL } from '@/modules/monitoring/constants/visualHierarchy'

interface AlertsDistributionProps {
  incumplidos: number
  criticos: number
  pendientes: number
}

interface AlertBarProps {
  label: string
  value: number
  maxValue: number
  barClass: string
  valueClass: string
}

const BAR_TRACK_MAX = '4.75rem'

function AlertBar({ label, value, maxValue, barClass, valueClass }: AlertBarProps) {
  const relativeWidth = (value / maxValue) * 100

  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`${CONTEXT_ROW_LABEL} text-xs`}>{label}</span>
        <span className={`font-mono text-xs font-semibold tabular-nums ${valueClass}`}>
          {value}
        </span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-sm bg-slate-200/70"
        style={{ width: BAR_TRACK_MAX }}
        role="presentation"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-sm transition-[width] duration-[600ms] ease-out ${barClass}`}
          style={{ width: `${relativeWidth}%` }}
        />
      </div>
    </div>
  )
}

export function AlertsDistribution({
  incumplidos,
  criticos,
  pendientes,
}: AlertsDistributionProps) {
  const maxAlertValue = Math.max(incumplidos, criticos, pendientes, 1)
  const total = incumplidos + criticos + pendientes

  return (
    <div
      className="alerts-distribution space-y-2"
      role="group"
      aria-label={`Alertas operativas, total ${total}`}
    >
      <AlertBar
        label="Incumplidos"
        value={incumplidos}
        maxValue={maxAlertValue}
        barClass="bg-red-500/90"
        valueClass="text-red-700"
      />
      <AlertBar
        label="Críticos"
        value={criticos}
        maxValue={maxAlertValue}
        barClass="bg-rose-600/85"
        valueClass="text-rose-800"
      />
      <AlertBar
        label="Pendientes"
        value={pendientes}
        maxValue={maxAlertValue}
        barClass="bg-amber-500/90"
        valueClass="text-amber-700"
      />
    </div>
  )
}
