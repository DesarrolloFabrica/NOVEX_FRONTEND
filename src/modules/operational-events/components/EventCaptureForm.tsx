// Paso 1 — captura: estación de trabajo en dos columnas (Sprint 10).
// Izquierda: relato. Derecha: contexto operativo.

import type { ChangeEvent, FormEvent } from 'react'
import type { OperationalArea } from '@/modules/operational-events/types/operational-event.types'
import type { OperationalEventDraft } from '@/modules/operational-events/types/operational-event.types'
import {
  FOCUS_VISIBLE,
  TEXT_LABEL,
} from '@/modules/monitoring/constants/monitoringTheme'

const FIELD =
  'w-full border-0 bg-transparent px-0 py-2 text-sm text-slate-800 shadow-[inset_0_-1px_0_0_rgba(100,116,139,0.28)] placeholder:text-slate-500/65'
const FIELD_AREA = `${FIELD} min-h-[12rem] resize-y`

interface EventCaptureFormProps {
  draft: OperationalEventDraft
  areas: OperationalArea[]
  onChange: (next: OperationalEventDraft) => void
  onSubmit: () => void
}

export function EventCaptureForm({
  draft,
  areas,
  onChange,
  onSubmit,
}: EventCaptureFormProps) {
  const canContinue =
    draft.title.trim().length >= 4 &&
    draft.description.trim().length >= 12 &&
    draft.sourceAreaId.length > 0 &&
    draft.reportedAt.length > 0

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canContinue) return
    onSubmit()
  }

  function handleAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) {
      onChange({ ...draft, attachmentNames: [] })
      return
    }
    onChange({
      ...draft,
      attachmentNames: Array.from(files).map((file) => file.name),
    })
  }

  return (
    <form className="omega-event-capture-form flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="omega-capture-desk min-h-0 flex-1">
        <div className="omega-capture-desk__primary">
          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Qué ocurrió</span>
            <input
              className={`${FIELD} text-base font-medium ${FOCUS_VISIBLE}`}
              value={draft.title}
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              maxLength={120}
              placeholder="Título del evento"
              required
            />
          </label>

          <label className="block min-h-0 flex-1 space-y-1.5">
            <span className={TEXT_LABEL}>Relato</span>
            <textarea
              className={`${FIELD_AREA} ${FOCUS_VISIBLE}`}
              value={draft.description}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              placeholder="Hechos observados, desde cuándo y alcance percibido…"
              required
            />
          </label>
        </div>

        <aside className="omega-capture-desk__context">
          <p className="omega-section-eyebrow mb-0">Contexto</p>

          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Área</span>
            <select
              className={`${FIELD} ${FOCUS_VISIBLE}`}
              value={draft.sourceAreaId}
              onChange={(event) =>
                onChange({ ...draft, sourceAreaId: event.target.value })
              }
              required
            >
              <option value="" disabled>
                Seleccione
              </option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.code} · {area.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Fecha</span>
            <input
              type="date"
              className={`${FIELD} ${FOCUS_VISIBLE}`}
              value={draft.reportedAt}
              onChange={(event) =>
                onChange({ ...draft, reportedAt: event.target.value })
              }
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Observaciones</span>
            <textarea
              className={`${FIELD} min-h-[5.5rem] resize-y ${FOCUS_VISIBLE}`}
              value={draft.observations ?? ''}
              onChange={(event) =>
                onChange({ ...draft, observations: event.target.value })
              }
              placeholder="Notas opcionales…"
            />
          </label>

          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Adjuntos</span>
            <input
              type="file"
              multiple
              className={`${FIELD} ${FOCUS_VISIBLE} file:mr-3 file:border-0 file:bg-transparent file:px-0 file:text-xs file:font-medium file:text-slate-600`}
              onChange={handleAttachments}
            />
            {draft.attachmentNames && draft.attachmentNames.length > 0 ? (
              <ul className="mt-1 space-y-1 font-mono text-[0.68rem] text-slate-500">
                {draft.attachmentNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : null}
          </label>
        </aside>
      </div>

      <div className="mt-4 flex shrink-0 justify-end border-t border-slate-400/15 pt-3">
        <button
          type="submit"
          disabled={!canContinue}
          className={`omega-console-action px-4 py-2 text-sm font-semibold ${FOCUS_VISIBLE} ${
            canContinue
              ? 'bg-indigo-600/90 text-white hover:bg-indigo-600'
              : 'cursor-not-allowed bg-slate-300/50 text-slate-500'
          }`}
        >
          Continuar
        </button>
      </div>
    </form>
  )
}
