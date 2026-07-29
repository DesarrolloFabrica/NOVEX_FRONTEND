import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SituationRegistryRow } from '@/modules/api/types/situation-registry.types'
import type {
  SituationRegistryCategoryOption,
  SituationRegistryIndicators,
  SituationRegistrySummary,
} from '@/modules/api/types/situation-registry.types'
import { SituationRegistrySummaryBar } from '@/modules/operational-events/components/registry/SituationRegistrySummaryBar'
import { SituationRegistryTableRow } from '@/modules/operational-events/components/registry/SituationRegistryTableRow'
import {
  DEFAULT_SITUATION_REGISTRY_QUERY,
  filterAndSortSituationRegistry,
  type SituationRegistryQuery,
  type RegistryDateFilter,
  type RegistrySeverityFilter,
  type RegistrySortOrder,
  type RegistryStatusFilter,
} from '@/modules/operational-events/utils/situationRegistryQuery'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  SITUATION_SEVERITY_LABEL,
  SITUATION_STATUS_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'
import type { CoordinationSummary } from '@/modules/situations/types/situation.types'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface SituationsRegistryConsoleProps {
  rows: SituationRegistryRow[]
  summary: SituationRegistrySummary
  indicators: SituationRegistryIndicators
  categories: SituationRegistryCategoryOption[]
  coordinations: CoordinationSummary[]
  selectedSituationId: string | null
  loading: boolean
  error: string | null
  query: SituationRegistryQuery
  onQueryChange: (next: SituationRegistryQuery) => void
  onSelectSituation: (situationId: string) => void
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
      className="novex-events-table__notice"
      data-state={state}
      role={state === 'error' ? 'alert' : state === 'loading' ? 'status' : undefined}
      aria-live={state === 'loading' ? 'polite' : undefined}
      aria-busy={state === 'loading' ? true : undefined}
    >
      {message}
    </p>
  )
}

export function SituationsRegistryConsole({
  rows,
  summary,
  indicators,
  categories,
  coordinations,
  selectedSituationId,
  loading,
  error,
  query,
  onQueryChange,
  onSelectSituation,
}: SituationsRegistryConsoleProps) {
  const visible = useMemo(
    () => filterAndSortSituationRegistry(rows, query),
    [rows, query],
  )

  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const activeFilterCount = [
    query.status,
    query.coordinationId,
    query.categoryId,
    query.severity,
    query.date,
  ].filter((value) => value !== 'all').length

  const clearFilters = () => {
    onQueryChange({
      ...query,
      status: 'all',
      coordinationId: 'all',
      categoryId: 'all',
      severity: 'all',
      date: 'all',
    })
  }

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  useEffect(() => {
    setPage(1)
  }, [
    query.search,
    query.status,
    query.coordinationId,
    query.categoryId,
    query.severity,
    query.date,
    query.sort,
    pageSize,
  ])

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
      : visible.length === 0 && rows.length > 0
        ? {
            state: 'empty' as const,
            message:
              'Ninguna situación coincide con los filtros. Ajuste la búsqueda para continuar.',
          }
        : null

  return (
    <div className="novex-registry-console">
      <SituationRegistrySummaryBar summary={summary} indicators={indicators} />

      <section
        className="novex-events-table novex-events-table--registry"
        aria-labelledby="events-table-heading"
      >
        <header className="novex-events-table__header novex-events-table__header--registry">
          <div className="novex-registry-table-head">
            <div className="novex-events-table__heading">
              <div className="novex-events-table__title-row">
                <h2 id="events-table-heading">Listado de situaciones</h2>
                <span className="novex-table-help">
                  <button
                    type="button"
                    className="novex-table-help__trigger"
                    aria-label="Qué muestra esta tabla"
                    aria-describedby="events-table-help-tip"
                  >
                    <NovexIcon name="help" size={11} strokeWidth={1.6} />
                  </button>
                  <span
                    id="events-table-help-tip"
                    className="novex-table-help__tip"
                    role="tooltip"
                  >
                    Cada fila es una situación registrada. Seleccione una para abrir su
                    análisis ejecutivo.
                  </span>
                </span>
              </div>
              <p>Seleccione una fila para abrir el análisis ejecutivo.</p>
            </div>
            <span className="novex-events-table__count" aria-live="polite">
              {visible.length === 1
                ? '1 resultado'
                : `${visible.length} resultados`}
              {visible.length !== rows.length ? ` de ${rows.length}` : ''}
            </span>
          </div>

          <div className="novex-registry-toolbar">
            <div className="novex-registry-toolbar__primary">
              <span className="novex-events-table__search novex-registry-toolbar__search">
                <NovexIcon name="search" size={15} />
                <input
                  type="search"
                  aria-label="Buscar situaciones"
                  placeholder="Buscar por situación, código, coordinación o categoría"
                  value={query.search}
                  onChange={(event) =>
                    onQueryChange({ ...query, search: event.target.value })
                  }
                />
                {query.search ? (
                  <button
                    type="button"
                    className="novex-registry-toolbar__clear-search"
                    onClick={() => onQueryChange({ ...query, search: '' })}
                    aria-label="Limpiar búsqueda"
                  >
                    <NovexIcon name="x" size={13} />
                  </button>
                ) : null}
              </span>

              <div className="novex-registry-toolbar__actions">
                <label className="novex-registry-toolbar__sort">
                  <span>Ordenar por</span>
                  <select
                    aria-label="Ordenar situaciones"
                    value={query.sort}
                    onChange={(event) =>
                      onQueryChange({
                        ...query,
                        sort: event.target.value as RegistrySortOrder,
                      })
                    }
                    className={`novex-registry-toolbar__select ${FOCUS_VISIBLE}`}
                  >
                    <option value="date-desc">Más recientes</option>
                    <option value="date-asc">Más antiguas</option>
                    <option value="updated-desc">Actualizadas</option>
                    <option value="risk-desc">Mayor riesgo</option>
                    <option value="severity-desc">Mayor severidad</option>
                    <option value="title-asc">Nombre A–Z</option>
                  </select>
                </label>

                <button
                  type="button"
                  className={`novex-registry-toolbar__filter-toggle ${FOCUS_VISIBLE}`}
                  aria-expanded={filtersOpen}
                  aria-controls="registry-filter-panel"
                  onClick={() => setFiltersOpen((current) => !current)}
                >
                  <NovexIcon name="settings" size={14} />
                  <span>Filtros</span>
                  {activeFilterCount > 0 ? (
                    <strong aria-label={`${activeFilterCount} filtros activos`}>
                      {activeFilterCount}
                    </strong>
                  ) : null}
                  <NovexIcon
                    name="chevron-down"
                    size={13}
                    className="novex-registry-toolbar__filter-chevron"
                  />
                </button>
              </div>
            </div>

            <div
              id="registry-filter-panel"
              className="novex-registry-toolbar__filter-panel"
              hidden={!filtersOpen}
            >
              <div className="novex-registry-toolbar__filter-heading">
                <div>
                  <strong>Filtrar situaciones</strong>
                  <span>Refine el registro con uno o varios criterios.</span>
                </div>
                {activeFilterCount > 0 ? (
                  <button type="button" onClick={clearFilters}>
                    Limpiar filtros
                  </button>
                ) : null}
              </div>

              <div className="novex-registry-toolbar__filters">
              <select
                aria-label="Filtrar por estado"
                value={query.status}
                onChange={(event) =>
                  onQueryChange({
                    ...query,
                    status: event.target.value as RegistryStatusFilter,
                  })
                }
                className={`novex-registry-toolbar__select ${FOCUS_VISIBLE}`}
              >
                <option value="all">Todos los estados</option>
                {Object.entries(SITUATION_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por coordinación"
                value={query.coordinationId}
                onChange={(event) =>
                  onQueryChange({ ...query, coordinationId: event.target.value })
                }
                className={`novex-registry-toolbar__select ${FOCUS_VISIBLE}`}
              >
                <option value="all">Todas las coordinaciones</option>
                {coordinations.map((coordination) => (
                  <option key={coordination.id} value={coordination.id}>
                    {coordination.code}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por categoría"
                value={query.categoryId}
                onChange={(event) =>
                  onQueryChange({ ...query, categoryId: event.target.value })
                }
                className={`novex-registry-toolbar__select ${FOCUS_VISIBLE}`}
              >
                <option value="all">Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por severidad"
                value={query.severity}
                onChange={(event) =>
                  onQueryChange({
                    ...query,
                    severity: event.target.value as RegistrySeverityFilter,
                  })
                }
                className={`novex-registry-toolbar__select ${FOCUS_VISIBLE}`}
              >
                <option value="all">Todas las severidades</option>
                {Object.entries(SITUATION_SEVERITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por fecha"
                value={query.date}
                onChange={(event) =>
                  onQueryChange({
                    ...query,
                    date: event.target.value as RegistryDateFilter,
                  })
                }
                className={`novex-registry-toolbar__select ${FOCUS_VISIBLE}`}
              >
                <option value="all">Cualquier fecha</option>
                <option value="today">Hoy</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
              </select>
              </div>
            </div>
          </div>
        </header>

        {rows.length === 0 && !loading && !error ? (
          <p className="novex-events-table__notice" data-state="empty">
            Aún no hay situaciones registradas.{' '}
            <Link
              to="/situaciones/nueva"
              viewTransition
              className={`font-semibold text-emerald-300 hover:text-emerald-200 ${FOCUS_VISIBLE}`}
            >
              Registre la primera
            </Link>
          </p>
        ) : (
          <div className="novex-events-table__scroll" tabIndex={0}>
            <table className="novex-events-table__grid novex-events-table__grid--registry">
              <thead>
                <tr>
                  <th scope="col">Situación</th>
                  <th scope="col">Contexto</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Riesgo</th>
                  <th scope="col">IA</th>
                  <th scope="col">Fecha</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
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
                  paged.map((row) => (
                    <SituationRegistryTableRow
                      key={row.id}
                      row={row}
                      selected={row.id === selectedSituationId}
                      onSelect={onSelectSituation}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!notice && visible.length > 0 ? (
          <footer className="novex-events-table__footer">
            <div className="novex-events-table__pagesize">
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

            <p className="novex-events-table__range" aria-live="polite">
              {rangeStart}–{rangeEnd} de {visible.length}
            </p>

            <nav className="novex-events-table__pager" aria-label="Paginación de situaciones">
              <button
                type="button"
                className={FOCUS_VISIBLE}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                aria-label="Página anterior"
              >
                <NovexIcon name="chevron-left" size={14} />
              </button>
              <span className="novex-events-table__pager-status">
                Página {page} de {pageCount}
              </span>
              <button
                type="button"
                className={FOCUS_VISIBLE}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={page >= pageCount}
                aria-label="Página siguiente"
              >
                <NovexIcon name="chevron-right" size={14} />
              </button>
            </nav>
          </footer>
        ) : null}
      </section>
    </div>
  )
}

export { DEFAULT_SITUATION_REGISTRY_QUERY }
