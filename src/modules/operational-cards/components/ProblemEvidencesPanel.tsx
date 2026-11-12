import { useCallback, useEffect, useState } from 'react'
import type { SituationEvidenceItem } from '@/modules/api/evidences.api'
import { fetchSituationEvidences } from '@/modules/api/evidences.api'
import { ApiError } from '@/shared/api/http'
import {
  activeEvidencesOf,
  mayRequestRetiredEvidenceHistory,
  retiredEvidencesOf,
} from '@/modules/operational-cards/data/evidenceAccess'
import {
  formatProblemDateTime,
  splitProblemEvidences,
} from '@/modules/operational-cards/data/problemDetailPresentation'
import { ProblemDetailSection } from '@/modules/operational-cards/components/ProblemDetailSection'
import { RetireEvidenceModal } from '@/modules/operational-cards/components/RetireEvidenceModal'
import type { User } from '@/modules/auth/types/user.types'
import type {
  LoadState,
  OperationalSubmissionState,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { ProblemSectionId } from '@/modules/operational-cards/types/problem-detail.types'

type HistoryAccess = 'idle' | 'loading' | 'allowed' | 'denied' | 'error'
type EvidenceTab = 'active' | 'history'

export interface ProblemEvidencesPanelProps {
  situationId: string
  situationStatus: string
  user: Pick<User, 'id' | 'roleCode' | 'permissions'> | null
  /** Evidencias activas ya cargadas con el detalle. */
  activeStatus: LoadState
  activeItems: readonly SituationEvidenceItem[]
  activeErrorMessage: string | null
  expanded: readonly ProblemSectionId[]
  onToggleSection: (section: ProblemSectionId) => void
  onRetryActive: () => void
  canRetire: boolean
  submission: OperationalSubmissionState
  onRetire: (evidenceId: string, reason: string) => Promise<boolean>
  /** Tras un retiro confirmado, el padre recarga activas; aquí se refresca historial. */
  historyRefreshKey: number
  /** El backend permite operar este caso: requisito para ver evidencias retiradas. */
  caseOperable?: boolean
}

function Byline({
  author,
  dateLabel,
  dateIso,
}: {
  author: string
  dateLabel: string
  dateIso: string | null
}) {
  return (
    <p className="detail-entry__byline">
      <span>{author}</span>
      {' · '}
      {dateIso ? <time dateTime={dateIso}>{dateLabel}</time> : dateLabel}
    </p>
  )
}

/**
 * Evidencias del expediente: activas (notas / otras) + historial retirado.
 * El historial solo se pide cuando el usuario es candidato (ADMIN o
 * SITUATIONS_UPDATE); un 404 se trata como denegación sin revelar datos.
 */
export function ProblemEvidencesPanel({
  situationId,
  situationStatus,
  user,
  activeStatus,
  activeItems,
  activeErrorMessage,
  expanded,
  onToggleSection,
  onRetryActive,
  canRetire,
  submission,
  onRetire,
  historyRefreshKey,
  caseOperable = true,
}: ProblemEvidencesPanelProps) {
  const [tab, setTab] = useState<EvidenceTab>('active')
  const [historyAccess, setHistoryAccess] = useState<HistoryAccess>('idle')
  const [historyItems, setHistoryItems] = useState<SituationEvidenceItem[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [retireTarget, setRetireTarget] = useState<SituationEvidenceItem | null>(
    null,
  )

  const retiring =
    submission.status === 'sending' &&
    submission.kind === 'evidence-retirement' &&
    Boolean(retireTarget) &&
    submission.targetKey === `${situationId}:${retireTarget?.id}`
  const retireError =
    submission.status === 'error' &&
    submission.kind === 'evidence-retirement' &&
    retireTarget &&
    submission.targetKey === `${situationId}:${retireTarget.id}`
      ? submission.errorMessage
      : null

  const loadHistory = useCallback(async () => {
    if (!mayRequestRetiredEvidenceHistory(user, caseOperable)) {
      setHistoryAccess('denied')
      setHistoryItems([])
      return
    }

    setHistoryAccess('loading')
    setHistoryError(null)
    try {
      const response = await fetchSituationEvidences(situationId, {
        includeRetired: true,
      })
      // Defensa: si la respuesta no es de este caso, no pintar nada ajeno.
      if (response.situationId !== situationId) {
        setHistoryItems([])
        setHistoryAccess('denied')
        return
      }
      setHistoryItems(retiredEvidencesOf(response.items))
      setHistoryAccess('allowed')
    } catch (error: unknown) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        // 404 deliberado del BE: no revelar existencia del historial.
        setHistoryAccess('denied')
        setHistoryItems([])
        setHistoryError(null)
        if (tab === 'history') setTab('active')
        return
      }
      setHistoryAccess('error')
      setHistoryError('No pudimos cargar el historial de evidencias.')
      setHistoryItems([])
    }
  }, [situationId, user, tab, caseOperable])

  // Al cambiar de situación se limpia el historial (evita datos obsoletos).
  useEffect(() => {
    setTab('active')
    setHistoryItems([])
    setHistoryError(null)
    setRetireTarget(null)
    setHistoryAccess('idle')
  }, [situationId])

  useEffect(() => {
    if (historyAccess !== 'idle') return
    void loadHistory()
  }, [historyAccess, loadHistory])

  useEffect(() => {
    if (historyRefreshKey === 0) return
    if (historyAccess === 'denied') return
    void loadHistory()
  }, [historyRefreshKey, historyAccess, loadHistory])

  const activeOnly = activeEvidencesOf(activeItems)
  const { notes, others } =
    activeStatus === 'ready'
      ? splitProblemEvidences(activeOnly)
      : { notes: [], others: [] }

  const isExpanded = (section: ProblemSectionId) => expanded.includes(section)
  const showHistoryTab = historyAccess === 'allowed' || historyAccess === 'error'
  const showRetire = canRetire && situationStatus !== 'CLOSED' && situationStatus !== 'CANCELLED'

  const handleConfirmRetire = async (reason: string) => {
    if (!retireTarget || retiring) return
    const ok = await onRetire(retireTarget.id, reason)
    if (ok) setRetireTarget(null)
  }

  return (
    <div
      className="problem-evidences"
      data-testid="problem-evidences"
      data-situation={situationId}
      data-history-access={historyAccess}
      data-tab={tab}
    >
      {showHistoryTab && (
        <div
          className="problem-evidences__tabs"
          role="tablist"
          aria-label="Evidencias de la situación"
          data-testid="evidence-tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'active'}
            className="problem-evidences__tab"
            data-testid="evidence-tab-active"
            data-active={tab === 'active' ? 'true' : undefined}
            onClick={() => setTab('active')}
          >
            Activas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'history'}
            className="problem-evidences__tab"
            data-testid="evidence-tab-history"
            data-active={tab === 'history' ? 'true' : undefined}
            onClick={() => setTab('history')}
          >
            Historial
          </button>
        </div>
      )}

      {tab === 'active' && (
        <div
          className="problem-evidences__active"
          data-testid="evidence-active-panel"
          role="tabpanel"
        >
          {(activeStatus === 'idle' || activeStatus === 'loading') && (
            <p
              className="detail-section__note problem-detail__notes-status"
              data-testid="detail-notes-loading"
              role="status"
            >
              Cargando evidencias…
            </p>
          )}

          {activeStatus === 'error' && (
            <div
              className="problem-detail__notice"
              data-testid="detail-notes-error"
              role="alert"
            >
              <p>
                No pudimos cargar las notas del reporte.
                {activeErrorMessage ? ` (${activeErrorMessage})` : ''}
              </p>
              <button
                type="button"
                data-testid="detail-notes-error-retry"
                onClick={onRetryActive}
              >
                Reintentar
              </button>
            </div>
          )}

          {activeStatus === 'ready' && notes.length === 0 && others.length === 0 && (
            <p
              className="detail-section__note"
              data-testid="evidence-active-empty"
            >
              Sin evidencias activas.
            </p>
          )}

          {activeStatus === 'ready' && (
            <div className="problem-detail__sections">
              {notes.length > 0 && (
                <ProblemDetailSection
                  id="notes"
                  title="Notas del reporte"
                  expanded={isExpanded('notes')}
                  onToggle={onToggleSection}
                >
                  <ul className="detail-entries" data-testid="detail-notes">
                    {notes.map((note) => (
                      <li
                        key={note.id}
                        className="detail-entry"
                        data-evidence-status="ACTIVE"
                      >
                        <div className="detail-entry__head">
                          <p className="detail-entry__title">{note.title}</p>
                          <span
                            className="detail-entry__status"
                            data-status="ACTIVE"
                          >
                            Activa
                          </span>
                        </div>
                        <p className="detail-entry__content">{note.content}</p>
                        <Byline
                          author={note.author}
                          dateLabel={note.date.label}
                          dateIso={note.date.iso}
                        />
                        {showRetire && (
                          <button
                            type="button"
                            className="detail-entry__retire"
                            data-testid={`retire-evidence-${note.id}`}
                            disabled={submission.status === 'sending'}
                            onClick={() => {
                              const raw = activeOnly.find((i) => i.id === note.id)
                              if (raw) setRetireTarget(raw)
                            }}
                          >
                            Retirar evidencia
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </ProblemDetailSection>
              )}

              {others.length > 0 && (
                <ProblemDetailSection
                  id="other-evidences"
                  title="Otras evidencias"
                  expanded={isExpanded('other-evidences')}
                  onToggle={onToggleSection}
                >
                  <ul
                    className="detail-entries"
                    data-testid="detail-other-evidences"
                  >
                    {others.map((item) => (
                      <li
                        key={item.id}
                        className="detail-entry"
                        data-evidence-status="ACTIVE"
                      >
                        <div className="detail-entry__head">
                          <p className="detail-entry__title">
                            {item.title}
                            <span className="detail-entry__kind">
                              {item.typeLabel}
                            </span>
                          </p>
                          <span
                            className="detail-entry__status"
                            data-status="ACTIVE"
                          >
                            Activa
                          </span>
                        </div>
                        {item.description && (
                          <p className="detail-entry__content">
                            {item.description}
                          </p>
                        )}
                        {item.facts.length > 0 && (
                          <dl className="detail-entry__facts">
                            {item.facts.map((fact) => (
                              <div key={fact.label}>
                                <dt>{fact.label}</dt>
                                <dd>{fact.value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        <Byline
                          author={item.author}
                          dateLabel={item.date.label}
                          dateIso={item.date.iso}
                        />
                        {showRetire && (
                          <button
                            type="button"
                            className="detail-entry__retire"
                            data-testid={`retire-evidence-${item.id}`}
                            disabled={submission.status === 'sending'}
                            onClick={() => {
                              const raw = activeOnly.find((i) => i.id === item.id)
                              if (raw) setRetireTarget(raw)
                            }}
                          >
                            Retirar evidencia
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </ProblemDetailSection>
              )}
            </div>
          )}
        </div>
      )}

      {historyAccess === 'loading' && tab === 'history' && (
        <p
          className="detail-section__note"
          data-testid="evidence-history-loading"
          role="status"
        >
          Cargando historial…
        </p>
      )}

      {tab === 'history' && showHistoryTab && (
        <div
          className="problem-evidences__history"
          data-testid="evidence-history-panel"
          role="tabpanel"
        >
          {historyAccess === 'error' && (
            <div className="problem-detail__notice" role="alert">
              <p>{historyError}</p>
              <button type="button" onClick={() => void loadHistory()}>
                Reintentar
              </button>
            </div>
          )}

          {historyAccess === 'allowed' && historyItems.length === 0 && (
            <p
              className="detail-section__note"
              data-testid="evidence-history-empty"
            >
              No hay evidencias retiradas en esta situación.
            </p>
          )}

          {historyAccess === 'allowed' && historyItems.length > 0 && (
            <ul className="detail-entries" data-testid="detail-retired-evidences">
              {historyItems.map((item) => {
                const retiredAt = formatProblemDateTime(
                  item.retirement?.retiredAt,
                )
                const typeLabel =
                  item.type === 'NOTE'
                    ? 'Nota'
                    : item.type === 'IMAGE'
                      ? 'Imagen'
                      : item.type === 'DOCUMENT'
                        ? 'Documento'
                        : item.type === 'EMAIL'
                          ? 'Correo'
                          : item.type === 'LINK'
                            ? 'Enlace'
                            : item.type === 'VIDEO'
                              ? 'Video'
                              : 'Evidencia'
                return (
                  <li
                    key={item.id}
                    className="detail-entry detail-entry--retired"
                    data-evidence-status="RETIRED"
                  >
                    <div className="detail-entry__head">
                      <p className="detail-entry__title">
                        {item.title}
                        <span className="detail-entry__kind">{typeLabel}</span>
                      </p>
                      <span
                        className="detail-entry__status"
                        data-status="RETIRED"
                      >
                        Retirada
                      </span>
                    </div>
                    {item.description && (
                      <p className="detail-entry__content">{item.description}</p>
                    )}
                    <dl className="detail-entry__facts">
                      <div>
                        <dt>Fecha de retiro</dt>
                        <dd>
                          {retiredAt.iso ? (
                            <time dateTime={retiredAt.iso}>
                              {retiredAt.label}
                            </time>
                          ) : (
                            retiredAt.label
                          )}
                        </dd>
                      </div>
                      {item.retirement?.reason && (
                        <div>
                          <dt>Motivo</dt>
                          <dd>{item.retirement.reason}</dd>
                        </div>
                      )}
                      {/*
                        El contrato solo expone retiredByUserId (sin nombre).
                        No inventamos un responsable legible a partir del UUID.
                      */}
                      {item.retirement?.retiredByUserId && (
                        <div>
                          <dt>Registro de retiro</dt>
                          <dd data-testid="retired-by-id">
                            Registrado por usuario autorizado
                          </dd>
                        </div>
                      )}
                    </dl>
                    <Byline
                      author={
                        item.uploadedByUserName?.trim() || 'Autor no registrado'
                      }
                      dateLabel={formatProblemDateTime(item.createdAt).label}
                      dateIso={formatProblemDateTime(item.createdAt).iso}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <RetireEvidenceModal
        isOpen={Boolean(retireTarget)}
        evidenceTitle={retireTarget?.title ?? ''}
        evidenceId={retireTarget?.id ?? ''}
        draftScope={user && 'id' in user ? user.id : null}
        isSubmitting={retiring}
        error={retireError}
        onClose={() => {
          if (!retiring) setRetireTarget(null)
        }}
        onConfirm={(reason) => {
          void handleConfirmRetire(reason)
        }}
      />
    </div>
  )
}
