import { useEffect, useMemo, useState } from 'react'
import {
  NovexIcon,
  type NovexIconName,
} from '@/shared/components/NovexIcon'

const PROCESSING_STEPS: ReadonlyArray<{
  title: string
  detail: string
  icon: NovexIconName
}> = [
  {
    title: 'Validando expediente',
    detail: 'Información recibida',
    icon: 'file',
  },
  {
    title: 'Procesando contexto',
    detail: 'Entendiendo la situación',
    icon: 'users',
  },
  {
    title: 'Analizando impacto',
    detail: 'Evaluando afectaciones',
    icon: 'activity',
  },
  {
    title: 'Generando insights',
    detail: 'IA construyendo informe',
    icon: 'sparkles',
  },
  {
    title: 'Finalizando reporte',
    detail: 'Preparando resultados',
    icon: 'shield',
  },
] as const

const ROTATING_MESSAGES = [
  'Procesando información...',
  'Cruzando dependencias operativas...',
  'Identificando patrones de impacto...',
  'Construyendo recomendaciones estratégicas...',
] as const

const REPORT_SECTIONS: ReadonlyArray<{
  title: string
  description: string
  icon: NovexIconName
  tone: 'emerald' | 'cyan' | 'amber' | 'violet'
  offset: number
  floor: number
  ceiling: number
}> = [
  {
    title: 'Resumen ejecutivo',
    description: 'Generando narrativa ejecutiva y conclusiones principales.',
    icon: 'file',
    tone: 'emerald',
    offset: 14,
    floor: 22,
    ceiling: 96,
  },
  {
    title: 'Impacto',
    description: 'Evaluando afectación en áreas y procesos institucionales.',
    icon: 'activity',
    tone: 'cyan',
    offset: -4,
    floor: 14,
    ceiling: 90,
  },
  {
    title: 'Recomendaciones',
    description: 'Construyendo acciones prioritarias y plan de respuesta.',
    icon: 'sparkles',
    tone: 'amber',
    offset: -18,
    floor: 8,
    ceiling: 82,
  },
  {
    title: 'Indicadores e insights',
    description: 'Calculando métricas, tendencias y señales clave.',
    icon: 'grid',
    tone: 'violet',
    offset: -32,
    floor: 5,
    ceiling: 76,
  },
] as const

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`
}

interface AnalysisIntelligenceCenterProps {
  startedAt?: number
}

export function AnalysisIntelligenceCenter({
  startedAt = Date.now(),
}: AnalysisIntelligenceCenterProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(() =>
    Math.max(0, Date.now() - startedAt),
  )

  useEffect(() => {
    const elapsedTimer = window.setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - startedAt))
    }, 500)

    const messageTimer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % ROTATING_MESSAGES.length)
    }, 3_200)

    return () => {
      window.clearInterval(elapsedTimer)
      window.clearInterval(messageTimer)
    }
  }, [startedAt])

  const activeStep = Math.min(
    PROCESSING_STEPS.length - 1,
    Math.floor(elapsedMs / 2_600),
  )
  const progress = Math.min(94, Math.round(18 + elapsedMs / 190))
  const reportSections = useMemo(
    () =>
      REPORT_SECTIONS.map((section) => ({
        ...section,
        progress: Math.min(
          section.ceiling,
          Math.max(section.floor, progress + section.offset),
        ),
      })),
    [progress],
  )

  return (
    <section
      className="novex-intel-center"
      aria-busy="true"
      aria-labelledby="novex-analysis-title"
    >
      <p className="sr-only" aria-live="polite">
        {ROTATING_MESSAGES[messageIndex]}
      </p>

      <div className="novex-analysis-workspace">
        <div className="novex-analysis-workspace__stage">
          <header className="novex-analysis-workspace__header">
            <div className="novex-analysis-workspace__heading">
              <h2 id="novex-analysis-title">Analizando la situación...</h2>
              <p>NOVEX está interpretando el expediente operativo.</p>
              <p>Esto puede tardar algunos segundos.</p>
            </div>

            <div className="novex-analysis-model" aria-label="IA Ejecutiva, modelo NOVEX versión 2.1">
              <span className="novex-analysis-model__icon" aria-hidden="true">
                <NovexIcon name="sparkles" size={18} />
              </span>
              <span>
                <strong>IA Ejecutiva</strong>
                <small>Modelo: NOVEX v2.1</small>
              </span>
            </div>
          </header>

          <div className="novex-analysis-visual" aria-hidden="true">
            <div className="novex-analysis-visual__particles">
              {Array.from({ length: 14 }, (_, index) => (
                <i key={index} />
              ))}
            </div>

            <svg
              className="novex-analysis-connectors"
              viewBox="0 0 1000 520"
              preserveAspectRatio="none"
            >
              <path d="M205 158 C320 158 318 246 455 252" pathLength="1" />
              <path d="M250 375 C360 356 355 292 464 276" pathLength="1" />
              <path d="M795 148 C680 158 687 238 545 250" pathLength="1" />
              <path d="M766 370 C660 352 663 292 536 274" pathLength="1" />
              <circle cx="455" cy="252" r="4" />
              <circle cx="464" cy="276" r="4" />
              <circle cx="545" cy="250" r="4" />
              <circle cx="536" cy="274" r="4" />
            </svg>

            <div className="novex-analysis-core-scan">
              <span />
              <span />
              <span />
            </div>

            <article className="novex-analysis-callout novex-analysis-callout--context">
              <strong>Contexto operativo</strong>
              <small>Validando información</small>
              <span className="novex-analysis-mini-bars">
                <i />
                <i />
                <i />
              </span>
              <span className="novex-analysis-callout__check">
                <NovexIcon name="check" size={14} />
              </span>
            </article>

            <article className="novex-analysis-callout novex-analysis-callout--risk">
              <strong>Riesgos e impacto</strong>
              <small>Evaluando afectaciones</small>
              <span className="novex-analysis-mini-chart">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </article>

            <article className="novex-analysis-callout novex-analysis-callout--coordination">
              <strong>Coordinaciones</strong>
              <small>Mapeando dependencias</small>
              <span className="novex-analysis-mini-network">
                <i />
                <i />
                <i />
                <i />
              </span>
            </article>

            <article className="novex-analysis-callout novex-analysis-callout--patterns">
              <strong>Patrones y tendencias</strong>
              <small>Analizando historial</small>
              <svg viewBox="0 0 120 32" preserveAspectRatio="none">
                <polyline points="0,25 12,17 23,22 36,10 49,26 63,14 77,22 91,7 104,20 120,5" />
              </svg>
            </article>
          </div>

          <div className="novex-analysis-progress">
            <div className="novex-analysis-progress__label">
              <span className="novex-analysis-progress__signal" aria-hidden="true" />
              <strong key={messageIndex}>{ROTATING_MESSAGES[messageIndex]}</strong>
              <small>Tiempo activo · {formatElapsed(elapsedMs)}</small>
            </div>
            <div className="novex-analysis-progress__row">
              <div
                className="novex-analysis-progress__track"
                role="progressbar"
                aria-label="Progreso estimado del análisis"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <strong>{progress}%</strong>
            </div>
            <p>
              Cruzando datos, identificando patrones y generando recomendaciones
              estratégicas.
            </p>
          </div>

          <ol className="novex-analysis-pipeline" aria-label="Etapas del análisis">
            {PROCESSING_STEPS.map((step, index) => {
              const state =
                index < activeStep
                  ? 'done'
                  : index === activeStep
                    ? 'active'
                    : 'pending'

              return (
                <li
                  key={step.title}
                  className={`novex-analysis-pipeline__step novex-analysis-pipeline__step--${state}`}
                >
                  <span className="novex-analysis-pipeline__icon" aria-hidden="true">
                    {state === 'done' ? (
                      <NovexIcon name="check" size={16} />
                    ) : (
                      <NovexIcon name={step.icon} size={16} />
                    )}
                  </span>
                  <span className="novex-analysis-pipeline__copy">
                    <strong>{step.title}</strong>
                    <small>{step.detail}</small>
                  </span>
                  {index < PROCESSING_STEPS.length - 1 ? (
                    <span className="novex-analysis-pipeline__connector" aria-hidden="true">
                      <i />
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </div>

        <aside className="novex-analysis-report" aria-label="Informe en construcción">
          <header className="novex-analysis-report__header">
            <span>
              <strong>Construyendo informe</strong>
              <small>La IA está estructurando el informe ejecutivo.</small>
            </span>
            <NovexIcon name="activity" size={25} aria-hidden="true" />
          </header>

          <div className="novex-analysis-report__cards">
            {reportSections.map((section) => (
              <article
                key={section.title}
                className="novex-analysis-report-card"
                data-tone={section.tone}
              >
                <span className="novex-analysis-report-card__icon" aria-hidden="true">
                  <NovexIcon name={section.icon} size={18} />
                </span>
                <div className="novex-analysis-report-card__body">
                  <strong>{section.title}</strong>
                  <p>{section.description}</p>
                  <div className="novex-analysis-report-card__progress">
                    <span>
                      <i style={{ width: `${section.progress}%` }} />
                    </span>
                    <b>{section.progress}%</b>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <footer className="novex-analysis-report__security">
            <span aria-hidden="true">
              <NovexIcon name="shield" size={19} />
            </span>
            <p>
              <strong>Seguridad y confidencialidad</strong>
              <small>
                Tus datos están protegidos y son utilizados únicamente para este
                análisis.
              </small>
            </p>
          </footer>
        </aside>
      </div>
    </section>
  )
}
