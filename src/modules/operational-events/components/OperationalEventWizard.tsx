// Componente: orquestador del wizard — capturar, confirmar y analizar.

import { useEffect, useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { CRYSTAL_ZONE } from '@/modules/monitoring/constants/monitoringTheme'
import { SituationAnalysisPanel } from '@/modules/operational-events/components/analysis/SituationAnalysisPanel'
import { ConnectedSituationDetailModal } from '@/modules/operational-events/components/ConnectedSituationDetailModal'
import { EventCaptureForm } from '@/modules/operational-events/components/EventCaptureForm'
import { SituationCaptureSummary } from '@/modules/operational-events/components/SituationCaptureSummary'
import {
  WizardStepRail,
  type WizardStepId,
} from '@/modules/operational-events/components/WizardStepRail'
import { registerSituationWithEvidences } from '@/modules/services/situationRegistration.service'
import { fetchCoordinationsRequest } from '@/modules/situations/services/coordinations.service'
import { fetchIncidentCategoriesRequest } from '@/modules/situations/services/situations.service'
import type { SituationCaptureDraft } from '@/modules/situations/types/situation-capture.types'
import type {
  CoordinationSummary,
  IncidentCategorySummary,
  SituationResponse,
} from '@/modules/situations/types/situation.types'
import {
  clearSituationCapturePersistence,
  readSituationCaptureDraft,
  readSituationCaptureWizardStep,
  writeSituationCaptureDraft,
  writeSituationCaptureWizardStep,
} from '@/modules/operational-events/utils/situationCaptureDraftStorage'
import { getErrorMessage } from '@/shared/utils/error'
import { isValidUuid } from '@/shared/utils/uuid'

function todayDateInput(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

function createEmptyDraft(defaultCoordinationId = ''): SituationCaptureDraft {
  return {
    title: '',
    description: '',
    coordinationId: defaultCoordinationId,
    reportedAt: todayDateInput(),
    detectionMethod: '',
    detectionMethodOther: '',
    affectedParties: [],
    affectedPartyOther: '',
    relatedCoordinationIds: [],
    additionalNotes: '',
    attachments: [],
  }
}

function resolveDefaultCoordinationId(
  coordinations: CoordinationSummary[],
  coordinationId?: string,
  coordinationCode?: string,
): string {
  if (coordinationId && coordinations.some((item) => item.id === coordinationId)) {
    return coordinationId
  }

  if (coordinationCode) {
    const byCode = coordinations.find((item) => item.code === coordinationCode)
    if (byCode) return byCode.id
  }

  return coordinations[0]?.id ?? ''
}

export function OperationalEventWizard() {
  const { user } = useAuth()
  const [step, setStep] = useState<WizardStepId>(
    () => readSituationCaptureWizardStep() ?? 1,
  )
  const [draft, setDraft] = useState<SituationCaptureDraft>(() => {
    return readSituationCaptureDraft() ?? createEmptyDraft()
  })
  const [coordinations, setCoordinations] = useState<CoordinationSummary[]>([])
  const [categories, setCategories] = useState<IncidentCategorySummary[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(true)
  const [situation, setSituation] = useState<SituationResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showExecutiveModal, setShowExecutiveModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registeredSituationId =
    situation && isValidUuid(situation.id) ? situation.id : null

  useEffect(() => {
    writeSituationCaptureDraft(draft)
  }, [draft])

  useEffect(() => {
    writeSituationCaptureWizardStep(step)
  }, [step])

  useEffect(() => {
    let cancelled = false

    async function loadCatalogs() {
      setLoadingCatalogs(true)
      setError(null)
      try {
        const [coordinationsResponse, categoriesResponse] = await Promise.all([
          fetchCoordinationsRequest(),
          fetchIncidentCategoriesRequest(),
        ])

        if (cancelled) return

        const sortedCoordinations = [...coordinationsResponse].sort(
          (left, right) => left.displayOrder - right.displayOrder,
        )

        setCoordinations(sortedCoordinations)
        setCategories(categoriesResponse)
        setDraft((current) => ({
          ...current,
          coordinationId:
            current.coordinationId ||
            resolveDefaultCoordinationId(
              sortedCoordinations,
              user?.coordinationId,
              user?.selectedAreaId,
            ),
        }))
      } catch (loadError) {
        if (!cancelled) {
          setError(getErrorMessage(loadError))
        }
      } finally {
        if (!cancelled) {
          setLoadingCatalogs(false)
        }
      }
    }

    void loadCatalogs()

    return () => {
      cancelled = true
    }
  }, [user?.coordinationId, user?.selectedAreaId])

  async function handleConfirmAndRegister() {
    setError(null)

    if (registeredSituationId) {
      setStep(3)
      return
    }

    setSubmitting(true)

    try {
      const created = await registerSituationWithEvidences({
        draft,
        coordinations,
        categories,
      })
      clearSituationCapturePersistence()
      setSituation(created)
      setStep(3)
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={`novex-operational-event-wizard novex-wizard-station ${CRYSTAL_ZONE}`}
    >
      <div className="novex-wizard-station__rail">
        <WizardStepRail currentStep={step} />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden pr-1">
        {step === 1 ? (
          <div className="novex-wizard-step-pane flex min-h-0 flex-1 flex-col gap-3">
            <EventCaptureForm
              draft={draft}
              coordinations={coordinations}
              loadingCoordinations={loadingCatalogs}
              onChange={setDraft}
              submitLabel="Continuar"
              submitDisabled={loadingCatalogs}
              onSubmit={() => {
                setError(null)
                setStep(2)
              }}
            />
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="novex-wizard-step-pane novex-wizard-step-pane--dossier">
            <SituationCaptureSummary
              draft={draft}
              coordinations={coordinations}
              confirming={submitting}
              canConfirm={!loadingCatalogs && Boolean(draft.coordinationId)}
              onBack={() => {
                setError(null)
                setStep(1)
              }}
              onConfirm={() => {
                void handleConfirmAndRegister()
              }}
            />
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 3 && registeredSituationId ? (
          <div className="novex-wizard-step-pane novex-wizard-step-pane--intelligence flex min-h-0 flex-1 flex-col">
            <SituationAnalysisPanel
              situationId={registeredSituationId}
              situationTitle={situation?.title ?? draft.title}
              situation={situation}
              onViewExecutiveReport={() => setShowExecutiveModal(true)}
            />
          </div>
        ) : null}
      </div>

      {showExecutiveModal && registeredSituationId ? (
        <ConnectedSituationDetailModal
          situationId={registeredSituationId}
          onClose={() => setShowExecutiveModal(false)}
        />
      ) : null}
    </div>
  )
}
