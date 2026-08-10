import type { PropsWithChildren, ReactNode } from 'react'
import { NovexIcon, type NovexIconName } from '@/shared/components/NovexIcon'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import {
  formatDateTime,
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
} from '@/modules/executive-operations-center/utils/operational-center.presentation'

interface OperationsPageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  generatedAt?: string
  loading?: boolean
  onRefresh?: () => void
  action?: ReactNode
  compact?: boolean
}

export function OperationsPageHeader({
  eyebrow,
  title,
  description,
  generatedAt,
  loading = false,
  onRefresh,
  action,
  compact = false,
}: OperationsPageHeaderProps) {
  return (
    <header
      className={`eoc-view-header${compact ? ' eoc-view-header--compact' : ''}`}
    >
      <div>
        {eyebrow ? (
          <span className="eoc-view-header__eyebrow">{eyebrow}</span>
        ) : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="eoc-view-header__actions">
        {generatedAt ? (
          <span className="eoc-live-stamp">
            <i /> Actualizado {formatDateTime(generatedAt)}
          </span>
        ) : null}
        {action}
        {onRefresh ? (
          <button
            type="button"
            className="eoc-icon-button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Actualizar información"
            title="Actualizar información"
          >
            <NovexIcon name="activity" size={15} />
            <span>{loading ? 'Actualizando…' : 'Actualizar'}</span>
          </button>
        ) : null}
      </div>
    </header>
  )
}

interface OperationsPanelProps extends PropsWithChildren {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
  id?: string
}

export function OperationsPanel({
  eyebrow,
  title,
  description,
  action,
  className = '',
  id,
  children,
}: OperationsPanelProps) {
  return (
    <section id={id} className={`eoc-panel ${className}`.trim()}>
      <div className="eoc-panel__header">
        <div>
          {eyebrow ? <span>{eyebrow}</span> : null}
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="eoc-panel__action">{action}</div> : null}
      </div>
      <div className="eoc-panel__body">{children}</div>
    </section>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string
  value: string | number
  hint: string
  tone?: string
  icon?: NovexIconName
}) {
  return (
    <article className="eoc-metric" data-tone={tone}>
      <div className="eoc-metric__top">
        <span>{label}</span>
        {icon ? <NovexIcon name={icon} size={15} /> : null}
      </div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  )
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="eoc-pill" data-tone={statusTone(status)}>
      <i /> {statusLabel(status)}
    </span>
  )
}

export function SeverityPill({ severity }: { severity: SituationSeverity }) {
  return (
    <span className="eoc-pill" data-tone={severityTone(severity)}>
      <i /> {severityLabel(severity)}
    </span>
  )
}

export function DataState({
  status,
  error,
  onRetry,
}: {
  status: 'loading' | 'empty' | 'error'
  error?: string | null
  onRetry: () => void
}) {
  if (status === 'loading') {
    return (
      <div className="eoc-state" role="status">
        <span className="eoc-state__loader" />
        <div>
          <strong>Consolidando la operación</strong>
          <p>
            Estamos cruzando situaciones, actividad, responsables, análisis IA y
            recomendaciones.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'empty') {
    return (
      <div className="eoc-state">
        <NovexIcon name="file" size={24} />
        <div>
          <strong>Aún no hay situaciones registradas</strong>
          <p>
            El centro empezará a construir la auditoría cuando se documente el
            primer evento operativo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="eoc-state eoc-state--error" role="alert">
      <NovexIcon name="alert" size={24} />
      <div>
        <strong>No fue posible consolidar la información</strong>
        <p>{error || 'Ocurrió un error inesperado al consultar la plataforma.'}</p>
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    </div>
  )
}

export function PanelLink({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" className="eoc-text-action" onClick={onClick}>
      {children}
      <NovexIcon name="chevron-right" size={14} />
    </button>
  )
}

export function OperationsPagination({
  page,
  pageSize,
  total,
  onPageChange,
  label = 'registros',
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  label?: string
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, total)

  if (total <= pageSize) {
    return total > 0 ? (
      <div className="eoc-pagination eoc-pagination--compact" aria-live="polite">
        <span>
          {total} {label}
        </span>
      </div>
    ) : null
  }

  return (
    <div className="eoc-pagination" role="navigation" aria-label="Paginación">
      <span className="eoc-pagination__summary">
        {from}–{to} de {total} {label}
      </span>
      <div className="eoc-pagination__controls">
        <button
          type="button"
          className="eoc-pagination__button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Página anterior"
        >
          <NovexIcon name="chevron-left" size={14} />
          Anterior
        </button>
        <span className="eoc-pagination__page">
          Página {currentPage} de {totalPages}
        </span>
        <button
          type="button"
          className="eoc-pagination__button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Página siguiente"
        >
          Siguiente
          <NovexIcon name="chevron-right" size={14} />
        </button>
      </div>
    </div>
  )
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * pageSize
  return items.slice(start, start + pageSize)
}
