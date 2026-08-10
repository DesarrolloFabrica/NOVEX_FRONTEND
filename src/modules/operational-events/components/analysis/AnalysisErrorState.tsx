import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'

interface AnalysisErrorStateProps {
  message: string
  onRetry?: () => void
  retrying?: boolean
  onViewDossier?: () => void
  onRegisterAnother?: () => void
}

export function AnalysisErrorState({
  message,
  onRetry,
  retrying = false,
  onViewDossier,
  onRegisterAnother,
}: AnalysisErrorStateProps) {
  return (
    <section className="novex-analysis-state novex-analysis-state--error" role="alert">
      <header className="space-y-1">
        <h2>La situación quedó registrada</h2>
        <p>
          Lo que no se pudo completar es el análisis IA. Puede reintentarlo o
          continuar; el expediente ya está guardado.
        </p>
        <p className="text-sm opacity-90">{message}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-400/15 pt-4">
        {onRetry ? (
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
        ) : null}
        {onViewDossier ? (
          <button
            type="button"
            onClick={onViewDossier}
            disabled={retrying}
            className={`px-4 py-2 text-sm font-semibold text-slate-100 ${FOCUS_VISIBLE} border border-slate-400/30 bg-slate-800/60 hover:bg-slate-700/70`}
          >
            Ver expediente en Gestión
          </button>
        ) : null}
        {onRegisterAnother ? (
          <button
            type="button"
            onClick={onRegisterAnother}
            disabled={retrying}
            className={`px-4 py-2 text-sm font-semibold text-slate-100 ${FOCUS_VISIBLE} border border-slate-400/30 bg-transparent hover:bg-slate-800/50`}
          >
            Registrar otra situación
          </button>
        ) : null}
      </div>
    </section>
  )
}
