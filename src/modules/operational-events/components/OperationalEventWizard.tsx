// Componente: orquestador del wizard — capturar, confirmar y analizar.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchSituations } from '@/modules/api/situations.api'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { isCoordinator } from '@/modules/auth/utils/permissions'
import { CRYSTAL_ZONE } from '@/modules/monitoring/constants/monitoringTheme'
import { SituationAnalysisPanel } from '@/modules/operational-events/components/analysis/SituationAnalysisPanel'
import { AnalysisIntelligenceCenter } from '@/modules/operational-events/components/analysis/AnalysisIntelligenceCenter'
import { EventCaptureForm } from '@/modules/operational-events/components/EventCaptureForm'
import { SituationCaptureSummary } from '@/modules/operational-events/components/SituationCaptureSummary'
import {
  WizardStepRail,
  type WizardStepId,
} from '@/modules/operational-events/components/WizardStepRail'
import { registerSituationWithAnalysis } from '@/modules/services/situationRegistration.service'
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
import {
  clearOnboardingSituation,
  readOnboardingSituation,
  rememberOnboardingSituation,
} from '@/modules/onboarding/onboardingFirstSituation'
import { findLatestSituationCreatedByUser } from '@/modules/onboarding/onboardingSituationRecovery'
import { useOnboarding } from '@/modules/onboarding/OnboardingContext'

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
    analystMode: boolean
  },
): string {
  const validIds = new Set(coordinations.map((item) => item.id))

  if (options.analystMode) return ''

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
  const { stepIndex: onboardingStepIndex, steps: onboardingSteps } =
    useOnboarding()
  const [searchParams] = useSearchParams()
  const prefillCoordinationCode = searchParams.get('coordination')
  const coordinationLocked =
    Boolean(prefillCoordinationCode) || isCoordinator(user)
  const coordinatorMode = isCoordinator(user)
  const analystMode = user?.roleCode === 'ANALISTA'
  const onboardingStepId = onboardingSteps[onboardingStepIndex]?.id
  const canResumeOnboardingAnalysis =
    !user?.onboardingCompleted &&
    (onboardingStepId === 'review' || onboardingStepId === 'analysis')
  const rememberedSituationId = canResumeOnboardingAnalysis
    ? readOnboardingSituation(user?.id)
    : null
  const resumableSituationId =
    rememberedSituationId && isValidUuid(rememberedSituationId)
      ? rememberedSituationId
      : null

  /** Impide que la recuperación de onboarding reenganche un expediente viejo. */
  const skipRecoveryRef = useRef(false)
  const registrationStartedAtRef = useRef(Date.now())

  const [step, setStep] = useState<WizardStepId>(() => {
    if (resumableSituationId) return 3
    const persisted = readSituationCaptureWizardStep()
    // El id de la situación no vive en el borrador; nunca restaure una
    // pantalla de análisis sin expediente asociado.
    return persisted === 3 ? 1 : (persisted ?? 1)
  })
  const [draft, setDraft] = useState<SituationCaptureDraft>(() => {
    return readSituationCaptureDraft() ?? createEmptyDraft()
  })
  const [coordinationCatalog, setCoordinationCatalog] = useState<
    CoordinationSummary[]
  >([])
  const [categories, setCategories] = useState<IncidentCategorySummary[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(true)
  const responsibleCoordinations = useMemo(() => {
    if (analystMode) return []
    if (coordinatorMode && user?.coordinationId) {
      return coordinationCatalog.filter(
        (item) => item.id === user.coordinationId,
      )
    }
    return coordinationCatalog
  }, [analystMode, coordinationCatalog, coordinatorMode, user?.coordinationId])
  const [situation, setSituation] = useState<SituationResponse | null>(null)
  const [registeredSituationId, setRegisteredSituationId] = useState<
    string | null
  >(resumableSituationId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submissionInFlightRef = useRef(false)

  const captureValidation = validateSituationCaptureDraft(
    draft,
    coordinationCatalog,
    responsibleCoordinations,
    !analystMode,
  )

  useEffect(() => {
    writeSituationCaptureDraft(draft)
  }, [draft])

  useEffect(() => {
    writeSituationCaptureWizardStep(step)
  }, [step])

  useEffect(() => {
    if (!resumableSituationId || registeredSituationId || skipRecoveryRef.current) {
      return
    }

    setRegisteredSituationId(resumableSituationId)
    setStep(3)
  }, [registeredSituationId, resumableSituationId])

  useEffect(() => {
    if (
      skipRecoveryRef.current ||
      user?.onboardingCompleted ||
      onboardingStepId !== 'analysis' ||
      registeredSituationId
    ) {
      return
    }

    let cancelled = false

    async function recoverRegisteredSituation() {
      try {
        const response = await fetchSituations({ limit: 100, page: 1 })
        if (cancelled || skipRecoveryRef.current) return

        const recovered = findLatestSituationCreatedByUser(
          response.items,
          user?.id,
        )
        if (!recovered) return

        rememberOnboardingSituation(user?.id, recovered.id)
        setSituation(recovered)
        setRegisteredSituationId(recovered.id)
        setStep(3)
      } catch {
        // El tour habilita una salida segura si el expediente ya no es visible.
      }
    }

    void recoverRegisteredSituation()

    return () => {
      cancelled = true
    }
  }, [onboardingStepId, registeredSituationId, user?.id, user?.onboardingCompleted])

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
              analystMode,
            },
          )

          if (
            current.coordinationId === nextCoordinationId &&
            (!analystMode || current.relatedCoordinationIds.length === 0)
          ) {
            return current
          }
          return {
            ...current,
            coordinationId: nextCoordinationId,
            relatedCoordinationIds: analystMode ? [] : current.relatedCoordinationIds,
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
  }, [analystMode, coordinatorMode, prefillCoordinationCode, user?.coordinationId])

  function startFreshCapture() {
    skipRecoveryRef.current = true
    clearOnboardingSituation(user?.id)
    clearSituationCapturePersistence()
    setRegisteredSituationId(null)
    setSituation(null)
    setError(null)
    setDraft(
      createEmptyDraft(
        coordinatorMode && user?.coordinationId ? user.coordinationId : '',
      ),
    )
    setStep(1)
  }

  function handleAnalysisComplete(situationId: string) {
    // Conservar el ID de onboarding para que el tour pueda reabrir /gestion
    // con la misma situación en pasos posteriores (historial → gestión).
    clearSituationCapturePersistence()
    navigate(`/gestion?situation=${encodeURIComponent(situationId)}`, {
      replace: true,
    })
  }

  function handleViewDossier(situationId: string) {
    clearSituationCapturePersistence()
    navigate(`/gestion?situation=${encodeURIComponent(situationId)}`, {
      replace: true,
    })
  }

  async function handleConfirmAndRegister() {
    if (submissionInFlightRef.current) return

    setError(null)

    if (registeredSituationId) {
      setStep(3)
      return
    }

    submissionInFlightRef.current = true
    setSubmitting(true)
    registrationStartedAtRef.current = Date.now()
    setStep(3)

    try {
      const created = await registerSituationWithAnalysis({
        draft,
        coordinations: coordinationCatalog,
        categories,
        allowUnassignedCoordination: analystMode,
      })
      rememberOnboardingSituation(user?.id, created.id)
      clearSituationCapturePersistence()
      setSituation(created)
      setRegisteredSituationId(created.id)
      setStep(3)
    } catch (submitError) {
      setStep(2)
      setError(getErrorMessage(submitError))
    } finally {
      submissionInFlightRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div
      data-tour="registration-wizard"
      className={`novex-operational-event-wizard novex-wizard-station ${CRYSTAL_ZONE}`}
    >
      <div className="novex-wizard-station__rail" data-tour="wizard-steps">
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
              requiresCoordination={!analystMode}
              showRelatedCoordinations={!analystMode}
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

        {step === 3 && submitting && !registeredSituationId ? (
          <div
            className="novex-wizard-step-pane novex-wizard-step-pane--intelligence flex min-h-0 flex-1 flex-col gap-3"
            data-tour="analysis-stage"
          >
            <AnalysisIntelligenceCenter
              startedAt={registrationStartedAtRef.current}
            />
          </div>
        ) : null}

        {step === 3 && registeredSituationId ? (
          <div
            className="novex-wizard-step-pane novex-wizard-step-pane--intelligence flex min-h-0 flex-1 flex-col gap-3"
            data-tour="analysis-stage"
          >
            <div className="flex justify-end px-1">
              <button
                type="button"
                className="text-sm font-semibold text-slate-200 underline-offset-2 hover:underline"
                onClick={startFreshCapture}
              >
                Registrar otra situación
              </button>
            </div>
            <SituationAnalysisPanel
              situationId={registeredSituationId}
              situationTitle={situation?.title ?? draft.title}
              onAnalysisComplete={handleAnalysisComplete}
              onViewDossier={handleViewDossier}
              onRegisterAnother={startFreshCapture}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
