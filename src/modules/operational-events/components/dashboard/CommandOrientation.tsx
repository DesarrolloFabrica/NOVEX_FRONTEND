import { Link } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

const FLOW_STEPS = [
  'Registrar',
  'Situaciones',
  'Análisis IA',
  'Seguimiento',
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
      className="omega-command-orientation"
      aria-labelledby="omega-command-heading"
    >
      <div className="omega-command-orientation__copy">
        <p className="omega-section-eyebrow mb-2">Bienvenida</p>
        <h2 id="omega-command-heading" className="omega-command-orientation__title">
          O.M.E.G.A. convierte lo que ocurre en el frente operativo en
          decisiones claras con apoyo de IA.
        </h2>
        <p className="omega-command-orientation__hint">
          Empiece registrando una situación. Luego verá el análisis y podrá
          dar seguimiento a lo que importa.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/operational-events/register"
            viewTransition
            className="omega-register-cta omega-register-cta--command"
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

      <ol className="omega-command-flow" aria-label="Recorrido operacional">
        {FLOW_STEPS.map((step, index) => (
          <li key={step} className="omega-command-flow__step">
            <span className="omega-command-flow__label">{step}</span>
            {index < FLOW_STEPS.length - 1 ? (
              <span className="omega-command-flow__arrow" aria-hidden="true">
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
