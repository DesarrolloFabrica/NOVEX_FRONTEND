import type { CoordinationProblem } from '@/modules/operational-cards/types/operational-cards.state'
import { ProblemDossierCard } from '@/modules/operational-cards/components/ProblemDossierCard'
import {
  buildProblemRowAccessibleName,
  resolveProblemMark,
} from '@/modules/operational-cards/data/coordinationMark'
import {
  DOSSIER_ACTIVE_STATUS_LABEL,
  DOSSIER_SEVERITY_LABEL,
} from '@/modules/operational-cards/data/problemDossier'

/**
 * Ficha de problema de una coordinación consultada.
 *
 * Presentación dossier compartida: logo + tipo/origen, severidad y estado por
 * separado, y aviso SLA solo si la lista ya trae `slaHealth` en riesgo/vencido.
 */

export interface ProblemRowProps {
  problem: CoordinationProblem
  /** Coordinación consultada: punto de vista para elegir «la otra». */
  selectedCoordinationCode?: string | null
  selected?: boolean
  onSelect?: (problemId: string) => void
  /** Nombres de presentación por code. */
  labelByCode?: Readonly<Record<string, string>>
  /** Colores de overview por code (talón de identidad). */
  colorByCode?: Readonly<Record<string, string>>
}

export function ProblemRow({
  problem,
  selectedCoordinationCode = null,
  selected,
  onSelect,
  labelByCode,
  colorByCode,
}: ProblemRowProps) {
  const severityLabel = DOSSIER_SEVERITY_LABEL[problem.severity]
  const statusLabel = DOSSIER_ACTIVE_STATUS_LABEL[problem.status]
  const mark = resolveProblemMark({
    reportKind: problem.reportKind,
    coordinationCode: problem.coordinationCode,
    affectedCoordinationCode: problem.affectedCoordinationCode,
    viewpointCode: selectedCoordinationCode,
    labelByCode,
  })

  return (
    <ProblemDossierCard
      id={problem.id}
      title={problem.title}
      severity={problem.severity}
      status={problem.status}
      reportKind={problem.reportKind}
      mark={mark}
      severityLabel={severityLabel}
      statusLabel={statusLabel}
      accessibleName={buildProblemRowAccessibleName({
        title: problem.title,
        mark,
        severityLabel,
        statusLabel,
      })}
      selected={Boolean(selected)}
      slaHealth={problem.slaHealth ?? null}
      colorByCode={colorByCode}
      surfaceClassName="problem-row"
      testId="problem-row"
      originTestId="problem-row-origin"
      severityTestId="problem-row-severity"
      statusTestId="problem-row-status"
      onClick={onSelect ? () => onSelect(problem.id) : undefined}
    />
  )
}
