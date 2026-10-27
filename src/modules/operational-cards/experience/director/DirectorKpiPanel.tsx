import type { ReactNode } from 'react'
import { DirectorStatusDistribution } from '@/modules/operational-cards/experience/director/DirectorCoordinationTable'
import type { DirectorKpiLoadStatus } from '@/modules/operational-cards/hooks/useDirectorKpi'
import type {
  OperationalKpiCoordinationSnapshot,
  OperationalKpiDirectionSnapshot,
  OperationalKpiSeverityCounts,
  OperationalKpiStatusCounts,
} from '@/modules/operational-cards/types/operational-kpi.types'
import '@/styles/director-kpi-panel.css'

const SEVERITY_ORDER: ReadonlyArray<{
  key: keyof OperationalKpiSeverityCounts
  short: string
  label: string
}> = [
  { key: 'low', short: 'L', label: 'LOW' },
  { key: 'medium', short: 'M', label: 'MEDIUM' },
  { key: 'high', short: 'H', label: 'HIGH' },
  { key: 'critical', short: 'C', label: 'CRITICAL' },
]

function SeveritySegment({
  severity,
}: {
  severity: OperationalKpiSeverityCounts
}) {
  const total =
    severity.low + severity.medium + severity.high + severity.critical
  return (
    <div className="director-kpi-severity" data-testid="director-kpi-severity">
      <p className="director-block__title">Severidad</p>
      <div className="director-kpi-severity__legend">
        {SEVERITY_ORDER.map(({ key, short }) => (
          <span key={key} data-severity={key}>
            {short} {severity[key]}
          </span>
        ))}
      </div>
      <div className="director-kpi-severity__rail" aria-hidden="true">
        <span className="director-kpi-severity__cap director-kpi-severity__cap--start" />
        <div className="director-kpi-severity__segment">
          {SEVERITY_ORDER.map(({ key }) =>
            severity[key] > 0 ? (
              <span
                key={key}
                className="director-kpi-severity__seg"
                data-severity={key}
                style={{ flexGrow: severity[key], flexBasis: 0 }}
              />
            ) : null,
          )}
          {total === 0 ? (
            <span className="director-kpi-severity__seg director-kpi-severity__seg--empty" />
          ) : null}
        </div>
        <span className="director-kpi-severity__cap director-kpi-severity__cap--end" />
      </div>
      <span className="visually-hidden">
        Severidad: baja {severity.low}, media {severity.medium}, alta{' '}
        {severity.high}, crítica {severity.critical}. Total {total}.
      </span>
    </div>
  )
}

function CycleStrip({ status }: { status: OperationalKpiStatusCounts }) {
  const total = status.open + status.inProgress || 1
  return (
    <div className="director-kpi-mini" data-testid="director-kpi-status-split">
      <p className="director-block__title">Ciclo</p>
      <div className="director-kpi-mini__facts">
        <p className="director-kpi-mini__fact">
          <span className="director-kpi-mini__mark" data-kind="open" aria-hidden="true">
            ○
          </span>
          <em>Abierto</em>
          <strong>{status.open}</strong>
        </p>
        <p className="director-kpi-mini__fact">
          <span className="director-kpi-mini__mark" data-kind="progress" aria-hidden="true">
            ◉
          </span>
          <em>En atención</em>
          <strong>{status.inProgress}</strong>
        </p>
      </div>
      <span className="visually-hidden">
        {status.open} abiertos de {total}
      </span>
    </div>
  )
}

function RelationsMini({
  incoming,
  outgoing,
  testId,
}: {
  incoming: number
  outgoing: number
  testId: string
}) {
  return (
    <div className="director-kpi-mini" data-testid={testId}>
      <p className="director-block__title">Relaciones</p>
      <div className="director-kpi-mini__facts">
        <p className="director-kpi-mini__fact">
          <span className="director-kpi-mini__mark" data-kind="dep" aria-hidden="true">
            ↓
          </span>
          <em>Depende de</em>
          <strong>{incoming}</strong>
        </p>
        <p className="director-kpi-mini__fact">
          <span className="director-kpi-mini__mark" data-kind="out" aria-hidden="true">
            ↑
          </span>
          <em>Compromisos</em>
          <strong>{outgoing}</strong>
        </p>
      </div>
    </div>
  )
}

function Block({
  title,
  children,
  testId,
}: {
  title: string
  children: ReactNode
  testId?: string
}) {
  return (
    <section className="director-block" data-testid={testId}>
      <p className="director-block__title">{title}</p>
      {children}
    </section>
  )
}

/**
 * Snapshot del presente. En section="ahora" no repite activos/críticos.
 */
export function DirectorKpiPanel({
  selected,
  directionStatus,
  direction,
  directionError,
  onRetryDirection,
  coordinationStatus,
  coordination,
  coordinationError,
  section = 'standalone',
}: {
  selected: boolean
  directionStatus: DirectorKpiLoadStatus
  direction: OperationalKpiDirectionSnapshot | null
  directionError: string | null
  onRetryDirection: () => void
  coordinationStatus: DirectorKpiLoadStatus
  coordination: OperationalKpiCoordinationSnapshot | null
  coordinationError: string | null
  section?: 'standalone' | 'ahora'
}) {
  const loading = selected
    ? coordinationStatus === 'loading'
    : directionStatus === 'loading'
  const error = selected ? coordinationError : directionError
  const failed = selected
    ? coordinationStatus === 'error'
    : directionStatus === 'error'
  const compactNow = section === 'ahora'

  return (
    <div
      className="director-kpi-panel director-kpi-panel--actual"
      data-testid="director-kpi-panel"
      data-scope={selected ? 'coordination' : 'direction'}
      data-section={section}
      aria-busy={loading}
    >
      {failed ? (
        <p className="director-kpi-panel__error" role="alert">
          No se pudo leer el KPI.
          {error ? ` ${error}` : ''}
          {!selected ? (
            <button type="button" onClick={onRetryDirection}>
              Reintentar
            </button>
          ) : null}
        </p>
      ) : null}

      {!selected && direction ? (
        <>
          {!compactNow ? (
            <Block title="Problemas" testId="director-kpi-active">
              <p className="director-block__lead">
                <strong>{direction.problems.activeCount}</strong> activos
              </p>
            </Block>
          ) : null}
          <Block title="Coordinaciones" testId="director-kpi-critical-coordinations">
            <p className="director-block__lead">
              <strong>{direction.coordinationStatusTotals.critical}</strong>{' '}
              en estado crítico
            </p>
            <DirectorStatusDistribution
              totals={direction.coordinationStatusTotals}
            />
          </Block>
          <div className="director-kpi-split">
            <CycleStrip status={direction.problems.status} />
            <RelationsMini
              incoming={direction.dependencies.incoming}
              outgoing={direction.dependencies.outgoing}
              testId="director-kpi-incoming"
            />
          </div>
        </>
      ) : null}

      {selected && coordination ? (
        <>
          {!compactNow ? (
            <Block title="Problemas" testId="director-kpi-problems">
              <p
                className="director-block__lead"
                data-testid="director-kpi-active"
              >
                <strong>{coordination.problems.activeCount}</strong> activos
              </p>
            </Block>
          ) : null}

          <SeveritySegment severity={coordination.problems.severity} />

          <div className="director-kpi-split">
            <CycleStrip status={coordination.problems.status} />
            <RelationsMini
              incoming={coordination.dependencies.incoming}
              outgoing={coordination.dependencies.outgoing}
              testId="director-kpi-io"
            />
          </div>
        </>
      ) : null}

      {loading ? (
        <p className="director-kpi-panel__hint">Leyendo indicadores…</p>
      ) : null}
    </div>
  )
}
