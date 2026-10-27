import type { ReactNode } from 'react'
import '@/styles/director-kpi-panel.css'

/**
 * Marco seguro del chart: altura reservada + zona libre de ornamentos.
 */
export function NovexChartFrame({
  children,
  className,
  testId = 'novex-chart-frame',
}: {
  children: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <div
      className={
        className
          ? `novex-chart-frame chart-safe-area director-evolution-chart-frame ${className}`
          : 'novex-chart-frame chart-safe-area director-evolution-chart-frame'
      }
      data-testid={testId}
    >
      {children}
    </div>
  )
}

export function NovexChartHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <div className="novex-chart-header">
      <p className="novex-chart-header__title">
        <span>{title}</span>
        {subtitle ? (
          <span className="novex-chart-header__sub"> · {subtitle}</span>
        ) : null}
      </p>
      {children}
    </div>
  )
}

export function NovexChartStat({
  label,
  value,
  testId,
}: {
  label: string
  value: number | string
  testId?: string
}) {
  return (
    <div className="novex-chart-stat">
      <span className="novex-chart-stat__label">{label}</span>
      <strong className="novex-chart-stat__value" data-testid={testId}>
        {value}
      </strong>
    </div>
  )
}

export function NovexChartSafeArea({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={
        className ? `chart-safe-area ${className}` : 'chart-safe-area'
      }
    >
      {children}
    </div>
  )
}
