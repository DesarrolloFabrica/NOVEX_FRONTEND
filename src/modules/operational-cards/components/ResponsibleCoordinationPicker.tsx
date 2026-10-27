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
  buildResponsibleSelectionSummary,
  filterResponsibleOptions,
  findResponsibleOption,
  type ResponsiblePickerOption,
} from '@/modules/operational-cards/data/responsibleCoordinationPicker'

/**
 * Selector visual de coordinación RESPONSABLE para dependencias INTER.
 *
 * Lista inline (no overlay absoluto) para no recortarse en el panel ticket.
 * Búsqueda, logos, teclado (Abrir / flechas / Enter / Escape) y confirmación
 * «Afectada → Responsable».
 */

export interface ResponsibleCoordinationPickerProps {
  options: readonly ResponsiblePickerOption[]
  value: string
  affectedLabel: string
  disabled?: boolean
  onChange: (coordinationId: string) => void
  /** Fuerza estado de error (p. ej. envío sin selección). */
  showError?: boolean
}

export function ResponsibleCoordinationPicker({
  options,
  value,
  affectedLabel,
  disabled = false,
  onChange,
  showError = false,
}: ResponsibleCoordinationPickerProps) {
  const baseId = useId()
  const listId = `${baseId}-list`
  const searchId = `${baseId}-search`
  const labelId = `${baseId}-label`

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [touched, setTouched] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const selected = findResponsibleOption(options, value)
  const filtered = useMemo(
    () => filterResponsibleOptions(options, query),
    [options, query],
  )

  const invalid = (showError || touched) && !value
  const summary =
    selected && affectedLabel
      ? buildResponsibleSelectionSummary(affectedLabel, selected.label)
      : null

  const close = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
    if (!value) setTouched(true)
  }

  const openPicker = () => {
    if (disabled || options.length === 0) return
    const selectedIndex = options.findIndex((option) => option.id === value)
    setQuery('')
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  const choose = (option: ResponsiblePickerOption) => {
    onChange(option.id)
    setTouched(true)
    close()
  }

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const option = optionRefs.current[activeIndex]
    option?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, filtered])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filtered.length === 0) return
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (filtered.length === 0) return
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[activeIndex]
      if (option) choose(option)
    }
  }

  const onOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(Math.min(index + 1, filtered.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (index === 0) {
        searchRef.current?.focus()
        return
      }
      setActiveIndex(index - 1)
    }
  }

  return (
    <div
      ref={rootRef}
      className="responsible-picker"
      data-testid="report-responsible"
      data-open={open ? 'true' : undefined}
      data-invalid={invalid ? 'true' : undefined}
      data-has-value={selected ? 'true' : undefined}
    >
      <span id={labelId} className="responsible-picker__label">
        Coordinación responsable
      </span>

      {summary && !open ? (
        <div
          className="responsible-picker__summary"
          data-testid="report-responsible-summary"
        >
          <div className="responsible-picker__summary-main">
            <CoordinationMark
              className="responsible-picker__mark"
              asset={resolveCoordinationMarkAsset(selected!.code)}
              code={selected!.code}
            />
            <p className="responsible-picker__summary-text">{summary}</p>
          </div>
          <button
            type="button"
            className="responsible-picker__change"
            data-testid="report-responsible-change"
            disabled={disabled}
            onClick={openPicker}
            onKeyDown={onTriggerKeyDown}
          >
            Cambiar coordinación
          </button>
        </div>
      ) : null}

      {!summary && !open ? (
        <button
          type="button"
          className="responsible-picker__trigger"
          data-testid="report-responsible-trigger"
          aria-labelledby={labelId}
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          disabled={disabled || options.length === 0}
          onClick={openPicker}
          onKeyDown={onTriggerKeyDown}
        >
          Elegir coordinación responsable
        </button>
      ) : null}

      {invalid && !open ? (
        <p
          className="responsible-picker__error"
          data-testid="report-responsible-error"
          role="alert"
        >
          Elija la coordinación que debe atender la dependencia.
        </p>
      ) : null}

      {open ? (
        <div
          className="responsible-picker__panel"
          data-testid="report-responsible-panel"
        >
          <div className="responsible-picker__panel-toolbar">
            <label
              className="responsible-picker__search-label"
              htmlFor={searchId}
            >
              Buscar coordinación
            </label>
            <button
              type="button"
              className="responsible-picker__dismiss"
              data-testid="report-responsible-dismiss"
              onClick={close}
            >
              Cerrar
            </button>
          </div>
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            className="responsible-picker__search"
            data-testid="report-responsible-search"
            placeholder="Escriba el nombre…"
            value={query}
            disabled={disabled}
            autoComplete="off"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-expanded={open}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={onSearchKeyDown}
          />

          <ul
            id={listId}
            className="responsible-picker__list"
            role="listbox"
            aria-label="Coordinaciones responsables disponibles"
            data-testid="report-responsible-list"
          >
            {filtered.length === 0 ? (
              <li
                className="responsible-picker__empty"
                data-testid="report-responsible-empty"
                role="presentation"
              >
                Ninguna coordinación coincide con «{query.trim()}».
              </li>
            ) : (
              filtered.map((option, index) => {
                const selectedOption = option.id === value
                const active = index === activeIndex
                return (
                  <li key={option.id} role="presentation">
                    <button
                      ref={(node) => {
                        optionRefs.current[index] = node
                      }}
                      type="button"
                      role="option"
                      id={`${baseId}-option-${option.id}`}
                      className="responsible-picker__option"
                      data-testid="report-responsible-option"
                      data-option-id={option.id}
                      data-option-code={option.code}
                      aria-selected={selectedOption}
                      data-active={active ? 'true' : undefined}
                      tabIndex={active ? 0 : -1}
                      disabled={disabled}
                      onClick={() => choose(option)}
                      onKeyDown={(event) => onOptionKeyDown(event, index)}
                      onFocus={() => setActiveIndex(index)}
                    >
                      <CoordinationMark
                        className="responsible-picker__mark"
                        asset={resolveCoordinationMarkAsset(option.code)}
                        code={option.code}
                      />
                      <span className="responsible-picker__option-label">
                        {option.label}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}

      {/* Valor para lecturas de formulario / e2e sin depender del select nativo. */}
      <input
        type="hidden"
        data-testid="report-responsible-value"
        value={value}
        readOnly
      />
    </div>
  )
}
