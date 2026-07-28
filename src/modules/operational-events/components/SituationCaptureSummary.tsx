import {
  AFFECTED_PARTY_OPTIONS,
  DETECTION_METHOD_OPTIONS,
  type SituationCaptureDraft,
} from '@/modules/situations/types/situation-capture.types'
import type { CoordinationSummary } from '@/modules/situations/types/situation.types'
import {
  formatFileSize,
  inferEvidenceType,
} from '@/modules/situations/services/situation-evidences.service'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'

interface SituationCaptureSummaryProps {
  draft: SituationCaptureDraft
  coordinations: CoordinationSummary[]
  onBack: () => void
  onConfirm: () => void
  confirming?: boolean
  canConfirm?: boolean
}

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  IMAGE: 'Imagen',
  DOCUMENT: 'Documento',
  VIDEO: 'Video',
  EMAIL: 'Correo',
  LINK: 'Enlace',
  NOTE: 'Nota',
  OTHER: 'Archivo',
}

const AI_ANALYSIS_POINTS = [
  'Identificar la causa probable del incidente',
  'Estimar el impacto operacional',
  'Detectar coordinaciones afectadas',
  'Calcular la severidad de la situación',
  'Generar recomendaciones ejecutivas',
  'Proponer acciones inmediatas',
] as const

function splitReportedAt(value: string): { date: string; time: string } {
  if (!value) return { date: '—', time: '—' }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return { date: value, time: '—' }

  return {
    date: new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(parsed),
    time: new Intl.DateTimeFormat('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed),
  }
}

export function SituationCaptureSummary({
  draft,
  coordinations,
  onBack,
  onConfirm,
  confirming = false,
  canConfirm = true,
}: SituationCaptureSummaryProps) {
  const { user } = useAuth()
  const responsible = coordinations.find((item) => item.id === draft.coordinationId)
  const related = draft.relatedCoordinationIds
    .map((id) => coordinations.find((item) => item.id === id))
    .filter((item): item is CoordinationSummary => Boolean(item))

  const detectionLabel =
    draft.detectionMethod === 'OTRO'
      ? draft.detectionMethodOther.trim() || 'Otro'
      : DETECTION_METHOD_OPTIONS.find((item) => item.value === draft.detectionMethod)
          ?.label

  const affectedLabels = draft.affectedParties.map((party) => {
    if (party === 'OTRO') {
      return draft.affectedPartyOther.trim() || 'Otro'
    }
    return AFFECTED_PARTY_OPTIONS.find((item) => item.value === party)?.label ?? party
  })

  const { date, time } = splitReportedAt(draft.reportedAt)
  const hasNotes = draft.additionalNotes.trim().length > 0

  return (
    <section className="cunmark-executive-dossier" aria-labelledby="executive-dossier-title">
      <div className="cunmark-executive-dossier__scroll">
        <header className="cunmark-executive-dossier__header">
          <div className="cunmark-executive-dossier__header-copy">
            <p className="cunmark-executive-dossier__eyebrow">
              Revise el expediente antes de iniciar el análisis ejecutivo.
            </p>
            <h2 id="executive-dossier-title" className="cunmark-executive-dossier__title">
              {draft.title}
            </h2>
          </div>

          <div className="cunmark-executive-dossier__meta">
            <div className="cunmark-executive-dossier__meta-item">
              <CunmarkIcon name="calendar" size={14} />
              <span>{date}</span>
            </div>
            <div className="cunmark-executive-dossier__meta-item">
              <CunmarkIcon name="clock" size={14} />
              <span>{time}</span>
            </div>
            <div className="cunmark-executive-dossier__meta-item">
              <CunmarkIcon name="user" size={14} />
              <span>{user?.name ?? 'Operador Cunmark'}</span>
            </div>
            <div className="cunmark-executive-dossier__meta-item">
              <CunmarkIcon name="grid" size={14} />
              <span>
                {responsible
                  ? `${responsible.shortName || responsible.name}`
                  : 'Coordinación no definida'}
              </span>
            </div>
            <span className="cunmark-executive-dossier__status">
              Pendiente de análisis
            </span>
          </div>
        </header>

        <article className="cunmark-executive-dossier__narrative">
          <h3 className="cunmark-executive-dossier__section-title">Resumen ejecutivo</h3>
          <p className="cunmark-executive-dossier__narrative-text">
            {draft.description.trim()}
          </p>
        </article>

        <article className="cunmark-executive-dossier__context">
          <h3 className="cunmark-executive-dossier__section-title">Contexto operativo</h3>
          <div className="cunmark-executive-dossier__context-grid">
            <div className="cunmark-executive-dossier__fact">
              <CunmarkIcon name="activity" size={15} />
              <div>
                <span>Método de detección</span>
                <strong>{detectionLabel ?? 'No indicado'}</strong>
              </div>
            </div>

            <div className="cunmark-executive-dossier__fact">
              <CunmarkIcon name="grid" size={15} />
              <div>
                <span>Coordinación responsable</span>
                <strong>
                  {responsible
                    ? `${responsible.code} · ${responsible.name}`
                    : 'No indicada'}
                </strong>
              </div>
            </div>

            <div className="cunmark-executive-dossier__fact">
              <CunmarkIcon name="calendar" size={15} />
              <div>
                <span>Fecha</span>
                <strong>{date}</strong>
              </div>
            </div>

            <div className="cunmark-executive-dossier__fact">
              <CunmarkIcon name="clock" size={15} />
              <div>
                <span>Hora</span>
                <strong>{time}</strong>
              </div>
            </div>

            <div className="cunmark-executive-dossier__fact cunmark-executive-dossier__fact--wide">
              <CunmarkIcon name="users" size={15} />
              <div>
                <span>Personas afectadas</span>
                {affectedLabels.length > 0 ? (
                  <div className="cunmark-executive-dossier__chips">
                    {affectedLabels.map((label) => (
                      <span key={label} className="cunmark-executive-dossier__chip">
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <strong>No indicadas</strong>
                )}
              </div>
            </div>

            <div className="cunmark-executive-dossier__fact cunmark-executive-dossier__fact--wide">
              <CunmarkIcon name="grid" size={15} />
              <div>
                <span>Coordinaciones relacionadas</span>
                {related.length > 0 ? (
                  <div className="cunmark-executive-dossier__chips">
                    {related.map((item) => (
                      <span key={item.id} className="cunmark-executive-dossier__chip">
                        {item.shortName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <strong>Sin coordinaciones relacionadas</strong>
                )}
              </div>
            </div>
          </div>
        </article>

        {hasNotes ? (
          <article className="cunmark-executive-dossier__notes">
            <h3 className="cunmark-executive-dossier__section-title">Notas adicionales</h3>
            <p>{draft.additionalNotes.trim()}</p>
          </article>
        ) : null}

        <article className="cunmark-executive-dossier__evidence">
          <h3 className="cunmark-executive-dossier__section-title">Evidencias</h3>
          {draft.attachments.length > 0 ? (
            <ul className="cunmark-executive-dossier__evidence-list">
              {draft.attachments.map((attachment) => {
                const evidenceType = inferEvidenceType(attachment.file)
                return (
                  <li key={attachment.id} className="cunmark-executive-dossier__evidence-item">
                    <span className="cunmark-executive-dossier__evidence-icon" aria-hidden="true">
                      <CunmarkIcon name="file" size={16} />
                    </span>
                    <div className="cunmark-executive-dossier__evidence-copy">
                      <strong>{attachment.file.name}</strong>
                      <span>
                        {EVIDENCE_TYPE_LABEL[evidenceType] ?? 'Archivo'} ·{' '}
                        {formatFileSize(attachment.file.size)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="cunmark-executive-dossier__evidence-empty">
              Sin evidencias adjuntas.
            </p>
          )}
        </article>

        <article className="cunmark-executive-dossier__ai-brief">
          <div className="cunmark-executive-dossier__ai-brief-head">
            <span className="cunmark-executive-dossier__ai-brief-icon" aria-hidden="true">
              <CunmarkIcon name="sparkles" size={18} />
            </span>
            <div>
              <h3>Información que analizará la IA</h3>
              <p>
                El motor de inteligencia operacional procesará este expediente para
                generar un análisis ejecutivo accionable.
              </p>
            </div>
          </div>
          <ul className="cunmark-executive-dossier__ai-points">
            {AI_ANALYSIS_POINTS.map((point) => (
              <li key={point}>
                <CunmarkIcon name="check" size={14} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <footer className="cunmark-executive-dossier__actions">
        <button
          type="button"
          onClick={onBack}
          disabled={confirming}
          className={`cunmark-executive-dossier__back ${FOCUS_VISIBLE}`}
        >
          Volver a editar
        </button>

        <div className="cunmark-executive-dossier__confirm">
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming || !canConfirm}
            className={`cunmark-executive-dossier__submit ${FOCUS_VISIBLE}`}
          >
            {confirming ? 'Generando expediente…' : 'Crear expediente e iniciar análisis IA'}
          </button>
          <p className="cunmark-executive-dossier__confirm-note">
            Podrá reanalizar la situación posteriormente si el contexto cambia.
          </p>
        </div>
      </footer>
    </section>
  )
}
