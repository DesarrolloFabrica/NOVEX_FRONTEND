import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import { ProblemDetail } from '@/modules/operational-cards/components/ProblemDetail'
import { ProblemResolutionRecord } from '@/modules/operational-cards/components/ProblemResolutionRecord'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { useProblemListFilters } from '@/modules/operational-cards/hooks/useProblemListFilters'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import {
  canExecuteSituationAnalysis,
  canViewSituationAnalysis,
} from '@/modules/operational-cards/data/analysisAccess'
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
  const { user } = useAuth()
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
          evidenceActions={{
            user,
            allowOperationalWrites: false,
            submission: controller.submission,
            onRetire: async () => false,
          }}
          analysisActions={
            canViewSituationAnalysis(user)
              ? {
                  canExecute: canExecuteSituationAnalysis(
                    user,
                    detail?.status,
                  ),
                  submission: controller.submission,
                  onExecute: () => {
                    if (!detail) return
                    void controller.submitAiAnalysis(detail.id)
                  },
                  onRetry: () => controller.retryAnalysis(),
                  onRetryHistory: () => controller.retryAnalysisHistory(),
                }
              : null
          }
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

  const STATUS_RANK: Record<string, number> = { CRITICO: 0, ALERTA: 1 }
  const alertCoordinations = direction
    ? direction.coordinations
        .filter(
          (c) =>
            c.integrityStatus === 'CRITICO' ||
            c.integrityStatus === 'ALERTA' ||
            c.problems.activeCount > 0,
        )
        .sort(
          (a, b) =>
            (STATUS_RANK[a.integrityStatus] ?? 2) -
              (STATUS_RANK[b.integrityStatus] ?? 2) ||
            b.problems.activeCount - a.problems.activeCount,
        )
    : []

  /*
   * PRIMERA VISTA DEL DIRECTOR (sin carta observada). Responde, en este orden:
   *   1. ¿Cómo está la Dirección?  → titular en lenguaje llano + una frase.
   *   2. ¿Qué es lo más urgente?   → un botón directo a esa coordinación.
   *   3. ¿Dónde más hay que mirar? → el resto de áreas, por gravedad.
   */
  const status = direction?.directionStatus ?? 'ESTABLE'
  const headline =
    status === 'CRITICO'
      ? 'La operación está en estado crítico'
      : status === 'ALERTA'
        ? 'La operación necesita atención'
        : 'La operación está estable'
  const urgent = alertCoordinations[0] ?? null
  const otherAreas = alertCoordinations.slice(1)
  const nameOf = (code: string, fallback: string) => labelByCode[code] ?? fallback
  const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`

  return (
    <div
      className="director-direction-brief"
      data-testid="director-direction-brief"
      data-status={status.toLowerCase()}
    >
      <header className="director-direction-brief__header">
        <span className="director-direction-brief__eyebrow">
          Qué está pasando en la Dirección
        </span>
        <h2 className="director-direction-brief__title">{headline}</h2>
        {direction ? (
          <p className="director-direction-brief__copy">
            {plural(direction.problems.activeCount, 'situación activa', 'situaciones activas')}
            {direction.problems.severity.critical > 0
              ? `, ${plural(direction.problems.severity.critical, 'crítica', 'críticas')}`
              : ''}
            . De {direction.coordinations.length} coordinaciones,{' '}
            {direction.coordinationStatusTotals.critical} en estado crítico y{' '}
            {direction.coordinationStatusTotals.alert} en alerta.
          </p>
        ) : null}
      </header>

      {direction && urgent ? (
        <button
          type="button"
          className="director-direction-brief__urgent"
          data-status={urgent.integrityStatus.toLowerCase()}
          data-testid={`director-quick-jump-${urgent.coordination.code}`}
          onClick={() => controller.selectCoordination(urgent.coordination.code)}
        >
          <span className="director-direction-brief__urgent-label">
            Lo más urgente
          </span>
          <span className="director-direction-brief__urgent-name">
            {nameOf(urgent.coordination.code, urgent.coordination.name)}
          </span>
          <span className="director-direction-brief__urgent-meta">
            {plural(urgent.problems.activeCount, 'situación activa', 'situaciones activas')}
            {urgent.problems.severity.critical > 0
              ? ` · ${plural(urgent.problems.severity.critical, 'crítica', 'críticas')}`
              : ''}
          </span>
          <span className="director-direction-brief__urgent-cta" aria-hidden="true">
            Ver sus problemas →
          </span>
        </button>
      ) : null}

      {direction ? (
        <>
          {otherAreas.length > 0 ? (
            <h3 className="director-direction-brief__subheading">
              Otras áreas que piden atención
            </h3>
          ) : null}
          {alertCoordinations.length > 0 ? (
            <ul
              className="director-direction-brief__areas"
              data-testid="director-alert-areas"
            >
              {otherAreas.map((coord) => {
                const status = coord.integrityStatus.toLowerCase()
                const critical = coord.problems.severity.critical
                return (
                  <li key={coord.coordination.code}>
                    <button
                      type="button"
                      className="director-direction-brief__area"
                      data-status={status}
                      data-testid={`director-quick-jump-${coord.coordination.code}`}
                      onClick={() =>
                        controller.selectCoordination(coord.coordination.code)
                      }
                    >
                      <span
                        className="director-direction-brief__area-dot"
                        style={{
                          backgroundColor:
                            colorByCode[coord.coordination.code] ?? '#b98a26',
                        }}
                        aria-hidden="true"
                      />
                      <span className="director-direction-brief__area-text">
                        <span className="director-direction-brief__area-name">
                          {labelByCode[coord.coordination.code] ??
                            coord.coordination.name}
                        </span>
                        <span className="director-direction-brief__area-meta">
                          {coord.integrityStatus === 'CRITICO'
                            ? 'Crítica'
                            : coord.integrityStatus === 'ALERTA'
                              ? 'En alerta'
                              : 'Con actividad'}
                          {critical > 0
                            ? ` · ${critical} ${critical === 1 ? 'crítico' : 'críticos'}`
                            : ''}
                        </span>
                      </span>
                      <span
                        className="director-direction-brief__area-count"
                        aria-label={`${coord.problems.activeCount} activos`}
                      >
                        {coord.problems.activeCount}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div
              className="director-direction-brief__stable-notice"
              data-testid="director-stable-notice"
            >
              <span
                className="director-direction-brief__stable-icon"
                aria-hidden="true"
              >
                ✓
              </span>
              <p>
                Operación institucional estable. Ninguna coordinación reporta
                situaciones críticas en curso.
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
