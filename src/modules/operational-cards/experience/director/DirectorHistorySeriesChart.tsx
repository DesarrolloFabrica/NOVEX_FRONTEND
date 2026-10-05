import { useId, useState } from 'react'
import type {
  OperationalKpiHistoryGranularity,
  OperationalKpiHistoryMetric,
  OperationalKpiHistoryPoint,
} from '@/modules/operational-cards/types/operational-kpi.types'

const MONTH_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

function axisLabel(
  point: OperationalKpiHistoryPoint,
  granularity: OperationalKpiHistoryGranularity,
): string {
  if (granularity === 'cycle') {
    return point.label.includes('Ciclo 1')
      ? `H1 ${point.start.slice(0, 4)}`
      : `H2 ${point.start.slice(0, 4)}`
  }
  const monthIndex = Number(point.start.slice(5, 7)) - 1
  const month = MONTH_SHORT[monthIndex] ?? point.start.slice(5)
  if (granularity === 'week') {
    const day = Number(point.start.slice(8, 10))
    return `${day} ${month}`
  }
  return month
}

function metricLabel(metric: OperationalKpiHistoryMetric): string {
  if (metric === 'created') return 'Presentados'
  if (metric === 'closed') return 'Cerrados'
  return 'Backlog'
}

/** Sparse labels: first, last, and up to two midpoints with distinct months. */
function shouldShowAxisLabel(
  index: number,
  series: readonly OperationalKpiHistoryPoint[],
  granularity: OperationalKpiHistoryGranularity,
): boolean {
  const total = series.length
  if (total <= 3) return true
  if (index === 0 || index === total - 1) return true
  if (granularity === 'week' || granularity === 'month') {
    const monthOf = (i: number) => series[i]?.start.slice(5, 7)
    const mid = Math.floor(total / 2)
    const third = Math.floor((total * 2) / 3)
    if (index === mid || index === third) {
      return monthOf(index) !== monthOf(0) && monthOf(index) !== monthOf(total - 1)
    }
    return false
  }
  const step = Math.ceil(total / 3)
  return index % step === 0
}

function pointX(index: number, total: number): number {
  if (total <= 1) return 50
  return 4 + (index / (total - 1)) * 92
}

function pointY(value: number, maxValue: number): number {
  return maxValue === 0 ? 34 : 34 - (value / maxValue) * 26
}

/** Step-after path: holds level until the next bucket, then steps. */
function buildStepPath(
  series: readonly OperationalKpiHistoryPoint[],
  maxValue: number,
): string {
  if (series.length === 0) return ''
  const parts: string[] = [
    `M ${pointX(0, series.length)} ${pointY(series[0].value, maxValue)}`,
  ]
  for (let index = 1; index < series.length; index += 1) {
    const x = pointX(index, series.length)
    const prevY = pointY(series[index - 1].value, maxValue)
    const y = pointY(series[index].value, maxValue)
    parts.push(`L ${x} ${prevY}`)
    parts.push(`L ${x} ${y}`)
  }
  return parts.join(' ')
}

export function DirectorHistorySeriesChart({
  metric,
  granularity,
  series,
  testId = 'director-history-chart',
}: {
  metric: OperationalKpiHistoryMetric
  granularity: OperationalKpiHistoryGranularity
  series: readonly OperationalKpiHistoryPoint[]
  testId?: string
}) {
  const maxValue = Math.max(0, ...series.map((point) => point.value))
  const chartKind = metric === 'backlog' ? 'step' : 'bars'
  const tooltipId = useId()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const maxIndex = series.reduce(
    (best, point, index) =>
      point.value > (series[best]?.value ?? Number.NEGATIVE_INFINITY)
        ? index
        : best,
    0,
  )
  const lastIndex = series.length - 1
  const hoverPoint = hoverIndex !== null ? series[hoverIndex] : null

  return (
    <div
      className="director-history__chart director-history__chart--safe"
      data-testid={testId}
      data-kind={chartKind}
      key={`${metric}-${granularity}-${series.length}`}
    >
      {chartKind === 'step' ? (
        <div className="director-history__line">
          <svg
            viewBox="0 0 100 44"
            preserveAspectRatio="none"
            className="director-history__line-svg"
            role="img"
            aria-label={`Serie ${metric}`}
          >
            <line
              x1="4"
              y1="36"
              x2="96"
              y2="36"
              className="director-history__baseline"
            />
            <path
              d={buildStepPath(series, maxValue)}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinejoin="miter"
              vectorEffect="non-scaling-stroke"
              className="director-history__step"
            />
            {series.map((point, index) => {
              const x = pointX(index, series.length)
              const y = pointY(point.value, maxValue)
              const isCurrent = index === lastIndex
              const isMax = index === maxIndex && !isCurrent
              if (!isCurrent && !isMax) {
                return (
                  <rect
                    key={`${point.start}-${point.end}`}
                    x={x - 4}
                    y={0}
                    width={8}
                    height={44}
                    fill="transparent"
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                )
              }
              return (
                <g key={`${point.start}-${point.end}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isCurrent ? 2.8 : 1.8}
                    className={
                      isCurrent
                        ? 'director-history__mark director-history__mark--current'
                        : 'director-history__mark director-history__mark--max'
                    }
                    data-mark={isCurrent ? 'current' : 'max'}
                  />
                  <rect
                    x={x - 4}
                    y={0}
                    width={8}
                    height={44}
                    fill="transparent"
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                </g>
              )
            })}
          </svg>
          <div className="director-history__line-labels">
            {series.map((point, index) =>
              shouldShowAxisLabel(index, series, granularity) ? (
                <span key={`${point.start}-${point.end}`}>
                  {axisLabel(point, granularity)}
                </span>
              ) : (
                <span key={`${point.start}-${point.end}`} aria-hidden="true" />
              ),
            )}
          </div>
        </div>
      ) : (
        <ul className="director-history__bars director-history__bars--accent">
          {series.map((point, index) => (
            <li
              key={`${point.start}-${point.end}`}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              data-hover={hoverIndex === index ? 'true' : 'false'}
            >
              {shouldShowAxisLabel(index, series, granularity) ? (
                <span className="director-history__bar-label">
                  {axisLabel(point, granularity)}
                </span>
              ) : (
                <span className="director-history__bar-label" aria-hidden="true">
                  ·
                </span>
              )}
              <span className="director-history__bar-track">
                <span
                  className="director-history__bar-fill"
                  style={{
                    width: `${maxValue === 0 ? 0 : (point.value / maxValue) * 100}%`,
                  }}
                />
              </span>
              <strong className="director-history__bar-value">
                {point.value}
              </strong>
            </li>
          ))}
        </ul>
      )}

      {hoverPoint ? (
        <p
          className="director-history__tooltip"
          id={tooltipId}
          data-testid="director-history-tooltip"
          role="status"
        >
          {hoverPoint.label}
          <br />
          {metricLabel(metric)}: {hoverPoint.value}
        </p>
      ) : null}
    </div>
  )
}

export function isHistorySeriesEmpty(
  series: readonly OperationalKpiHistoryPoint[],
): boolean {
  return series.length < 2 || series.every((point) => point.value === 0)
}
