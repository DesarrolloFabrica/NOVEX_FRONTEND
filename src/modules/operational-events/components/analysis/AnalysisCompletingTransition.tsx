import { useEffect, useState } from 'react'
import { NovexIcon } from '@/shared/components/NovexIcon'

type TransitionPhase = 'spinner' | 'check' | 'label' | 'done'

interface AnalysisCompletingTransitionProps {
  onComplete: () => void
  durationMs?: number
}

export function AnalysisCompletingTransition({
  onComplete,
  durationMs = 800,
}: AnalysisCompletingTransitionProps) {
  const [phase, setPhase] = useState<TransitionPhase>('spinner')

  useEffect(() => {
    const spinnerEnd = Math.round(durationMs * 0.35)
    const checkEnd = Math.round(durationMs * 0.55)
    const labelEnd = Math.round(durationMs * 0.8)

    const checkTimer = window.setTimeout(() => setPhase('check'), spinnerEnd)
    const labelTimer = window.setTimeout(() => setPhase('label'), checkEnd)
    const doneTimer = window.setTimeout(() => setPhase('done'), labelEnd)
    const completeTimer = window.setTimeout(onComplete, durationMs)

    return () => {
      window.clearTimeout(checkTimer)
      window.clearTimeout(labelTimer)
      window.clearTimeout(doneTimer)
      window.clearTimeout(completeTimer)
    }
  }, [durationMs, onComplete])

  return (
    <section
      className={`novex-intel-complete-transition novex-intel-complete-transition--${phase}`}
      aria-live="polite"
      aria-busy={phase !== 'done'}
    >
      {phase === 'spinner' ? (
        <div className="novex-intel-complete-transition__spinner" aria-hidden="true" />
      ) : (
        <div className="novex-intel-complete-transition__success" aria-hidden="true">
          <NovexIcon name="check" size={28} />
        </div>
      )}
      <p className="novex-intel-complete-transition__label">
        {phase === 'spinner' ? 'Finalizando análisis…' : 'Informe generado'}
      </p>
    </section>
  )
}
