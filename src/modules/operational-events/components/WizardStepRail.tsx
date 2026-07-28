// Componente: riel de pasos del wizard (captura → resumen → interpretación).

export type WizardStepId = 1 | 2 | 3

const STEPS: Array<{ id: WizardStepId; label: string }> = [
  { id: 1, label: 'Registrar' },
  { id: 2, label: 'Resumen' },
  { id: 3, label: 'Interpretar' },
]

interface WizardStepRailProps {
  currentStep: WizardStepId
}

export function WizardStepRail({ currentStep }: WizardStepRailProps) {
  return (
    <nav aria-label="Pasos del registro" className="cunmark-wizard-steps">
      <ol className="cunmark-wizard-steps__rail">
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
                className={`cunmark-wizard-steps__step ${
                  active
                    ? 'cunmark-wizard-steps__step--active'
                    : done
                      ? 'cunmark-wizard-steps__step--done'
                      : ''
                }`}
              >
                <span className="cunmark-wizard-steps__index" aria-hidden="true">
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
