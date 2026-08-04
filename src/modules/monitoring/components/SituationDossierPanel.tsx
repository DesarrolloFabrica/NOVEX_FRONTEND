import type { SituationDossier } from '@/modules/api/types/situation-management.types'
import { splitSituationDescription } from '@/modules/operational-events/utils/parseSituationDescription'
import {
  formatManagementDate,
  SITUATION_SEVERITY_LABEL,
  SITUATION_STATUS_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'

interface SituationDossierPanelProps {
  dossier: SituationDossier | null
  loading: boolean
  error: string | null
}

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
}: SituationDossierPanelProps) {
  if (loading) {
    return (
      <section className="novex-action-detail novex-action-detail--empty">
        <strong>Cargando expediente…</strong>
        <p>Obteniendo análisis, recomendaciones e historial.</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="novex-action-detail novex-action-detail--empty" role="alert">
        <strong>No fue posible cargar el expediente</strong>
        <p>{error}</p>
      </section>
    )
  }

  if (!dossier) {
    return (
      <section className="novex-action-detail novex-action-detail--empty">
        <strong>Ninguna situación seleccionada</strong>
        <p>Selecciona una situación para revisar su expediente operativo.</p>
      </section>
    )
  }

  const { situation } = dossier
  const responsibleName =
    situation.assignedUserName ?? situation.createdByUserName
  const { narrative, reportedContext } = splitSituationDescription(
    situation.description,
  )
  const captureEvidences = dossier.evidences.filter(
    (evidence) => evidence.type === 'NOTE',
  )
  const affectedCoordinations = dossier.affectedCoordinations?.items ?? []

  return (
    <article
      className="novex-action-detail novex-ops-dossier"
      data-status={situation.status.toLowerCase()}
      data-priority={situation.severity.toLowerCase()}
      data-tour="management-dossier"
    >
      <header className="novex-action-detail__header">
        <div className="novex-action-detail__heading">
          <p>Expediente operativo</p>
          <h2>{situation.title}</h2>
        </div>
        <div className="novex-action-detail__signals">
          <span className="novex-action-detail__priority">
            <i />
            {SITUATION_SEVERITY_LABEL[situation.severity] ?? situation.severity}
          </span>
          <span
            className="novex-action-detail__state"
            data-status={situation.status.toLowerCase()}
          >
            <i />
            {SITUATION_STATUS_LABEL[situation.status] ?? situation.status}
          </span>
        </div>
      </header>

      <section className="novex-ops-facts" aria-label="Resumen del expediente">
        <dl className="novex-ops-facts__grid">
          <div>
            <dt>Estado</dt>
            <dd>{SITUATION_STATUS_LABEL[situation.status] ?? situation.status}</dd>
          </div>
          <div>
            <dt>Riesgo</dt>
            <dd>{resolveRiskLabel(dossier)}</dd>
          </div>
          <div>
            <dt>Categoría</dt>
            <dd>{situation.categoryName}</dd>
          </div>
          <div>
            <dt>Responsable</dt>
            <dd>{responsibleName}</dd>
          </div>
          <div>
            <dt>Coordinación</dt>
            <dd>{situation.coordinationName}</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{formatManagementDate(situation.occurredAt)}</dd>
          </div>
        </dl>

        <div className="novex-ops-context">
          <strong>Descripción</strong>
          <p>{narrative}</p>
        </div>

        {reportedContext ? (
          <div className="novex-ops-context">
            <strong>Contexto reportado</strong>
            <p>{reportedContext}</p>
          </div>
        ) : null}

        {captureEvidences.length > 0 ? (
          <div className="novex-ops-context">
            <strong>Evidencias de registro</strong>
            <ul className="novex-ops-evidence-list">
              {captureEvidences.map((evidence) => (
                <li key={evidence.id}>
                  <span>{evidence.title}</span>
                  <p>{evidence.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {affectedCoordinations.length > 0 ? (
          <div className="novex-ops-context">
            <strong>Coordinaciones afectadas (análisis IA)</strong>
            <ul className="novex-ops-evidence-list">
              {affectedCoordinations.map((item) => (
                <li key={item.id}>
                  <span>{item.coordinationName}</span>
                  <p>{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </article>
  )
}
