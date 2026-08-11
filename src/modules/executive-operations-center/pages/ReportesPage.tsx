import { useMemo, useState } from 'react'
import { ConnectedSituationDetailModal } from '@/modules/operational-events/components/ConnectedSituationDetailModal'
import { useExecutiveOperations } from '@/modules/executive-operations-center/hooks/useExecutiveOperations'
import {
  DataState,
  MetricCard,
  OperationsPageHeader,
  OperationsPagination,
  OperationsPanel,
  paginateItems,
  SeverityPill,
  StatusPill,
} from '@/modules/executive-operations-center/components/shared/OperationalCenterUI'
import {
  downloadExcelCompatibleCsv,
  eventTypeLabel,
  formatConfidence,
  formatDateTime,
  formatRelativeTime,
  isInstitutionalAuditEvent,
  severityLabel,
  statusLabel,
} from '@/modules/executive-operations-center/utils/operational-center.presentation'
import type { OperationalAuditEvent } from '@/modules/executive-operations-center/types/operational-center.types'
import { NovexIcon } from '@/shared/components/NovexIcon'

type AiFilter = 'all' | 'with' | 'without' | 'reanalyzed'
type EventFilter = 'relevant' | 'human' | 'ai'

const INVENTORY_PAGE_SIZE = 15
const TIMELINE_PAGE_SIZE = 5

export function ReportesPage() {
  const { data, status, error, reload } = useExecutiveOperations()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [aiFilter, setAiFilter] = useState<AiFilter>('all')
  const [eventFilter, setEventFilter] = useState<EventFilter>('relevant')
  const [timelinePage, setTimelinePage] = useState(1)
  const [inventoryPage, setInventoryPage] = useState(1)
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(null)

  const filteredSituations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es')
    return (data?.situations ?? []).filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          item.code,
          item.title,
          item.description,
          item.coordinationName,
          item.categoryName,
          item.createdByUserName,
          item.assignedUserName ?? '',
        ].some((value) => value.toLocaleLowerCase('es').includes(normalizedQuery))
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesSeverity =
        severityFilter === 'all' || item.severity === severityFilter
      const matchesAi =
        aiFilter === 'all' ||
        (aiFilter === 'with' && item.ai.hasAnalysis) ||
        (aiFilter === 'without' && !item.ai.hasAnalysis) ||
        (aiFilter === 'reanalyzed' && item.ai.versionsCount > 1)
      return matchesQuery && matchesStatus && matchesSeverity && matchesAi
    })
  }, [aiFilter, data, query, severityFilter, statusFilter])

  const pagedSituations = useMemo(
    () => paginateItems(filteredSituations, inventoryPage, INVENTORY_PAGE_SIZE),
    [filteredSituations, inventoryPage],
  )

  const filteredEvents = useMemo(
    () =>
      (data?.auditEvents ?? []).filter((event) => {
        if (!isInstitutionalAuditEvent(event.eventType)) return false
        if (eventFilter === 'ai') return event.isAiEvent
        if (eventFilter === 'human') return !event.isAiEvent
        return true
      }),
    [data, eventFilter],
  )

  const pagedEvents = useMemo(
    () => paginateItems(filteredEvents, timelinePage, TIMELINE_PAGE_SIZE),
    [filteredEvents, timelinePage],
  )

  const hasInstitutionalEvents = useMemo(
    () => (data?.auditEvents ?? []).some((event) => isInstitutionalAuditEvent(event.eventType)),
    [data],
  )

  function resetInventoryPage() {
    setInventoryPage(1)
  }

  function changeEventFilter(filter: EventFilter) {
    setEventFilter(filter)
    setTimelinePage(1)
  }

  if (status !== 'ready' || !data) {
    return (
      <div className="eoc-view">
        <OperationsPageHeader
          title="Quién hizo qué, cuándo y sobre qué"
          description="Trazabilidad de registros, responsables y análisis IA."
          compact
        />
        <DataState
          status={status === 'ready' ? 'loading' : status}
          error={error}
          onRetry={() => void reload()}
        />
      </div>
    )
  }

  const authors = new Set(data.situations.map((item) => item.createdByUserId)).size
  const aiEvents = data.auditEvents.filter((event) => event.isAiEvent).length
  const categoryCounts = new Map<string, number>()
  const authorCounts = new Map<string, number>()
  for (const situation of data.situations) {
    categoryCounts.set(
      situation.categoryName,
      (categoryCounts.get(situation.categoryName) ?? 0) + 1,
    )
    authorCounts.set(
      situation.createdByUserName,
      (authorCounts.get(situation.createdByUserName) ?? 0) + 1,
    )
  }

  function downloadCsv() {
    const headers = [
      'Código',
      'Situación',
      'Descripción',
      'Coordinación',
      'Categoría',
      'Registró',
      'Responsable asignado',
      'Ocurrió',
      'Se registró',
      'Última actualización',
      'Estado',
      'Severidad declarada',
      'Análisis IA',
      'Versión IA',
      'Severidad IA',
      'Confianza IA',
      'Recomendaciones pendientes',
      'Evidencias',
      'Eventos de auditoría',
    ]
    const rows = filteredSituations.map((item) => [
      item.code,
      item.title,
      item.description,
      item.coordinationName,
      item.categoryName,
      item.createdByUserName,
      item.assignedUserName ?? '',
      formatDateTime(item.occurredAt),
      formatDateTime(item.createdAt),
      formatDateTime(item.updatedAt),
      statusLabel(item.status),
      severityLabel(item.severity),
      item.ai.hasAnalysis ? 'Sí' : 'No',
      item.ai.version,
      item.ai.classifiedSeverity ? severityLabel(item.ai.classifiedSeverity) : '',
      item.ai.confidence === null ? '' : Math.round(item.ai.confidence * 100),
      item.recommendationsPending,
      item.evidencesCount,
      item.timelineEventsCount,
    ])
    downloadExcelCompatibleCsv(
      `novex-auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    )
  }

  return (
    <div className="eoc-view">
      <OperationsPageHeader
        title="Quién hizo qué, cuándo y sobre qué"
        description="Expedientes y eventos para reconstruir lo registrado."
        generatedAt={data.generatedAt}
        loading={false}
        onRefresh={() => void reload()}
        compact
        actionsClassName="eoc-view-header__actions--subtle"
        action={
          <button
            type="button"
            className="eoc-ghost-action"
            onClick={downloadCsv}
            aria-label={`Exportar ${filteredSituations.length} registros filtrados`}
          >
            <NovexIcon name="download" size={14} />
            <span>Exportar CSV</span>
            <em>{filteredSituations.length}</em>
          </button>
        }
      />

      <div className="eoc-metrics-grid eoc-metrics-grid--six">
        <MetricCard
          label="Expedientes"
          value={data.metrics.totalSituations}
          hint="Total histórico consultado"
          icon="file"
        />
        <MetricCard
          label="Personas que registraron"
          value={authors}
          hint="Autores únicos identificados"
          icon="users"
        />
        <MetricCard
          label="Eventos trazables"
          value={data.metrics.auditEventCount}
          hint="Total en historiales de expediente"
          icon="activity"
        />
        <MetricCard
          label="Eventos de IA"
          value={aiEvents}
          hint="Análisis y reanálisis registrados"
          tone="ai"
          icon="sparkles"
        />
        <MetricCard
          label="Evidencias"
          value={data.metrics.evidenceCount}
          hint="Soportes documentales adjuntos"
          icon="file"
        />
        <MetricCard
          label="Fuentes incompletas"
          value={data.partialFailures}
          hint="Consultas de detalle no disponibles"
          tone={data.partialFailures > 0 ? 'attention' : 'stable'}
          icon={data.partialFailures > 0 ? 'alert' : 'check'}
        />
      </div>

      <div
        className={
          hasInstitutionalEvents
            ? 'eoc-audit-overview'
            : 'eoc-audit-overview eoc-audit-overview--compact'
        }
      >
        {hasInstitutionalEvents ? (
          <OperationsPanel
            eyebrow="Actividad verificable"
            title="Línea de tiempo institucional"
            description="Hitos decisivos: creación, cambios de estado o severidad, cierre, evidencias y análisis IA. El historial fino de cada expediente está en Auditar."
            action={
              <div className="eoc-segmented" aria-label="Filtrar eventos por origen">
                {(['relevant', 'human', 'ai'] as EventFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={eventFilter === filter ? 'is-active' : ''}
                    onClick={() => changeEventFilter(filter)}
                  >
                    {filter === 'relevant'
                      ? 'Relevantes'
                      : filter === 'human'
                        ? 'Personas'
                        : 'IA'}
                  </button>
                ))}
              </div>
            }
          >
            {filteredEvents.length > 0 ? (
              <>
                <ol className="eoc-audit-timeline">
                  {pagedEvents.map((event) => (
                    <AuditEventRow
                      key={event.id}
                      event={event}
                      onOpen={() => setSelectedSituationId(event.situationId)}
                    />
                  ))}
                </ol>
                <OperationsPagination
                  page={timelinePage}
                  pageSize={TIMELINE_PAGE_SIZE}
                  total={filteredEvents.length}
                  onPageChange={setTimelinePage}
                  label="hitos"
                />
              </>
            ) : (
              <div className="eoc-inline-empty eoc-inline-empty--compact">
                {eventFilter === 'ai'
                  ? 'No hay hitos de IA en este periodo.'
                  : eventFilter === 'human'
                    ? 'No hay hitos de personas en este periodo.'
                    : 'No hay hitos relevantes en este periodo.'}
              </div>
            )}
          </OperationsPanel>
        ) : null}

        <div className="eoc-stack">
          <OperationsPanel eyebrow="Origen del registro" title="Principales autores">
            <ul className="eoc-ranking-list">
              {[...authorCounts.entries()]
                .sort((left, right) => right[1] - left[1])
                .slice(0, 6)
                .map(([author, count], index) => (
                  <li key={author}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{author}</strong>
                    <em>{count}</em>
                  </li>
                ))}
            </ul>
          </OperationsPanel>
          <OperationsPanel eyebrow="Motivo documentado" title="Categorías registradas">
            <ul className="eoc-ranking-list">
              {[...categoryCounts.entries()]
                .sort((left, right) => right[1] - left[1])
                .slice(0, 6)
                .map(([category, count], index) => (
                  <li key={category}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{category}</strong>
                    <em>{count}</em>
                  </li>
                ))}
            </ul>
          </OperationsPanel>
        </div>
      </div>

      <OperationsPanel
        eyebrow="Inventario auditable"
        title="Expedientes registrados en NOVEX"
        description="Busca por situación, autor, coordinación o categoría. Los filtros también controlan la exportación."
      >
        <div className="eoc-audit-filters">
          <label className="eoc-search-control">
            <NovexIcon name="search" />
            <span className="sr-only">Buscar expedientes</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                resetInventoryPage()
              }}
              placeholder="Buscar código, situación, autor, área o categoría…"
            />
          </label>
          <label>
            <span>Estado</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                resetInventoryPage()
              }}
            >
              <option value="all">Todos</option>
              <option value="OPEN">Abiertas</option>
              <option value="IN_PROGRESS">En gestión</option>
              <option value="RESOLVED">Resueltas</option>
              <option value="CLOSED">Cerradas</option>
            </select>
          </label>
          <label>
            <span>Severidad</span>
            <select
              value={severityFilter}
              onChange={(event) => {
                setSeverityFilter(event.target.value)
                resetInventoryPage()
              }}
            >
              <option value="all">Todas</option>
              <option value="CRITICAL">Crítica</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Media</option>
              <option value="LOW">Baja</option>
            </select>
          </label>
          <label>
            <span>Inteligencia IA</span>
            <select
              value={aiFilter}
              onChange={(event) => {
                setAiFilter(event.target.value as AiFilter)
                resetInventoryPage()
              }}
            >
              <option value="all">Todos</option>
              <option value="with">Con análisis</option>
              <option value="without">Sin análisis</option>
              <option value="reanalyzed">Reanalizados</option>
            </select>
          </label>
          <button
            type="button"
            className="eoc-clear-filters"
            onClick={() => {
              setQuery('')
              setStatusFilter('all')
              setSeverityFilter('all')
              setAiFilter('all')
              resetInventoryPage()
            }}
          >
            Limpiar
          </button>
        </div>

        <div className="eoc-results-summary">
          <span>
            <strong>{filteredSituations.length}</strong> de {data.situations.length} expedientes
          </span>
          <span>Consulta consolidada de {data.totalReportedByApi} registros reportados por la API</span>
        </div>

        <div className="eoc-table-wrap">
          <table className="eoc-table eoc-table--audit">
            <thead>
              <tr>
                <th>Expediente</th>
                <th>Origen y motivo</th>
                <th>Quién registró</th>
                <th>Cuándo</th>
                <th>Estado actual</th>
                <th>IA registrada</th>
                <th>Soportes</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {pagedSituations.map((situation) => (
                <tr key={situation.id}>
                  <td>
                    <span className="eoc-table__primary eoc-table__primary--wide">
                      <small>{situation.code}</small>
                      <strong>{situation.title}</strong>
                      <em>{situation.description}</em>
                    </span>
                  </td>
                  <td>
                    <span className="eoc-table__stacked">
                      <strong>{situation.coordinationName}</strong>
                      <small>{situation.categoryName}</small>
                    </span>
                  </td>
                  <td>
                    <span className="eoc-table__stacked">
                      <strong>{situation.createdByUserName}</strong>
                      <small>
                        {situation.assignedUserName
                          ? `Asignada a ${situation.assignedUserName}`
                          : 'Sin responsable asignado'}
                      </small>
                    </span>
                  </td>
                  <td>
                    <span className="eoc-table__dates">
                      <small>Ocurrió</small><strong>{formatDateTime(situation.occurredAt)}</strong>
                      <small>Registrada</small><strong>{formatDateTime(situation.createdAt)}</strong>
                      <em>Actualizada {formatRelativeTime(situation.updatedAt)}</em>
                    </span>
                  </td>
                  <td>
                    <span className="eoc-table__status-stack">
                      <StatusPill status={situation.status} />
                      <SeverityPill severity={situation.severity} />
                    </span>
                  </td>
                  <td>
                    {situation.ai.hasAnalysis ? (
                      <span className="eoc-table__ai-record">
                        <strong><NovexIcon name="sparkles" /> v{situation.ai.version} · {formatConfidence(situation.ai.confidence)}</strong>
                        <small>
                          {situation.ai.classifiedSeverity
                            ? `${severityLabel(situation.ai.classifiedSeverity)} según IA`
                            : 'Sin clasificación IA'}
                        </small>
                        <em>{situation.ai.versionsCount} versiones</em>
                      </span>
                    ) : (
                      <span className="eoc-ai-availability">Sin análisis</span>
                    )}
                  </td>
                  <td>
                    <span className="eoc-table__supports">
                      <span><NovexIcon name="file" /> {situation.evidencesCount}</span>
                      <span><NovexIcon name="activity" /> {situation.timelineEventsCount}</span>
                      <span><NovexIcon name="check" /> {situation.recommendationsPending}</span>
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="eoc-row-action"
                      onClick={() => setSelectedSituationId(situation.id)}
                    >
                      Auditar <NovexIcon name="chevron-right" size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSituations.length === 0 ? (
          <div className="eoc-inline-empty">No hay expedientes que coincidan con los filtros.</div>
        ) : (
          <OperationsPagination
            page={inventoryPage}
            pageSize={INVENTORY_PAGE_SIZE}
            total={filteredSituations.length}
            onPageChange={setInventoryPage}
            label="expedientes"
          />
        )}
      </OperationsPanel>

      {selectedSituationId ? (
        <ConnectedSituationDetailModal
          situationId={selectedSituationId}
          title={data.situations.find((item) => item.id === selectedSituationId)?.title}
          onClose={() => setSelectedSituationId(null)}
        />
      ) : null}
    </div>
  )
}

function AuditEventRow({
  event,
  onOpen,
}: {
  event: OperationalAuditEvent
  onOpen: () => void
}) {
  return (
    <li data-ai={event.isAiEvent || undefined}>
      <div className="eoc-audit-timeline__rail">
        <i><NovexIcon name={event.isAiEvent ? 'sparkles' : 'user'} size={13} /></i>
        <span />
      </div>
      <div>
        <span>
          {event.isAiEvent ? 'Inteligencia artificial' : event.userName || 'Sistema'} ·{' '}
          {formatDateTime(event.createdAt)}
        </span>
        <button type="button" onClick={onOpen}>
          {event.title || eventTypeLabel(event.eventType)}
        </button>
        <p>{event.description}</p>
        <small>{event.situationCode} · {event.situationTitle} · {event.coordinationName}</small>
      </div>
    </li>
  )
}
