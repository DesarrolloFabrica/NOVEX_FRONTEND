// Componente: consola central — tabla y filtros de situaciones.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import { OperationalEventRow } from '@/modules/operational-events/components/OperationalEventRow'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import {
  filterAndSortEvents,
  type EventListQuery,
  type EventRiskFilter,
  type EventSortOrder,
  type EventStatusFilter,
} from '@/modules/operational-events/utils/eventListQuery'
import {
  EVENT_STATUS_LABEL,
  RISK_LEVEL_LABEL,
} from '@/modules/operational-events/components/eventPresentation'
import { OmegaIcon } from '@/shared/components/OmegaIcon'

interface EventsConsoleProps {
  events: OperationalEvent[]
  query: EventListQuery
  selectedEventId: string | null
  loading: boolean
  error: string | null
  onQueryChange: (next: EventListQuery) => void
  onSelectEvent: (eventId: string) => void
}

const PAGE_SIZE_OPTIONS = [8, 15, 25] as const

function ConsoleNotice({
  message,
  state = 'empty',
}: {
  message: string
  state?: 'loading' | 'empty' | 'error'
}) {
  return (
    <p
      className="omega-events-table__notice"
      data-state={state}
      role={state === 'error' ? 'alert' : state === 'loading' ? 'status' : undefined}
      aria-live={state === 'loading' ? 'polite' : undefined}
      aria-busy={state === 'loading' ? true : undefined}
    >
      {message}
    </p>
  )
}

export function EventsConsole({
  events,
  query,
  selectedEventId,
  loading,
  error,
  onQueryChange,
  onSelectEvent,
}: EventsConsoleProps) {
  const visible = useMemo(
    () => filterAndSortEvents(events, query),
    [events, query],
  )

  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const [page, setPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))

  // Mantiene la página dentro de rango cuando cambian filtros o tamaño.
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  useEffect(() => {
    setPage(1)
  }, [query.search, query.status, query.risk, query.sort, pageSize])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return visible.slice(start, start + pageSize)
  }, [visible, page, pageSize])

  const rangeStart = visible.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, visible.length)

  const notice = loading
    ? { state: 'loading' as const, message: 'Cargando situaciones…' }
    : error
      ? { state: 'error' as const, message: error }
      : visible.length === 0 && events.length > 0
        ? {
            state: 'empty' as const,
            message:
              'Ninguna situación coincide con los filtros. Ajuste la búsqueda para continuar.',
          }
        : null

  return (
    <section className="omega-events-table" aria-labelledby="events-table-heading">
      <header className="omega-events-table__header">
        <div className="omega-events-table__heading">
          <div className="omega-events-table__title-row">
            <h2 id="events-table-heading">Listado de situaciones</h2>
            <span className="omega-table-help">
              <button
                type="button"
                className="omega-table-help__trigger"
                aria-label="Qué muestra esta tabla"
                aria-describedby="events-table-help-tip"
              >
                <OmegaIcon name="help" size={11} strokeWidth={1.6} />
              </button>
              <span
                id="events-table-help-tip"
                className="omega-table-help__tip"
                role="tooltip"
              >
                Cada fila es una situación registrada: riesgo, área, categoría,
                estado y fecha. Seleccione una para abrir su análisis detallado.
              </span>
            </span>
          </div>
          <p>Seleccione una fila para abrir el análisis completo.</p>
        </div>

        <div className="omega-events-table__controls">
          <span className="omega-events-table__search">
            <OmegaIcon name="search" size={13} />
            <input
              type="search"
              aria-label="Buscar situaciones"
              placeholder="Buscar situación, área o categoría…"
              value={query.search}
              onChange={(event) =>
                onQueryChange({ ...query, search: event.target.value })
              }
            />
          </span>

          <select
            aria-label="Filtrar por estado"
            value={query.status}
            onChange={(event) =>
              onQueryChange({
                ...query,
                status: event.target.value as EventStatusFilter,
              })
            }
            className={FOCUS_VISIBLE}
          >
            <option value="all">Todos los estados</option>
            {(Object.keys(EVENT_STATUS_LABEL) as Array<keyof typeof EVENT_STATUS_LABEL>).map(
              (status) => (
                <option key={status} value={status}>
                  {EVENT_STATUS_LABEL[status]}
                </option>
              ),
            )}
          </select>

          <select
            aria-label="Filtrar por riesgo"
            value={query.risk}
            onChange={(event) =>
              onQueryChange({
                ...query,
                risk: event.target.value as EventRiskFilter,
              })
            }
            className={FOCUS_VISIBLE}
          >
            <option value="all">Todo riesgo</option>
            {(Object.keys(RISK_LEVEL_LABEL) as Array<keyof typeof RISK_LEVEL_LABEL>).map(
              (risk) => (
                <option key={risk} value={risk}>
                  {RISK_LEVEL_LABEL[risk]}
                </option>
              ),
            )}
          </select>

          <select
            aria-label="Ordenar situaciones"
            value={query.sort}
            onChange={(event) =>
              onQueryChange({
                ...query,
                sort: event.target.value as EventSortOrder,
              })
            }
            className={FOCUS_VISIBLE}
          >
            <option value="date-desc">Más recientes</option>
            <option value="risk-desc">Mayor riesgo</option>
            <option value="date-asc">Más antiguos</option>
          </select>

          <span className="omega-events-table__count">
            {visible.length} de {events.length}
          </span>
        </div>
      </header>

      {events.length === 0 && !loading && !error ? (
        <p className="omega-events-table__notice">
          Aún no hay situaciones registradas.{' '}
          <Link
            to="/operational-events/register"
            viewTransition
            className={`font-semibold text-indigo-300 hover:text-indigo-200 ${FOCUS_VISIBLE}`}
          >
            Registre la primera
          </Link>
        </p>
      ) : (
        <div className="omega-events-table__scroll" tabIndex={0}>
          <table className="omega-events-table__grid">
            <thead>
              <tr>
                <th scope="col">Riesgo</th>
                <th scope="col">Situación</th>
                <th scope="col">Área</th>
                <th scope="col">Categoría</th>
                <th scope="col">Estado</th>
                <th scope="col">Reportada</th>
                <th scope="col">
                  <span className="sr-only">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {notice ? (
                <tr>
                  <td colSpan={7}>
                    <ConsoleNotice state={notice.state} message={notice.message} />
                  </td>
                </tr>
              ) : (
                paged.map((event) => (
                  <OperationalEventRow
                    key={event.id}
                    event={event}
                    selected={event.id === selectedEventId}
                    onSelect={onSelectEvent}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!notice && visible.length > 0 ? (
        <footer className="omega-events-table__footer">
          <div className="omega-events-table__pagesize">
            <label htmlFor="events-page-size">Filas por página</label>
            <select
              id="events-page-size"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className={FOCUS_VISIBLE}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <p className="omega-events-table__range" aria-live="polite">
            {rangeStart}–{rangeEnd} de {visible.length}
          </p>

          <nav className="omega-events-table__pager" aria-label="Paginación de situaciones">
            <button
              type="button"
              className={FOCUS_VISIBLE}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              aria-label="Página anterior"
            >
              <OmegaIcon name="chevron-left" size={14} />
            </button>
            <span className="omega-events-table__pager-status">
              Página {page} de {pageCount}
            </span>
            <button
              type="button"
              className={FOCUS_VISIBLE}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page >= pageCount}
              aria-label="Página siguiente"
            >
              <OmegaIcon name="chevron-right" size={14} />
            </button>
          </nav>
        </footer>
      ) : null}
    </section>
  )
}
