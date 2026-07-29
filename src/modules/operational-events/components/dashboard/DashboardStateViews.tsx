import { NovexSectionLoader } from '@/shared/components/NovexSectionLoader'

export function DashboardLoadingState() {
  return <NovexSectionLoader />
}

interface DashboardErrorStateProps {
  message: string
  onRetry?: () => void
}

export function DashboardErrorState({
  message,
  onRetry,
}: DashboardErrorStateProps) {
  return (
    <section className="novex-dashboard-state novex-dashboard-state--error">
      <h2>No fue posible cargar el tablero</h2>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="novex-dashboard-state__action" onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </section>
  )
}

export function DashboardEmptyState() {
  return (
    <section className="novex-dashboard-state novex-dashboard-state--empty">
      <h2>Sin situaciones registradas</h2>
      <p>
        El tablero ejecutivo se activará cuando existan situaciones operacionales
        en el sistema.
      </p>
    </section>
  )
}

export function DashboardNoDataState({ label }: { label: string }) {
  return (
    <p className="novex-empty-signal py-3 text-sm leading-relaxed text-slate-400">
      {label}
    </p>
  )
}
