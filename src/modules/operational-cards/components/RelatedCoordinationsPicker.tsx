import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { CoordinationMark } from '@/modules/operational-cards/components/CoordinationMark'
import { resolveCoordinationMarkAsset } from '@/modules/operational-cards/data/coordinationMark'
import {
  availableRelatedOptions,
  describeRelatedCount,
  type RelatedPickerOption,
} from '@/modules/operational-cards/data/relatedCoordinationsPicker'

/**
 * Selector MÚLTIPLE de coordinaciones relacionadas.
 *
 * Patrón combobox + listbox (WAI-ARIA 1.2) con la selección como chips
 * quitables encima del buscador:
 *
 *   - Escribir filtra (sin tildes); Flecha abajo/arriba recorre; Enter añade;
 *     Escape cierra la lista sin cerrar el modal; Retroceso con el buscador
 *     vacío quita la última elegida.
 *   - La lista es inline (no un overlay absoluto) para no recortarse dentro
 *     del modal, igual que el selector de responsable.
 *   - Nunca ofrece la coordinación propia/afectada ni la responsable
 *     (`excludedIds`), ni repite una ya elegida.
 *   - Cada alta o baja se anuncia en una región viva.
 */

export interface RelatedCoordinationsPickerProps {
  options: readonly RelatedPickerOption[]
  value: readonly string[]
  /** Coordinaciones que no se pueden relacionar (propia/afectada, responsable). */
  excludedIds?: readonly string[]
  disabled?: boolean
  onChange: (coordinationIds: string[]) => void
}

export function RelatedCoordinationsPicker({
  options,
  value,
  excludedIds = [],
  disabled = false,
  onChange,
}: RelatedCoordinationsPickerProps) {
  const baseId = useId()
  const inputId = `${baseId}-input`
  const listId = `${baseId}-list`
  const hintId = `${baseId}-hint`
  const chipsLabelId = `${baseId}-chips`

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [announcement, setAnnouncement] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLLIElement | null>>([])

  const byId = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  )
  // Solo se pintan las elegidas que siguen siendo opciones válidas.
  const selected = value
    .map((id) => byId.get(id))
    .filter((option): option is RelatedPickerOption => Boolean(option))

  const available = useMemo(
    () => availableRelatedOptions(options, value, excludedIds, query),
    [options, value, excludedIds, query],
  )
  const anyLeft = useMemo(
    () => availableRelatedOptions(options, value, excludedIds, '').length > 0,
    [options, value, excludedIds],
  )

  const safeActive = Math.min(activeIndex, Math.max(available.length - 1, 0))
  const activeOption = open ? available[safeActive] : undefined

  useEffect(() => {
    if (!open) return
    optionRefs.current[safeActive]?.scrollIntoView?.({ block: 'nearest' })
  }, [safeActive, open, available])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const add = (option: RelatedPickerOption) => {
    if (value.includes(option.id)) return
    const next = [...value, option.id]
    onChange(next)
    setQuery('')
    setActiveIndex(0)
    setAnnouncement(`${option.label} añadida. ${describeRelatedCount(next.length)}`)
    inputRef.current?.focus()
  }

  const remove = (option: RelatedPickerOption, refocus = true) => {
    const next = value.filter((id) => id !== option.id)
    onChange(next)
    setAnnouncement(`${option.label} quitada. ${describeRelatedCount(next.length)}`)
    if (refocus) inputRef.current?.focus()
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) {
          setOpen(true)
          setActiveIndex(0)
          return
        }
        setActiveIndex(Math.min(safeActive + 1, available.length - 1))
        return
      case 'ArrowUp':
        event.preventDefault()
        if (open) setActiveIndex(Math.max(safeActive - 1, 0))
        return
      case 'Home':
        if (open) {
          event.preventDefault()
          setActiveIndex(0)
        }
        return
      case 'End':
        if (open) {
          event.preventDefault()
          setActiveIndex(Math.max(available.length - 1, 0))
        }
        return
      case 'Enter':
        // Nunca envía el formulario desde el buscador.
        event.preventDefault()
        if (open && activeOption) add(activeOption)
        else setOpen(true)
        return
      case 'Escape':
        if (open || query) {
          // `preventDefault` avisa al modal de que este Escape ya se atendió.
          event.preventDefault()
          event.stopPropagation()
          setOpen(false)
          setQuery('')
        }
        return
      case 'Backspace':
        if (!query && selected.length > 0) {
          event.preventDefault()
          remove(selected[selected.length - 1])
        }
        return
      default:
        return
    }
  }

  return (
    <div
      ref={rootRef}
      className="related-picker"
      data-testid="report-related"
      data-open={open ? 'true' : undefined}
      data-count={selected.length}
    >
      <div className="related-picker__head">
        <label className="related-picker__label" htmlFor={inputId}>
          Coordinaciones relacionadas
        </label>
        <span className="report-form__step-optional">Opcional</span>
      </div>
      <p className="report-form__hint related-picker__hint" id={hintId}>
        Otras áreas que también intervienen. No cambian quién debe responder.
      </p>

      {selected.length > 0 ? (
        <>
          <span id={chipsLabelId} className="related-picker__sr-only">
            Coordinaciones relacionadas elegidas
          </span>
          <ul
            className="related-picker__chips"
            aria-labelledby={chipsLabelId}
            data-testid="report-related-chips"
          >
            {selected.map((option) => (
              <li
                key={option.id}
                className="related-picker__chip"
                data-testid="report-related-chip"
                data-option-id={option.id}
              >
                <CoordinationMark
                  className="related-picker__chip-mark"
                  asset={resolveCoordinationMarkAsset(option.code)}
                  code={option.code}
                />
                <span className="related-picker__chip-label">
                  {option.label}
                </span>
                <button
                  type="button"
                  className="related-picker__chip-remove"
                  data-testid="report-related-remove"
                  aria-label={`Quitar ${option.label}`}
                  title={`Quitar ${option.label}`}
                  disabled={disabled}
                  onClick={() => remove(option)}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="related-picker__combo">
        <svg
          className="related-picker__search-icon"
          viewBox="0 0 20 20"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m13 13 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="related-picker__input"
          data-testid="report-related-search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeOption ? `${baseId}-option-${activeOption.id}` : undefined
          }
          aria-describedby={hintId}
          autoComplete="off"
          placeholder={
            anyLeft
              ? selected.length > 0
                ? 'Añadir otra coordinación…'
                : 'Buscar y añadir coordinación…'
              : 'No quedan coordinaciones por añadir'
          }
          value={query}
          disabled={disabled || options.length === 0}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onClick={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
        />
      </div>

      <ul
        id={listId}
        className="related-picker__list"
        role="listbox"
        aria-label="Coordinaciones disponibles para relacionar"
        data-testid="report-related-list"
        hidden={!open}
      >
        {open && available.length === 0 ? (
          <li
            className="related-picker__empty"
            data-testid="report-related-empty"
            role="presentation"
          >
            {query.trim()
              ? `Ninguna coordinación coincide con «${query.trim()}».`
              : 'Ya relacionó todas las coordinaciones disponibles.'}
          </li>
        ) : null}
        {open
          ? available.map((option, index) => {
              const active = index === safeActive
              return (
                <li
                  key={option.id}
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  id={`${baseId}-option-${option.id}`}
                  role="option"
                  aria-selected={false}
                  className="related-picker__option"
                  data-testid="report-related-option"
                  data-option-id={option.id}
                  data-active={active ? 'true' : undefined}
                  // Conserva el foco en el buscador al hacer clic.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => add(option)}
                >
                  <CoordinationMark
                    className="related-picker__option-mark"
                    asset={resolveCoordinationMarkAsset(option.code)}
                    code={option.code}
                  />
                  <span className="related-picker__option-label">
                    {option.label}
                  </span>
                  <span className="related-picker__option-add" aria-hidden="true">
                    Añadir
                  </span>
                </li>
              )
            })
          : null}
      </ul>

      <p
        className="related-picker__sr-only"
        aria-live="polite"
        data-testid="report-related-status"
      >
        {announcement}
      </p>
    </div>
  )
}
