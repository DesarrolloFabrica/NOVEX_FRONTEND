import { useEffect, useId, type FormEvent } from 'react'
import type { IncidentCategorySummary } from '@/modules/situations/types/situation.types'
import type {
  OperationalSubmissionState,
  ReportDraft,
  ReportFormKind,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import { ResponsibleCoordinationPicker } from '@/modules/operational-cards/components/ResponsibleCoordinationPicker'

/**
 * FORMULARIO DE REPORTE, en el panel derecho.
 *
 *   INTERNAL  Destino = carta seleccionada; categorías del catálogo.
 *   INTER     Afectada fija (carta); selector de responsable externa;
 *             proceso afectado y entrega pendiente.
 */

const SEVERITY_OPTIONS: ReadonlyArray<{
  value: SituationSeverity
  label: string
  hint: string
}> = [
  { value: 'LOW', label: 'Baja', hint: 'Molestia puntual, sin bloqueo' },
  { value: 'MEDIUM', label: 'Media', hint: 'Afecta la operación del área' },
  { value: 'HIGH', label: 'Alta', hint: 'Bloquea a varias personas' },
  { value: 'CRITICAL', label: 'Crítica', hint: 'Detiene el servicio' },
]

export interface ResponsibleOption {
  id: string
  label: string
  /** Code para logo en el selector INTER. */
  code?: string
}

export interface ReportProblemFormProps {
  reportKind: ReportFormKind
  /** Nombre de PRODUCTO de la carta (afectada / destino INTERNAL por defecto). */
  affectedLabel: string | null
  categories: readonly IncidentCategorySummary[]
  categoriesError: string | null
  /** Opciones de responsable (INTER), sin incluir la carta seleccionada. */
  responsibleOptions: readonly ResponsibleOption[]
  /**
   * Selector de destino INTERNAL (vista COORDINADOR).
   * Si está presente, el formulario permite reportar un problema interno en
   * otra área sin cambiar la carta. Distinto de «coordinación responsable».
   */
  destinationOptions?: readonly ResponsibleOption[] | null
  /** UUID de la coordinación propia (opción por defecto del destino). */
  ownCoordinationId?: string | null
  draft: ReportDraft
  submission: OperationalSubmissionState
  onDraftChange: (patch: Partial<ReportDraft>) => void
  onSubmit: () => void
  /** Vuelve al panel idle sin enviar. */
  onCancel?: () => void
  maxOccurredAt: string
}

export function ReportProblemForm({
  reportKind,
  affectedLabel,
  categories,
  categoriesError,
  responsibleOptions,
  destinationOptions = null,
  ownCoordinationId = null,
  draft,
  submission,
  onDraftChange,
  onSubmit,
  onCancel,
  maxOccurredAt,
}: ReportProblemFormProps) {
  const idPrefijo = useId()
  const enviando = submission.status === 'sending' && submission.kind === 'report'
  const errorEnvio =
    submission.status === 'error' && submission.kind === 'report'
      ? submission.errorMessage
      : null

  const sinDestino = affectedLabel === null
  const esInter = reportKind === 'INTER_COORDINATION'
  const tieneSelectorDestino =
    !esInter && Boolean(destinationOptions && destinationOptions.length > 0)

  const destinoEfectivo =
    draft.internalDestinationCoordinationId.trim() ||
    ownCoordinationId ||
    ''

  const destinoLabel =
    destinationOptions?.find((option) => option.id === destinoEfectivo)?.label ??
    affectedLabel

  const pickerOptions = responsibleOptions.map((option) => ({
    id: option.id,
    label: option.label,
    code: option.code ?? '',
  }))

  /*
   * Si la carta/afectada cambia, las opciones se recalculan y la responsable
   * elegida puede quedar inválida (p. ej. era la nueva afectada). Se limpia
   * para pedir otra sin tocar el resto del borrador.
   */
  const responsibleOptionIds = responsibleOptions
    .map((option) => option.id)
    .join('|')
  useEffect(() => {
    if (!esInter || !draft.responsibleCoordinationId) return
    const stillValid = responsibleOptions.some(
      (option) => option.id === draft.responsibleCoordinationId,
    )
    if (!stillValid) {
      onDraftChange({ responsibleCoordinationId: '' })
    }
  }, [
    esInter,
    draft.responsibleCoordinationId,
    responsibleOptionIds,
    responsibleOptions,
    onDraftChange,
  ])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (enviando || sinDestino) return
    if (esInter && !draft.responsibleCoordinationId) return
    onSubmit()
  }

  return (
    <form
      className="report-form"
      data-testid="report-form"
      data-report-kind={reportKind}
      data-sending={enviando ? 'true' : undefined}
      onSubmit={handleSubmit}
    >
      <header className="report-form__header">
        <div className="report-form__header-row">
          <h2 className="report-form__heading">
            {esInter
              ? 'Dependencia de otra coordinación'
              : 'Problema interno'}
          </h2>
          {onCancel ? (
            <button
              type="button"
              className="report-form__back"
              data-testid="report-form-back"
              onClick={onCancel}
              disabled={enviando}
            >
              Volver
            </button>
          ) : null}
        </div>
        {sinDestino ? (
          <p
            className="report-form__destination report-form__destination--missing"
            data-testid="report-form-no-destination"
            role="status"
          >
            Seleccione una coordinación en las cartas para poder reportar.
          </p>
        ) : tieneSelectorDestino ? (
          <p
            className="report-form__destination"
            data-testid="report-form-destination"
          >
            Destino del registro:{' '}
            <strong>{destinoLabel ?? affectedLabel}</strong>
          </p>
        ) : (
          <p
            className="report-form__destination"
            data-testid="report-form-destination"
          >
            {esInter ? (
              <>
                Coordinación afectada:{' '}
                <strong>{affectedLabel}</strong>
              </>
            ) : (
              <>
                Se registrará en <strong>{affectedLabel}</strong>
              </>
            )}
          </p>
        )}
      </header>

      {tieneSelectorDestino ? (
        <div className="report-form__field">
          <label htmlFor={`${idPrefijo}-destination`}>
            Coordinación destino del problema interno
          </label>
          <select
            id={`${idPrefijo}-destination`}
            data-testid="report-internal-destination"
            value={destinoEfectivo}
            disabled={enviando}
            onChange={(e) =>
              onDraftChange({
                internalDestinationCoordinationId:
                  e.target.value === ownCoordinationId ? '' : e.target.value,
              })
            }
          >
            {destinationOptions!.map((option) => (
              <option key={option.id} value={option.id}>
                {option.id === ownCoordinationId
                  ? `${option.label} (mi coordinación)`
                  : option.label}
              </option>
            ))}
          </select>
          <p className="report-form__hint">
            Por defecto es su área. Elija otra solo si registra un problema
            interno hacia esa coordinación, sin abrir su lista ni su estado.
          </p>
        </div>
      ) : null}

      {esInter && (
        <div className="report-form__field">
          <ResponsibleCoordinationPicker
            options={pickerOptions}
            value={draft.responsibleCoordinationId}
            affectedLabel={affectedLabel ?? ''}
            disabled={enviando || responsibleOptions.length === 0}
            onChange={(coordinationId) =>
              onDraftChange({ responsibleCoordinationId: coordinationId })
            }
          />
        </div>
      )}

      <div className="report-form__field">
        <label htmlFor={`${idPrefijo}-title`}>Título</label>
        <input
          id={`${idPrefijo}-title`}
          data-testid="report-title"
          type="text"
          maxLength={200}
          required
          value={draft.title}
          disabled={enviando}
          onChange={(e) => onDraftChange({ title: e.target.value })}
        />
      </div>

      <div className="report-form__field">
        <label htmlFor={`${idPrefijo}-description`}>Descripción</label>
        <textarea
          id={`${idPrefijo}-description`}
          data-testid="report-description"
          rows={4}
          maxLength={4000}
          required
          value={draft.description}
          disabled={enviando}
          onChange={(e) => onDraftChange({ description: e.target.value })}
        />
      </div>

      {esInter ? (
        <>
          <div className="report-form__field">
            <label htmlFor={`${idPrefijo}-process`}>
              Proceso afectado que se retrasa o bloquea
            </label>
            <textarea
              id={`${idPrefijo}-process`}
              data-testid="report-affected-process"
              rows={2}
              maxLength={2000}
              required
              value={draft.affectedProcess}
              disabled={enviando}
              onChange={(e) =>
                onDraftChange({ affectedProcess: e.target.value })
              }
            />
          </div>
          <div className="report-form__field">
            <label htmlFor={`${idPrefijo}-pending`}>
              Entrega o acción pendiente de la coordinación responsable
            </label>
            <textarea
              id={`${idPrefijo}-pending`}
              data-testid="report-pending-delivery"
              rows={2}
              maxLength={2000}
              required
              value={draft.pendingDelivery}
              disabled={enviando}
              onChange={(e) =>
                onDraftChange({ pendingDelivery: e.target.value })
              }
            />
          </div>
        </>
      ) : (
        <div className="report-form__field">
          <label htmlFor={`${idPrefijo}-category`}>Categoría</label>
          <select
            id={`${idPrefijo}-category`}
            data-testid="report-category"
            required
            value={draft.categoryId}
            disabled={enviando || categories.length === 0}
            onChange={(e) => onDraftChange({ categoryId: e.target.value })}
          >
            <option value="">Seleccione…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {categoriesError && (
            <p className="report-form__hint report-form__hint--error">
              {categoriesError}
            </p>
          )}
        </div>
      )}

      <fieldset className="report-form__field report-form__severity">
        <legend>Severidad</legend>
        <div className="report-form__severity-options">
          {SEVERITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="report-form__severity-option"
              data-severity={option.value}
              data-selected={draft.severity === option.value ? 'true' : undefined}
            >
              <input
                type="radio"
                name={`${idPrefijo}-severity`}
                value={option.value}
                data-testid={`report-severity-${option.value}`}
                checked={draft.severity === option.value}
                disabled={enviando}
                onChange={() => onDraftChange({ severity: option.value })}
              />
              <span className="report-form__severity-label">{option.label}</span>
              <span className="report-form__severity-hint">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="report-form__field">
        <label htmlFor={`${idPrefijo}-occurred`}>¿Cuándo ocurrió?</label>
        <input
          id={`${idPrefijo}-occurred`}
          data-testid="report-occurred-at"
          type="datetime-local"
          required
          max={maxOccurredAt}
          value={draft.occurredAt}
          disabled={enviando}
          onChange={(e) => onDraftChange({ occurredAt: e.target.value })}
        />
      </div>

      {enviando && (
        <p className="report-form__note" data-testid="report-sending" role="status">
          Registrando el problema y generando su análisis…
        </p>
      )}

      {errorEnvio && (
        <p
          className="report-form__note report-form__note--error"
          data-testid="report-error"
          role="alert"
        >
          {errorEnvio}
        </p>
      )}

      <button
        type="submit"
        className="report-form__submit"
        data-testid="report-submit"
        disabled={
          enviando ||
          sinDestino ||
          (esInter && !draft.responsibleCoordinationId)
        }
      >
        {enviando ? 'Registrando…' : 'Registrar problema'}
      </button>
    </form>
  )
}
