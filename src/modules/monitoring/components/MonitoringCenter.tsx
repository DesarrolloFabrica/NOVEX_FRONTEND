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
import type { SituationDossier } from '@/modules/api/types/situation-management.types'
import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { sortSituationsForQueue } from '@/modules/monitoring/utils/situation-management.presentation'

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
  onUpdateSituationStatus: (status: SituationResponse['status']) => Promise<void>
  onUpdateRecommendationStatus: (
    recommendationId: string,
    status: string,
  ) => Promise<void>
  onLogout: () => void
}

function SituationSummary({ summary }: { summary: SituationManagementSummary }) {
  const indicators = [
    ['Abiertas', summary.open],
    ['En progreso', summary.inProgress],
    ['Resueltas', summary.resolved],
    ['Cerradas', summary.closed],
    ['Atención prioritaria', summary.critical],
  ] as const

  return (
    <section className="cunmark-execution-summary" aria-label="Resumen ejecutivo">
      {indicators.map(([label, value]) => (
        <div key={label} className="cunmark-execution-summary__item">
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
  onUpdateRecommendationStatus,
  onLogout,
}: MonitoringCenterProps) {
  const [showAnalysis, setShowAnalysis] = useState(false)
  const sortedSituations = sortSituationsForQueue(situations)

  return (
    <ScreenDeck
      environment={environment}
      className="cunmark-monitoring-deck"
      header={
        <MonitoringHeader
          user={user}
          environment={environment}
          onLogout={onLogout}
        />
      }
    >
      <main className="cunmark-execution-flow">
        <SituationSummary summary={summary} />

        <SituationQueueConsole
          situations={sortedSituations}
          selectedSituationId={selectedSituationId}
          loading={listLoading}
          error={listError}
          onSelectSituation={onSelectSituation}
        />

        <section
          className="cunmark-execution-detail"
          aria-label="Expediente operativo de la situación"
        >
          <SituationDossierPanel
            dossier={dossier}
            loading={dossierLoading}
            error={dossierError}
            canUpdate={canUpdate}
            isUpdating={isUpdating}
            onUpdateSituationStatus={onUpdateSituationStatus}
            onUpdateRecommendationStatus={onUpdateRecommendationStatus}
          />
          <SituationIntelligencePanel
            dossier={dossier}
            loading={dossierLoading}
            onOpenAnalysis={() => setShowAnalysis(true)}
          />
        </section>
      </main>

      {showAnalysis && selectedSituationId ? (
        <ConnectedSituationDetailModal
          situationId={selectedSituationId}
          onClose={() => setShowAnalysis(false)}
        />
      ) : null}
    </ScreenDeck>
  )
}
