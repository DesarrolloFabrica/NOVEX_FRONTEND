// Tarjetas compactas — cumplidos e incumplidos bajo el donut de riesgo.

interface RiskSummaryCardsProps {
  cumplidos: number
  incumplidos: number
}

interface SummaryCardProps {
  label: string
  value: number
  tone: 'fulfilled' | 'breached'
}

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  const toneClasses =
    tone === 'fulfilled'
      ? 'border-emerald-200/80 bg-emerald-50/45 text-emerald-800'
      : 'border-red-200/80 bg-red-50/40 text-red-800'

  return (
    <div
      className={`risk-summary-card flex min-w-0 flex-col gap-1 rounded-[var(--risk-card-radius,0.25rem)] border px-2 py-1.5 ${toneClasses}`}
    >
      <span className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
        {label}
      </span>
      <span
        className="risk-summary-card__value font-mono text-base font-bold tabular-nums leading-none"
        style={{ fontSize: 'var(--risk-card-value-size, 1rem)' }}
      >
        {value}
      </span>
    </div>
  )
}

export function RiskSummaryCards({ cumplidos, incumplidos }: RiskSummaryCardsProps) {
  return (
    <div
      className="risk-summary-cards grid grid-cols-2 gap-[var(--risk-card-gap,0.5rem)]"
      role="group"
      aria-label="Distribución de cumplimiento"
    >
      <SummaryCard label="Cumplidos" value={cumplidos} tone="fulfilled" />
      <SummaryCard label="Incumplidos" value={incumplidos} tone="breached" />
    </div>
  )
}
