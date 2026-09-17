import { useId, type FormEvent } from 'react'
import type { IncidentCategorySummary } from '@/modules/situations/types/situation.types'
import type {
  OperationalSubmissionState,
  ReportDraft,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'

/**
 * FORMULARIO DE REPORTE, en el panel derecho.
 *
 * DESTINO. El problema se registra en la coordinación SELECCIONADA en las
 * cartas, cuyo nombre se muestra sin ambigüedad: quien reporta debe saber a qué
 * área queda atribuido. Sin selección no se envía nada y el panel lo dice.
 *
 * SEVERIDAD VISIBLE. Arranca en MEDIUM y es editable. Antes viajaba fija y
 * oculta en el servicio de captura, de modo que el usuario registraba una
 * gravedad que no había elegido.
 *
 * BORRADOR. El texto vive en el estado de la experiencia, bajo la clave de su
 * coordinación, así que cambiar de carta o consultar un problema no lo pierde
 * ni lo traslada a otra área.
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

export interface ReportProblemFormProps {
  /** Nombre de PRODUCTO de la coordinación destino, o null sin selección. */
  coordinationLabel: string | null
  categories: readonly IncidentCategorySummary[]
  categoriesError: string | null
  draft: ReportDraft
  submission: OperationalSubmissionState
  /** Máximo local, espejo del contrato del backend. */
  onDraftChange: (patch: Partial<ReportDraft>) => void
  onSubmit: () => void
  /** Momento actual en formato `datetime-local`, para el tope del campo. */
  maxOccurredAt: string
}

export function ReportProblemForm({
  coordinationLabel,
  categories,
  categoriesError,
  draft,
  submission,
  onDraftChange,
  onSubmit,
  maxOccurredAt,
}: ReportProblemFormProps) {
  const idPrefijo = useId()
  const enviando = submission.status === 'sending' && submission.kind === 'report'
  const errorEnvio =
    submission.status === 'error' && submission.kind === 'report'
      ? submission.errorMessage
      : null

  const sinDestino = coordinationLabel === null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    // Doble cinturón contra el envío duplicado: el botón está deshabilitado y
    // aquí se vuelve a comprobar por si el submit llega por teclado.
    if (enviando || sinDestino) return
    onSubmit()
  }

  return (
    <form
      className="report-form"
      data-testid="report-form"
      data-sending={enviando ? 'true' : undefined}
      onSubmit={handleSubmit}
    >
      <header className="report-form__header">
        <h2 className="report-form__heading">Reportar problema</h2>
        {/*
          DESTINO SIEMPRE A LA VISTA. No se deduce: se declara.
        */}
        {sinDestino ? (
          <p
            className="report-form__destination report-form__destination--missing"
            data-testid="report-form-no-destination"
            role="status"
          >
            Seleccione una coordinación en las cartas para poder reportar.
          </p>
        ) : (
          <p
            className="report-form__destination"
            data-testid="report-form-destination"
          >
            Se registrará en <strong>{coordinationLabel}</strong>
          </p>
        )}
      </header>

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

      <fieldset className="report-form__field report-form__severity">
        <legend>Severidad</legend>
        {/*
          Visible y editable, con MEDIUM de partida. El texto acompaña siempre
          al color: la severidad nunca se comunica solo con el color.
        */}
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
          /* El backend rechaza fechas futuras; el campo lo impide antes. */
          max={maxOccurredAt}
          value={draft.occurredAt}
          disabled={enviando}
          onChange={(e) => onDraftChange({ occurredAt: e.target.value })}
        />
      </div>

      {/*
        ESTADO DE ENVÍO. El alta ejecuta además el análisis con IA, así que
        puede tardar; decirlo evita que parezca colgado y que se pulse dos veces.
      */}
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
        disabled={enviando || sinDestino}
      >
        {enviando ? 'Registrando…' : 'Registrar problema'}
      </button>
    </form>
  )
}
