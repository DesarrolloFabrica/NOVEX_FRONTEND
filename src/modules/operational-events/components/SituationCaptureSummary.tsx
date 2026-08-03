import {
  AFFECTED_PARTY_OPTIONS,
  DETECTION_METHOD_OPTIONS,
  type SituationCaptureDraft,
} from '@/modules/situations/types/situation-capture.types'
import type { CoordinationSummary } from '@/modules/situations/types/situation.types'
import { formatCaptureDateLabel } from '@/modules/operational-events/utils/situationCaptureDate'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface SituationCaptureSummaryProps {
  draft: SituationCaptureDraft
  coordinations: CoordinationSummary[]
  onBack: () => void
  onConfirm: () => void
  confirming?: boolean
  canConfirm?: boolean
}

const AI_ANALYSIS_POINTS = [
  'Identificar la causa probable del incidente',
  'Estimar el impacto operacional',
  'Detectar coordinaciones afectadas',
  'Calcular la severidad de la situación',
  'Generar recomendaciones ejecutivas',
  'Proponer acciones inmediatas',
] as const

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

  const occurrenceDate = formatCaptureDateLabel(draft.reportedAt)
  const hasNotes = draft.additionalNotes.trim().length > 0

  return (
    <section className="novex-executive-dossier" aria-labelledby="executive-dossier-title">
      <div className="novex-executive-dossier__scroll">
        <header className="novex-executive-dossier__header">
          <div className="novex-executive-dossier__header-copy">
            <p className="novex-executive-dossier__eyebrow">
              Revise el expediente antes de iniciar el análisis ejecutivo.
            </p>
            <h2 id="executive-dossier-title" className="novex-executive-dossier__title">
              {draft.title}
            </h2>
          </div>

          <div className="novex-executive-dossier__meta">
            <div className="novex-executive-dossier__meta-item">
              <NovexIcon name="calendar" size={14} />
              <span>{occurrenceDate}</span>
            </div>
            <div className="novex-executive-dossier__meta-item">
              <NovexIcon name="user" size={14} />
              <span>{user?.name ?? 'Operador Novex'}</span>
            </div>
            <div className="novex-executive-dossier__meta-item">
              <NovexIcon name="grid" size={14} />
              <span>
                {responsible
                  ? `${responsible.shortName || responsible.name}`
                  : 'Coordinación no definida'}
              </span>
            </div>
            <span className="novex-executive-dossier__status">
              Pendiente de análisis
            </span>
          </div>
        </header>

        <article className="novex-executive-dossier__narrative">
          <h3 className="novex-executive-dossier__section-title">Resumen ejecutivo</h3>
          <p className="novex-executive-dossier__narrative-text">
            {draft.description.trim()}
          </p>
        </article>

        <article className="novex-executive-dossier__context">
          <h3 className="novex-executive-dossier__section-title">Contexto operativo</h3>
          <div className="novex-executive-dossier__context-grid">
            <div className="novex-executive-dossier__fact">
              <NovexIcon name="activity" size={15} />
              <div>
                <span>Método de detección</span>
                <strong>{detectionLabel ?? 'No indicado'}</strong>
              </div>
            </div>

            <div className="novex-executive-dossier__fact">
              <NovexIcon name="grid" size={15} />
              <div>
                <span>Coordinación responsable</span>
                <strong>
                  {responsible
                    ? `${responsible.code} · ${responsible.name}`
                    : 'No indicada'}
                </strong>
              </div>
            </div>

            <div className="novex-executive-dossier__fact">
              <NovexIcon name="calendar" size={15} />
              <div>
                <span>Fecha de ocurrencia</span>
                <strong>{occurrenceDate}</strong>
              </div>
            </div>

            <div className="novex-executive-dossier__fact novex-executive-dossier__fact--wide">
              <NovexIcon name="users" size={15} />
              <div>
                <span>Personas afectadas</span>
                {affectedLabels.length > 0 ? (
                  <div className="novex-executive-dossier__chips">
                    {affectedLabels.map((label) => (
                      <span key={label} className="novex-executive-dossier__chip">
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <strong>No indicadas</strong>
                )}
              </div>
            </div>

            <div className="novex-executive-dossier__fact novex-executive-dossier__fact--wide">
              <NovexIcon name="grid" size={15} />
              <div>
                <span>Coordinaciones relacionadas</span>
                {related.length > 0 ? (
                  <div className="novex-executive-dossier__chips">
                    {related.map((item) => (
                      <span key={item.id} className="novex-executive-dossier__chip">
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
          <article className="novex-executive-dossier__notes">
            <h3 className="novex-executive-dossier__section-title">Notas adicionales</h3>
            <p>{draft.additionalNotes.trim()}</p>
          </article>
        ) : null}

        <article className="novex-executive-dossier__ai-brief">
          <div className="novex-executive-dossier__ai-brief-head">
            <span className="novex-executive-dossier__ai-brief-icon" aria-hidden="true">
              <NovexIcon name="sparkles" size={18} />
            </span>
            <div>
              <h3>Información que analizará la IA</h3>
              <p>
                El motor de inteligencia operacional procesará este expediente para
                generar un análisis ejecutivo accionable.
              </p>
            </div>
          </div>
          <ul className="novex-executive-dossier__ai-points">
            {AI_ANALYSIS_POINTS.map((point) => (
              <li key={point}>
                <NovexIcon name="check" size={14} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <footer className="novex-executive-dossier__actions">
        <button
          type="button"
          onClick={onBack}
          disabled={confirming}
          className={`novex-executive-dossier__back ${FOCUS_VISIBLE}`}
        >
          Volver a editar
        </button>

        <div className="novex-executive-dossier__confirm">
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming || !canConfirm}
            className={`novex-executive-dossier__submit ${FOCUS_VISIBLE}`}
          >
            {confirming ? 'Generando expediente…' : 'Crear expediente e iniciar análisis IA'}
          </button>
          <p className="novex-executive-dossier__confirm-note">
            Podrá reanalizar la situación posteriormente si el contexto cambia.
          </p>
        </div>
      </footer>
    </section>
  )
}
