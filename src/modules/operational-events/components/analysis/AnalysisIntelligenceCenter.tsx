import { useEffect, useState } from 'react'

const PROCESSING_STEPS = [
  'Validando expediente',
  'Procesando contexto operativo',
  'Analizando impacto institucional',
  'Identificando coordinaciones afectadas',
  'Generando recomendaciones',
  'Preparando informe ejecutivo',
] as const

const ROTATING_MESSAGES = [
  'Analizando dependencias entre coordinaciones...',
  'Evaluando impacto institucional...',
  'Estimando riesgo operacional...',
  'Detectando patrones...',
  'Construyendo recomendaciones...',
] as const

const SKELETON_SECTIONS = [
  { title: 'Resumen Ejecutivo', lines: [0.92, 0.72] },
  { title: 'Impacto', lines: [0.58, 0.84] },
  { title: 'Recomendaciones', lines: [0.88, 0.64] },
] as const

function formatElapsed(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000))
  return `${seconds}s`
}

interface AnalysisIntelligenceCenterProps {
  startedAt?: number
}

export function AnalysisIntelligenceCenter({
  startedAt = Date.now(),
}: AnalysisIntelligenceCenterProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setActiveStep((current) =>
        current < PROCESSING_STEPS.length - 1 ? current + 1 : current,
      )
    }, 2_400)

    const messageTimer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % ROTATING_MESSAGES.length)
    }, 3_200)

    const elapsedTimer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 500)

    return () => {
      window.clearInterval(stepTimer)
      window.clearInterval(messageTimer)
      window.clearInterval(elapsedTimer)
    }
  }, [startedAt])

  return (
    <section
      className="cunmark-intel-center"
      aria-live="polite"
      aria-busy="true"
      aria-label="Centro de inteligencia operacional"
    >
      <div className="cunmark-intel-center__main">
        <header className="cunmark-intel-center__header">
          <div className="cunmark-intel-center__pulse" aria-hidden="true">
            <span className="cunmark-intel-center__pulse-ring" />
            <span className="cunmark-intel-center__pulse-core" />
          </div>
          <div className="cunmark-intel-center__headline">
            <h2>Analizando situación…</h2>
            <p>
              CUNMARK está interpretando el expediente operativo.
              <br />
              Esto puede tardar algunos segundos.
            </p>
          </div>
          <p className="cunmark-intel-center__elapsed">
            Tiempo transcurrido · {formatElapsed(elapsedMs)}
          </p>
        </header>

        <div className="cunmark-intel-center__body">
          <div className="cunmark-intel-center__timeline">
            <h3>Procesamiento</h3>
            <ol>
              {PROCESSING_STEPS.map((step, index) => {
                const state =
                  index < activeStep
                    ? 'done'
                    : index === activeStep
                      ? 'active'
                      : 'pending'

                return (
                  <li
                    key={step}
                    className={`cunmark-intel-center__step cunmark-intel-center__step--${state}`}
                  >
                    <span className="cunmark-intel-center__step-marker" aria-hidden="true">
                      {state === 'done' ? '✓' : state === 'active' ? '●' : '○'}
                    </span>
                    <span>{step}</span>
                  </li>
                )
              })}
            </ol>
            <p className="cunmark-intel-center__status-message" key={messageIndex}>
              {ROTATING_MESSAGES[messageIndex]}
            </p>
          </div>

          <aside className="cunmark-intel-center__preview" aria-hidden="true">
            <h3>Construyendo informe</h3>
            {SKELETON_SECTIONS.map((section) => (
              <article key={section.title} className="cunmark-intel-center__skeleton-card">
                <p className="cunmark-intel-center__skeleton-title">{section.title}</p>
                {section.lines.map((width, index) => (
                  <span
                    key={`${section.title}-${index}`}
                    className="cunmark-intel-center__skeleton-line"
                    style={{ width: `${Math.round(width * 100)}%` }}
                  />
                ))}
              </article>
            ))}
          </aside>
        </div>
      </div>
    </section>
  )
}
