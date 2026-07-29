import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'

interface AnalysisErrorStateProps {
  message: string
  onRetry?: () => void
  retrying?: boolean
}

export function AnalysisErrorState({
  message,
  onRetry,
  retrying = false,
}: AnalysisErrorStateProps) {
  return (
    <section
      className="novex-analysis-state novex-analysis-state--error space-y-4"
      role="alert"
    >
      <header className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-red-800">
          No fue posible completar el análisis
        </h2>
        <p className="text-[0.8rem] leading-relaxed text-slate-600">{message}</p>
      </header>

      {onRetry ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-400/15 pt-4">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className={`px-4 py-2 text-sm font-semibold text-white ${FOCUS_VISIBLE} ${
              retrying
                ? 'cursor-wait bg-emerald-500/60'
                : 'bg-emerald-600/90 hover:bg-emerald-600'
            }`}
          >
            {retrying ? 'Reintentando…' : 'Reintentar análisis'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
