import { useId, useState } from 'react'
import { formatProblemDateTime } from '@/modules/operational-cards/data/problemDetailPresentation'
import type { ProblemSeverityStep } from '@/modules/operational-cards/types/problem-detail.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'

/**
 * SEVERIDAD REPORTADA vs ACTUAL, en una línea.
 *
 * Si nunca cambió no se pinta nada: el badge de la cabecera ya lo dice. Si
 * cambió, se muestra «Reportado como Media · Actual Alta» y un acceso compacto
 * al historial («Media → Alta · 10 oct · por antigüedad»). No es una caja
 * técnica: solo los datos que explican por qué el nivel no es el reportado.
 */

const SEVERITY_LABEL: Record<SituationSeverity, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
}

function reasonOf(step: ProblemSeverityStep): string {
  if (step.source === 'REPORTED') return 'reportado'
  // Historia mock del escenario QA: nunca se presenta como política real.
  if (step.simulated) return 'escalamiento simulado (QA)'
  return 'por antigüedad'
}

export function ProblemSeverityTrail({
  reportedSeverity,
  severity,
  history,
}: {
  reportedSeverity: SituationSeverity
  severity: SituationSeverity
  history: readonly ProblemSeverityStep[]
}) {
  const [open, setOpen] = useState(false)
  const listId = useId()

  if (reportedSeverity === severity && history.length <= 1) return null

  return (
    <div className="severity-trail" data-testid="severity-trail">
      <p className="severity-trail__summary">
        <span className="severity-trail__label">Reportado como</span>{' '}
        <span
          className="severity-trail__value"
          data-severity={reportedSeverity}
          data-testid="severity-trail-reported"
        >
          {SEVERITY_LABEL[reportedSeverity]}
        </span>
        <span aria-hidden="true"> · </span>
        <span className="severity-trail__label">Actual</span>{' '}
        <span
          className="severity-trail__value"
          data-severity={severity}
          data-testid="severity-trail-current"
        >
          {SEVERITY_LABEL[severity]}
        </span>
        {history.length > 1 && (
          <button
            type="button"
            className="severity-trail__toggle"
            data-testid="severity-trail-toggle"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Ocultar historial' : 'Ver historial'}
          </button>
        )}
      </p>
      {open && (
        <ol
          id={listId}
          className="severity-trail__steps"
          data-testid="severity-trail-steps"
        >
          {history.map((step) => {
            const date = formatProblemDateTime(step.effectiveAt)
            return (
              <li key={step.id} data-source={step.source}>
                <span className="severity-trail__transition">
                  {step.from
                    ? `${SEVERITY_LABEL[step.from]} → ${SEVERITY_LABEL[step.to]}`
                    : SEVERITY_LABEL[step.to]}
                </span>
                <span aria-hidden="true"> · </span>
                {date.iso ? (
                  <time dateTime={date.iso}>{date.label}</time>
                ) : (
                  <span>{date.label}</span>
                )}
                <span aria-hidden="true"> · </span>
                <span className="severity-trail__reason">{reasonOf(step)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
