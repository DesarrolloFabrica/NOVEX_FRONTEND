import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  dayBefore,
  daysBefore,
  formatCutDay,
  formatMarkDay,
  layoutMarks,
  markTooltip,
  problemTooltip,
  severityPath,
  timelineFacts,
  timelineScale,
  timelineSegments,
} from '@/modules/operational-cards/experience/director/internal-problems.presentation'
import type {
  InternalConsequenceMark,
  InternalProblemRow,
} from '@/modules/operational-cards/types/internal-problems.types'

/**
 * TIEMPO ACTIVO Y AFECTACIONES (foto al corte).
 *
 *   Una fila = un INTERNAL activo fiable, en dos niveles: identidad + resumen
 *   (título · severidad · edad · afectaciones) y su pista (alta → corte) con
 *   una ● por afectación CONOCIDA al corte, en su fecha de OCURRENCIA.
 *   Tres capas: los TRAMOS de la escala son el fondo de toda la gráfica
 *   (crema apenas distinto + separador punteado); las FILAS llevan su filete
 *   horizontal; encima, las pistas. Todas las filas comparten una escala.
 *
 * Clic en nombre, línea o ●: ProblemDetail en solo lectura.
 */

const DEFAULT_W = 560
/** Margen izquierdo para la fecha de inicio de la fila más antigua. */
const LEFT = 50
const RIGHT = 12
const LANE_H = 30
const MIN_LINE = 6

function useMeasuredWidth(fallback: number) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const next = Math.round(el.getBoundingClientRect().width)
      if (next > 0) setWidth(next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

type Tip = {
  left: number
  top: number
  bottom: number
  title: string
  lines: string[]
  edge?: 'start' | 'end'
  place: 'above' | 'below'
}

type AnyPointerEvent = ReactMouseEvent<Element> | ReactFocusEvent<Element>

export function DirectorInternosTimeline({
  rows,
  reference,
  cutDataTo,
  isCurrent,
  openProblemId,
  onOpenProblem,
}: {
  rows: readonly InternalProblemRow[]
  /** Fin de la línea: min(ahora, corte). */
  reference: Date
  /** dataTo del periodo (YYYY-MM-DD): rótulo del extremo derecho histórico. */
  cutDataTo: string
  isCurrent: boolean
  openProblemId: string | null
  onOpenProblem: ((problemId: string) => void) | null
}) {
  const { ref, width: W } = useMeasuredWidth(DEFAULT_W)
  const [tip, setTip] = useState<Tip | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  /** Ajuste tras medir el tooltip: nunca sale de la región visible. */
  const [nudge, setNudge] = useState<{ dx: number; place: Tip['place'] | null }>({ dx: 0, place: null })
  useLayoutEffect(() => {
    setNudge({ dx: 0, place: null })
  }, [tip])
  useLayoutEffect(() => {
    const el = tipRef.current
    const host = ref.current
    if (!el || !host || !tip) return
    const box = el.getBoundingClientRect()
    const area = (host.closest('.director-internos-scroll') ?? host).getBoundingClientRect()
    let dx = nudge.dx
    if (box.right > area.right - 4) dx -= box.right - (area.right - 4)
    if (box.left + dx < area.left + 4) dx += area.left + 4 - (box.left + dx)
    const current = nudge.place ?? tip.place
    let place = current
    if (current === 'above' && box.top < area.top + 2) place = 'below'
    else if (current === 'below' && box.bottom > area.bottom - 2) {
      const roomAbove = host.getBoundingClientRect().top + tip.top - area.top
      if (roomAbove >= box.height + 10) place = 'above'
    }
    if (Math.round(dx) !== Math.round(nudge.dx) || place !== current) setNudge({ dx, place })
  }, [tip, nudge, ref])
  const tipPlace = nudge.place ?? tip?.place ?? 'above'
  const starts = rows.map((row) => daysBefore(row.createdAt, reference))
  const scale = timelineScale(starts)
  const segments = timelineSegments(scale)
  const span = W - LEFT - RIGHT
  const X = (days: number) => LEFT + scale.at(days) * span
  const P = (fraction: number) => LEFT + fraction * span
  const endLabel = isCurrent ? 'HOY' : formatCutDay(cutDataTo)

  const show = (event: AnyPointerEvent, title: string, lines: string[]) => {
    const hostEl = ref.current
    if (!hostEl) return
    const host = hostEl.getBoundingClientRect()
    const box = (event.currentTarget as Element).getBoundingClientRect()
    // El tooltip respeta la región de scroll: si no cabe encima, va debajo.
    const viewport = hostEl.closest('.director-internos-scroll')?.getBoundingClientRect()
    const roomAbove = box.top - (viewport?.top ?? host.top)
    const center = box.left + box.width / 2 - host.left
    setTip({
      left: Math.min(Math.max(center, 8), host.width - 8),
      top: box.top - host.top,
      bottom: box.bottom - host.top,
      title,
      lines,
      edge: center > host.width * 0.62 ? 'end' : center < host.width * 0.3 ? 'start' : undefined,
      place: roomAbove < 110 ? 'below' : 'above',
    })
  }
  const hide = () => setTip(null)
  const showMark = (event: AnyPointerEvent, mark: InternalConsequenceMark) => {
    const content = markTooltip(mark)
    show(event, content.title, content.lines)
  }
  const showRow = (event: AnyPointerEvent, row: InternalProblemRow) => {
    const content = problemTooltip(row)
    show(event, content.title, content.lines)
  }
  const open = (id: string) => onOpenProblem?.(id)

  return (
    <div
      ref={ref}
      className="director-internos-timeline"
      data-testid="director-internos-timeline"
      data-scale={scale.mode}
      data-rows={rows.length}
      onMouseLeave={hide}
    >
      {/* Banda superior: tramos rotulados (rango fuerte, fecha secundaria). */}
      <div className="director-internos-timeline__header" aria-hidden="true">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="director-internos-timeline__segment-head"
            data-testid="director-internos-timeline-segment"
            style={{ left: P(segment.left), width: P(segment.right) - P(segment.left) }}
          >
            <span className="director-internos-timeline__segment-label">{segment.label}</span>
            <span className="director-internos-timeline__segment-date">
              {dayBefore(reference, segment.toDays)}
            </span>
          </div>
        ))}
        <span className="director-internos-timeline__end" data-testid="director-internos-timeline-end">
          {endLabel}
        </span>
      </div>

      <div className="director-internos-timeline__body">
        {/* Capa de FONDO: tramos de toda la gráfica + línea común del corte. */}
        <div className="director-internos-timeline__bands" aria-hidden="true">
          {segments.map((segment, index) => (
            <span
              key={segment.label}
              className="director-internos-timeline__band"
              data-tone={index % 2 === 0 ? 'a' : 'b'}
              style={{ left: P(segment.left), width: P(segment.right) - P(segment.left) }}
            />
          ))}
          <span className="director-internos-timeline__now" style={{ left: X(0) }} />
        </div>

        <ol className="director-internos-timeline__rows">
          {rows.map((row, index) => {
            const start = starts[index]
            const x0 = Math.min(X(start), X(0) - MIN_LINE)
            const x1 = X(0)
            const y = LANE_H / 2
            const xs = row.consequenceTimeline.map((mark) =>
              Math.max(x0, X(daysBefore(mark.occurredAt, reference))),
            )
            const placement = layoutMarks(xs)
            const selected = openProblemId === row.id
            return (
              <li
                key={row.id}
                className="director-internos-timeline__row"
                data-testid="director-internos-timeline-row"
                data-problem-id={row.id}
                data-age={row.ageDays}
                data-marks={row.consequenceTimeline.length}
                data-empty={row.consequenceTimeline.length === 0 ? 'true' : undefined}
                data-selected={selected ? 'true' : undefined}
              >
                {/* Nivel 1 · identidad + resumen. */}
                <div className="director-internos-timeline__head">
                  <button
                    type="button"
                    className="director-internos-timeline__title"
                    data-testid="director-internos-timeline-title"
                    title={row.title}
                    disabled={!onOpenProblem}
                    onClick={() => open(row.id)}
                    onMouseEnter={(event) => showRow(event, row)}
                    onFocus={(event) => showRow(event, row)}
                    onBlur={hide}
                  >
                    {row.title}
                  </button>
                  <span className="director-internos-timeline__meta">
                    <span className="director-internos-timeline__severity" data-severity={row.severityAtCut}>
                      {severityPath(row)}
                    </span>
                    <span aria-hidden="true" className="director-internos-timeline__dot">
                      ·
                    </span>
                    <span className="director-internos-timeline__facts" data-testid="director-internos-timeline-facts">
                      {timelineFacts(row)}
                    </span>
                  </span>
                </div>

                {/* Nivel 2 · pista temporal. */}
                <svg
                  className="director-internos-timeline__lane"
                  width={W}
                  height={LANE_H}
                  viewBox={`0 0 ${W} ${LANE_H}`}
                  role="img"
                  aria-label={`${row.title}: abierto desde ${formatMarkDay(row.createdAt)}, ${timelineFacts(row)}`}
                >
                  <text x={x0 - 7} y={y + 3.5} textAnchor="end" className="director-internos-timeline__start">
                    {formatMarkDay(row.createdAt)}
                  </text>
                  <line x1={x0} x2={x1} y1={y} y2={y} className="director-internos-timeline__life" />
                  <line x1={x0} x2={x0} y1={y - 6} y2={y + 6} className="director-internos-timeline__cap" />
                  <line x1={x1} x2={x1} y1={y - 4} y2={y + 4} className="director-internos-timeline__cap" />
                  <rect
                    x={x0}
                    y={0}
                    width={Math.max(MIN_LINE, x1 - x0)}
                    height={LANE_H}
                    className="director-internos-timeline__hit"
                    onClick={() => open(row.id)}
                    onMouseEnter={(event) => showRow(event, row)}
                  />
                  {row.consequenceTimeline.map((mark, i) => {
                    const place = placement[i]
                    if (!place.visible) return null
                    const cx = xs[i]
                    const cy = y + place.dy
                    return (
                      <g key={mark.id}>
                        {place.dy !== 0 ? (
                          <line x1={cx} x2={cx} y1={y} y2={cy} className="director-internos-timeline__stem" />
                        ) : null}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5}
                          className="director-internos-timeline__mark"
                          data-testid="director-internos-timeline-mark"
                          data-dy={place.dy}
                          role="button"
                          tabIndex={onOpenProblem ? 0 : -1}
                          aria-label={`Afectación del ${formatMarkDay(mark.occurredAt)}: ${mark.preview}`}
                          onMouseEnter={(event) => showMark(event, mark)}
                          onFocus={(event) => showMark(event, mark)}
                          onBlur={hide}
                          onClick={() => open(row.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              open(row.id)
                            }
                          }}
                        />
                        {place.count > 1 ? (
                          <text x={cx + 7} y={cy - 6} className="director-internos-timeline__count">
                            ×{place.count}
                          </text>
                        ) : null}
                      </g>
                    )
                  })}
                </svg>
              </li>
            )
          })}
        </ol>
      </div>

      {scale.mode === 'banded' ? (
        <p className="director-internos-timeline__scale-note" data-testid="director-internos-timeline-scale">
          Escala por tramos de días: cada tramo ocupa el mismo ancho aunque abarque más días.
        </p>
      ) : null}
      {tip ? (
        <div
          ref={tipRef}
          className="director-internos-timeline__tip"
          role="tooltip"
          data-testid="director-internos-timeline-tip"
          data-edge={tip.edge}
          data-place={tipPlace}
          style={{
            left: `${tip.left + nudge.dx}px`,
            top: `${tipPlace === 'below' ? tip.bottom : tip.top}px`,
          }}
        >
          <strong>{tip.title}</strong>
          {tip.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
