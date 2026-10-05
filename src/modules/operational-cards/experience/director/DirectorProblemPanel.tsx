import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import { ProblemDetail } from '@/modules/operational-cards/components/ProblemDetail'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { OperationalKpiDirectionSnapshot } from '@/modules/operational-cards/types/operational-kpi.types'
import type { OperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'
import '@/styles/director-kpi-panel.css'

/**
 * Lista de problemas de la coordinación observada, o resumen de Dirección
 * cuando no hay carta seleccionada. El detalle sustituye la lista en el mismo
 * panel (volver), sin montar el action panel operativo.
 */
export function DirectorProblemPanel({
  model,
  direction,
}: {
  model: OperationalShellModel
  direction: OperationalKpiDirectionSnapshot | null
}) {
  const {
    controller,
    selectedCoordination,
    labelByCode,
    rowLabelByCode,
    colorByCode,
  } = model

  if (controller.level2.problemId) {
    return (
      <div className="director-problem-panel" data-testid="director-problem-panel">
        <div className="action-panel__detail-nav">
          <button
            type="button"
            className="action-panel__detail-back"
            data-testid="detail-back"
            onClick={controller.closeProblem}
          >
            Volver
          </button>
        </div>
        <ProblemDetail
          level2={controller.level2}
          selectedCoordinationCode={controller.selectedCoordinationCode}
          onToggleSection={controller.toggleSection}
          onRetrySection={controller.retrySection}
        />
      </div>
    )
  }

  if (selectedCoordination) {
    return (
      <CoordinationProblemList
        coordination={selectedCoordination}
        identity={resolveCoordinationVisualIdentity(selectedCoordination)}
        productLabel={labelByCode[selectedCoordination.code]}
        level1={controller.level1}
        selectedProblemId={controller.selectedProblemId}
        onProblemSelect={controller.selectProblem}
        onRetry={controller.retryCoordinationProblems}
        labelByCode={rowLabelByCode}
        colorByCode={colorByCode}
      />
    )
  }

  return (
    <div
      className="director-direction-brief"
      data-testid="director-direction-brief"
    >
      <h2 className="director-direction-brief__title">Resumen de Dirección</h2>
      <p className="director-direction-brief__copy">
        Seleccione una carta para ver los problemas activos de esa coordinación.
      </p>
      {direction ? (
        <ul className="director-direction-brief__facts">
          <li>Activos {direction.problems.activeCount}</li>
          <li>Críticos {direction.problems.severity.critical}</li>
          <li>
            Coordinaciones críticas {direction.coordinationStatusTotals.critical}
          </li>
        </ul>
      ) : null}
    </div>
  )
}
