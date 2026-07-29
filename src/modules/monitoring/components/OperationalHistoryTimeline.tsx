import { useState } from 'react'
import type { SituationTimelineEntry } from '@/modules/api/timeline.api'
import {
  formatManagementDate,
  formatManagementTime,
  SITUATION_STATUS_LABEL,
  TIMELINE_EVENT_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'

interface OperationalHistoryTimelineProps {
  timeline: SituationTimelineEntry[]
}

function readMetaString(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!metadata) return null
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value : null
}

export function OperationalHistoryTimeline({
  timeline,
}: OperationalHistoryTimelineProps) {
  const [showAll, setShowAll] = useState(false)
  const ordered = [...timeline].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )
  const visibleItems = showAll ? ordered : ordered.slice(0, 3)

  return (
    <section className="novex-ops-history novex-ops-dashboard-section">
      <div className="novex-ops-section-heading">
        <h2>Historial operacional</h2>
      </div>

      {ordered.length === 0 ? (
        <p className="novex-empty-signal">Sin eventos en el historial.</p>
      ) : (
        <ol className="novex-ops-history__list">
          {visibleItems.map((item) => {
            const previousLabel =
              readMetaString(item.metadata, 'previousLabel') ??
              (readMetaString(item.metadata, 'previousValue')
                ? SITUATION_STATUS_LABEL[
                    readMetaString(item.metadata, 'previousValue')!
                  ]
                : null)
            const newLabel =
              readMetaString(item.metadata, 'newLabel') ??
              (readMetaString(item.metadata, 'newValue')
                ? SITUATION_STATUS_LABEL[
                    readMetaString(item.metadata, 'newValue')!
                  ]
                : null)
            const statusComment = readMetaString(item.metadata, 'statusComment')
            const commentKind = readMetaString(item.metadata, 'commentKind')
            const assignedUserName = readMetaString(
              item.metadata,
              'assignedUserName',
            )
            const commentTitle =
              commentKind === 'resolution'
                ? 'Motivo'
                : commentKind === 'closure'
                  ? 'Comentario'
                  : 'Nota'

            return (
              <li key={item.id} className="novex-ops-history__item">
                <time dateTime={item.createdAt}>
                  <span>{formatManagementTime(item.createdAt)}</span>
                  <small>{formatManagementDate(item.createdAt)}</small>
                </time>
                <div>
                  <strong>
                    {TIMELINE_EVENT_LABEL[item.eventType] ?? item.title}
                  </strong>
                  {previousLabel && newLabel ? (
                    <p className="novex-ops-history__transition">
                      <span>{previousLabel}</span>
                      <span aria-hidden="true">↓</span>
                      <span>{newLabel}</span>
                    </p>
                  ) : null}
                  <p>{item.description}</p>
                  {assignedUserName ? (
                    <p className="novex-ops-history__meta">
                      Responsable: {assignedUserName}
                    </p>
                  ) : null}
                  {statusComment ? (
                    <blockquote>
                      <span>{commentTitle}</span>
                      {statusComment}
                    </blockquote>
                  ) : null}
                  <small>{item.userName ?? 'Sistema'}</small>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {ordered.length > 3 ? (
        <button
          type="button"
          className="novex-ops-history__toggle"
          aria-expanded={showAll}
          onClick={() => setShowAll((current) => !current)}
        >
          {showAll ? 'Mostrar últimos eventos' : 'Ver historial completo'}
        </button>
      ) : null}
    </section>
  )
}
