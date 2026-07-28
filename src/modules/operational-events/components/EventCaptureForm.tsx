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
  'cunmark-capture-field w-full min-w-0 border-0 bg-transparent px-3 py-2 text-sm text-slate-800 shadow-[inset_0_-1px_0_0_rgba(100,116,139,0.28)] placeholder:text-slate-500/65'
const FIELD_AREA = `${FIELD} min-h-[8rem] resize-none`

const TITLE_MIN_LENGTH = 8
const DESCRIPTION_MIN_LENGTH = 80
const DESCRIPTION_IDEAL_LENGTH = 150
const AFFECTED_AREA_OPTIONS = [
  'Registro',
  'Tecnología',
  'Bienestar',
  'Biblioteca',
  'LMS',
  'Admisiones',
  'Financiera',
] as const

interface CaptureContext {
  urgency: string
  affectedAreas: string[]
  otherAffectedArea: string
}

interface EventCaptureFormProps {
  draft: OperationalEventDraft
  areas: OperationalArea[]
  captureContext: CaptureContext
  onChange: (next: OperationalEventDraft) => void
  onCaptureContextChange: (next: CaptureContext) => void
  onSubmit: () => void
  submitLabel?: string
  submitDisabled?: boolean
}

export function EventCaptureForm({
  draft,
  areas,
  captureContext,
  onChange,
  onCaptureContextChange,
  onSubmit,
  submitLabel = 'Continuar',
  submitDisabled = false,
}: EventCaptureFormProps) {
  const canContinue =
    draft.title.trim().length >= TITLE_MIN_LENGTH &&
    draft.description.trim().length >= DESCRIPTION_MIN_LENGTH &&
    draft.sourceAreaId.length > 0 &&
    draft.reportedAt.length > 0

  const descriptionLength = draft.description.trim().length
  const hasAttachments = Boolean(draft.attachmentNames?.length)
  const contextSignals = [
    descriptionLength >= DESCRIPTION_IDEAL_LENGTH,
    Boolean(draft.sourceAreaId),
    Boolean(draft.reportedAt),
    captureContext.affectedAreas.length > 0 ||
      Boolean(captureContext.otherAffectedArea.trim()),
    captureContext.urgency !== 'Normal',
    Boolean(draft.observations?.trim()),
    hasAttachments,
  ].filter(Boolean).length
  const contextQuality =
    descriptionLength < DESCRIPTION_MIN_LENGTH
      ? 'Insuficiente'
      : contextSignals >= 5
        ? 'Completo'
        : 'Aceptable'
  const qualityClass = contextQuality.toLowerCase()

  const missingRequirements = [
    draft.title.trim().length < TITLE_MIN_LENGTH
      ? 'un título claro y específico'
      : null,
    draft.description.trim().length < DESCRIPTION_MIN_LENGTH
      ? 'más contexto operativo (qué ocurrió, desde cuándo y a quién afecta)'
      : null,
    !draft.sourceAreaId ? 'área' : null,
    !draft.reportedAt ? 'fecha y hora' : null,
  ].filter((requirement): requirement is string => requirement !== null)

  const selectedArea = areas.find((area) => area.id === draft.sourceAreaId)
  const selectedAreaLabel = selectedArea
    ? `${selectedArea.code} · ${selectedArea.name}`
    : undefined

  const [reportedDate = '', reportedTime = ''] = draft.reportedAt.split('T')

  function updateReportedAt(date: string, time: string) {
    onChange({ ...draft, reportedAt: date && time ? `${date}T${time}` : date })
  }

  function toggleAffectedArea(area: string) {
    const affectedAreas = captureContext.affectedAreas.includes(area)
      ? captureContext.affectedAreas.filter((item) => item !== area)
      : [...captureContext.affectedAreas, area]
    onCaptureContextChange({ ...captureContext, affectedAreas })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canContinue || submitDisabled) return
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
    <form className="cunmark-event-capture-form flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="cunmark-capture-desk min-h-0 flex-1">
        <div className="cunmark-capture-desk__primary">
          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Título de la situación</span>
            <input
              className={`${FIELD} text-base font-medium`}
              value={draft.title}
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              maxLength={120}
              minLength={TITLE_MIN_LENGTH}
              placeholder="Ej.: Caída total del SGP durante proceso de matrícula"
              required
            />
            <span className="cunmark-capture-field__hint">
              Describe la situación en una frase clara y específica. Máximo 120 caracteres.
            </span>
          </label>

          <label className="block min-h-0 flex-1 space-y-1.5">
            <span className={TEXT_LABEL}>Describa la situación</span>
            <textarea
              className={FIELD_AREA}
              value={draft.description}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              minLength={DESCRIPTION_MIN_LENGTH}
              placeholder={'Explique:\n\n• ¿Qué ocurrió?\n• ¿Desde cuándo ocurre?\n• ¿Quién detectó la situación?\n• ¿Qué procesos están afectados?\n• ¿Qué usuarios o áreas se han visto impactados?\n• ¿Qué acciones se intentaron previamente (si aplica)?'}
              required
            />
            <span className="cunmark-capture-field__hint">
              {descriptionLength < DESCRIPTION_MIN_LENGTH
                ? `Mínimo ${DESCRIPTION_MIN_LENGTH} caracteres · faltan ${DESCRIPTION_MIN_LENGTH - descriptionLength} para dar contexto suficiente`
                : descriptionLength < DESCRIPTION_IDEAL_LENGTH
                  ? `${descriptionLength} caracteres · idealmente ${DESCRIPTION_IDEAL_LENGTH}+ para un análisis más confiable`
                  : `${descriptionLength} caracteres · contexto detallado`}
            </span>
          </label>
        </div>

        <aside className="cunmark-capture-desk__context">
          <p className="cunmark-section-hint mb-0">
            Complete los datos que ayudarán a entender el impacto de la situación.
          </p>

          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Área responsable</span>
            <select
              className={FIELD}
              value={draft.sourceAreaId}
              onChange={(event) =>
                onChange({ ...draft, sourceAreaId: event.target.value })
              }
              required
              title={selectedAreaLabel}
            >
              <option value="" disabled>
                Elija el área
              </option>
              {areas.map((area) => (
                <option key={area.id} value={area.id} title={`${area.code} · ${area.name}`}>
                  {area.code} · {area.name}
                </option>
              ))}
            </select>
            <span className="cunmark-capture-field__hint">
              Seleccione el área donde se originó principalmente la situación.
            </span>
          </label>

          <fieldset className="block space-y-1.5">
            <legend className={TEXT_LABEL}>Fecha y hora</legend>
            <div className="cunmark-capture-date-time">
              <input
                type="date"
                className={FIELD}
                value={reportedDate}
                onChange={(event) => updateReportedAt(event.target.value, reportedTime)}
                required
              />
              <input
                type="time"
                className={FIELD}
                value={reportedTime}
                onChange={(event) => updateReportedAt(reportedDate, event.target.value)}
                required
              />
            </div>
            <span className="cunmark-capture-field__hint">
              Registre cuándo ocurrió o se detectó el incidente.
            </span>
          </fieldset>

          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Nivel de urgencia</span>
            <select
              className={FIELD}
              value={captureContext.urgency}
              onChange={(event) =>
                onCaptureContextChange({
                  ...captureContext,
                  urgency: event.target.value,
                })
              }
            >
              <option>No urgente</option>
              <option>Normal</option>
              <option>Alta</option>
              <option>Crítica</option>
            </select>
            <span className="cunmark-capture-field__hint">
              No determina el riesgo. Solo representa su percepción inicial; la IA lo recalculará.
            </span>
          </label>

          <fieldset className="cunmark-capture-affected-areas space-y-1.5">
            <legend className={TEXT_LABEL}>Personas o áreas afectadas</legend>
            <div className="cunmark-capture-chips" role="group" aria-label="Áreas afectadas">
              {AFFECTED_AREA_OPTIONS.map((area) => {
                const isSelected = captureContext.affectedAreas.includes(area)
                return (
                  <button
                    key={area}
                    type="button"
                    className={`cunmark-capture-chip ${isSelected ? 'is-selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => toggleAffectedArea(area)}
                  >
                    {area}
                  </button>
                )
              })}
              <button
                type="button"
                className={`cunmark-capture-chip ${captureContext.otherAffectedArea ? 'is-selected' : ''}`}
                onClick={() =>
                  document.getElementById('other-affected-area')?.focus()
                }
              >
                Otra…
              </button>
            </div>
            <input
              id="other-affected-area"
              className={FIELD}
              value={captureContext.otherAffectedArea}
              onChange={(event) =>
                onCaptureContextChange({
                  ...captureContext,
                  otherAffectedArea: event.target.value,
                })
              }
              placeholder="Indique otra área o grupo afectado"
            />
          </fieldset>

          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Evidencias adicionales</span>
            <textarea
              className={`${FIELD} min-h-16 max-h-22 resize-none`}
              value={draft.observations ?? ''}
              onChange={(event) =>
                onChange({ ...draft, observations: event.target.value })
              }
              placeholder={'Ejemplo:\n• Mensajes recibidos\n• Correos\n• Capturas\n• Información entregada por otra área'}
            />
            <span className="cunmark-capture-field__hint">Opcional.</span>
          </label>

          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Archivos</span>
            <input
              type="file"
              multiple
              className={`${FIELD} file:mr-3 file:border-0 file:bg-transparent file:px-0 file:text-xs file:font-medium file:text-slate-600`}
              onChange={handleAttachments}
            />
            <span className="cunmark-capture-field__hint">
              Adjunte capturas, documentos o evidencias relacionadas.
            </span>
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

      <div className="cunmark-capture-actions mt-3 flex shrink-0 items-center justify-between gap-4 border-t border-slate-400/15 pt-2.5">
        <div className="cunmark-capture-actions__context">
          <div className={`cunmark-capture-quality is-${qualityClass}`} aria-live="polite">
            <span>Calidad del contexto</span>
            <strong><i aria-hidden="true" />{contextQuality}</strong>
          </div>
          <p className="cunmark-capture-validation" aria-live="polite">
            {canContinue
              ? 'La IA analizará: contexto operativo, impacto potencial, riesgos, áreas afectadas, prioridad y recomendaciones.'
              : missingRequirements.length === 1
                ? `Todavía falta ${missingRequirements[0]} para que la IA pueda generar un análisis confiable.`
                : `Todavía falta completar ${missingRequirements.join(', ')}.`}
          </p>
        </div>
        <button
          type="submit"
          disabled={!canContinue || submitDisabled}
          title={
            canContinue
              ? 'Analizar la situación con IA'
              : `Completa: ${missingRequirements.join(', ')}`
          }
          className={`cunmark-console-action px-4 py-2 text-sm font-semibold ${FOCUS_VISIBLE} ${
            canContinue && !submitDisabled
              ? 'bg-emerald-600/90 text-white hover:bg-emerald-600'
              : 'cursor-not-allowed bg-slate-300/50 text-slate-500'
          }`}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
