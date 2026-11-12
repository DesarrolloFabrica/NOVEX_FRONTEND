import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { IncidentCategorySummary } from '@/modules/situations/types/situation.types'
import type {
  OperationalSubmissionState,
  ReportDraft,
  ReportFormKind,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import { ResponsibleCoordinationPicker } from '@/modules/operational-cards/components/ResponsibleCoordinationPicker'
import { RelatedCoordinationsPicker } from '@/modules/operational-cards/components/RelatedCoordinationsPicker'
import {
  CATEGORY_OTHER_TEXT_MAX,
  CATEGORY_OTHER_TEXT_MIN,
  categoryRequiresOtherText,
  validateCategoryOtherText,
} from '@/modules/operational-cards/data/reportCategories'
import { sanitizeRelatedIds } from '@/modules/operational-cards/data/relatedCoordinationsPicker'
import '@/styles/report-form-related.css'

/**
 * FORMULARIO UNIFICADO DE REGISTRO, en el panel derecho.
 *
 * Un solo flujo con selector de tipo:
 *   INTERNAL  En mi coordinación (carta seleccionada).
 *   INTER     Dependo de otra coordinación (afectada = carta; responsable
 *             externa; proceso y entrega pendiente).
 *
 * Los campos comunes se conservan al cambiar de tipo; los específicos solo
 * se muestran (y validan/envían) cuando corresponden.
 *
 * En los dos tipos se pueden declarar COORDINACIONES RELACIONADAS (contexto,
 * no responsables). En INTERNAL, la categoría «Otra» abre un campo
 * obligatorio para escribir la categoría propia.
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
   * Coordinaciones que se pueden relacionar, sin la carta seleccionada (propia
   * o afectada). El formulario descarta además la responsable elegida.
   */
  relatedOptions?: readonly ResponsibleOption[]
  draft: ReportDraft
  submission: OperationalSubmissionState
  onDraftChange: (patch: Partial<ReportDraft>) => void
  /** Cambia el tipo sin reiniciar el borrador común. */
  onReportKindChange?: (kind: ReportFormKind) => void
  onSubmit: () => void
  /** Vuelve al panel idle sin enviar. */
  onCancel?: () => void
  maxOccurredAt: string
  /**
   * Quien reporta pertenece a la coordinación de la carta (COORDINADOR). El
   * ANALISTA no tiene coordinación propia: no se le habla de «mi coordinación».
   */
  ownCoordination?: boolean
}

const EMPTY_OPTIONS: readonly ResponsibleOption[] = []

type RequiredField =
  | 'responsible'
  | 'title'
  | 'description'
  | 'process'
  | 'pending'
  | 'category'
  | 'occurred'

/** Orden de lectura: el foco va al primer campo con error. */
const FIELD_ORDER: readonly RequiredField[] = [
  'responsible',
  'title',
  'description',
  'process',
  'pending',
  'category',
  'occurred',
]

/** Sufijo del `id` de cada control (el selector de responsable no tiene uno). */
const FIELD_INPUT_SUFFIX: Record<RequiredField, string> = {
  responsible: 'responsible',
  title: 'title',
  description: 'description',
  process: 'process',
  pending: 'pending',
  category: 'category',
  occurred: 'occurred',
}

export function ReportProblemForm({
  reportKind,
  affectedLabel,
  categories,
  categoriesError,
  responsibleOptions,
  relatedOptions = EMPTY_OPTIONS,
  draft,
  submission,
  onDraftChange,
  onReportKindChange,
  onSubmit,
  onCancel,
  maxOccurredAt,
  ownCoordination = true,
}: ReportProblemFormProps) {
  const idPrefijo = useId()
  const enviando =
    submission.status === 'sending' && submission.kind === 'report'
  const errorEnvio =
    submission.status === 'error' && submission.kind === 'report'
      ? submission.errorMessage
      : null

  const sinDestino = affectedLabel === null
  const esInter = reportKind === 'INTER_COORDINATION'

  const pickerOptions = responsibleOptions.map((option) => ({
    id: option.id,
    label: option.label,
    code: option.code ?? '',
  }))
  const relatedPickerOptions = relatedOptions.map((option) => ({
    id: option.id,
    label: option.label,
    code: option.code ?? '',
  }))

  // Borradores guardados antes de estos campos pueden no traerlos.
  const relatedIds = draft.relatedCoordinationIds ?? []
  const categoryOtherText = draft.categoryOtherText ?? ''
  const excludedRelatedId = esInter ? draft.responsibleCoordinationId : ''
  const relatedExcluded = excludedRelatedId ? [excludedRelatedId] : []

  /*
   * La selección de relacionadas nunca contiene a la responsable ni una
   * coordinación que ya no se ofrece (cambio de carta, catálogo recargado).
   * Se depura en el borrador para que lo que se ve sea lo que se envía.
   */
  const relatedOptionIds = relatedOptions.map((option) => option.id).join('|')
  const relatedIdsKey = relatedIds.join('|')
  useEffect(() => {
    if (relatedIdsKey === '' || relatedOptionIds === '') return
    const known = new Set(relatedOptionIds.split('|'))
    const clean = sanitizeRelatedIds(
      relatedIdsKey.split('|'),
      [excludedRelatedId],
      known,
    )
    if (clean.join('|') !== relatedIdsKey) {
      onDraftChange({ relatedCoordinationIds: clean })
    }
  }, [relatedIdsKey, relatedOptionIds, excludedRelatedId, onDraftChange])

  /* «Otra»: categoría escrita obligatoria, con error inline. */
  const esOtra =
    !esInter && categoryRequiresOtherText(categories, draft.categoryId)
  const otherError = esOtra ? validateCategoryOtherText(categoryOtherText) : null
  const [otherTouched, setOtherTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const showOtherError =
    otherError !== null && (otherTouched || submitAttempted)

  /*
   * Validación propia de los obligatorios: mensajes junto a cada campo, en el
   * idioma de la interfaz. Antes se apoyaba en el globo nativo del navegador
   * (en el idioma del navegador y fuera del diseño) y, en INTER sin
   * responsable, el envío no hacía nada sin explicar por qué.
   */
  const fieldErrors: Partial<Record<RequiredField, string>> = {}
  if (!draft.title.trim()) fieldErrors.title = 'Escriba un título.'
  if (!draft.description.trim())
    fieldErrors.description = 'Describa qué está pasando.'
  if (esInter) {
    if (!draft.responsibleCoordinationId)
      fieldErrors.responsible = 'Elija la coordinación responsable.'
    if (!draft.affectedProcess.trim())
      fieldErrors.process = 'Indique el proceso que se retrasa o bloquea.'
    if (!draft.pendingDelivery.trim())
      fieldErrors.pending = 'Indique la entrega o acción pendiente.'
  } else if (!draft.categoryId) {
    fieldErrors.category = 'Elija una categoría.'
  }
  if (!draft.occurredAt) fieldErrors.occurred = 'Indique cuándo ocurrió.'
  const errorOf = (field: RequiredField) =>
    submitAttempted ? fieldErrors[field] : undefined
  const errorId = (field: RequiredField) => `${idPrefijo}-${field}-error`
  const describedBy = (field: RequiredField, ...others: Array<string | undefined>) =>
    [errorOf(field) ? errorId(field) : undefined, ...others]
      .filter(Boolean)
      .join(' ') || undefined
  const fieldError = (field: RequiredField) =>
    errorOf(field) ? (
      <p
        className="report-form__hint report-form__hint--error"
        id={errorId(field)}
        data-testid={`report-${field}-error`}
        role="alert"
      >
        {errorOf(field)}
      </p>
    ) : null
  const otherInputRef = useRef<HTMLInputElement>(null)
  const focusOtherRef = useRef(false)
  useEffect(() => {
    if (esOtra && focusOtherRef.current) {
      focusOtherRef.current = false
      otherInputRef.current?.focus()
    }
  }, [esOtra])

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
    const firstInvalid = FIELD_ORDER.find((field) => fieldErrors[field])
    if (firstInvalid || otherError) {
      setSubmitAttempted(true)
      // El foco va al primer campo con error, en el orden en que se lee.
      if (firstInvalid) {
        document
          .getElementById(`${idPrefijo}-${FIELD_INPUT_SUFFIX[firstInvalid]}`)
          ?.focus()
      } else {
        otherInputRef.current?.focus()
      }
      return
    }
    onSubmit()
  }

  return (
    <form
      className="report-form"
      data-testid="report-form"
      data-report-kind={reportKind}
      data-sending={enviando ? 'true' : undefined}
      // Los obligatorios se validan con mensajes propios, no con el globo nativo.
      noValidate
      onSubmit={handleSubmit}
    >
      <header className="report-form__header">
        <div className="report-form__header-row">
          <h2 className="report-form__heading">Registrar situación</h2>
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
        ) : (
          <p
            className="report-form__destination"
            data-testid="report-form-destination"
          >
            {esInter ? (
              <>
                Coordinación afectada: <strong>{affectedLabel}</strong>
              </>
            ) : (
              <>
                Se registrará en <strong>{affectedLabel}</strong>
              </>
            )}
          </p>
        )}
      </header>

      <section className="report-form__step" data-step="1">
        <h3 className="report-form__step-title">
          <span className="report-form__step-num" aria-hidden="true">
            1
          </span>
          ¿Dónde ocurre?
        </h3>
        <fieldset
          className="report-form__field report-form__kind"
          data-testid="report-kind-fieldset"
        >
          <legend>Tipo de situación</legend>
          <div
            className="report-form__kind-options"
            role="radiogroup"
            aria-label="Tipo de situación"
          >
            <label
              className="report-form__kind-option"
              data-selected={reportKind === 'INTERNAL' ? 'true' : undefined}
            >
              <input
                type="radio"
                name={`${idPrefijo}-kind`}
                value="INTERNAL"
                data-testid="report-kind-internal"
                checked={reportKind === 'INTERNAL'}
                disabled={enviando || !onReportKindChange}
                onChange={() => onReportKindChange?.('INTERNAL')}
              />
              <span className="report-form__kind-label">
                {ownCoordination ? 'En mi coordinación' : 'En la coordinación seleccionada'}
              </span>
              <span className="report-form__kind-hint">
                {ownCoordination
                  ? 'Situación interna de su área'
                  : `Situación interna de ${affectedLabel ?? 'la coordinación seleccionada'}`}
              </span>
            </label>
            <label
              className="report-form__kind-option"
              data-selected={
                reportKind === 'INTER_COORDINATION' ? 'true' : undefined
              }
            >
              <input
                type="radio"
                name={`${idPrefijo}-kind`}
                value="INTER_COORDINATION"
                data-testid="report-kind-inter"
                checked={reportKind === 'INTER_COORDINATION'}
                disabled={enviando || !onReportKindChange}
                onChange={() => onReportKindChange?.('INTER_COORDINATION')}
              />
              <span className="report-form__kind-label">
                {ownCoordination ? 'Dependo de otra coordinación' : 'Depende de otra coordinación'}
              </span>
              <span className="report-form__kind-hint">
                {ownCoordination
                  ? 'Otra área debe resolver algo que nos afecta'
                  : `Otra área debe resolver algo que afecta a ${affectedLabel ?? 'esta coordinación'}`}
              </span>
            </label>
          </div>
        </fieldset>

        {esInter && (
          <div className="report-form__field">
            <ResponsibleCoordinationPicker
              options={pickerOptions}
              value={draft.responsibleCoordinationId}
              affectedLabel={affectedLabel ?? ''}
              disabled={enviando || responsibleOptions.length === 0}
              showError={Boolean(errorOf('responsible'))}
              onChange={(coordinationId) =>
                onDraftChange({
                  responsibleCoordinationId: coordinationId,
                  // La responsable no puede figurar además como relacionada.
                  relatedCoordinationIds: relatedIds.filter(
                    (id) => id !== coordinationId,
                  ),
                })
              }
            />
          </div>
        )}

        <div className="report-form__field report-form__related">
          <RelatedCoordinationsPicker
            options={relatedPickerOptions}
            value={relatedIds}
            excludedIds={relatedExcluded}
            disabled={enviando}
            onChange={(ids) => onDraftChange({ relatedCoordinationIds: ids })}
          />
        </div>
      </section>

      <section className="report-form__step" data-step="2">
        <h3 className="report-form__step-title">
          <span className="report-form__step-num" aria-hidden="true">
            2
          </span>
          ¿Qué pasa?
        </h3>
        <div className="report-form__field">
          <label htmlFor={`${idPrefijo}-title`}>Título</label>
          <input
            id={`${idPrefijo}-title`}
            data-testid="report-title"
            type="text"
            maxLength={200}
            required
            aria-invalid={Boolean(errorOf('title'))}
            aria-describedby={describedBy('title')}
            data-initial-focus="true"
            placeholder="Ej.: Falla el acceso al aula virtual"
            value={draft.title}
            disabled={enviando}
            onChange={(e) => onDraftChange({ title: e.target.value })}
          />
          {fieldError('title')}
        </div>

        <div className="report-form__field">
          <label htmlFor={`${idPrefijo}-description`}>Descripción</label>
          <textarea
            id={`${idPrefijo}-description`}
            data-testid="report-description"
            rows={4}
            maxLength={4000}
            required
            placeholder="Describa qué está fallando, desde cuándo y a quién afecta."
            value={draft.description}
            disabled={enviando}
            aria-invalid={Boolean(errorOf('description'))}
            aria-describedby={describedBy(
              'description',
              esInter ? undefined : `${idPrefijo}-description-hint`,
            )}
            onChange={(e) => onDraftChange({ description: e.target.value })}
          />
          {fieldError('description')}
          {!esInter && (
            <p
              className="report-form__hint"
              id={`${idPrefijo}-description-hint`}
            >
              Qué está fallando. Las consecuencias van en «Afectación inicial».
            </p>
          )}
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
                aria-invalid={Boolean(errorOf('process'))}
                aria-describedby={describedBy('process')}
                value={draft.affectedProcess}
                disabled={enviando}
                onChange={(e) =>
                  onDraftChange({ affectedProcess: e.target.value })
                }
              />
              {fieldError('process')}
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
                aria-invalid={Boolean(errorOf('pending'))}
                aria-describedby={describedBy('pending')}
                value={draft.pendingDelivery}
                disabled={enviando}
                onChange={(e) =>
                  onDraftChange({ pendingDelivery: e.target.value })
                }
              />
              {fieldError('pending')}
            </div>
          </>
        ) : (
          <div className="report-form__field">
            <label htmlFor={`${idPrefijo}-category`}>Categoría</label>
            <select
              id={`${idPrefijo}-category`}
              data-testid="report-category"
              required
              aria-invalid={Boolean(errorOf('category'))}
              aria-describedby={describedBy('category')}
              value={draft.categoryId}
              disabled={enviando || categories.length === 0}
              aria-controls={esOtra ? `${idPrefijo}-category-other` : undefined}
              onChange={(e) => {
                const categoryId = e.target.value
                if (categoryRequiresOtherText(categories, categoryId)) {
                  focusOtherRef.current = true
                }
                onDraftChange({ categoryId })
              }}
            >
              <option value="">Seleccione…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fieldError('category')}
            {categoriesError && (
              <p className="report-form__hint report-form__hint--error">
                {categoriesError}
              </p>
            )}
          </div>
        )}

        {esOtra && (
          <div
            className="report-form__field report-form__other-category"
            data-testid="report-category-other-field"
            data-invalid={showOtherError ? 'true' : undefined}
          >
            <label htmlFor={`${idPrefijo}-category-other`}>
              ¿Qué categoría es?
            </label>
            <input
              ref={otherInputRef}
              id={`${idPrefijo}-category-other`}
              data-testid="report-category-other"
              type="text"
              maxLength={CATEGORY_OTHER_TEXT_MAX}
              aria-required="true"
              aria-invalid={showOtherError}
              aria-describedby={
                showOtherError
                  ? `${idPrefijo}-category-other-error ${idPrefijo}-category-other-hint`
                  : `${idPrefijo}-category-other-hint`
              }
              placeholder="Ej.: Biblioteca, Laboratorios, Transporte"
              value={categoryOtherText}
              disabled={enviando}
              onChange={(e) =>
                onDraftChange({ categoryOtherText: e.target.value })
              }
              onBlur={() => setOtherTouched(true)}
            />
            <p
              className="report-form__hint report-form__other-hint"
              id={`${idPrefijo}-category-other-hint`}
            >
              <span>
                Nómbrela en pocas palabras ({CATEGORY_OTHER_TEXT_MIN} a{' '}
                {CATEGORY_OTHER_TEXT_MAX} caracteres).
              </span>
              <span
                className="report-form__other-count"
                data-testid="report-category-other-count"
                aria-hidden="true"
              >
                {categoryOtherText.trim().length}/{CATEGORY_OTHER_TEXT_MAX}
              </span>
            </p>
            {showOtherError && (
              <p
                className="report-form__hint report-form__hint--error report-form__other-error"
                id={`${idPrefijo}-category-other-error`}
                data-testid="report-category-other-error"
                role="alert"
              >
                {otherError}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="report-form__step" data-step="3">
        <h3 className="report-form__step-title">
          <span className="report-form__step-num" aria-hidden="true">
            3
          </span>
          ¿Qué tan grave y cuándo?
        </h3>
        <fieldset className="report-form__field report-form__severity">
          <legend>{esInter ? 'Severidad' : '¿Qué tan grave es ahora?'}</legend>
          <div className="report-form__severity-options">
            {SEVERITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="report-form__severity-option"
                data-severity={option.value}
                data-selected={
                  draft.severity === option.value ? 'true' : undefined
                }
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
                <span className="report-form__severity-label">
                  {option.label}
                </span>
                <span className="report-form__severity-hint">
                  {option.hint}
                </span>
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
            aria-invalid={Boolean(errorOf('occurred'))}
            aria-describedby={describedBy('occurred')}
            max={maxOccurredAt}
            value={draft.occurredAt}
            disabled={enviando}
            onChange={(e) => onDraftChange({ occurredAt: e.target.value })}
          />
          {fieldError('occurred')}
        </div>
      </section>

      {!esInter && (
        <section className="report-form__step" data-step="4">
          <h3 className="report-form__step-title">
            <span className="report-form__step-num" aria-hidden="true">
              4
            </span>
            ¿Qué consecuencias tuvo?
            <span className="report-form__step-optional">Opcional</span>
          </h3>
          <div className="report-form__field">
            <label htmlFor={`${idPrefijo}-consequence`}>
              Afectación inicial (opcional)
            </label>
            <textarea
              id={`${idPrefijo}-consequence`}
              data-testid="report-initial-consequence"
              rows={2}
              maxLength={2000}
              value={draft.initialConsequence}
              disabled={enviando}
              aria-describedby={`${idPrefijo}-consequence-hint`}
              placeholder="Ej.: Se retrasó la entrega de dos contenidos."
              onChange={(e) =>
                onDraftChange({ initialConsequence: e.target.value })
              }
            />
            <p
              className="report-form__hint"
              id={`${idPrefijo}-consequence-hint`}
            >
              ¿Qué se retrasó, bloqueó o no se pudo hacer como consecuencia de
              esta situación?
            </p>
          </div>
        </section>
      )}

      <div className="report-form__footer">
        {enviando && (
          <p
            className="report-form__note"
            data-testid="report-sending"
            role="status"
          >
            Registrando la situación…
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
          {enviando ? 'Registrando…' : 'Registrar situación'}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="report-form__cancel"
            onClick={onCancel}
            disabled={enviando}
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  )
}
