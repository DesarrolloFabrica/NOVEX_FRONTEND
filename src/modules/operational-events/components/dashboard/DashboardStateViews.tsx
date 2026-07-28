import { CunmarkSectionLoader } from '@/shared/components/CunmarkSectionLoader'

export function DashboardLoadingState() {
  return <CunmarkSectionLoader />
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
    <section className="cunmark-dashboard-state cunmark-dashboard-state--error">
      <h2>No fue posible cargar el tablero</h2>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="cunmark-dashboard-state__action" onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </section>
  )
}

export function DashboardEmptyState() {
  return (
    <section className="cunmark-dashboard-state cunmark-dashboard-state--empty">
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
    <p className="cunmark-empty-signal py-3 text-sm leading-relaxed text-slate-400">
      {label}
    </p>
  )
}
