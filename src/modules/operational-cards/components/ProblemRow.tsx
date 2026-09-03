import type { CoordinationProblem } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Fila de problema en la carta activa.
 *
 * Muestra SOLO título y severidad. El estado (`OPEN` / `IN_PROGRESS`) viaja en
 * `data-status` para diagnóstico y lectores de pantalla, no como una segunda
 * insignia que compita con la severidad.
 *
 * Es un `button` preparado para la fase de la isla flotante: `onSelect` existe
 * pero la experiencia todavía no lo conecta, así que el clic no abre nada.
 */

const SEVERITY_LABEL = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
} as const

const STATUS_LABEL = {
  OPEN: 'Registrada',
  IN_PROGRESS: 'En atención',
} as const

export interface ProblemRowProps {
  problem: CoordinationProblem
  onSelect?: (problemId: string) => void
}

export function ProblemRow({ problem, onSelect }: ProblemRowProps) {
  const severityLabel = SEVERITY_LABEL[problem.severity]

  return (
    <button
      type="button"
      className="problem-row"
      data-testid="problem-row"
      data-problem-id={problem.id}
      data-severity={problem.severity}
      data-status={problem.status}
      aria-label={`${problem.title}. Severidad ${severityLabel}. ${
        STATUS_LABEL[problem.status]
      }.`}
      onClick={onSelect ? () => onSelect(problem.id) : undefined}
    >
      <span className="problem-row__title" title={problem.title}>
        {problem.title}
      </span>
      <span className="problem-row__severity" data-testid="problem-row-severity">
        {severityLabel}
      </span>
    </button>
  )
}
