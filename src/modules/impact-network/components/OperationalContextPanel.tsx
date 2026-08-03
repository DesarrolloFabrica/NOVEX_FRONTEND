import { memo, useEffect, useRef } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ImpactSituationCommand } from '@/modules/impact-network/components/ImpactSituationCommand'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { Coordination } from '@/modules/impact-network/types/operational-network.types'
import type {
  ImpactIncident,
  ImpactNetworkStatus,
} from '@/modules/impact-network/types/impact-network.types'
import type {
  OperationalEvent,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import type { UpdateSituationStatusInput } from '@/modules/monitoring/utils/situation-lifecycle'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { NovexIcon } from '@/shared/components/NovexIcon'

type PanelLevel = 'institutional' | 'coordination' | 'situation'

interface OperationalContextPanelProps {
  coordination: Coordination | null
  coordinationsCount: number
  synchronizedCoordinationsCount?: number
  incidents: readonly ImpactIncident[]
  globalIncidentCount: number
  globalRiskScore: number
  networkStatus: ImpactNetworkStatus
  lastSynchronizedAt: string
  focusedEvent?: OperationalEvent | null
  focusedSituation?: SituationResponse | null
  originCoordinationId?: CoordinationId | null
  affectedNames?: readonly string[]
  reducedMotion?: boolean
  canUpdateSituation?: boolean
  isUpdatingSituation?: boolean
  isExportingPdf?: boolean
  onSelectSituation: (eventId: string) => void
  onCreateSituation?: () => void
  onUpdateSituationStatus?: (input: UpdateSituationStatusInput) => Promise<void>
  onOpenAnalysis?: () => void
  onDownloadPdf?: () => void
  onOpenSituationDetail?: () => void
}

const RISK_LABEL: Record<RiskLevel, string> = {
  critical: 'Crítica',
  high: 'Alta',
  moderate: 'Media',
  low: 'Baja',
}

const STATUS_LABEL = {
  open: 'Registrada',
  monitoring: 'En atención',
  resolved: 'Resuelta',
  archived: 'Cerrada',
} as const

const NETWORK_STATUS_LABEL: Record<ImpactNetworkStatus, string> = {
  critical: 'Atención crítica',
  attention: 'Bajo observación',
  stable: 'Operación estable',
}

const PANEL_DEPTH: Record<PanelLevel, number> = {
  institutional: 0,
  coordination: 1,
  situation: 2,
}

const PANEL_VARIANTS = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 26,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -24,
  }),
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Sin actividad registrada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || date.getTime() <= 0) {
    return 'Sin actividad registrada'
  }
  return dateFormatter.format(date)
}

function resolveCoordinationLastActivity(
  incidents: readonly ImpactIncident[],
  fallback: string | null,
): string {
  if (incidents.length > 0) {
    const latestMs = incidents.reduce((max, incident) => {
      const reported = Date.parse(incident.reportedAt)
      const updated = Date.parse(incident.lastUpdateAt)
      const candidate = Math.max(
        Number.isNaN(reported) ? 0 : reported,
        Number.isNaN(updated) ? 0 : updated,
      )
      return candidate > max ? candidate : max
    }, 0)

    if (latestMs > 0) {
      return formatDate(new Date(latestMs).toISOString())
    }
  }

  return formatDate(fallback)
}

function averageRisk(incidents: readonly ImpactIncident[]): number {
  if (incidents.length === 0) return 0
  return Math.round(
    incidents.reduce((total, incident) => total + incident.riskScore, 0) /
      incidents.length,
  )
}

function strongestRisk(
  incidents: readonly ImpactIncident[],
): RiskLevel | null {
  return (
    [...incidents].sort(
      (left, right) => right.riskScore - left.riskScore,
    )[0]?.riskLevel ?? null
  )
}

function OperationalContextPanelView({
  coordination,
  coordinationsCount,
  synchronizedCoordinationsCount,
  incidents,
  globalIncidentCount,
  globalRiskScore,
  networkStatus,
  lastSynchronizedAt,
  focusedEvent = null,
  focusedSituation = null,
  originCoordinationId = null,
  affectedNames = [],
  reducedMotion = false,
  canUpdateSituation = false,
  isUpdatingSituation = false,
  isExportingPdf = false,
  onSelectSituation,
  onCreateSituation,
  onUpdateSituationStatus,
  onOpenAnalysis,
  onDownloadPdf,
  onOpenSituationDetail,
}: OperationalContextPanelProps) {
  const panelLevel: PanelLevel = focusedEvent
    ? 'situation'
    : coordination
      ? 'coordination'
      : 'institutional'
  const previousLevelRef = useRef<PanelLevel>(panelLevel)
  const direction =
    PANEL_DEPTH[panelLevel] >= PANEL_DEPTH[previousLevelRef.current] ? 1 : -1
  const coordinationRisk = strongestRisk(incidents)
  const coordinationRiskScore = averageRisk(incidents)
  const coordinationLastActivity = coordination
    ? resolveCoordinationLastActivity(incidents, coordination.lastActivityAt)
    : 'Sin actividad registrada'

  useEffect(() => {
    previousLevelRef.current = panelLevel
  }, [panelLevel])

  let content

  if (focusedEvent && coordination && originCoordinationId) {
    const focusedRisk =
      focusedEvent.interpretation?.riskLevel ?? coordinationRisk ?? 'moderate'
    const focusedScore =
      focusedEvent.interpretation?.riskScore ??
      incidents.find((incident) => incident.eventId === focusedEvent.id)
        ?.riskScore ??
      0

    content = (
      <>
        <motion.header
          layoutId={`impact-situation-${focusedEvent.id}`}
          className="island-focus-dossier__topbar operational-context-panel__dossier-header"
          transition={{
            layout: {
              duration: reducedMotion ? 0.01 : 0.22,
              ease: [0.22, 0.61, 0.36, 1],
            },
          }}
        >
          <div className="island-focus-dossier__topbar-copy">
            <span className="island-focus-dossier__topbar-kicker">
              Situación activa · {coordination.shortName}
            </span>
            <strong>{focusedEvent.title}</strong>
            <span className="island-focus-dossier__topbar-subtitle">
              Mapa de impacto · {affectedNames.length}{' '}
              {affectedNames.length === 1 ? 'conexión' : 'conexiones'} · Riesgo{' '}
              {RISK_LABEL[focusedRisk]} {Math.round(focusedScore)}/100
            </span>
          </div>
        </motion.header>

        <div className="island-focus-dossier__content operational-context-panel__dossier-content">
          {onOpenSituationDetail ? (
            <button
              type="button"
              className="operational-context-panel__detail-cta"
              onClick={onOpenSituationDetail}
            >
              <span
                className="operational-context-panel__detail-cta-icon"
                aria-hidden="true"
              >
                <NovexIcon name="grid" size={17} strokeWidth={1.8} />
              </span>
              <span className="operational-context-panel__detail-cta-copy">
                <strong>Ver detalle de la situación</strong>
                <small>Abrir expediente ejecutivo en la isla origen</small>
              </span>
              <NovexIcon
                name="chevron-right"
                size={17}
                strokeWidth={1.8}
              />
            </button>
          ) : null}

          {focusedSituation &&
          onUpdateSituationStatus &&
          onOpenAnalysis &&
          onDownloadPdf ? (
            <ImpactSituationCommand
              situation={focusedSituation}
              canUpdate={canUpdateSituation}
              isUpdating={isUpdatingSituation}
              isExportingPdf={isExportingPdf}
              onUpdateStatus={onUpdateSituationStatus}
              onOpenAnalysis={onOpenAnalysis}
              onDownloadPdf={onDownloadPdf}
            />
          ) : null}
        </div>
      </>
    )
  } else if (coordination) {
    content = (
      <>
        <header className="operational-context-panel__hero">
          <span>Nivel 02 · Situaciones de la coordinación</span>
          <div>
            <h2>{coordination.name}</h2>
          </div>
          <p>
            Registre una situación o abra un expediente existente sin abandonar
            el mapa operacional.
          </p>
        </header>

        <section className="operational-context-panel__coordination-state">
          <span
            className="operational-context-panel__status-dot"
            aria-hidden="true"
          />
          <div>
            <small>Estado operacional</small>
            <strong>
              {incidents.length > 0 ? 'Bajo seguimiento' : 'Operación estable'}
            </strong>
          </div>
          <span
            className="operational-context-panel__risk-chip"
            data-risk={coordinationRisk ?? 'low'}
          >
            {coordinationRisk ? RISK_LABEL[coordinationRisk] : 'Sin riesgo'}
          </span>
        </section>

        <dl className="operational-context-panel__metrics operational-context-panel__metrics--compact">
          <div>
            <dt>Situaciones</dt>
            <dd>{incidents.length}</dd>
            <small>Activas</small>
          </div>
          <div>
            <dt>Riesgo promedio</dt>
            <dd>{coordinationRiskScore}</dd>
            <small>Escala 0–100</small>
          </div>
          <div>
            <dt>Responsables</dt>
            <dd>{coordination.responsiblePeople.length}</dd>
            <small>{coordination.responsiblePeople.join(' · ')}</small>
          </div>
          <div>
            <dt>Última actividad</dt>
            <dd className="operational-context-panel__date">
              {coordinationLastActivity}
            </dd>
            <small>Actualización operacional</small>
          </div>
        </dl>

        {onCreateSituation ? (
          <div className="operational-context-panel__create">
            <button
              type="button"
              className="operational-context-panel__create-btn"
              onClick={onCreateSituation}
            >
              Crear situación
            </button>
          </div>
        ) : null}

        <section className="operational-context-panel__situations">
          <header>
            <div>
              <span>Situaciones activas</span>
              <h3>Seleccione una situación</h3>
            </div>
            <strong>{incidents.length}</strong>
          </header>

          <div className="operational-context-panel__situation-list">
            {incidents.length > 0 ? (
              incidents.map((incident) => (
                <motion.button
                  type="button"
                  key={incident.eventId}
                  layoutId={`impact-situation-${incident.eventId}`}
                  className="operational-context-panel__situation"
                  data-risk={incident.riskLevel ?? 'moderate'}
                  aria-label={`Abrir expediente IA de ${incident.title}`}
                  onClick={() => onSelectSituation(incident.eventId)}
                  transition={{
                    layout: {
                      duration: reducedMotion ? 0.01 : 0.22,
                      ease: [0.22, 0.61, 0.36, 1],
                    },
                  }}
                >
                  <span
                    className="operational-context-panel__situation-signal"
                    aria-hidden="true"
                  />
                  <span className="operational-context-panel__situation-copy">
                    <strong>{incident.title}</strong>
                    <small>
                      {incident.riskLevel
                        ? RISK_LABEL[incident.riskLevel]
                        : 'Por clasificar'}{' '}
                      · {STATUS_LABEL[incident.status]}
                    </small>
                  </span>
                  <span className="operational-context-panel__situation-score">
                    {Math.round(incident.riskScore)}
                    <small>{formatDate(incident.reportedAt)}</small>
                  </span>
                </motion.button>
              ))
            ) : (
              <div className="operational-context-panel__empty-state">
                <div className="operational-context-panel__empty">
                  <i aria-hidden="true">✓</i>
                  <div className="operational-context-panel__empty-copy">
                    <strong>Sin situaciones activas</strong>
                    <span>
                      {onCreateSituation
                        ? 'Esta coordinación no tiene casos abiertos.'
                        : 'La coordinación opera sin alertas abiertas.'}
                    </span>
                  </div>
                </div>
                {onCreateSituation ? (
                  <button
                    type="button"
                    className="operational-context-panel__empty-action"
                    onClick={onCreateSituation}
                  >
                    <span aria-hidden="true">＋</span>
                    Registrar primera situación
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </>
    )
  } else {
    content = (
      <>
        <header className="operational-context-panel__hero">
          <span>Nivel 01 · Vista institucional</span>
          <div>
            <h2>Coordinaciones activas</h2>
            <strong>{coordinationsCount}</strong>
          </div>
          <p>
            Seleccione una coordinación para explorar su estado operacional.
          </p>
        </header>

        <section className="operational-context-panel__section">
          <span className="operational-context-panel__section-title">
            Estado general
          </span>
          <div
            className="operational-context-panel__status"
            data-status={networkStatus}
          >
            <i aria-hidden="true" />
            <span>
              <strong>{NETWORK_STATUS_LABEL[networkStatus]}</strong>
              <small>Centro de Inteligencia Operacional</small>
            </span>
          </div>
        </section>

        <dl className="operational-context-panel__metrics">
          <div>
            <dt>Coordinaciones</dt>
            <dd>{coordinationsCount}</dd>
            <small>
              {synchronizedCoordinationsCount != null && coordinationsCount > 0
                ? `${Math.round(
                    (synchronizedCoordinationsCount / coordinationsCount) * 100,
                  )}% sincronizadas`
                : 'En monitoreo'}
            </small>
          </div>
          <div>
            <dt>Riesgo global</dt>
            <dd>{globalRiskScore}</dd>
            <small>Escala 0–100</small>
          </div>
          <div>
            <dt>Incidentes activos</dt>
            <dd>{globalIncidentCount}</dd>
            <small>Dirección de Operaciones</small>
          </div>
          <div>
            <dt>Última sincronización</dt>
            <dd className="operational-context-panel__date">
              {formatDate(lastSynchronizedAt)}
            </dd>
            <small>Datos operacionales</small>
          </div>
        </dl>

        <footer className="operational-context-panel__hint">
          <span aria-hidden="true">01</span>
          <p>
            Está en el primer nivel. Cada coordinación se conecta al nodo
            institucional central de la Dirección de Operaciones.
          </p>
        </footer>
      </>
    )
  }

  return (
    <aside
      className="operational-context-panel operational-context-panel--smart"
      data-level={panelLevel}
      aria-label={
        focusedEvent
          ? `Mapa de impacto de ${focusedEvent.title}`
          : coordination
            ? `Estado de ${coordination.name}`
            : 'Resumen de la Dirección de Operaciones'
      }
    >
      <LayoutGroup id="operational-context-panel">
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div
            key={`${panelLevel}:${coordination?.id ?? 'all'}:${focusedEvent?.id ?? 'none'}`}
            className="operational-context-panel__view"
            custom={direction}
            variants={PANEL_VARIANTS}
            initial={reducedMotion ? false : 'enter'}
            animate="center"
            exit={reducedMotion ? undefined : 'exit'}
            transition={{
              duration: reducedMotion ? 0.01 : 0.27,
              ease: [0.22, 0.61, 0.36, 1],
            }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </LayoutGroup>
    </aside>
  )
}

export const OperationalContextPanel = memo(OperationalContextPanelView)
