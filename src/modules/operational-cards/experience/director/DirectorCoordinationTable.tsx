import { CharacterLives } from '@/modules/operational-cards/components/CharacterLives'
import { DirectorStatusBadge } from '@/modules/operational-cards/experience/director/DirectorStatusBadge'
import {
  columnMax,
  heatRatio,
  sortDirectionCoordinations,
  type DirectionTableSortDir,
  type DirectionTableSortKey,
} from '@/modules/operational-cards/experience/director/director-direction.sort'
import { getCoordinationIconAsset } from '@/modules/impact-network/data/coordination-icons.config'
import { resolveIslandColor } from '@/modules/impact-network/data/coordination-islands.config'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { OperationalKpiCoordinationSnapshot } from '@/modules/operational-cards/types/operational-kpi.types'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import type { CSSProperties } from 'react'

const VOLUME_RGB = '42 33 24'
const CRITICAL_RGB = '154 42 38'

function heatStyle(
  value: number,
  max: number,
  kind: 'volume' | 'critical',
): CSSProperties {
  const ratio = heatRatio(value, max)
  const ceiling = kind === 'critical' ? 0.52 : 0.3
  const floor = kind === 'critical' ? 0.1 : 0.05
  const alpha = ratio === 0 ? 0 : floor + ratio * (ceiling - floor)
  return {
    '--heat-rgb': kind === 'critical' ? CRITICAL_RGB : VOLUME_RGB,
    '--heat-alpha': String(alpha),
  } as CSSProperties
}

function SortHeader({
  label,
  column,
  active,
  dir,
  onSort,
}: {
  label: string
  column: DirectionTableSortKey
  active: boolean
  dir: DirectionTableSortDir
  onSort: (key: DirectionTableSortKey) => void
}) {
  const suffix = active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''
  return (
    <th>
      <button
        type="button"
        className="director-table__sort"
        data-testid={`director-sort-${column}`}
        aria-pressed={active}
        onClick={() => onSort(column)}
      >
        {label}
        {suffix}
      </button>
    </th>
  )
}

export function DirectorCoordinationTable({
  rows,
  sortKey,
  sortDir,
  selectedCode,
  onSort,
  onSelect,
}: {
  rows: readonly OperationalKpiCoordinationSnapshot[]
  sortKey: DirectionTableSortKey
  sortDir: DirectionTableSortDir
  selectedCode: string | null
  onSort: (key: DirectionTableSortKey) => void
  onSelect: (code: string) => void
}) {
  const ordered = sortDirectionCoordinations(rows, sortKey, sortDir)
  const maxActive = columnMax(ordered, (row) => row.problems.activeCount)
  const maxCritical = columnMax(ordered, (row) => row.problems.severity.critical)
  const maxIncoming = columnMax(ordered, (row) => row.dependencies.incoming)
  const maxOutgoing = columnMax(ordered, (row) => row.dependencies.outgoing)

  return (
    <div className="director-table-wrap">
      <table className="director-table" data-testid="director-coordination-table">
        <thead>
          <tr>
            <th>Coordinación</th>
            <th>Estado</th>
            <SortHeader
              label="Vidas"
              column="lives"
              active={sortKey === 'lives'}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Activos"
              column="active"
              active={sortKey === 'active'}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Críticos"
              column="critical"
              active={sortKey === 'critical'}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Incoming"
              column="incoming"
              active={sortKey === 'incoming'}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Outgoing"
              column="outgoing"
              active={sortKey === 'outgoing'}
              dir={sortDir}
              onSort={onSort}
            />
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => {
            const code = row.coordination.code
            const accent = resolveIslandColor(code, '#7a6a52')
            const selected = selectedCode === code
            return (
              <tr
                key={row.coordination.id}
                data-testid={`director-row-${code}`}
                data-code={code}
                data-status={row.integrityStatus}
                aria-selected={selected}
                tabIndex={0}
                style={{ '--coord-accent': accent } as CSSProperties}
                onClick={() => onSelect(code)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(code)
                  }
                }}
              >
                <td>
                  <div className="director-table__who">
                    <span className="director-table__mark" aria-hidden="true" />
                    <img
                      className="director-table__icon"
                      src={getCoordinationIconAsset(code)}
                      alt=""
                    />
                    <span className="director-table__name">
                      {row.coordination.shortName}
                    </span>
                  </div>
                </td>
                <td>
                  <DirectorStatusBadge
                    status={row.integrityStatus}
                    testId={`director-row-status-${code}`}
                  />
                </td>
                <td data-testid={`director-lives-${code}`}>
                  <CharacterLives
                    lifePoints={row.lifePoints}
                    size="sm"
                    ownerKey={code}
                  />
                </td>
                <td
                  className="director-table__num director-heat"
                  data-testid={`director-active-${code}`}
                  style={heatStyle(row.problems.activeCount, maxActive, 'volume')}
                >
                  {row.problems.activeCount}
                </td>
                <td
                  className="director-table__num director-table__num--critical director-heat"
                  data-testid={`director-critical-${code}`}
                  style={heatStyle(
                    row.problems.severity.critical,
                    maxCritical,
                    'critical',
                  )}
                >
                  {row.problems.severity.critical}
                </td>
                <td
                  className="director-table__num director-heat"
                  data-testid={`director-incoming-${code}`}
                  style={heatStyle(
                    row.dependencies.incoming,
                    maxIncoming,
                    'volume',
                  )}
                >
                  {row.dependencies.incoming}
                </td>
                <td
                  className="director-table__num director-heat"
                  data-testid={`director-outgoing-${code}`}
                  style={heatStyle(
                    row.dependencies.outgoing,
                    maxOutgoing,
                    'volume',
                  )}
                >
                  {row.dependencies.outgoing}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const DISTRIBUTION: ReadonlyArray<{
  key: 'stable' | 'alert' | 'critical' | 'unknown'
  status: OperationalIntegrityStatus
}> = [
  { key: 'stable', status: 'ESTABLE' },
  { key: 'alert', status: 'ALERTA' },
  { key: 'critical', status: 'CRITICO' },
  { key: 'unknown', status: 'DESCONOCIDO' },
]

export function DirectorStatusDistribution({
  totals,
}: {
  totals: {
    stable: number
    alert: number
    critical: number
    unknown: number
  }
}) {
  const sum =
    totals.stable + totals.alert + totals.critical + totals.unknown || 1
  return (
    <div
      className="director-distribution"
      data-testid="director-status-distribution"
    >
      {DISTRIBUTION.map(({ key, status }) => {
        const value = totals[key]
        return (
          <div
            key={key}
            className="director-distribution__row"
            data-testid={`director-total-${key}`}
          >
            <span>{OPERATIONAL_STATUS_LABEL[status]}</span>
            <div className="director-distribution__track">
              <div
                className="director-distribution__fill"
                data-status={status}
                style={{ width: `${(value / sum) * 100}%` }}
              />
            </div>
            <span>{value}</span>
          </div>
        )
      })}
    </div>
  )
}
