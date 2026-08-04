// Paso 1 — captura: estación de trabajo en dos columnas.
// Izquierda: relato. Derecha: contexto operativo.

import type { FormEvent } from 'react'
import type { CoordinationSummary } from '@/modules/situations/types/situation.types'
import {
  AFFECTED_PARTY_OPTIONS,
  DETECTION_METHOD_OPTIONS,
  type SituationCaptureDraft,
} from '@/modules/situations/types/situation-capture.types'
import {
  CoordinationAutocomplete,
  CoordinationAutocompleteLegend,
} from '@/modules/operational-events/components/CoordinationAutocomplete'
import {
  contextQualityClass,
  DESCRIPTION_MIN_LENGTH_EXPORT,
  evaluateContextQuality,
} from '@/modules/operational-events/utils/contextQuality'
import {
  normalizeCaptureDate,
  todayCaptureDate,
} from '@/modules/operational-events/utils/situationCaptureDate'
import {
  DESCRIPTION_MAX_LENGTH,
  formatMissingRequirements,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  validateSituationCaptureDraft,
} from '@/modules/operational-events/utils/situationCaptureValidation'
import {
  FOCUS_VISIBLE,
  TEXT_LABEL,
} from '@/modules/monitoring/constants/monitoringTheme'

const FIELD =
  'novex-capture-field w-full min-w-0 border-0 bg-transparent px-3 py-2 text-sm text-slate-800 shadow-[inset_0_-1px_0_0_rgba(100,116,139,0.28)] placeholder:text-slate-500/65'
const FIELD_AREA = `${FIELD} resize-none`

const DESCRIPTION_MIN_LENGTH = DESCRIPTION_MIN_LENGTH_EXPORT
const DESCRIPTION_PLACEHOLDER =
  'Describe la situación con el mayor detalle posible.\n\nIncluye qué ocurrió, desde cuándo sucede, cómo fue detectada, qué procesos afecta y qué acciones se intentaron previamente.\n\nMientras más contexto proporciones, mejor será el análisis de la IA.'

interface EventCaptureFormProps {
  draft: SituationCaptureDraft
  coordinations: CoordinationSummary[]
  relatedCoordinations?: CoordinationSummary[]
  loadingCoordinations?: boolean
  coordinationLocked?: boolean
  onChange: (next: SituationCaptureDraft) => void
  onSubmit: () => void
  submitLabel?: string
  submitDisabled?: boolean
}

export function EventCaptureForm({
  draft,
  coordinations,
  relatedCoordinations,
  loadingCoordinations = false,
  coordinationLocked = false,
  onChange,
  onSubmit,
  submitLabel = 'Continuar',
  submitDisabled = false,
}: EventCaptureFormProps) {
  const descriptionLength = draft.description.trim().length
  const contextQuality = evaluateContextQuality(draft)
  const qualityClass = contextQualityClass(contextQuality)

  const validation = validateSituationCaptureDraft(
    draft,
    relatedCoordinations ?? coordinations,
    coordinations,
  )
  const canContinue = validation.valid

  const missingRequirements = validation.missingRequirements

  const selectedCoordination = coordinations.find(
    (item) => item.id === draft.coordinationId,
  )

  const reportedDate = normalizeCaptureDate(draft.reportedAt)

  function updateReportedDate(date: string) {
    onChange({
      ...draft,
      reportedAt: date ? normalizeCaptureDate(date) : '',
    })
  }

  function toggleAffectedParty(party: (typeof AFFECTED_PARTY_OPTIONS)[number]['value']) {
    const affectedParties = draft.affectedParties.includes(party)
      ? draft.affectedParties.filter((item) => item !== party)
      : [...draft.affectedParties, party]
    onChange({ ...draft, affectedParties })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canContinue || submitDisabled) return
    onSubmit()
  }

  return (
    <form
      data-tour="capture-form"
      className="novex-event-capture-form flex min-h-0 flex-1 flex-col"
      onSubmit={handleSubmit}
    >
      <div className="novex-capture-desk min-h-0 flex-1">
        <div className="novex-capture-desk__primary">
          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Título de la situación</span>
            <input
              className={`${FIELD} text-base font-medium`}
              value={draft.title}
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              maxLength={TITLE_MAX_LENGTH}
              minLength={TITLE_MIN_LENGTH}
              placeholder="Ej.: Caída total del SGP durante proceso de matrícula"
              required
            />
          </label>

          <fieldset className="block space-y-1.5">
            <legend className={TEXT_LABEL}>¿Cómo se detectó la situación?</legend>
            <select
              className={FIELD}
              value={draft.detectionMethod}
              onChange={(event) =>
                onChange({
                  ...draft,
                  detectionMethod:
                    event.target.value as SituationCaptureDraft['detectionMethod'],
                })
              }
              required
            >
              <option value="" disabled>
                Seleccione una opción
              </option>
              {DETECTION_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {draft.detectionMethod === 'OTRO' ? (
              <input
                className={FIELD}
                value={draft.detectionMethodOther}
                onChange={(event) =>
                  onChange({ ...draft, detectionMethodOther: event.target.value })
                }
                placeholder="Especifique cómo se detectó"
                required
              />
            ) : null}
          </fieldset>

          <label className="novex-capture-description-block block min-h-0 flex-1 space-y-1.5">
            <span className={TEXT_LABEL}>Describa la situación</span>
            <textarea
              className={`${FIELD_AREA} novex-capture-description`}
              value={draft.description}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              minLength={DESCRIPTION_MIN_LENGTH}
              maxLength={DESCRIPTION_MAX_LENGTH}
              placeholder={DESCRIPTION_PLACEHOLDER}
              required
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="novex-capture-field__hint">
                {descriptionLength} caracteres
              </span>
              <div
                className={`novex-capture-quality is-${qualityClass}`}
                aria-live="polite"
              >
                <span>Calidad del contexto</span>
                <strong>
                  <i aria-hidden="true" />
                  {contextQuality}
                </strong>
              </div>
            </div>
          </label>
        </div>

        <aside className="novex-capture-desk__context">
          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Coordinación responsable</span>
            <select
              className={FIELD}
              value={draft.coordinationId}
              onChange={(event) =>
                onChange({ ...draft, coordinationId: event.target.value })
              }
              required
              disabled={loadingCoordinations || coordinationLocked}
              title={
                selectedCoordination
                  ? `${selectedCoordination.code} · ${selectedCoordination.name}`
                  : undefined
              }
            >
              <option value="" disabled>
                {loadingCoordinations
                  ? 'Cargando coordinaciones…'
                  : 'Elija la coordinación'}
              </option>
              {coordinations.map((coordination) => (
                <option
                  key={coordination.id}
                  value={coordination.id}
                  title={`${coordination.code} · ${coordination.name}`}
                >
                  {coordination.code} · {coordination.name}
                </option>
              ))}
            </select>
            <span className="novex-capture-field__hint">
              Coordinación donde se originó principalmente la situación.
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Fecha de ocurrencia</span>
            <input
              type="date"
              className={FIELD}
              value={reportedDate}
              max={todayCaptureDate()}
              onChange={(event) => updateReportedDate(event.target.value)}
              required
            />
            <span className="novex-capture-field__hint">
              Día en que ocurrió la situación. Por defecto es hoy; puede elegir
              una fecha anterior si el hecho sucedió otro día.
            </span>
          </label>

          <fieldset className="novex-capture-related-coordinations block space-y-1.5">
            <CoordinationAutocompleteLegend />
            <CoordinationAutocomplete
              coordinations={relatedCoordinations ?? coordinations}
              selectedIds={draft.relatedCoordinationIds}
              onChange={(relatedCoordinationIds) =>
                onChange({ ...draft, relatedCoordinationIds })
              }
            />
          </fieldset>

          <fieldset className="novex-capture-affected-parties space-y-2">
            <legend className={TEXT_LABEL}>
              ¿Quiénes considera que están siendo afectados?
            </legend>
            <div className="novex-capture-chips">
              {AFFECTED_PARTY_OPTIONS.map((option) => {
                const checked = draft.affectedParties.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`novex-capture-chip${checked ? ' is-selected' : ''}`}
                    aria-pressed={checked}
                    onClick={() => toggleAffectedParty(option.value)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            {draft.affectedParties.includes('OTRO') ? (
              <input
                className={FIELD}
                value={draft.affectedPartyOther}
                onChange={(event) =>
                  onChange({ ...draft, affectedPartyOther: event.target.value })
                }
                placeholder="Especifique quiénes están siendo afectados"
                required
              />
            ) : null}
            <span className="novex-capture-field__hint">
              Percepción inicial del reportante. La IA validará el impacto real.
            </span>
          </fieldset>

          <label className="block space-y-1.5">
            <span className={TEXT_LABEL}>Notas adicionales</span>
            <textarea
              className={`${FIELD} min-h-16 max-h-24 resize-none`}
              value={draft.additionalNotes}
              onChange={(event) =>
                onChange({ ...draft, additionalNotes: event.target.value })
              }
              placeholder="Información adicional que se guardará como evidencia en el expediente."
            />
          </label>
        </aside>
      </div>

      <div className="novex-capture-actions flex shrink-0 items-center justify-between gap-4 pt-2.5">
        <p className="novex-capture-validation" aria-live="polite">
          {formatMissingRequirements(missingRequirements)}
        </p>
        <button
          type="submit"
          disabled={!canContinue || submitDisabled}
          className={`novex-console-action px-4 py-2 text-sm font-semibold ${FOCUS_VISIBLE} ${
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
