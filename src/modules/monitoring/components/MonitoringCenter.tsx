// Componente: orquestador visual del Cristal Maestro (Dashboard).
// La izquierda sigue la selección; la derecha resume la salud del área.

import type { Area } from '@/modules/areas/types/area.types'
import type { Commitment } from '@/modules/commitments/types/commitment.types'
import type { User } from '@/modules/auth/types/user.types'
import type { AreaHealth } from '@/modules/monitoring/types/monitoring.types'
import type { AreaHealthEntry } from '@/modules/monitoring/selectors/areaHealth.selectors'
import { MonitoringHeader } from '@/modules/monitoring/components/MonitoringHeader'
import { MonitoringLayout } from '@/modules/monitoring/components/MonitoringLayout'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { AreaFocusStrip } from '@/modules/monitoring/components/AreaFocusStrip'
import { LeftOperationalPanel } from '@/modules/monitoring/components/LeftOperationalPanel'
import { EvaluationConsole } from '@/modules/monitoring/components/EvaluationConsole'
import { IntelligencePanel } from '@/modules/monitoring/components/IntelligencePanel'
import { CrystalModuleConsoleChannel } from '@/modules/monitoring/components/CrystalStructure'

interface MonitoringCenterProps {
  user: User | null
  areaEntries: AreaHealthEntry[]
  selectedArea: Area | undefined
  selectedAreaId: string
  areaHealth: AreaHealth
  isGlobal: boolean
  areaCommitments: Commitment[]
  selectedCommitment: Commitment | null
  selectedCommitmentId: string | null
  loading: boolean
  error: string | null
  executorWithoutArea: boolean
  criticalCount: number
  projectedTitle: string | null
  canValidate: boolean
  isUpdating: boolean
  canApplyValidation: boolean
  isApplyingValidation: boolean
  onSelectArea: (areaId: string) => void
  onSelectCommitment: (commitmentId: string) => void
  onValidateCommitment: (status: 'Cumplido' | 'Incumplido') => void
  onApplyAreaValidation: () => void
  onLogout: () => void
  onReset: () => void
}

export function MonitoringCenter({
  user,
  areaEntries,
  selectedArea: _selectedArea,
  selectedAreaId,
  areaHealth,
  isGlobal,
  areaCommitments,
  selectedCommitment,
  selectedCommitmentId,
  loading,
  error,
  executorWithoutArea,
  criticalCount,
  projectedTitle,
  canValidate,
  isUpdating,
  canApplyValidation,
  isApplyingValidation,
  onSelectArea,
  onSelectCommitment,
  onValidateCommitment,
  onApplyAreaValidation,
  onLogout,
  onReset,
}: MonitoringCenterProps) {
  return (
    <ScreenDeck
      environment={areaHealth.environment}
      header={
        <MonitoringHeader
          user={user}
          environment={areaHealth.environment}
          onLogout={onLogout}
          onReset={onReset}
        />
      }
    >
      <MonitoringLayout
        left={
          <LeftOperationalPanel
            selectedCommitment={selectedCommitment}
            canValidate={canValidate}
            isUpdating={isUpdating}
            onValidateCommitment={onValidateCommitment}
          />
        }
        main={
          <>
            <AreaFocusStrip
              entries={areaEntries}
              selectedAreaId={selectedAreaId}
              onSelectArea={onSelectArea}
            />
            <CrystalModuleConsoleChannel />
            <EvaluationConsole
              commitments={areaCommitments}
              selectedCommitmentId={selectedCommitmentId}
              loading={loading}
              error={error}
              executorWithoutArea={executorWithoutArea}
              isGlobal={isGlobal}
              canValidate={canValidate}
              canApplyValidation={canApplyValidation}
              isApplyingValidation={isApplyingValidation}
              onSelectCommitment={onSelectCommitment}
              onApplyAreaValidation={onApplyAreaValidation}
              environment={areaHealth.environment}
            />
          </>
        }
        right={
          <IntelligencePanel
            health={areaHealth}
            criticalCount={criticalCount}
            projectedTitle={projectedTitle}
            environment={areaHealth.environment}
          />
        }
      />
    </ScreenDeck>
  )
}
