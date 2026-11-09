import { useMemo, useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { planTourSteps } from '../engine/tourPlan'
import { writePilotProgress, type TourOutcome } from '../engine/tourProgress'
import { TourOverlay } from '../TourOverlay'
import { COORDINATOR_PILOT_STEPS } from './coordinatorPilot'

export interface CoordinatorPilotTourProps {
  /** Se llama al terminar, omitir o pausar; el padre desmonta el piloto. */
  onClose: () => void
}

/**
 * Ejecución manual del piloto del Coordinador. Estado local y progreso aislado:
 * no se llama a ninguna operación de onboarding del backend ni del contexto.
 * Solo se monta desde el menú del Centro, y el menú solo lo ofrece en desarrollo.
 */
export function CoordinatorPilotTour({ onClose }: CoordinatorPilotTourProps) {
  const { user } = useAuth()
  const [stepIndex, setStepIndex] = useState(0)
  const [active, setActive] = useState(true)
  const userId = user?.id

  const steps = useMemo(
    () =>
      planTourSteps(
        COORDINATOR_PILOT_STEPS,
        { permissions: user?.permissions ?? [] },
        'COORDINADOR',
      ),
    [user?.permissions],
  )

  const record = (outcome: TourOutcome, index: number) => {
    if (userId) writePilotProgress(userId, outcome, index)
  }

  const finish = (outcome: Extract<TourOutcome, 'completed' | 'skipped'>) => {
    setActive(false)
    record(outcome, stepIndex)
    onClose()
  }

  const next = () => {
    if (stepIndex >= steps.length - 1) {
      finish('completed')
      return
    }
    const following = stepIndex + 1
    setStepIndex(following)
    record('in-progress', following)
  }

  const previous = () => {
    const preceding = Math.max(0, stepIndex - 1)
    setStepIndex(preceding)
    record('in-progress', preceding)
  }

  const pause = () => {
    setActive(false)
    record('in-progress', stepIndex)
    onClose()
  }

  return (
    <TourOverlay
      active={active}
      steps={steps}
      stepIndex={Math.min(stepIndex, steps.length - 1)}
      onNext={next}
      onPrevious={previous}
      onPause={pause}
      onSkip={() => finish('skipped')}
    />
  )
}
