import { useEffect, useRef } from 'react'
import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import { SituationEvaluationCard } from '@/modules/monitoring/components/SituationEvaluationCard'
import {
  SITUATION_QUEUE_PAGE_SIZES,
  type SituationQueueQuery,
  type SituationQueueSeverityFilter,
  type SituationQueueStatusFilter,
} from '@/modules/monitoring/utils/situation-queue-query'
import {
  SITUATION_SEVERITY_LABEL,
  SITUATION_STATUS_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface SituationQueueConsoleProps {
  pageItems: SituationListItem[]
  selectedSituationId: string | null
  loading: boolean
  error: string | null
  queueQuery: SituationQueueQuery
  totalFiltered: number
  totalPages: number
  totalAvailable: number
  onSelectSituation: (situationId: string) => void
  onSearchChange: (search: string) => void
  onStatusChange: (status: SituationQueueStatusFilter) => void
  onSeverityChange: (severity: SituationQueueSeverityFilter) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

const STATUS_OPTIONS: Array<{ value: SituationQueueStatusFilter; label: string }> = [
  { value: 'ACTIVE', label: 'Sin cerrar' },
  { value: 'OPEN', label: SITUATION_STATUS_LABEL.OPEN },
  { value: 'IN_PROGRESS', label: SITUATION_STATUS_LABEL.IN_PROGRESS },
  { value: 'CLOSED', label: 'Cerradas' },
  { value: 'ALL', label: 'Todas' },
]

const SEVERITY_OPTIONS: Array<{ value: SituationQueueSeverityFilter; label: string }> = [
  { value: 'ALL', label: 'Todas las severidades' },
  { value: 'PRIORITY', label: 'Prioritaria (crítica/alta)' },
  { value: 'CRITICAL', label: SITUATION_SEVERITY_LABEL.CRITICAL },
  { value: 'HIGH', label: SITUATION_SEVERITY_LABEL.HIGH },
  { value: 'MEDIUM', label: SITUATION_SEVERITY_LABEL.MEDIUM },
  { value: 'LOW', label: SITUATION_SEVERITY_LABEL.LOW },
]

function QueueSkeleton() {
  return (
    <div className="novex-action-queue__skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

export function SituationQueueConsole({
  pageItems,
  selectedSituationId,
  loading,
  error,
  queueQuery,
  totalFiltered,
  totalPages,
  totalAvailable,
  onSelectSituation,
  onSearchChange,
  onStatusChange,
  onSeverityChange,
  onPageChange,
  onPageSizeChange,
}: SituationQueueConsoleProps) {
  const listRef = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    if (!selectedSituationId || !listRef.current) return
    const selected = listRef.current.querySelector<HTMLElement>(
      `[data-situation-id="${selectedSituationId}"]`,
    )
    selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedSituationId, pageItems])

  return (
    <section className="novex-action-queue" aria-labelledby="situation-list-title">
      <header className="novex-action-queue__header">
        <div>
          <p>Selecciona la situación para actualizar el estado</p>
          <h2 id="situation-list-title">Situaciones</h2>
        </div>
        <span>
          Mostrando {pageItems.length} de {totalFiltered}
          {totalAvailable > totalFiltered ? ` · ${totalAvailable} en total` : ''}
        </span>
      </header>

      <p className="novex-action-queue__guidance">
        Seleccione una situación → revise el expediente → Actualizar estado
      </p>

      <div className="novex-action-queue__filters" role="search" aria-label="Filtros de la cola">
        <label className="novex-action-queue__search">
          <span className="sr-only">Buscar situación</span>
          <input
            type="search"
            value={queueQuery.search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por título, coordinación o categoría"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por estado</span>
          <select
            value={queueQuery.status}
            onChange={(event) =>
              onStatusChange(event.target.value as SituationQueueStatusFilter)
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrar por severidad</span>
          <select
            value={queueQuery.severity}
            onChange={(event) =>
              onSeverityChange(event.target.value as SituationQueueSeverityFilter)
            }
          >
            {SEVERITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div role="status" aria-live="polite">
          <span className="sr-only">Cargando situaciones…</span>
          <QueueSkeleton />
        </div>
      ) : error ? (
        <div className="novex-action-queue__notice" role="alert">
          <NovexIcon name="x" size={22} />
          <strong>No fue posible consultar las situaciones</strong>
          <span>{error}</span>
        </div>
      ) : totalFiltered === 0 ? (
        <div className="novex-action-queue__notice">
          <NovexIcon name="check" size={24} />
          <strong>No hay situaciones con estos filtros</strong>
          <span>
            Ajuste el estado, la severidad o la búsqueda. Por defecto se muestran
            situaciones sin cerrar (registradas y en atención).
          </span>
        </div>
      ) : (
        <>
          <ol className="novex-action-queue__list" ref={listRef}>
            {pageItems.map((situation) => (
              <li key={situation.id}>
                <SituationEvaluationCard
                  situation={situation}
                  selected={situation.id === selectedSituationId}
                  onSelect={onSelectSituation}
                />
              </li>
            ))}
          </ol>

          <footer className="novex-action-queue__pager">
            <label>
              <span className="sr-only">Tamaño de página</span>
              <select
                value={queueQuery.pageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
              >
                {SITUATION_QUEUE_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} por página
                  </option>
                ))}
              </select>
            </label>
            <div className="novex-action-queue__pager-controls">
              <button
                type="button"
                disabled={queueQuery.page <= 1}
                onClick={() => onPageChange(queueQuery.page - 1)}
              >
                Anterior
              </button>
              <span>
                Página {queueQuery.page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={queueQuery.page >= totalPages}
                onClick={() => onPageChange(queueQuery.page + 1)}
              >
                Siguiente
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  )
}
