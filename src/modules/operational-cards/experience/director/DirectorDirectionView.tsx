import { useMemo, useState } from 'react'
import {
  DirectorCoordinationTable,
  DirectorStatusDistribution,
} from '@/modules/operational-cards/experience/director/DirectorCoordinationTable'
import { DirectorStatusBadge } from '@/modules/operational-cards/experience/director/DirectorStatusBadge'
import type {
  DirectionTableSortDir,
  DirectionTableSortKey,
} from '@/modules/operational-cards/experience/director/director-direction.sort'
import type { DirectorDirectionLoadStatus } from '@/modules/operational-cards/hooks/useDirectorDirectionKpi'
import type { OperationalKpiDirectionSnapshot } from '@/modules/operational-cards/types/operational-kpi.types'

export function DirectorDirectionView({
  status,
  snapshot,
  error,
  selectedCode,
  onSelect,
  onRetry,
}: {
  status: DirectorDirectionLoadStatus
  snapshot: OperationalKpiDirectionSnapshot | null
  error: string | null
  selectedCode: string | null
  onSelect: (code: string) => void
  onRetry: () => void
}) {
  const [sortKey, setSortKey] = useState<DirectionTableSortKey>('executive')
  const [sortDir, setSortDir] = useState<DirectionTableSortDir>('desc')

  const selected = useMemo(
    () =>
      snapshot?.coordinations.find(
        (row) => row.coordination.code === selectedCode,
      ) ?? null,
    [snapshot, selectedCode],
  )

  const handleSort = (key: DirectionTableSortKey) => {
    if (key === sortKey) {
      setSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
      return
    }
    setSortKey(key)
    setSortDir('desc')
  }

  const loading = status === 'loading'
  const directionStatus = snapshot?.directionStatus ?? 'DESCONOCIDO'
  const activeCount = snapshot?.problems.activeCount ?? 0
  const criticalCount = snapshot?.problems.severity.critical ?? 0
  const criticalCoordinations =
    snapshot?.coordinationStatusTotals.critical ?? 0
  const incoming = snapshot?.dependencies.incoming ?? 0

  return (
    <div
      className={`director-direction${loading ? ' director-direction--loading' : ''}`}
      data-testid="director-direction-view"
      data-load-status={status}
      aria-busy={loading}
    >
      <header className="director-direction__masthead">
        <div>
          <p className="director-direction__kicker">NOVEX · Centro operacional</p>
          <h1 className="director-direction__title">
            Dirección de Operaciones
          </h1>
          <p className="director-direction__crumb">
            Dirección → Coordinación
          </p>
        </div>
        <div className="director-direction__status-block">
          <p className="director-direction__status-label">Estado actual</p>
          {loading ? (
            <span className="director-skeleton" style={{ width: 120, height: 28 }} />
          ) : (
            <DirectorStatusBadge
              status={directionStatus}
              testId="director-direction-status"
            />
          )}
        </div>
        <div className="director-direction__actions">
          <button
            type="button"
            className="director-direction__compare"
            data-testid="director-compare-cta"
            disabled
            title="El comparador se habilita en una fase posterior"
          >
            Comparar coordinaciones
          </button>
        </div>
        <div className="director-direction__metrics">
          <div className="director-metric" data-testid="director-metric-active">
            <span className="director-metric__label">Problemas activos</span>
            <span className="director-metric__value">
              {loading ? '—' : activeCount}
            </span>
          </div>
          <div
            className="director-metric director-metric--critical"
            data-testid="director-metric-critical"
          >
            <span className="director-metric__label">Problemas críticos</span>
            <span className="director-metric__value">
              {loading ? '—' : criticalCount}
            </span>
          </div>
          <div
            className="director-metric"
            data-testid="director-metric-critical-coordinations"
          >
            <span className="director-metric__label">
              Coordinaciones críticas
            </span>
            <span className="director-metric__value">
              {loading ? '—' : criticalCoordinations}
            </span>
          </div>
          <div
            className="director-metric director-metric--quiet"
            data-testid="director-metric-incoming"
          >
            <span className="director-metric__label">
              Dependencias entrantes
            </span>
            <span className="director-metric__value">
              {loading ? '—' : incoming}
            </span>
          </div>
        </div>
        {loading ? (
          <DirectorStatusDistribution
            totals={{ stable: 0, alert: 0, critical: 0, unknown: 0 }}
          />
        ) : snapshot ? (
          <DirectorStatusDistribution
            totals={snapshot.coordinationStatusTotals}
          />
        ) : null}
      </header>

      <section className="director-direction__board" aria-label="Estado de las coordinaciones">
        <div className="director-direction__board-head">
          <h2 className="director-direction__board-title">
            Estado de las coordinaciones
          </h2>
          {sortKey !== 'executive' ? (
            <button
              type="button"
              className="director-direction__sort-restore"
              data-testid="director-sort-restore"
              onClick={() => {
                setSortKey('executive')
                setSortDir('desc')
              }}
            >
              Orden ejecutivo
            </button>
          ) : null}
        </div>
        {status === 'error' ? (
          <p className="director-direction__error" role="alert" data-testid="director-kpi-error">
            No se pudo leer el estado de Dirección.
            {error ? ` ${error}` : ''}
            <button
              type="button"
              className="director-direction__retry"
              onClick={onRetry}
            >
              Reintentar
            </button>
          </p>
        ) : loading ? (
          <div className="director-table-wrap" data-testid="director-table-skeleton">
            <table className="director-table">
              <thead>
                <tr>
                  <th>Coordinación</th>
                  <th>Estado</th>
                  <th>Vidas</th>
                  <th>Activos</th>
                  <th>Críticos</th>
                  <th>Incoming</th>
                  <th>Outgoing</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }, (_unused, index) => (
                  <tr key={index}>
                    <td colSpan={7}>
                      <div className="director-skeleton" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : snapshot ? (
          <DirectorCoordinationTable
            rows={snapshot.coordinations}
            sortKey={sortKey}
            sortDir={sortDir}
            selectedCode={selectedCode}
            onSort={handleSort}
            onSelect={onSelect}
          />
        ) : null}
      </section>

      {selected ? (
        <aside
          className="director-direction__preview"
          data-testid="director-coordination-preview"
          data-selected-code={selected.coordination.code}
        >
          <div>
            <p className="director-direction__preview-kicker">
              Lectura de coordinación · siguiente nivel
            </p>
            <p className="director-direction__preview-name">
              {selected.coordination.name}
            </p>
          </div>
          <DirectorStatusBadge status={selected.integrityStatus} />
          <span data-testid="director-preview-open">
            Abiertos {selected.problems.status.open}
          </span>
          <span data-testid="director-preview-in-progress">
            En curso {selected.problems.status.inProgress}
          </span>
          <p className="director-direction__preview-hint">
            El detalle KPI de coordinación se construye en la siguiente fase.
            Esta lectura reutiliza el contrato actual de Dirección.
          </p>
        </aside>
      ) : null}
    </div>
  )
}
