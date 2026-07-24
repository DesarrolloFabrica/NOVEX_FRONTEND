// Componente: riel de pasos del wizard de captura operacional.
// Sprint 9: índice tipográfico — sin pastillas ni anillos.

export type WizardStepId = 1 | 2 | 3 | 4

const STEPS: Array<{ id: WizardStepId; label: string }> = [
  { id: 1, label: 'Registrar' },
  { id: 2, label: 'Analizar' },
  { id: 3, label: 'Interpretación' },
  { id: 4, label: 'Confirmar' },
]

interface WizardStepRailProps {
  currentStep: WizardStepId
}

export function WizardStepRail({ currentStep }: WizardStepRailProps) {
  return (
    <nav aria-label="Pasos del registro" className="omega-wizard-steps">
      <ol className="omega-wizard-steps__rail">
        {STEPS.map((step, index) => {
          const active = step.id === currentStep
          const done = step.id < currentStep
          return (
            <li key={step.id} className="flex items-center gap-2">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="hidden h-px w-5 bg-slate-400/30 sm:block"
                />
              ) : null}
              <span
                className={`omega-wizard-steps__step ${
                  active
                    ? 'omega-wizard-steps__step--active'
                    : done
                      ? 'omega-wizard-steps__step--done'
                      : ''
                }`}
              >
                <span className="omega-wizard-steps__index" aria-hidden="true">
                  0{step.id}
                </span>
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
