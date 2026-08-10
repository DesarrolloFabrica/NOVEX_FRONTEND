import { useState } from 'react'
import type { User } from '@/modules/auth/types/user.types'
import type { SituationManagementSummary } from '@/modules/api/types/situation-management.types'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { ConnectedSituationDetailModal } from '@/modules/operational-events/components/ConnectedSituationDetailModal'
import { MonitoringHeader } from '@/modules/monitoring/components/MonitoringHeader'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { SituationDossierPanel } from '@/modules/monitoring/components/SituationDossierPanel'
import { SituationIntelligencePanel } from '@/modules/monitoring/components/SituationIntelligencePanel'
import { SituationQueueConsole } from '@/modules/monitoring/components/SituationQueueConsole'
import { SituationPrimaryActionBar } from '@/modules/monitoring/components/SituationPrimaryActionBar'
import { OperationalStatusPanel } from '@/modules/monitoring/components/OperationalStatusPanel'
import { AiRecommendationsReadOnly } from '@/modules/monitoring/components/AiRecommendationsReadOnly'
import { OperationalHistoryTimeline } from '@/modules/monitoring/components/OperationalHistoryTimeline'
import { AiVersionCard } from '@/modules/monitoring/components/AiVersionCard'
import type { SituationDossier } from '@/modules/api/types/situation-management.types'
import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import type {
  SituationQueueQuery,
  SituationQueueSeverityFilter,
  SituationQueueStatusFilter,
} from '@/modules/monitoring/utils/situation-queue-query'
import type { UpdateSituationStatusInput } from '@/modules/monitoring/utils/situation-lifecycle'

interface MonitoringCenterProps {
  user: User | null
  pageItems: SituationListItem[]
  summary: SituationManagementSummary
  queueQuery: SituationQueueQuery
  totalFiltered: number
  totalPages: number
  totalAvailable: number
  selectedSituationId: string | null
  dossier: SituationDossier | null
  listLoading: boolean
  dossierLoading: boolean
  listError: string | null
  dossierError: string | null
  updateError: string | null
  canUpdate: boolean
  isUpdating: boolean
  environment: EnvironmentStatus
  onSelectSituation: (situationId: string) => void
  onSearchChange: (search: string) => void
  onStatusFilterChange: (status: SituationQueueStatusFilter) => void
  onSeverityFilterChange: (severity: SituationQueueSeverityFilter) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSummaryFilter: (filter: SituationQueueStatusFilter | 'CRITICAL') => void
  onUpdateSituationStatus: (input: UpdateSituationStatusInput) => Promise<void>
  onLogout: () => void
}

function SituationSummary({
  summary,
  activeFilter,
  onFilter,
}: {
  summary: SituationManagementSummary
  activeFilter: SituationQueueStatusFilter | 'CRITICAL'
  onFilter: (filter: SituationQueueStatusFilter | 'CRITICAL') => void
}) {
  const indicators: Array<{
    key: SituationQueueStatusFilter | 'CRITICAL'
    label: string
    value: number
  }> = [
    { key: 'OPEN', label: 'Registradas', value: summary.open },
    { key: 'IN_PROGRESS', label: 'En atención', value: summary.inProgress },
    { key: 'CLOSED', label: 'Cerradas', value: summary.closed },
    { key: 'CRITICAL', label: 'Atención prioritaria', value: summary.critical },
  ]

  return (
    <section className="novex-execution-summary" aria-label="Resumen ejecutivo">
      {indicators.map((item) => (
        <button
          key={item.key}
          type="button"
          className="novex-execution-summary__item"
          data-active={activeFilter === item.key ? 'true' : 'false'}
          onClick={() => onFilter(item.key)}
          aria-pressed={activeFilter === item.key}
        >
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </button>
      ))}
    </section>
  )
}

function resolveActiveSummaryFilter(
  query: SituationQueueQuery,
): SituationQueueStatusFilter | 'CRITICAL' {
  if (query.severity === 'PRIORITY' || query.severity === 'CRITICAL') {
    return 'CRITICAL'
  }
  return query.status
}

export function MonitoringCenter({
  user,
  pageItems,
  summary,
  queueQuery,
  totalFiltered,
  totalPages,
  totalAvailable,
  selectedSituationId,
  dossier,
  listLoading,
  dossierLoading,
  listError,
  dossierError,
  updateError: _updateError,
  canUpdate,
  isUpdating,
  environment,
  onSelectSituation,
  onSearchChange,
  onStatusFilterChange,
  onSeverityFilterChange,
  onPageChange,
  onPageSizeChange,
  onSummaryFilter,
  onUpdateSituationStatus,
  onLogout,
}: MonitoringCenterProps) {
  const [showAnalysis, setShowAnalysis] = useState(false)

  return (
    <ScreenDeck
      environment={environment}
      className="novex-monitoring-deck"
      header={
        <MonitoringHeader
          user={user}
          environment={environment}
          onLogout={onLogout}
        />
      }
    >
      <main className="novex-execution-flow" data-tour="situation-management">
        <SituationSummary
          summary={summary}
          activeFilter={resolveActiveSummaryFilter(queueQuery)}
          onFilter={onSummaryFilter}
        />

        <div className="novex-gestion-workspace">
          <aside
            className="novex-gestion-workspace__queue"
            aria-label="Cola de situaciones"
          >
            <SituationQueueConsole
              pageItems={pageItems}
              selectedSituationId={selectedSituationId}
              loading={listLoading}
              error={listError}
              queueQuery={queueQuery}
              totalFiltered={totalFiltered}
              totalPages={totalPages}
              totalAvailable={totalAvailable}
              onSelectSituation={onSelectSituation}
              onSearchChange={onSearchChange}
              onStatusChange={onStatusFilterChange}
              onSeverityChange={onSeverityFilterChange}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </aside>

          <section
            className="novex-gestion-workspace__dossier"
            aria-label="Expediente operativo"
          >
            <div className="novex-gestion-workspace__scroll">
              {dossier ? (
                <SituationPrimaryActionBar
                  situation={dossier.situation}
                  canUpdate={canUpdate}
                  isUpdating={isUpdating}
                  onUpdate={onUpdateSituationStatus}
                />
              ) : null}

              <div
                className="novex-execution-detail"
                aria-label="Vista ejecutiva de la situación"
              >
                <SituationDossierPanel
                  dossier={dossier}
                  loading={dossierLoading}
                  error={dossierError}
                />
                <SituationIntelligencePanel
                  dossier={dossier}
                  loading={dossierLoading}
                  onOpenAnalysis={() => setShowAnalysis(true)}
                />
              </div>

              {dossier ? (
                <>
                  <OperationalStatusPanel situation={dossier.situation} />
                  <AiRecommendationsReadOnly
                    recommendations={dossier.recommendations}
                  />
                  <div className="novex-ops-secondary-grid">
                    <OperationalHistoryTimeline timeline={dossier.timeline} />
                    <AiVersionCard
                      situationId={dossier.situation.id}
                      history={dossier.analysisHistory}
                    />
                  </div>
                </>
              ) : !dossierLoading && !dossierError ? (
                <section className="novex-action-detail novex-action-detail--empty">
                  <strong>Seleccione una situación de la cola</strong>
                  <p>
                    Elija un caso a la izquierda para revisar el expediente y, si
                    tiene permiso, actualizar su estado operacional.
                  </p>
                </section>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {showAnalysis && selectedSituationId ? (
        <ConnectedSituationDetailModal
          situationId={selectedSituationId}
          title={dossier?.situation.title}
          onClose={() => setShowAnalysis(false)}
        />
      ) : null}
    </ScreenDeck>
  )
}
