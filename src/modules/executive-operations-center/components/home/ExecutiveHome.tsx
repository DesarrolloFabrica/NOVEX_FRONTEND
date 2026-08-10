import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConnectedSituationDetailModal } from '@/modules/operational-events/components/ConnectedSituationDetailModal'
import { useExecutiveOperations } from '@/modules/executive-operations-center/hooks/useExecutiveOperations'
import {
  DataState,
  EocSectionHelp,
  SeverityPill,
  StatusPill,
} from '@/modules/executive-operations-center/components/shared/OperationalCenterUI'
import {
  eventTypeLabel,
  formatConfidence,
  formatDateTime,
  formatRelativeTime,
  situationAge,
} from '@/modules/executive-operations-center/utils/operational-center.presentation'
import { NovexIcon } from '@/shared/components/NovexIcon'

const SEVERITY_WEIGHT = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
} as const

export function ExecutiveHome() {
  const { data, status, error, reload } = useExecutiveOperations()
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(
    null,
  )

  const priorities = useMemo(
    () =>
      (data?.situations ?? [])
        .filter((item) => item.status === 'OPEN' || item.status === 'IN_PROGRESS')
        .sort(
          (left, right) =>
            SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity] ||
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        ),
    [data],
  )

  const activeCoordinations = useMemo(
    () =>
      (data?.coordinations ?? [])
        .filter(
          (item) =>
            item.activeSituations > 0 || item.affectedBySituations > 0,
        )
        .sort(
          (left, right) =>
            right.criticalSituations - left.criticalSituations ||
            right.activeSituations - left.activeSituations ||
            right.affectedBySituations - left.affectedBySituations,
        ),
    [data],
  )

  if (status !== 'ready' || !data) {
    return (
      <div className="eoc-view eoc-home-v4">
        <div className="eoc-home-toolbar">
          <p>Consolidando el estado de la operación…</p>
        </div>
        <DataState
          status={status === 'ready' ? 'loading' : status}
          error={error}
          onRetry={() => void reload()}
        />
      </div>
    )
  }

  const { metrics } = data
  const visiblePriorities = priorities.slice(0, 3)
  const visibleEvents = data.auditEvents.slice(0, 5)
  const visibleCoordinations = activeCoordinations.slice(0, 5)
  const inactiveCoordinationCount =
    data.coordinations.length - activeCoordinations.length
  const coordinationSummary = [
    activeCoordinations.length > visibleCoordinations.length
      ? `Mostrando ${visibleCoordinations.length} de ${activeCoordinations.length} áreas con actividad`
      : null,
    inactiveCoordinationCount > 0
      ? `${inactiveCoordinationCount} ${inactiveCoordinationCount === 1 ? 'coordinación' : 'coordinaciones'} sin carga activa`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const critical = metrics.criticalOpenSituations > 0
  const headline = critical
    ? `${metrics.criticalOpenSituations} ${metrics.criticalOpenSituations === 1 ? 'situación prioritaria requiere' : 'situaciones prioritarias requieren'} decisión`
    : metrics.openSituations + metrics.inProgressSituations > 0
      ? 'La operación está activa y bajo seguimiento'
      : 'Sin situaciones abiertas en este momento'
  const brief = `NOVEX conserva ${metrics.totalSituations} ${metrics.totalSituations === 1 ? 'situación' : 'situaciones'} en su historial: ${metrics.openSituations} abiertas, ${metrics.inProgressSituations} en gestión y ${metrics.resolvedSituations + metrics.closedSituations} finalizadas. ${metrics.situationsWithAnalysis} con lectura IA y ${metrics.pendingRecommendations} acciones pendientes.`

  return (
    <div className="eoc-view eoc-home-v4">
      <div className="eoc-home-toolbar">
        <p>Resumen ejecutivo de lo activo, la prioridad y la trazabilidad.</p>
        <div className="eoc-home-toolbar__actions">
          <span className="eoc-live-stamp">
            <i /> Actualizado {formatDateTime(data.generatedAt)}
          </span>
          <button
            type="button"
            className="eoc-icon-button"
            onClick={() => void reload()}
            aria-label="Actualizar información"
            title="Actualizar información"
          >
            <NovexIcon name="activity" size={15} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {data.partialFailures > 0 ? (
        <div className="eoc-data-warning" role="status">
          <NovexIcon name="alert" />
          <span>
            La lectura principal está disponible, pero {data.partialFailures}{' '}
            fuentes de detalle no respondieron. Los campos afectados aparecen sin
            información.
          </span>
        </div>
      ) : null}

      <section
        className="eoc-home-command"
        data-tone={critical ? 'critical' : 'stable'}
        aria-labelledby="home-status-title"
      >
        <div className="eoc-home-command__summary">
          <span className="eoc-home-kicker">
            Estado operativo
            <EocSectionHelp label="Qué significa Estado operativo">
              Lectura consolidada del momento actual: resume la carga activa, la
              prioridad ejecutiva y el nivel de cobertura con inteligencia
              asistida en toda la operación.
            </EocSectionHelp>
          </span>
          <h2 id="home-status-title">{headline}</h2>
          <p>{brief}</p>
        </div>
      </section>

      <dl className="eoc-home-kpis" aria-label="Indicadores esenciales">
        <div data-tone="attention">
          <dt>
            En seguimiento
            <EocSectionHelp label="Qué significa En seguimiento">
              Situaciones abiertas o en gestión que aún no se han cerrado. Mide
              la carga activa que requiere seguimiento operativo.
            </EocSectionHelp>
          </dt>
          <dd>{metrics.openSituations + metrics.inProgressSituations}</dd>
          <small>
            {metrics.openSituations} abiertas · {metrics.inProgressSituations} en
            gestión
          </small>
        </div>
        <div data-tone={metrics.criticalOpenSituations > 0 ? 'critical' : 'stable'}>
          <dt>
            Alta o crítica
            <EocSectionHelp label="Qué significa Alta o crítica">
              Situaciones con severidad alta o crítica que permanecen abiertas.
              Señalan dónde conviene priorizar la decisión ejecutiva.
            </EocSectionHelp>
          </dt>
          <dd>{metrics.criticalOpenSituations}</dd>
          <small>Requieren prioridad inmediata</small>
        </div>
        <div data-tone={metrics.analysisCoverage >= 80 ? 'stable' : 'attention'}>
          <dt>
            Cobertura IA
            <EocSectionHelp label="Qué significa Cobertura IA">
              Porcentaje de situaciones con lectura o análisis generado por
              inteligencia artificial. Indica qué tan documentada está la
              operación.
            </EocSectionHelp>
          </dt>
          <dd>{metrics.analysisCoverage}%</dd>
          <small>
            {metrics.situationsWithAnalysis} de {metrics.totalSituations}{' '}
            situaciones
          </small>
        </div>
        <div
          data-tone={
            metrics.pendingRecommendations > 0 ? 'attention' : 'stable'
          }
        >
          <dt>
            Acciones pendientes
            <EocSectionHelp label="Qué significan Acciones pendientes" align="end">
              Recomendaciones sugeridas por la IA que aún no se han marcado
              como completadas en los expedientes de situación.
            </EocSectionHelp>
          </dt>
          <dd>{metrics.pendingRecommendations}</dd>
          <small>
            {metrics.completedRecommendations} recomendaciones completadas
          </small>
        </div>
      </dl>

      <section className="eoc-home-priority" aria-labelledby="home-priority-title">
        <header className="eoc-home-section-heading">
          <div>
            <h3 id="home-priority-title">
              Prioridades
              <EocSectionHelp label="Qué muestra Prioridades">
                Las situaciones más severas y antiguas que siguen abiertas o en
                gestión. Sirve para decidir por dónde empezar la revisión
                ejecutiva.
              </EocSectionHelp>
            </h3>
            <p>Situaciones más severas y antiguas que aún requieren gestión.</p>
          </div>
          <Link to="/centro-operacional/panorama" className="eoc-section-link">
            Ver panorama <NovexIcon name="chevron-right" size={14} />
          </Link>
        </header>

        {visiblePriorities.length > 0 ? (
          <ol className="eoc-home-priority-list">
            {visiblePriorities.map((item, index) => (
              <li key={item.id}>
                <span className="eoc-home-priority-list__rank">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="eoc-home-priority-list__main">
                  <div className="eoc-home-priority-list__meta">
                    <strong>{item.coordinationName}</strong>
                    <SeverityPill severity={item.severity} />
                    <StatusPill status={item.status} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSituationId(item.id)}
                  >
                    {item.title}
                  </button>
                  <small>
                    {item.code} · {item.createdByUserName} ·{' '}
                    {situationAge(item.createdAt)} en plataforma
                  </small>
                </div>
                <div className="eoc-home-priority-list__coverage">
                  <span>Lectura IA</span>
                  <strong>{formatConfidence(item.ai.confidence)}</strong>
                  <small>{item.recommendationsPending} acciones pendientes</small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="eoc-inline-empty">
            <NovexIcon name="check" />
            No hay situaciones abiertas o en gestión.
          </div>
        )}
        {priorities.length > visiblePriorities.length ? (
          <footer className="eoc-home-list-note">
            Mostrando {visiblePriorities.length} de {priorities.length} en
            seguimiento.
            <Link to="/centro-operacional/panorama">Consultar todas</Link>
          </footer>
        ) : null}
      </section>

      <div className="eoc-home-streams">
        <section className="eoc-home-stream" aria-labelledby="home-activity-title">
          <header className="eoc-home-section-heading eoc-home-section-heading--compact">
            <div>
              <h3 id="home-activity-title">
                Actividad reciente
                <EocSectionHelp label="Qué muestra Actividad reciente">
                  Últimos movimientos registrados en la plataforma: cambios de
                  estado, notas y eventos generados por personas o por la IA.
                </EocSectionHelp>
              </h3>
              <p>Últimos movimientos de personas y de la IA.</p>
            </div>
            <Link to="/centro-operacional/reportes" className="eoc-section-link">
              Ver auditoría
            </Link>
          </header>
          {visibleEvents.length > 0 ? (
            <ul className="eoc-home-activity-list">
              {visibleEvents.map((event) => (
                <li key={event.id} data-ai={event.isAiEvent || undefined}>
                  <span className="eoc-home-activity-list__icon">
                    <NovexIcon
                      name={event.isAiEvent ? 'sparkles' : 'activity'}
                      size={15}
                    />
                  </span>
                  <div>
                    <span>
                      {event.isAiEvent ? 'IA' : event.userName || 'Sistema'} ·{' '}
                      {formatRelativeTime(event.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSituationId(event.situationId)}
                    >
                      {event.title || eventTypeLabel(event.eventType)}
                    </button>
                    <small>
                      {event.situationCode} · {event.coordinationName}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="eoc-inline-empty">
              No hay movimientos en la línea de tiempo.
            </div>
          )}
          {data.auditEvents.length > visibleEvents.length ? (
            <div className="eoc-home-list-note">
              {data.auditEvents.length - visibleEvents.length} movimientos
              adicionales en Auditoría.
            </div>
          ) : null}
        </section>

        <section
          className="eoc-home-stream"
          aria-labelledby="home-coordination-title"
        >
          <header className="eoc-home-section-heading eoc-home-section-heading--compact">
            <div>
              <h3 id="home-coordination-title">
                Carga por área
                <EocSectionHelp label="Qué muestra Carga por área" align="end">
                  Coordinaciones con situaciones activas o impactos declarados.
                  Muestra dónde se concentra la presión operativa institucional.
                </EocSectionHelp>
              </h3>
              <p>Solo coordinaciones con situaciones o impactos activos.</p>
            </div>
            <Link to="/centro-operacional/panorama" className="eoc-section-link">
              Ver todas
            </Link>
          </header>
          {visibleCoordinations.length > 0 ? (
            <div className="eoc-home-coordination-list">
              {visibleCoordinations.map((coordination) => (
                <div key={coordination.id} data-health={coordination.health}>
                  <span className="eoc-home-coordination-list__beacon" />
                  <div>
                    <strong>{coordination.name}</strong>
                    <small>
                      {coordination.totalSituations} registradas ·{' '}
                      {coordination.affectedBySituations} impactos
                    </small>
                  </div>
                  <dl>
                    <div>
                      <dt>Activas</dt>
                      <dd>{coordination.activeSituations}</dd>
                    </div>
                    <div>
                      <dt>Críticas</dt>
                      <dd>{coordination.criticalSituations}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <div className="eoc-inline-empty">
              <NovexIcon name="check" /> No hay carga activa por coordinación.
            </div>
          )}
          {coordinationSummary ? (
            <div className="eoc-home-list-note">{coordinationSummary}.</div>
          ) : null}
        </section>
      </div>

      <section
        className="eoc-home-integrity"
        aria-labelledby="home-integrity-title"
      >
        <header className="eoc-home-section-heading eoc-home-section-heading--compact">
          <div>
            <h3 id="home-integrity-title">
              Integridad del registro
              <EocSectionHelp label="Qué muestra Integridad del registro">
                Indicadores de trazabilidad: análisis IA, eventos de auditoría,
                notas de captura y áreas afectadas. Confirma la evidencia
                disponible para reconstruir hechos.
              </EocSectionHelp>
            </h3>
            <p>Base disponible para explicar decisiones y reconstruir hechos.</p>
          </div>
        </header>
        <ul className="eoc-home-integrity__metrics">
          <li>
            <span>
              <NovexIcon name="sparkles" /> Análisis IA
            </span>
            <strong>
              {metrics.situationsWithAnalysis}/{metrics.totalSituations}
            </strong>
            <small>{metrics.analysisCoverage}% de cobertura</small>
          </li>
          <li>
            <span>
              <NovexIcon name="activity" /> Eventos de auditoría
            </span>
            <strong>{metrics.auditEventCount}</strong>
            <small>Movimientos trazables</small>
          </li>
          <li>
            <span>
              <NovexIcon name="file" /> Notas de captura
            </span>
            <strong>{metrics.evidenceCount}</strong>
            <small>Notas del formulario de captura</small>
          </li>
          <li>
            <span>
              <NovexIcon name="users" /> Áreas afectadas
            </span>
            <strong>{metrics.affectedCoordinations}</strong>
            <small>Impacto declarado por IA</small>
          </li>
        </ul>
      </section>

      {selectedSituationId ? (
        <ConnectedSituationDetailModal
          situationId={selectedSituationId}
          title={
            data.situations.find((item) => item.id === selectedSituationId)
              ?.title
          }
          onClose={() => setSelectedSituationId(null)}
        />
      ) : null}
    </div>
  )
}
