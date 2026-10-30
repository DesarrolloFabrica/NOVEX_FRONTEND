import { useNavigate } from 'react-router-dom'
import { useOnboarding } from './OnboardingContext'
import { TourOverlay } from './TourOverlay'

/**
 * Recorrido del onboarding conectado al contexto. Toda la lógica visual vive en
 * `TourOverlay`, que también usa el piloto del Coordinador sin contexto.
 */
export function OnboardingTour() {
  const { active, stepIndex, steps, next, previous, pause, skip } =
    useOnboarding()
  const navigate = useNavigate()

  return (
    <TourOverlay
      active={active}
      steps={steps}
      stepIndex={stepIndex}
      onNext={next}
      onPrevious={previous}
      onPause={pause}
      onSkip={skip}
      onRecover={() => navigate('/situaciones')}
    />
  )
}
