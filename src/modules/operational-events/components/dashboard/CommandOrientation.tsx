import { Link } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

const FLOW_STEPS = [
  'Registrar',
  'Situaciones',
  'Dashboard',
  'Gestión',
] as const

/**
 * Onboarding contextual de primera vez.
 * Solo se monta cuando onboardingCompleted === false.
 */
export function CommandOrientation() {
  const { completeOnboarding } = useAuth()

  async function handleStart() {
    await completeOnboarding()
  }

  return (
    <section
      className="cunmark-command-orientation"
      aria-labelledby="cunmark-command-heading"
    >
      <div className="cunmark-command-orientation__copy">
        <p className="cunmark-section-eyebrow mb-2">Bienvenida</p>
        <h2 id="cunmark-command-heading" className="cunmark-command-orientation__title">
          Cunmark convierte lo que ocurre en el frente operativo en
          decisiones claras con apoyo de IA.
        </h2>
        <p className="cunmark-command-orientation__hint">
          Empiece registrando una situación. Luego verá el análisis y podrá
          dar seguimiento a lo que importa.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/situaciones/nueva"
            viewTransition
            className="cunmark-register-cta cunmark-register-cta--command"
            onClick={() => {
              void handleStart()
            }}
          >
            Registrar primera situación
          </Link>
          <button
            type="button"
            className="text-[0.72rem] font-semibold text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            onClick={() => {
              void handleStart()
            }}
          >
            Entendido
          </button>
        </div>
      </div>

      <ol className="cunmark-command-flow" aria-label="Recorrido operacional">
        {FLOW_STEPS.map((step, index) => (
          <li key={step} className="cunmark-command-flow__step">
            <span className="cunmark-command-flow__label">{step}</span>
            {index < FLOW_STEPS.length - 1 ? (
              <span className="cunmark-command-flow__arrow" aria-hidden="true">
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
