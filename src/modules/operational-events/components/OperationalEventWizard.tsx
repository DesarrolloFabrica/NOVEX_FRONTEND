// Componente: orquestador del wizard de captura de eventos operacionales.
// Responsabilidad: estado local de pasos + ensamblado del evento + persistencia
// vía useOperationalEvents. Sin Gemini real.

import { useEffect, useMemo, useState } from 'react'
import { CRYSTAL_ZONE } from '@/modules/monitoring/constants/monitoringTheme'
import { EventAnalyzeStep } from '@/modules/operational-events/components/EventAnalyzeStep'
import { EventCaptureForm } from '@/modules/operational-events/components/EventCaptureForm'
import { EventConfirmSave } from '@/modules/operational-events/components/EventConfirmSave'
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
  return new Date().toISOString().slice(0, 10)
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
      setEventId(nextId)
      const result = await simulateAIInterpretation(draft, nextId)
      setInterpretation(result)
      setStep(3)
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
        draft,
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
    setEventId(createDraftEventId())
    setInterpretation(null)
    setSaved(false)
    setError(null)
    setStep(1)
  }

  return (
    <div
      className={`omega-operational-event-wizard omega-wizard-station ${CRYSTAL_ZONE}`}
    >
      <div className="omega-wizard-station__rail">
        <WizardStepRail currentStep={step} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {step === 1 ? (
          <EventCaptureForm
            draft={draft}
            areas={areas}
            onChange={setDraft}
            onSubmit={() => {
              setError(null)
              setStep(2)
            }}
          />
        ) : null}

        {step === 2 ? (
          <EventAnalyzeStep
            draft={draft}
            analyzing={analyzing}
            error={error}
            onAnalyze={() => void handleAnalyze()}
            onBack={() => {
              setError(null)
              setStep(1)
            }}
          />
        ) : null}

        {step === 3 && interpretation ? (
          <EventInterpretationView
            interpretation={interpretation}
            onBack={() => {
              setError(null)
              setStep(2)
            }}
            onContinue={() => {
              setError(null)
              setStep(4)
            }}
          />
        ) : null}

        {step === 4 && interpretation ? (
          <EventConfirmSave
            draft={draft}
            interpretation={interpretation}
            saving={saving || storeLoading}
            saved={saved}
            error={error}
            onBack={() => {
              setError(null)
              setStep(3)
            }}
            onSave={() => void handleSave()}
            onRegisterAnother={handleRegisterAnother}
          />
        ) : null}
      </div>
    </div>
  )
}
