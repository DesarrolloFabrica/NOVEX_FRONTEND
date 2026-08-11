import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  OperationsPagination,
  paginateItems,
  SeverityPill,
  StatusPill,
} from '@/modules/executive-operations-center/components/shared/OperationalCenterUI'
import {
  formatConfidence,
  formatDateTime,
  formatRelativeTime,
} from '@/modules/executive-operations-center/utils/operational-center.presentation'
import type {
  OperationalCenterSituation,
  OperationalCoordinationRollup,
} from '@/modules/executive-operations-center/types/operational-center.types'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface CoordinationSituationsModalProps {
  coordination: OperationalCoordinationRollup
  situations: OperationalCenterSituation[]
  onClose: () => void
  onOpenSituation: (situationId: string) => void
}

const SCROLL_LOCK_SELECTOR = '.eoc-deck > .novex-os-deck__content'
const MODAL_PAGE_SIZE = 8

export function CoordinationSituationsModal({
  coordination,
  situations,
  onClose,
  onOpenSituation,
}: CoordinationSituationsModalProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [page, setPage] = useState(1)
  const ordered = useMemo(
    () =>
      [...situations].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [situations],
  )
  const pageItems = useMemo(
    () => paginateItems(ordered, page, MODAL_PAGE_SIZE),
    [ordered, page],
  )

  useEffect(() => {
    setPage(1)
  }, [coordination.id, situations.length])

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousBodyOverflow = document.body.style.overflow
    const scrollContainer = document.querySelector<HTMLElement>(SCROLL_LOCK_SELECTOR)
    const previousContainerOverflow = scrollContainer?.style.overflow ?? ''

    closeRef.current?.focus()
    document.body.style.overflow = 'hidden'
    if (scrollContainer) scrollContainer.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousBodyOverflow
      if (scrollContainer) {
        scrollContainer.style.overflow = previousContainerOverflow
      }
      previousFocus?.focus()
    }
  }, [onClose])

  const activeCount = ordered.filter(
    (item) => item.status === 'OPEN' || item.status === 'IN_PROGRESS',
  ).length

  return (
    <div
      className="eoc-modal-backdrop"
      role="presentation"
      onClick={onClose}
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <div
        className="eoc-modal eoc-modal--coordination"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="eoc-modal__header">
          <div>
            <span className="eoc-home-kicker">Expedientes del área</span>
            <h2 id={titleId}>{coordination.name}</h2>
            <p>
              {ordered.length}{' '}
              {ordered.length === 1
                ? 'situación registrada'
                : 'situaciones registradas'}
              {activeCount > 0
                ? ` · ${activeCount} ${activeCount === 1 ? 'activa' : 'activas'}`
                : ' · sin carga activa'}
              {' · '}
              seleccione una fila para abrir el expediente
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="eoc-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <NovexIcon name="x" size={16} />
          </button>
        </header>

        <div className="eoc-modal__summary">
          <div>
            <span>Históricas</span>
            <strong>{coordination.totalSituations}</strong>
          </div>
          <div>
            <span>Activas</span>
            <strong>{coordination.activeSituations}</strong>
          </div>
          <div>
            <span>Vencidas</span>
            <strong>{coordination.overdueSituations}</strong>
          </div>
          <div>
            <span>Alta / crítica</span>
            <strong>{coordination.criticalSituations}</strong>
          </div>
          <div>
            <span>Impactos</span>
            <strong>{coordination.affectedBySituations}</strong>
          </div>
        </div>

        <div className="eoc-modal__body">
          {ordered.length > 0 ? (
            <>
              <div className="eoc-modal-table-wrap">
                <table className="eoc-modal-table">
                  <thead>
                    <tr>
                      <th>Situación</th>
                      <th>Estado</th>
                      <th>Severidad</th>
                      <th>Registró</th>
                      <th>Registro</th>
                      <th>IA</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((situation) => (
                      <tr
                        key={situation.id}
                        className="eoc-modal-table__row"
                        tabIndex={0}
                        aria-label={`Abrir expediente ${situation.title}`}
                        onClick={() => onOpenSituation(situation.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onOpenSituation(situation.id)
                          }
                        }}
                      >
                        <td>
                          <span className="eoc-modal-table__primary">
                            <strong>{situation.title}</strong>
                            <small>
                              {situation.code} · {situation.categoryName}
                            </small>
                          </span>
                        </td>
                        <td>
                          <StatusPill status={situation.status} />
                        </td>
                        <td>
                          <SeverityPill severity={situation.severity} />
                        </td>
                        <td>
                          <span className="eoc-modal-table__stack">
                            <strong>{situation.createdByUserName}</strong>
                            {situation.assignedUserName ? (
                              <small>Asignada: {situation.assignedUserName}</small>
                            ) : (
                              <small>Sin asignar</small>
                            )}
                          </span>
                        </td>
                        <td>
                          <span className="eoc-modal-table__stack">
                            <strong>{formatDateTime(situation.createdAt)}</strong>
                            <small>
                              Actualizada {formatRelativeTime(situation.updatedAt)}
                            </small>
                          </span>
                        </td>
                        <td>
                          {situation.ai.hasAnalysis ? (
                            <span className="eoc-ai-availability is-ready">
                              <NovexIcon name="sparkles" size={13} />
                              {formatConfidence(situation.ai.confidence)}
                            </span>
                          ) : (
                            <span className="eoc-ai-availability">Sin análisis</span>
                          )}
                        </td>
                        <td>
                          <span className="eoc-modal-table__hint">
                            {situation.recommendationsPending > 0
                              ? `${situation.recommendationsPending} pend.`
                              : 'Abrir'}
                            <NovexIcon name="chevron-right" size={13} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <OperationsPagination
                page={page}
                pageSize={MODAL_PAGE_SIZE}
                total={ordered.length}
                onPageChange={setPage}
                label="situaciones"
              />
            </>
          ) : (
            <div className="eoc-inline-empty">
              <NovexIcon name="file" />
              Esta coordinación aún no tiene situaciones registradas como origen.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
