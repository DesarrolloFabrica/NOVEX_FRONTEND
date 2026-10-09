import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import { ProblemDetail } from '@/modules/operational-cards/components/ProblemDetail'
import { ProblemResolutionRecord } from '@/modules/operational-cards/components/ProblemResolutionRecord'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { useProblemListFilters } from '@/modules/operational-cards/hooks/useProblemListFilters'
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
  // Los filtros viven aquí: el detalle sustituye a la lista y «Volver» debe
  // recuperarlos tal como estaban.
  const [filters, setFilters] = useProblemListFilters(
    selectedCoordination?.code ?? '',
  )

  if (controller.level2.problemId) {
    const detail =
      controller.level2.status === 'ready' ? controller.level2.detail : null
    return (
      <div className="director-problem-panel" data-testid="director-problem-panel">
        <ProblemDetail
          level2={controller.level2}
          onBack={controller.closeProblem}
          backLabel="Volver a problemas"
          selectedCoordinationCode={controller.selectedCoordinationCode}
          onToggleSection={controller.toggleSection}
          onRetrySection={controller.retrySection}
        />
        {/*
         * Expediente de CONSULTA: el aprendizaje del cierre en solo lectura.
         * No se monta `ProblemActions`: el Director no avanza, no cierra y no
         * edita aprendizajes, aunque el DTO trajera indicadores.
         */}
        {detail && detail.status === 'CLOSED' ? (
          <section
            className="problem-actions"
            data-testid="director-problem-resolution"
            data-read-only="true"
            aria-label="Cierre del problema"
          >
            <ProblemResolutionRecord
              resolution={detail.resolution}
              reportKind={detail.reportKind}
            />
          </section>
        ) : null}
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
        filters={filters}
        onFiltersChange={setFilters}
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
