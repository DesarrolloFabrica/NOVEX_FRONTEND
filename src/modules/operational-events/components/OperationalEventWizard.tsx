// Componente: orquestador del wizard — capturar, confirmar y analizar.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { isCoordinator } from '@/modules/auth/utils/permissions'
import { CRYSTAL_ZONE } from '@/modules/monitoring/constants/monitoringTheme'
import { SituationAnalysisPanel } from '@/modules/operational-events/components/analysis/SituationAnalysisPanel'
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
import { todayCaptureDate } from '@/modules/operational-events/utils/situationCaptureDate'
import { validateSituationCaptureDraft } from '@/modules/operational-events/utils/situationCaptureValidation'
import { getErrorMessage } from '@/shared/utils/error'
import { isValidUuid } from '@/shared/utils/uuid'

function createEmptyDraft(defaultCoordinationId = ''): SituationCaptureDraft {
  return {
    title: '',
    description: '',
    coordinationId: defaultCoordinationId,
    reportedAt: todayCaptureDate(),
    detectionMethod: '',
    detectionMethodOther: '',
    affectedParties: [],
    affectedPartyOther: '',
    relatedCoordinationIds: [],
    additionalNotes: '',
  }
}

function resolveCoordinationAfterCatalogLoad(
  currentCoordinationId: string,
  coordinations: CoordinationSummary[],
  options: {
    prefillCoordinationCode?: string | null
    userCoordinationId?: string
    coordinatorMode: boolean
  },
): string {
  const validIds = new Set(coordinations.map((item) => item.id))

  if (currentCoordinationId && validIds.has(currentCoordinationId)) {
    return currentCoordinationId
  }

  if (options.prefillCoordinationCode) {
    const byCode = coordinations.find(
      (item) => item.code === options.prefillCoordinationCode,
    )
    if (byCode) return byCode.id
  }

  if (
    options.coordinatorMode &&
    options.userCoordinationId &&
    validIds.has(options.userCoordinationId)
  ) {
    return options.userCoordinationId
  }

  return ''
}

export function OperationalEventWizard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const prefillCoordinationCode = searchParams.get('coordination')
  const coordinationLocked =
    Boolean(prefillCoordinationCode) || isCoordinator(user)
  const coordinatorMode = isCoordinator(user)

  const [step, setStep] = useState<WizardStepId>(
    () => readSituationCaptureWizardStep() ?? 1,
  )
  const [draft, setDraft] = useState<SituationCaptureDraft>(() => {
    return readSituationCaptureDraft() ?? createEmptyDraft()
  })
  const [coordinationCatalog, setCoordinationCatalog] = useState<CoordinationSummary[]>([])
  const [categories, setCategories] = useState<IncidentCategorySummary[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(true)
  const responsibleCoordinations = useMemo(() => {
    if (coordinatorMode && user?.coordinationId) {
      return coordinationCatalog.filter(
        (item) => item.id === user.coordinationId,
      )
    }
    return coordinationCatalog
  }, [coordinationCatalog, coordinatorMode, user?.coordinationId])
  const [situation, setSituation] = useState<SituationResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registeredSituationId =
    situation && isValidUuid(situation.id) ? situation.id : null
  const captureValidation = validateSituationCaptureDraft(
    draft,
    coordinationCatalog,
    responsibleCoordinations,
  )

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
          fetchCoordinationsRequest(true),
          fetchIncidentCategoriesRequest(),
        ])

        if (cancelled) return

        const sortedCoordinations = [...coordinationsResponse].sort(
          (left, right) => left.displayOrder - right.displayOrder,
        )

        setCoordinationCatalog(sortedCoordinations)
        setCategories(categoriesResponse)
        setDraft((current) => {
          const nextCoordinationId = resolveCoordinationAfterCatalogLoad(
            current.coordinationId,
            sortedCoordinations,
            {
              prefillCoordinationCode,
              userCoordinationId: user?.coordinationId,
              coordinatorMode,
            },
          )

          if (current.coordinationId === nextCoordinationId) return current
          return {
            ...current,
            coordinationId: nextCoordinationId,
          }
        })
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
  }, [coordinatorMode, prefillCoordinationCode, user?.coordinationId])

  function handleAnalysisComplete(situationId: string) {
    navigate(`/gestion?situation=${encodeURIComponent(situationId)}`, {
      replace: true,
    })
  }

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
        coordinations: coordinationCatalog,
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
              coordinations={responsibleCoordinations}
              relatedCoordinations={coordinationCatalog}
              loadingCoordinations={loadingCatalogs}
              coordinationLocked={coordinationLocked}
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
              coordinations={coordinationCatalog}
              confirming={submitting}
              canConfirm={!loadingCatalogs && captureValidation.valid}
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
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
