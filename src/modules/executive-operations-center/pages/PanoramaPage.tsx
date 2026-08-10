import { useEffect, useMemo, useState } from 'react'
import { ConnectedSituationDetailModal } from '@/modules/operational-events/components/ConnectedSituationDetailModal'
import { CoordinationSituationsModal } from '@/modules/executive-operations-center/components/panorama/CoordinationSituationsModal'
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
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  severityLabel,
  statusLabel,
} from '@/modules/executive-operations-center/utils/operational-center.presentation'
import type {
  OperationalCenterSituation,
  OperationalCoordinationRollup,
  OperationalHealth,
} from '@/modules/executive-operations-center/types/operational-center.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import { NovexIcon } from '@/shared/components/NovexIcon'

const STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
const SEVERITY_ORDER: SituationSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const SITUATIONS_PAGE_SIZE = 10
const COORDINATIONS_PAGE_SIZE = 10

type LoadFilter = 'all' | 'active' | 'idle'
type HealthFilter = 'all' | OperationalHealth

function countBy<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

function Distribution({
  items,
  total,
}: {
  items: Array<{ label: string; value: number; tone: string }>
  total: number
}) {
  return (
    <div className="eoc-distribution">
      {items.map((item) => {
        const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
        return (
          <div key={item.label} data-tone={item.tone}>
            <span>{item.label}</span>
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={item.value}
            >
              <i style={{ width: `${percentage}%` }} />
            </div>
            <strong>{item.value}</strong>
            <small>{percentage}%</small>
          </div>
        )
      })}
    </div>
  )
}

function buildActivitySeries(situations: OperationalCenterSituation[]) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (13 - index))
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
      }).format(date),
      registered: 0,
      finalized: 0,
    }
  })
  const byDay = new Map(days.map((day) => [day.key, day]))

  for (const situation of situations) {
    const registeredKey = new Date(situation.createdAt).toISOString().slice(0, 10)
    const registeredDay = byDay.get(registeredKey)
    if (registeredDay) registeredDay.registered += 1
    const finalizedAt = situation.closedAt ?? situation.resolvedAt
    if (finalizedAt) {
      const finalizedKey = new Date(finalizedAt).toISOString().slice(0, 10)
      const finalizedDay = byDay.get(finalizedKey)
      if (finalizedDay) finalizedDay.finalized += 1
    }
  }
  return days
}

function healthLabel(health: OperationalHealth) {
  switch (health) {
    case 'critical':
      return 'Crítico'
    case 'attention':
      return 'En atención'
    case 'stable':
      return 'Estable'
    default: {
      const exhaustive: never = health
      return exhaustive
    }
  }
}

function matchesSituationFilters(
  situation: OperationalCenterSituation,
  query: string,
  statusFilter: string,
  coordinationFilter: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('es')
  const matchesQuery =
    !normalizedQuery ||
    [
      situation.code,
      situation.title,
      situation.coordinationName,
      situation.categoryName,
      situation.createdByUserName,
      situation.assignedUserName ?? '',
    ].some((value) => value.toLocaleLowerCase('es').includes(normalizedQuery))
  const matchesStatus = statusFilter === 'all' || situation.status === statusFilter
  const matchesCoordination =
    coordinationFilter === 'all' ||
    situation.coordinationId === coordinationFilter
  return matchesQuery && matchesStatus && matchesCoordination
}

function matchesCoordinationFilters(
  coordination: OperationalCoordinationRollup,
  query: string,
  healthFilter: HealthFilter,
  loadFilter: LoadFilter,
  coordinationFilter: string,
  matchingSituationIds: Set<string> | null,
  situationFilterActive: boolean,
  situationsByCoordination: Map<string, OperationalCenterSituation[]>,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('es')
  const nameMatches =
    !normalizedQuery ||
    [coordination.name, coordination.code].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedQuery),
    )
  const situationTextMatches = (
    situationsByCoordination.get(coordination.id) ?? []
  ).some((situation) =>
    [situation.title, situation.code, situation.createdByUserName].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedQuery),
    ),
  )
  const matchesQuery = nameMatches || situationTextMatches
  const matchesHealth =
    healthFilter === 'all' || coordination.health === healthFilter
  const matchesLoad =
    loadFilter === 'all' ||
    (loadFilter === 'active' &&
      (coordination.activeSituations > 0 || coordination.affectedBySituations > 0)) ||
    (loadFilter === 'idle' &&
      coordination.activeSituations === 0 &&
      coordination.affectedBySituations === 0)
  const matchesCoordination =
    coordinationFilter === 'all' || coordination.id === coordinationFilter
  const hasMatchingSituation = (
    situationsByCoordination.get(coordination.id) ?? []
  ).some((item) => matchingSituationIds?.has(item.id) ?? true)
  const matchesSituationScope =
    matchingSituationIds === null ||
    hasMatchingSituation ||
    coordination.id === coordinationFilter ||
    (nameMatches && !situationFilterActive)
  return (
    matchesQuery &&
    matchesHealth &&
    matchesLoad &&
    matchesCoordination &&
    matchesSituationScope
  )
}

export function PanoramaPage() {
  const { data, status, error, reload } = useExecutiveOperations()
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(null)
  const [selectedCoordinationId, setSelectedCoordinationId] = useState<string | null>(
    null,
  )
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [coordinationFilter, setCoordinationFilter] = useState('all')
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all')
  const [loadFilter, setLoadFilter] = useState<LoadFilter>('all')
  const [situationsPage, setSituationsPage] = useState(1)
  const [coordinationsPage, setCoordinationsPage] = useState(1)

  const situationsByCoordination = useMemo(() => {
    const map = new Map<string, OperationalCenterSituation[]>()
    for (const situation of data?.situations ?? []) {
      const current = map.get(situation.coordinationId) ?? []
      current.push(situation)
      map.set(situation.coordinationId, current)
    }
    return map
  }, [data])

  const filteredSituations = useMemo(
    () =>
      (data?.situations ?? []).filter((situation) =>
        matchesSituationFilters(
          situation,
          query,
          statusFilter,
          coordinationFilter,
        ),
      ),
    [coordinationFilter, data, query, statusFilter],
  )

  const situationFilterActive =
    statusFilter !== 'all' || coordinationFilter !== 'all'
  const matchingSituationIds = useMemo(
    () =>
      situationFilterActive || query.trim()
        ? new Set(filteredSituations.map((item) => item.id))
        : null,
    [filteredSituations, query, situationFilterActive],
  )

  const filteredCoordinations = useMemo(
    () =>
      (data?.coordinations ?? []).filter((coordination) =>
        matchesCoordinationFilters(
          coordination,
          query,
          healthFilter,
          loadFilter,
          coordinationFilter,
          matchingSituationIds,
          situationFilterActive,
          situationsByCoordination,
        ),
      ),
    [
      data,
      coordinationFilter,
      healthFilter,
      loadFilter,
      matchingSituationIds,
      query,
      situationFilterActive,
      situationsByCoordination,
    ],
  )

  const activity = useMemo(
    () => buildActivitySeries(filteredSituations),
    [filteredSituations],
  )

  const pagedSituations = useMemo(
    () => paginateItems(filteredSituations, situationsPage, SITUATIONS_PAGE_SIZE),
    [filteredSituations, situationsPage],
  )
  const pagedCoordinations = useMemo(
    () =>
      paginateItems(
        filteredCoordinations,
        coordinationsPage,
        COORDINATIONS_PAGE_SIZE,
      ),
    [coordinationsPage, filteredCoordinations],
  )

  useEffect(() => {
    setSituationsPage(1)
    setCoordinationsPage(1)
  }, [query, statusFilter, coordinationFilter, healthFilter, loadFilter])

  const filtersActive =
    query.trim() !== '' ||
    statusFilter !== 'all' ||
    coordinationFilter !== 'all' ||
    healthFilter !== 'all' ||
    loadFilter !== 'all'
  const activeFilterCount = [
    query.trim() !== '',
    statusFilter !== 'all',
    coordinationFilter !== 'all',
    healthFilter !== 'all',
    loadFilter !== 'all',
  ].filter(Boolean).length

  function clearFilters() {
    setQuery('')
    setStatusFilter('all')
    setCoordinationFilter('all')
    setHealthFilter('all')
    setLoadFilter('all')
    setSituationsPage(1)
    setCoordinationsPage(1)
  }

  if (status !== 'ready' || !data) {
    return (
      <div className="eoc-view eoc-panorama">
        <OperationsPageHeader
          title="Panorama global"
          description="Distribución, evolución y carga por coordinación."
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

  const statusCounts = countBy(filteredSituations.map((item) => item.status))
  const severityCounts = countBy(filteredSituations.map((item) => item.severity))
  const maxActivity = Math.max(
    1,
    ...activity.flatMap((day) => [day.registered, day.finalized]),
  )
  const openCount = filteredSituations.filter((item) => item.status === 'OPEN').length
  const inProgressCount = filteredSituations.filter(
    (item) => item.status === 'IN_PROGRESS',
  ).length
  const finalizedCount = filteredSituations.filter(
    (item) => item.status === 'RESOLVED' || item.status === 'CLOSED',
  ).length
  const criticalCount = filteredSituations.filter(
    (item) =>
      (item.status === 'OPEN' || item.status === 'IN_PROGRESS') &&
      (item.severity === 'CRITICAL' || item.severity === 'HIGH'),
  ).length
  const analyzedCount = filteredSituations.filter((item) => item.ai.hasAnalysis).length
  const analysisCoverage =
    filteredSituations.length > 0
      ? Math.round((analyzedCount / filteredSituations.length) * 100)
      : 0
  const selectedCoordination =
    data.coordinations.find((item) => item.id === selectedCoordinationId) ?? null
  const coordinationSituations = selectedCoordination
    ? (situationsByCoordination.get(selectedCoordination.id) ?? [])
    : []

  return (
    <div className="eoc-view eoc-panorama">
      <OperationsPageHeader
        title="Panorama global"
        description="Distribución, evolución y carga por coordinación."
        generatedAt={data.generatedAt}
        loading={false}
        onRefresh={() => void reload()}
        compact
      />

      <section className="eoc-panorama-filters" aria-label="Filtros del panorama">
        <header className="eoc-panorama-filters__header">
          <div className="eoc-panorama-filters__intro">
            <span><NovexIcon name="settings" size={16} /></span>
            <div>
              <strong>Explorar la operación</strong>
              <small>Combina criterios para encontrar situaciones y áreas específicas.</small>
            </div>
          </div>
          {filtersActive ? (
            <div className="eoc-panorama-filters__actions">
              <span>
                <i /> {activeFilterCount}{' '}
                {activeFilterCount === 1 ? 'filtro activo' : 'filtros activos'}
              </span>
              <button type="button" className="eoc-clear-filters" onClick={clearFilters}>
                <NovexIcon name="x" size={13} /> Limpiar
              </button>
            </div>
          ) : null}
        </header>

        <div className="eoc-panorama-filters__controls">
          <label
            className="eoc-search-control"
            data-active={query.trim() !== '' || undefined}
          >
            <span>Búsqueda</span>
            <div>
              <NovexIcon name="search" size={15} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Área, situación, código o responsable…"
              />
            </div>
          </label>

          <div className="eoc-panorama-filters__fields">
            <label data-active={statusFilter !== 'all' || undefined}>
              <span>Estado</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">Todos</option>
                <option value="OPEN">Abiertas</option>
                <option value="IN_PROGRESS">En gestión</option>
                <option value="RESOLVED">Resueltas</option>
                <option value="CLOSED">Cerradas</option>
              </select>
            </label>
            <label data-active={coordinationFilter !== 'all' || undefined}>
              <span>Coordinación</span>
              <select
                value={coordinationFilter}
                onChange={(event) => setCoordinationFilter(event.target.value)}
              >
                <option value="all">Todas las coordinaciones</option>
                {data.coordinations.map((coordination) => (
                  <option key={coordination.id} value={coordination.id}>
                    {coordination.name}
                  </option>
                ))}
              </select>
            </label>
            <label data-active={healthFilter !== 'all' || undefined}>
              <span>Salud</span>
              <select
                value={healthFilter}
                onChange={(event) =>
                  setHealthFilter(event.target.value as HealthFilter)
                }
              >
                <option value="all">Todas</option>
                <option value="critical">Crítica</option>
                <option value="attention">En atención</option>
                <option value="stable">Estable</option>
              </select>
            </label>
            <label data-active={loadFilter !== 'all' || undefined}>
              <span>Carga</span>
              <select
                value={loadFilter}
                onChange={(event) => setLoadFilter(event.target.value as LoadFilter)}
              >
                <option value="all">Todas</option>
                <option value="active">Con carga</option>
                <option value="idle">Sin carga</option>
              </select>
            </label>
          </div>
        </div>

        <footer className="eoc-results-summary eoc-panorama-summary">
          <span>
            Mostrando <strong>{filteredSituations.length}</strong> de{' '}
            {data.situations.length} situaciones ·{' '}
            <strong>{filteredCoordinations.length}</strong> de {data.coordinations.length}{' '}
            áreas
          </span>
          <span className="eoc-panorama-summary__mode">
            <i /> {filtersActive ? 'Vista filtrada' : 'Vista completa'}
          </span>
        </footer>
      </section>

      <div className="eoc-metrics-grid eoc-metrics-grid--six">
        <MetricCard
          label="Situaciones"
          value={filteredSituations.length}
          hint={
            filtersActive
              ? `De ${data.metrics.totalSituations} en historial`
              : 'En el alcance actual'
          }
          tone="default"
          icon="file"
        />
        <MetricCard
          label="Carga activa"
          value={openCount + inProgressCount}
          hint={`${criticalCount} alta o crítica`}
          tone={criticalCount > 0 ? 'critical' : 'attention'}
          icon="activity"
        />
        <MetricCard
          label="Finalizadas"
          value={finalizedCount}
          hint={`${data.metrics.resolvedSituations} resueltas · ${data.metrics.closedSituations} cerradas`}
          tone="stable"
          icon="check"
        />
        <MetricCard
          label="Tiempo de registro"
          value={formatDuration(data.metrics.averageRegistrationDelayMinutes)}
          hint="Promedio desde el evento hasta la captura"
          tone="default"
          icon="clock"
        />
        <MetricCard
          label="Cobertura IA"
          value={`${analysisCoverage}%`}
          hint={`${analyzedCount} con lectura asistida`}
          tone={analysisCoverage >= 80 ? 'stable' : 'ai'}
          icon="sparkles"
        />
        <MetricCard
          label="Notas de captura"
          value={data.metrics.evidenceCount}
          hint="Contexto del formulario (método, afectados, notas)"
          tone="default"
          icon="file"
        />
      </div>

      <div className="eoc-content-grid eoc-content-grid--panorama">
        <OperationsPanel
          title="Flujo de registros y cierres"
          description="Últimos 14 días · nuevas situaciones frente a casos finalizados."
          className="eoc-panel--trend"
        >
          <div className="eoc-trend-legend">
            <span>
              <i data-series="registered" /> Registradas
            </span>
            <span>
              <i data-series="finalized" /> Finalizadas
            </span>
          </div>
          <div
            className="eoc-trend-chart"
            aria-label="Actividad de los últimos catorce días"
          >
            {activity.map((day) => (
              <div key={day.key}>
                <div className="eoc-trend-chart__bars">
                  <i
                    data-series="registered"
                    style={{
                      height: `${Math.max(
                        day.registered > 0 ? 8 : 0,
                        (day.registered / maxActivity) * 100,
                      )}%`,
                    }}
                    title={`${day.registered} registradas`}
                  />
                  <i
                    data-series="finalized"
                    style={{
                      height: `${Math.max(
                        day.finalized > 0 ? 8 : 0,
                        (day.finalized / maxActivity) * 100,
                      )}%`,
                    }}
                    title={`${day.finalized} finalizadas`}
                  />
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </OperationsPanel>

        <div className="eoc-stack">
          <OperationsPanel title="Por estado">
            <Distribution
              total={filteredSituations.length}
              items={STATUS_ORDER.map((item) => ({
                label: statusLabel(item),
                value: statusCounts.get(item) ?? 0,
                tone:
                  item === 'OPEN'
                    ? 'critical'
                    : item === 'IN_PROGRESS'
                      ? 'attention'
                      : 'stable',
              }))}
            />
          </OperationsPanel>
          <OperationsPanel title="Por severidad">
            <Distribution
              total={filteredSituations.length}
              items={SEVERITY_ORDER.map((item) => ({
                label: severityLabel(item),
                value: severityCounts.get(item) ?? 0,
                tone:
                  item === 'CRITICAL'
                    ? 'critical'
                    : item === 'HIGH'
                      ? 'high'
                      : item === 'MEDIUM'
                        ? 'attention'
                        : 'stable',
              }))}
            />
          </OperationsPanel>
        </div>
      </div>

      <OperationsPanel
        title="Estado de coordinaciones"
        description="Carga originada, impactos recibidos, cobertura IA y acceso a expedientes del área."
      >
        <div className="eoc-table-wrap">
          <table className="eoc-table eoc-table--coordination">
            <thead>
              <tr>
                <th>Coordinación</th>
                <th>Estado</th>
                <th>Históricas</th>
                <th>Activas</th>
                <th>Alta/crítica</th>
                <th>Impactos</th>
                <th>Cobertura IA</th>
                <th>Última actividad</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {pagedCoordinations.length > 0 ? (
                pagedCoordinations.map((coordination) => {
                  const coverage =
                    coordination.totalSituations > 0
                      ? Math.round(
                          (coordination.analyzedSituations /
                            coordination.totalSituations) *
                            100,
                        )
                      : 0
                  return (
                    <tr key={coordination.id}>
                      <td>
                        <div className="eoc-table__identity">
                          <i style={{ backgroundColor: coordination.color }} />
                          <span>
                            <strong>{coordination.name}</strong>
                            <small>{coordination.code}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="eoc-health-label"
                          data-health={coordination.health}
                        >
                          <i />
                          {healthLabel(coordination.health)}
                        </span>
                      </td>
                      <td>{coordination.totalSituations}</td>
                      <td>{coordination.activeSituations}</td>
                      <td>{coordination.criticalSituations}</td>
                      <td>{coordination.affectedBySituations}</td>
                      <td>
                        <span className="eoc-coverage-value">
                          <i>
                            <b style={{ width: `${coverage}%` }} />
                          </i>
                          {coverage}%
                        </span>
                      </td>
                      <td>{formatRelativeTime(coordination.lastActivityAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="eoc-row-action eoc-row-action--quiet"
                          onClick={() => setSelectedCoordinationId(coordination.id)}
                        >
                          Ver detalle
                          <NovexIcon name="chevron-right" size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className="eoc-inline-empty">
                      Ninguna coordinación coincide con los filtros actuales.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <OperationsPagination
          page={coordinationsPage}
          pageSize={COORDINATIONS_PAGE_SIZE}
          total={filteredCoordinations.length}
          onPageChange={setCoordinationsPage}
          label="áreas"
        />
      </OperationsPanel>

      <OperationsPanel
        title="Últimas situaciones"
        description="Origen, responsable, estado y cobertura de cada expediente en el alcance filtrado."
      >
        <div className="eoc-table-wrap">
          <table className="eoc-table eoc-table--situations">
            <thead>
              <tr>
                <th>Situación</th>
                <th>Origen</th>
                <th>Registró</th>
                <th>Estado</th>
                <th>Severidad</th>
                <th>Registro</th>
                <th>IA</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {pagedSituations.length > 0 ? (
                pagedSituations.map((situation) => (
                  <tr key={situation.id}>
                    <td>
                      <span className="eoc-table__primary">
                        <strong>{situation.title}</strong>
                        <small>
                          {situation.code} · {situation.categoryName}
                        </small>
                      </span>
                    </td>
                    <td>{situation.coordinationName}</td>
                    <td>{situation.createdByUserName}</td>
                    <td>
                      <StatusPill status={situation.status} />
                    </td>
                    <td>
                      <SeverityPill severity={situation.severity} />
                    </td>
                    <td>{formatDateTime(situation.createdAt)}</td>
                    <td>
                      {situation.ai.hasAnalysis ? (
                        <span className="eoc-ai-availability is-ready">
                          <NovexIcon name="sparkles" /> v{situation.ai.version}
                        </span>
                      ) : (
                        <span className="eoc-ai-availability">Sin análisis</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="eoc-row-action eoc-row-action--quiet"
                        onClick={() => setSelectedSituationId(situation.id)}
                      >
                        Ver detalle
                        <NovexIcon name="chevron-right" size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="eoc-inline-empty">
                      No hay situaciones para los filtros seleccionados.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <OperationsPagination
          page={situationsPage}
          pageSize={SITUATIONS_PAGE_SIZE}
          total={filteredSituations.length}
          onPageChange={setSituationsPage}
          label="situaciones"
        />
      </OperationsPanel>

      {selectedCoordination ? (
        <CoordinationSituationsModal
          coordination={selectedCoordination}
          situations={coordinationSituations}
          onClose={() => setSelectedCoordinationId(null)}
          onOpenSituation={(situationId) => {
            setSelectedCoordinationId(null)
            setSelectedSituationId(situationId)
          }}
        />
      ) : null}

      {selectedSituationId ? (
        <ConnectedSituationDetailModal
          situationId={selectedSituationId}
          title={
            data.situations.find((item) => item.id === selectedSituationId)?.title
          }
          onClose={() => setSelectedSituationId(null)}
        />
      ) : null}
    </div>
  )
}
