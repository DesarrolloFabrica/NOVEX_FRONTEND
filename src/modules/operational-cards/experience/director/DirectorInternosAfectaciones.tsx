import { useId } from 'react'
import { DirectorInternosTimeline } from '@/modules/operational-cards/experience/director/DirectorInternosTimeline'
import {
  formatCutDay,
  legacyNote,
  timelineSelection,
} from '@/modules/operational-cards/experience/director/internal-problems.presentation'
import type { InternalProblemsResponse } from '@/modules/operational-cards/types/internal-problems.types'

/**
 * Lámina 2 · TIEMPO ACTIVO Y AFECTACIONES (FOTO AL CORTE T).
 *
 *   Una sola visual principal: línea de vida de hasta 5 activos fiables
 *   (alta → corte) con una ● por afectación conocida al corte, en su
 *   ocurrencia. Responde cuánto lleva activo cada problema y cuándo fue
 *   generando afectaciones. Legacy fuera, contados al pie.
 *
 * Clic en nombre, línea o ●: ProblemDetail en solo lectura.
 */

const HELP =
  'Cada línea va desde que se reportó el problema hasta el corte; cada punto es una afectación, ubicada cuando ocurrió. Solo se muestran las afectaciones que NOVEX ya conocía al corte. Todas las líneas usan la misma escala de tiempo.'

function SheetTitle({ title, help, testId }: { title: string; help: string; testId: string }) {
  const helpId = useId()
  return (
    <p className="director-estado__section-title director-flujo__chart-title director-internos-sheet__title">
      <span className="director-estado__section-mark" aria-hidden="true">
        ✦
      </span>
      <span>{title}</span>
      <span className="director-flujo__help">
        <button
          type="button"
          className="director-flujo__help-button"
          aria-label={`Qué muestra ${title.toLowerCase()}`}
          aria-describedby={helpId}
          data-testid={testId}
        >
          ?
        </button>
        <span role="tooltip" id={helpId} className="director-flujo__help-text">
          {help}
        </span>
      </span>
    </p>
  )
}

export function DirectorInternosAfectaciones({
  status,
  problems,
  error,
  reference,
  openProblemId,
  onOpenProblem,
}: {
  status: 'idle' | 'loading' | 'error' | 'success'
  problems: InternalProblemsResponse | null
  error: string | null
  reference: Date
  openProblemId: string | null
  onOpenProblem: ((problemId: string) => void) | null
}) {
  const rows = problems?.items ?? []
  const timeline = timelineSelection(rows)
  const note = legacyNote(timeline.legacy)
  const cutDay = problems ? formatCutDay(problems.period.dataTo) : null

  return (
    <div
      className="director-internos-sheet director-internos-sheet--timeline"
      data-testid="director-internos-affectations"
      data-total={problems?.total ?? ''}
      data-reliable={timeline.reliable}
      data-legacy={timeline.legacy}
    >
      <SheetTitle title="Tiempo activo y afectaciones" help={HELP} testId="director-internos-timeline-help" />
      <div className="director-internos-sheet__sub">
        <span>Problemas activos al corte y afectaciones registradas en el tiempo</span>
        {cutDay ? <span className="director-internos-sheet__period">· al {cutDay}</span> : null}
      </div>

      {status === 'loading' && !problems ? (
        <p className="director-kpi-panel__hint" data-testid="director-internos-affectations-loading">
          Leyendo problemas activos…
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="director-kpi-panel__error" role="alert" data-testid="director-internos-affectations-error">
          No se pudieron leer los problemas activos.{error ? ` ${error}` : ''}
        </p>
      ) : null}

      {problems && status !== 'error' ? (
        <>
          {problems.total === 0 ? (
            <p className="director-history__empty" data-testid="director-internos-timeline-empty">
              Sin problemas internos activos en este corte.
            </p>
          ) : null}
          {timeline.rows.length > 0 ? (
            <DirectorInternosTimeline
              rows={timeline.rows}
              reference={reference}
              cutDataTo={problems.period.dataTo}
              isCurrent={problems.period.isCurrent}
              openProblemId={openProblemId}
              onOpenProblem={onOpenProblem}
            />
          ) : null}
          {timeline.reliable > timeline.rows.length ? (
            <p className="director-internos-block__note" data-testid="director-internos-timeline-more">
              {`Se muestran ${timeline.rows.length} de ${timeline.reliable} activos.`}
            </p>
          ) : null}
          {note ? (
            <p className="director-internos-block__note" data-testid="director-internos-legacy-note">
              {note}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
