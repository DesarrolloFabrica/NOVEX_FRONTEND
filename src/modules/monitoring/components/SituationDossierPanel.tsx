import { useEffect, useState } from 'react'
import type { SituationDossier } from '@/modules/api/types/situation-management.types'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import {
  formatManagementDate,
  RECOMMENDATION_PRIORITY_LABEL,
  RECOMMENDATION_STATUS_LABEL,
  SITUATION_SEVERITY_LABEL,
  SITUATION_STATUS_LABEL,
  TIMELINE_EVENT_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'

interface SituationDossierPanelProps {
  dossier: SituationDossier | null
  loading: boolean
  error: string | null
  canUpdate: boolean
  isUpdating: boolean
  onUpdateSituationStatus: (status: SituationResponse['status']) => Promise<void>
  onUpdateRecommendationStatus: (
    recommendationId: string,
    status: string,
  ) => Promise<void>
}

const situationStatuses: Array<[SituationResponse['status'], string]> = [
  ['OPEN', 'Abierta'],
  ['IN_PROGRESS', 'En progreso'],
  ['RESOLVED', 'Resuelta'],
  ['CLOSED', 'Cerrada'],
]

const recommendationStatuses = [
  ['PENDING', 'Pendiente'],
  ['IN_PROGRESS', 'En progreso'],
  ['COMPLETED', 'Completada'],
  ['DISMISSED', 'Descartada'],
] as const

function resolveRiskLabel(dossier: SituationDossier): string {
  const severity =
    dossier.analysis?.analysis.incidentClassification.operationalSeverity ??
    dossier.situation.severity
  return SITUATION_SEVERITY_LABEL[severity] ?? severity
}

export function SituationDossierPanel({
  dossier,
  loading,
  error,
  canUpdate,
  isUpdating,
  onUpdateSituationStatus,
  onUpdateRecommendationStatus,
}: SituationDossierPanelProps) {
  const [draftStatus, setDraftStatus] = useState<SituationResponse['status'] | null>(
    null,
  )
  const [message, setMessage] = useState('')

  useEffect(() => {
    setDraftStatus(null)
    setMessage('')
  }, [dossier?.situation.id])

  if (loading) {
    return (
      <section className="cunmark-action-detail cunmark-action-detail--empty">
        <strong>Cargando expediente…</strong>
        <p>Obteniendo análisis, recomendaciones e historial.</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="cunmark-action-detail cunmark-action-detail--empty" role="alert">
        <strong>No fue posible cargar el expediente</strong>
        <p>{error}</p>
      </section>
    )
  }

  if (!dossier) {
    return (
      <section className="cunmark-action-detail cunmark-action-detail--empty">
        <strong>Ninguna situación seleccionada</strong>
        <p>Selecciona una situación para revisar su expediente operativo.</p>
      </section>
    )
  }

  const { situation } = dossier
  const status = draftStatus ?? situation.status
  const hasAnalysis = Boolean(dossier.analysis)
  const timeline = [...dossier.timeline].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )

  const saveStatus = async () => {
    if (status === situation.status) return
    try {
      await onUpdateSituationStatus(status)
      setDraftStatus(null)
      setMessage('Estado actualizado correctamente.')
    } catch {
      setMessage('No se pudo guardar la actualización.')
    }
  }

  return (
    <article
      className="cunmark-action-detail"
      data-status={situation.status.toLowerCase()}
      data-priority={situation.severity.toLowerCase()}
    >
      <header className="cunmark-action-detail__header">
        <div className="cunmark-action-detail__heading">
          <p>Expediente operativo</p>
          <h2>{situation.title}</h2>
        </div>
        <div className="cunmark-action-detail__signals">
          <span className="cunmark-action-detail__priority">
            <i />
            {SITUATION_SEVERITY_LABEL[situation.severity] ?? situation.severity}
          </span>
          <span className="cunmark-action-detail__state">
            <i />
            {SITUATION_STATUS_LABEL[situation.status] ?? situation.status}
          </span>
        </div>
      </header>

      <section className="cunmark-situation-block cunmark-general-strip">
        <h3>Información general</h3>
        <dl className="cunmark-action-detail__facts">
          <div>
            <dt>Estado</dt>
            <dd>{SITUATION_STATUS_LABEL[situation.status] ?? situation.status}</dd>
          </div>
          <div>
            <dt>Riesgo</dt>
            <dd>{resolveRiskLabel(dossier)}</dd>
          </div>
          <div>
            <dt>Coordinación</dt>
            <dd>
              {situation.coordinationCode} · {situation.coordinationName}
            </dd>
          </div>
          <div>
            <dt>Responsable</dt>
            <dd>{situation.createdByUserName}</dd>
          </div>
          <div>
            <dt>Categoría</dt>
            <dd>{situation.categoryName}</dd>
          </div>
          <div>
            <dt>Severidad</dt>
            <dd>
              {SITUATION_SEVERITY_LABEL[situation.severity] ?? situation.severity}
            </dd>
          </div>
          <div>
            <dt>Fecha del evento</dt>
            <dd>{formatManagementDate(situation.occurredAt)}</dd>
          </div>
          <div>
            <dt>Fecha de registro</dt>
            <dd>{formatManagementDate(situation.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <div className="cunmark-situation-lifecycle" aria-label="Línea de vida de la situación">
        <span className="is-complete">
          <i />
          Registrada
        </span>
        <b />
        <span className={hasAnalysis ? 'is-complete' : 'is-current'}>
          <i />
          Analizada IA
        </span>
        <b />
        <span
          className={
            situation.status === 'IN_PROGRESS' || situation.status === 'OPEN'
              ? 'is-current'
              : 'is-complete'
          }
        >
          <i />
          En gestión
        </span>
        <b />
        <span
          className={
            situation.status === 'RESOLVED' || situation.status === 'CLOSED'
              ? 'is-current'
              : ''
          }
        >
          <i />
          Resuelta
        </span>
      </div>

      <section className="cunmark-situation-block cunmark-action-detail__context">
        <h3>Contexto de la situación</h3>
        <div className="cunmark-situation-context">
          <div>
            <strong>Descripción</strong>
            <p>{situation.description}</p>
          </div>
          {dossier.analysis ? (
            <div>
              <strong>Resumen ejecutivo</strong>
              <p>{dossier.analysis.analysis.executiveSummary.summary}</p>
            </div>
          ) : null}
          {dossier.impact ? (
            <div>
              <strong>Impacto operacional</strong>
              <p>{dossier.impact.summary}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="cunmark-action-update">
        <header>
          <p>Gestión del estado</p>
          <span>Actualiza el estado operativo de la situación.</span>
        </header>
        <div
          className="cunmark-action-update__selector"
          role="radiogroup"
          aria-label="Estado actual"
        >
          {situationStatuses.map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={!canUpdate || isUpdating}
              aria-pressed={status === value}
              data-status={value.toLowerCase()}
              onClick={() => {
                setDraftStatus(value)
                setMessage('')
              }}
            >
              <i />
              {label}
            </button>
          ))}
        </div>
        <div className="cunmark-action-update__confirm">
          <button
            type="button"
            disabled={!canUpdate || isUpdating || status === situation.status}
            onClick={() => void saveStatus()}
          >
            {isUpdating ? 'Guardando…' : 'Guardar actualización'}
          </button>
          {message ? <span role="status">{message}</span> : null}
        </div>
      </section>

      <section className="cunmark-situation-block cunmark-recommendations-block">
        <h3>Recomendaciones</h3>
        {dossier.recommendations.length === 0 ? (
          <p className="cunmark-empty-signal">Sin recomendaciones registradas.</p>
        ) : (
          <ul className="cunmark-recommendations-list">
            {dossier.recommendations.map((recommendation) => (
              <li key={recommendation.id} className="cunmark-recommendation-item">
                <div className="cunmark-recommendation-item__head">
                  <strong>{recommendation.title}</strong>
                  <span data-priority={recommendation.priority}>
                    {RECOMMENDATION_PRIORITY_LABEL[recommendation.priority] ??
                      recommendation.priority}
                  </span>
                </div>
                <p>{recommendation.description}</p>
                <div className="cunmark-recommendation-item__meta">
                  <span>
                    Responsable:{' '}
                    {recommendation.assignedUserName ?? 'Sin asignar'}
                  </span>
                  <span>
                    Fecha: {formatManagementDate(recommendation.createdAt)}
                  </span>
                </div>
                <label className="cunmark-recommendation-item__status">
                  <span>Estado</span>
                  <select
                    value={recommendation.status}
                    disabled={!canUpdate || isUpdating}
                    onChange={(event) =>
                      void onUpdateRecommendationStatus(
                        recommendation.id,
                        event.target.value,
                      )
                    }
                  >
                    {recommendationStatuses.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <small>
                    {RECOMMENDATION_STATUS_LABEL[recommendation.status] ??
                      recommendation.status}
                  </small>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cunmark-situation-block cunmark-analysis-history-block">
        <h3>Versionado IA</h3>
        {dossier.analysisHistory.items.length === 0 ? (
          <p className="cunmark-empty-signal">Sin historial de análisis.</p>
        ) : (
          <ul className="cunmark-analysis-history-list">
            {dossier.analysisHistory.items.map((session) => (
              <li key={session.sessionId} className="cunmark-analysis-history-item">
                <div>
                  <strong>Versión {session.analysisVersion}</strong>
                  <span>{formatManagementDate(session.createdAt)}</span>
                </div>
                <p>
                  {session.provider} · {session.model}
                </p>
                <button
                  type="button"
                  className="cunmark-analysis-history-item__compare"
                  disabled={dossier.analysisHistory.items.length < 2}
                  onClick={() => {
                    // Preparado para GET /situations/:id/analysis/compare
                  }}
                  title="Comparar versiones (próximamente)"
                >
                  Comparar versiones
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cunmark-action-history">
        <h3>Historial operativo</h3>
        {timeline.length === 0 ? (
          <p className="cunmark-empty-signal">Sin eventos en el historial.</p>
        ) : (
          <ol>
            {timeline.map((item) => (
              <li key={item.id}>
                <time>
                  {new Date(item.createdAt).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <div>
                  <strong>
                    {TIMELINE_EVENT_LABEL[item.eventType] ?? item.title}
                  </strong>
                  <span>{item.description}</span>
                  <small>{item.userName ?? 'Sistema'}</small>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  )
}
