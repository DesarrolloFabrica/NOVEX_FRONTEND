// Componente: consola central del Centro de Eventos (lista + filtros).

import { useMemo, type ReactNode } from 'react'
import {
  CONSOLE_LIST_VIEWPORT,
  CRYSTAL_CONSOLE_HEADER,
  CRYSTAL_CONSOLE_ZONE,
  FOCUS_VISIBLE,
} from '@/modules/monitoring/constants/monitoringTheme'
import {
  CONSOLE_CONTROLS,
  CONSOLE_FILTER,
  CONSOLE_META,
  CONSOLE_ZONE,
} from '@/modules/monitoring/constants/visualHierarchy'
import { OperationalEventRow } from '@/modules/operational-events/components/OperationalEventRow'
import { INCIDENT_CATEGORIES } from '@/modules/operational-events/data/incident-categories.mock'
import { OPERATIONAL_AREAS } from '@/modules/operational-events/data/operational-areas.mock'
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

const SELECT_CLASSES = `appearance-none bg-transparent px-1.5 py-0.5 ${CONSOLE_FILTER} transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-400/35`
const INPUT_CLASSES = `min-w-[9rem] flex-1 border-0 bg-transparent px-1 py-1 text-xs text-slate-800 shadow-[inset_0_-1px_0_0_rgba(100,116,139,0.28)] placeholder:text-slate-500/70 ${FOCUS_VISIBLE}`

interface EventsConsoleProps {
  events: OperationalEvent[]
  query: EventListQuery
  selectedEventId: string | null
  loading: boolean
  error: string | null
  onQueryChange: (next: EventListQuery) => void
  onSelectEvent: (eventId: string) => void
}

function ConsoleListViewport({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div
      className={CONSOLE_LIST_VIEWPORT}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  )
}

function ConsoleNotice({ message }: { message: string }) {
  return (
    <p className="px-5 py-8 text-center text-sm text-slate-600">{message}</p>
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

  return (
    <section
      className={`omega-events-console min-h-0 flex flex-col overflow-hidden pb-2 lg:min-h-0 lg:flex-1 lg:pb-2 ${CONSOLE_ZONE} ${CRYSTAL_CONSOLE_ZONE}`}
    >
      <header className={`mb-1 shrink-0 ${CRYSTAL_CONSOLE_HEADER}`}>
        <h2 className="omega-section-eyebrow mb-0">Expedientes</h2>

        <div
          className={`omega-console-controls flex flex-wrap items-center gap-1.5 ${CONSOLE_CONTROLS}`}
        >
          <input
            type="search"
            aria-label="Buscar eventos"
            placeholder="Buscar…"
            value={query.search}
            onChange={(event) =>
              onQueryChange({ ...query, search: event.target.value })
            }
            className={INPUT_CLASSES}
          />

          <select
            aria-label="Filtrar por estado"
            value={query.status}
            onChange={(event) =>
              onQueryChange({
                ...query,
                status: event.target.value as EventStatusFilter,
              })
            }
            className={`omega-console-filter ${SELECT_CLASSES} ${FOCUS_VISIBLE}`}
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
            className={`omega-console-filter ${SELECT_CLASSES} ${FOCUS_VISIBLE}`}
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
            aria-label="Filtrar por categoría"
            value={query.categoryId}
            onChange={(event) =>
              onQueryChange({ ...query, categoryId: event.target.value })
            }
            className={`omega-console-filter ${SELECT_CLASSES} ${FOCUS_VISIBLE}`}
          >
            <option value="all">Todas las categorías</option>
            {INCIDENT_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por área"
            value={query.areaId}
            onChange={(event) =>
              onQueryChange({ ...query, areaId: event.target.value })
            }
            className={`omega-console-filter ${SELECT_CLASSES} ${FOCUS_VISIBLE}`}
          >
            <option value="all">Todas las áreas</option>
            {OPERATIONAL_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.code} · {area.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Ordenar eventos"
            value={query.sort}
            onChange={(event) =>
              onQueryChange({
                ...query,
                sort: event.target.value as EventSortOrder,
              })
            }
            className={`omega-console-filter ${SELECT_CLASSES} ${FOCUS_VISIBLE}`}
          >
            <option value="date-desc">Más recientes</option>
            <option value="date-asc">Más antiguos</option>
            <option value="risk-desc">Mayor riesgo</option>
            <option value="risk-asc">Menor riesgo</option>
            <option value="impact-desc">Mayor impacto</option>
            <option value="impact-asc">Menor impacto</option>
            <option value="title-asc">Título A–Z</option>
          </select>

          <span className={`shrink-0 ${CONSOLE_META}`}>
            {visible.length}/{events.length}
          </span>
        </div>
      </header>

      {loading ? (
        <ConsoleListViewport label="Lista de eventos">
          <ConsoleNotice message="Cargando eventos operacionales…" />
        </ConsoleListViewport>
      ) : error ? (
        <ConsoleListViewport label="Lista de eventos">
          <ConsoleNotice message={error} />
        </ConsoleListViewport>
      ) : events.length === 0 ? (
        <ConsoleListViewport label="Lista de eventos">
          <ConsoleNotice message="No hay eventos registrados todavía." />
        </ConsoleListViewport>
      ) : visible.length === 0 ? (
        <ConsoleListViewport label="Lista de eventos">
          <ConsoleNotice message="Ningún evento coincide con la búsqueda o los filtros." />
        </ConsoleListViewport>
      ) : (
        <ConsoleListViewport label="Lista de eventos">
          <ul className="divide-y-0">
            {visible.map((event) => (
              <li key={event.id} className="relative">
                <OperationalEventRow
                  event={event}
                  selected={event.id === selectedEventId}
                  onSelect={onSelectEvent}
                />
              </li>
            ))}
          </ul>
        </ConsoleListViewport>
      )}
    </section>
  )
}
