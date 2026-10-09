import type { CoordinationPanelProblem } from '@/modules/operational-cards/data/coordinationProblemFilters'
import { ProblemDossierCard } from '@/modules/operational-cards/components/ProblemDossierCard'
import {
  buildProblemRowAccessibleName,
  resolveProblemMark,
} from '@/modules/operational-cards/data/coordinationMark'
import {
  DOSSIER_HISTORY_STATUS_LABEL,
  DOSSIER_SEVERITY_LABEL,
  isDossierClosedStatus,
} from '@/modules/operational-cards/data/problemDossier'

/**
 * Ficha de problema de una coordinación consultada.
 *
 * Variante COMPACTA de la ficha dossier, exclusiva de los paneles de problemas
 * de la coordinación: talón con el logo de la coordinación representada,
 * coordinación + título + tipo, y severidad y estado a la derecha, sin aviso
 * SLA. «Mis reportes» e historial usan `ProblemDossierCard` sin variante y no
 * cambian.
 */

export interface ProblemRowProps {
  /** Activo de LEVEL 1 o, con el filtro de cerrados, un problema cerrado. */
  problem: CoordinationPanelProblem
  /** Coordinación consultada: punto de vista para elegir «la otra». */
  selectedCoordinationCode?: string | null
  selected?: boolean
  onSelect?: (problemId: string) => void
  /** Nombres de presentación por code. */
  labelByCode?: Readonly<Record<string, string>>
  /** Colores de overview por code (talón de identidad). */
  colorByCode?: Readonly<Record<string, string>>
  /**
   * Etiquetas de estado propias del panel que monta la fila (p. ej. «En
   * revisión»). Sin ellas, las de siempre.
   */
  statusLabels?: Readonly<Record<string, string>>
}

export function ProblemRow({
  problem,
  selectedCoordinationCode = null,
  selected,
  onSelect,
  labelByCode,
  colorByCode,
  statusLabels = DOSSIER_HISTORY_STATUS_LABEL,
}: ProblemRowProps) {
  const severityLabel = DOSSIER_SEVERITY_LABEL[problem.severity]
  // Mismas etiquetas que los estados activos; un cerrado, si llega, se nombra.
  const statusLabel = statusLabels[problem.status] ?? problem.status
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
      closed={isDossierClosedStatus(problem.status)}
      colorByCode={colorByCode}
      variant="compact"
      surfaceClassName="problem-row"
      testId="problem-row"
      originTestId="problem-row-origin"
      severityTestId="problem-row-severity"
      statusTestId="problem-row-status"
      onClick={onSelect ? () => onSelect(problem.id) : undefined}
    />
  )
}
