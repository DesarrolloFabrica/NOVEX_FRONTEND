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
import { OperationalStatusPanel } from '@/modules/monitoring/components/OperationalStatusPanel'
import { AiRecommendationsReadOnly } from '@/modules/monitoring/components/AiRecommendationsReadOnly'
import { OperationalHistoryTimeline } from '@/modules/monitoring/components/OperationalHistoryTimeline'
import { AiVersionCard } from '@/modules/monitoring/components/AiVersionCard'
import type { SituationDossier } from '@/modules/api/types/situation-management.types'
import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import { sortSituationsForQueue } from '@/modules/monitoring/utils/situation-management.presentation'
import type { UpdateSituationStatusInput } from '@/modules/monitoring/utils/situation-lifecycle'

interface MonitoringCenterProps {
  user: User | null
  situations: SituationListItem[]
  summary: SituationManagementSummary
  selectedSituationId: string | null
  dossier: SituationDossier | null
  listLoading: boolean
  dossierLoading: boolean
  listError: string | null
  dossierError: string | null
  canUpdate: boolean
  isUpdating: boolean
  environment: EnvironmentStatus
  onSelectSituation: (situationId: string) => void
  onUpdateSituationStatus: (input: UpdateSituationStatusInput) => Promise<void>
  onLogout: () => void
}

function SituationSummary({ summary }: { summary: SituationManagementSummary }) {
  const indicators = [
    ['Registradas', summary.open],
    ['En atención', summary.inProgress],
    ['Resueltas', summary.resolved],
    ['Cerradas', summary.closed],
    ['Atención prioritaria', summary.critical],
  ] as const

  return (
    <section className="novex-execution-summary" aria-label="Resumen ejecutivo">
      {indicators.map(([label, value]) => (
        <div key={label} className="novex-execution-summary__item">
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </section>
  )
}

export function MonitoringCenter({
  user,
  situations,
  summary,
  selectedSituationId,
  dossier,
  listLoading,
  dossierLoading,
  listError,
  dossierError,
  canUpdate,
  isUpdating,
  environment,
  onSelectSituation,
  onUpdateSituationStatus,
  onLogout,
}: MonitoringCenterProps) {
  const [showAnalysis, setShowAnalysis] = useState(false)
  const sortedSituations = sortSituationsForQueue(situations)

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
        <SituationSummary summary={summary} />

        <SituationQueueConsole
          situations={sortedSituations}
          selectedSituationId={selectedSituationId}
          loading={listLoading}
          error={listError}
          onSelectSituation={onSelectSituation}
        />

        <section className="novex-ops-command-center">
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
              <OperationalStatusPanel
                situation={dossier.situation}
                canUpdate={canUpdate}
                isUpdating={isUpdating}
                onUpdate={onUpdateSituationStatus}
              />
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
          ) : null}
        </section>
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
