// Componente: orquestador del wizard — 2 pasos: capturar e interpretar/guardar.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CRYSTAL_ZONE,
  FOCUS_VISIBLE,
} from '@/modules/monitoring/constants/monitoringTheme'
import { EventCaptureForm } from '@/modules/operational-events/components/EventCaptureForm'
import { EventInterpretationView } from '@/modules/operational-events/components/EventInterpretationView'
import {
  WizardStepRail,
  type WizardStepId,
} from '@/modules/operational-events/components/WizardStepRail'
import { useOperationalEvents } from '@/modules/operational-events/hooks/useOperationalEvents'
import type {
  AIInterpretation,
  OperationalEventDraft,
} from '@/modules/operational-events/types/operational-event.types'
import { buildOperationalEventFromCapture } from '@/modules/operational-events/utils/buildOperationalEvent'
import { getErrorMessage } from '@/shared/utils/error'
import {
  CAPTURE_DEFAULT_ACTOR,
  createDraftEventId,
  listCaptureAreas,
  simulateAIInterpretation,
} from '@/modules/operational-events/utils/simulateAIInterpretation'

function todayDateInput(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

function createEmptyDraft(defaultAreaId: string): OperationalEventDraft {
  return {
    title: '',
    description: '',
    sourceAreaId: defaultAreaId,
    reportedAt: todayDateInput(),
    observations: '',
    attachmentNames: [],
  }
}

export function OperationalEventWizard() {
  const {
    loadOperationalEvents,
    registerOperationalEvent,
    loading: storeLoading,
  } = useOperationalEvents()

  const areas = useMemo(() => listCaptureAreas(), [])
  const defaultAreaId = areas[0]?.id ?? ''

  const [step, setStep] = useState<WizardStepId>(1)
  const [draft, setDraft] = useState<OperationalEventDraft>(() =>
    createEmptyDraft(defaultAreaId),
  )
  const [captureContext, setCaptureContext] = useState({
    urgency: 'Normal',
    affectedAreas: [] as string[],
    otherAffectedArea: '',
  })
  const [analysisDraft, setAnalysisDraft] =
    useState<OperationalEventDraft | null>(null)
  const [eventId, setEventId] = useState(() => createDraftEventId())
  const [interpretation, setInterpretation] = useState<AIInterpretation | null>(
    null,
  )
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadOperationalEvents()
  }, [loadOperationalEvents])

  async function handleAnalyze() {
    setError(null)
    setAnalyzing(true)
    try {
      const nextId = eventId || createDraftEventId()
      const contextNotes = [
        `Urgencia percibida por quien reporta: ${captureContext.urgency}.`,
        captureContext.affectedAreas.length > 0
          ? `Personas o áreas afectadas: ${captureContext.affectedAreas.join(', ')}.`
          : null,
        captureContext.otherAffectedArea.trim()
          ? `Otra área afectada: ${captureContext.otherAffectedArea.trim()}.`
          : null,
        draft.observations?.trim()
          ? `Evidencias adicionales: ${draft.observations.trim()}`
          : null,
      ].filter((entry): entry is string => Boolean(entry))
      const nextAnalysisDraft = {
        ...draft,
        observations: contextNotes.join('\n'),
      }
      setEventId(nextId)
      setAnalysisDraft(nextAnalysisDraft)
      const result = await simulateAIInterpretation(nextAnalysisDraft, nextId)
      setInterpretation(result)
      setStep(2)
    } catch (analyzeError) {
      setError(getErrorMessage(analyzeError))
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    if (!interpretation) return
    setError(null)
    setSaving(true)
    try {
      const event = buildOperationalEventFromCapture({
        eventId,
        draft: analysisDraft ?? draft,
        interpretation,
        actor: CAPTURE_DEFAULT_ACTOR,
      })
      await registerOperationalEvent(event)
      setSaved(true)
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  function handleRegisterAnother() {
    setDraft(createEmptyDraft(defaultAreaId))
    setCaptureContext({
      urgency: 'Normal',
      affectedAreas: [],
      otherAffectedArea: '',
    })
    setAnalysisDraft(null)
    setEventId(createDraftEventId())
    setInterpretation(null)
    setSaved(false)
    setError(null)
    setStep(1)
  }

  return (
    <div
      className={`cunmark-operational-event-wizard cunmark-wizard-station ${CRYSTAL_ZONE}`}
    >
      <div className="cunmark-wizard-station__rail">
        <WizardStepRail currentStep={step} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {step === 1 ? (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <EventCaptureForm
              draft={draft}
              areas={areas}
              captureContext={captureContext}
              onCaptureContextChange={setCaptureContext}
              submitLabel={analyzing ? 'Generando análisis…' : 'Generar análisis IA'}
              submitDisabled={analyzing}
              onChange={setDraft}
              onSubmit={() => {
                void handleAnalyze()
              }}
            />
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 2 && interpretation && !saved ? (
          <EventInterpretationView
            interpretation={interpretation}
            saving={saving || storeLoading}
            error={error}
            onBack={() => {
              setError(null)
              setStep(1)
            }}
            onSave={() => void handleSave()}
          />
        ) : null}

        {step === 2 && saved ? (
          <section className="cunmark-event-saved space-y-5">
            <header className="space-y-1">
              <h2 className="text-sm font-semibold tracking-tight text-emerald-800">
                Situación guardada
              </h2>
              <p className="text-[0.8rem] leading-relaxed text-slate-500">
                Ya está disponible en Situaciones registradas.
              </p>
            </header>

            <div className="py-1 text-sm">
              <p className="font-medium text-slate-800">{draft.title}</p>
              {interpretation ? (
                <p className="mt-1 text-[0.8rem] text-slate-500">
                  {interpretation.categoryName} · Riesgo{' '}
                  {interpretation.riskScore}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-400/15 pt-4">
              <Link
                to="/situaciones"
                viewTransition
                className={`text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-emerald-700 hover:text-emerald-900 ${FOCUS_VISIBLE}`}
              >
                Situaciones registradas
              </Link>
              <button
                type="button"
                onClick={handleRegisterAnother}
                className={`bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 ${FOCUS_VISIBLE}`}
              >
                Registrar otra
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
