import { useMemo, useRef, useState, type FocusEvent } from 'react'
import type { CoordinationSummary } from '@/modules/situations/types/situation.types'
import { TEXT_LABEL } from '@/modules/monitoring/constants/monitoringTheme'

const FIELD =
  'novex-capture-field w-full min-w-0 border-0 bg-transparent px-3 py-2 text-sm text-slate-800 shadow-[inset_0_-1px_0_0_rgba(100,116,139,0.28)] placeholder:text-slate-500/65'

interface CoordinationAutocompleteProps {
  coordinations: CoordinationSummary[]
  selectedIds: string[]
  onChange: (nextIds: string[]) => void
}

export function CoordinationAutocomplete({
  coordinations,
  selectedIds,
  onChange,
}: CoordinationAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => coordinations.find((item) => item.id === id))
        .filter((item): item is CoordinationSummary => Boolean(item)),
    [coordinations, selectedIds],
  )

  const available = useMemo(
    () => coordinations.filter((item) => !selectedIds.includes(item.id)),
    [coordinations, selectedIds],
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matches = available.filter((item) => {
      if (!normalized) return true
      return (
        item.code.toLowerCase().includes(normalized) ||
        item.name.toLowerCase().includes(normalized) ||
        item.shortName.toLowerCase().includes(normalized)
      )
    })

    return normalized ? matches.slice(0, 12) : matches
  }, [available, query])

  function openList() {
    setOpen(true)
  }

  function closeList() {
    setOpen(false)
  }

  function addCoordination(id: string) {
    if (selectedIds.includes(id)) return
    onChange([...selectedIds, id])
    setQuery('')
    closeList()
    inputRef.current?.blur()
  }

  function removeCoordination(id: string) {
    closeList()
    onChange(selectedIds.filter((item) => item !== id))
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && rootRef.current?.contains(nextTarget)) return
    window.setTimeout(() => closeList(), 120)
  }

  return (
    <div className="novex-capture-autocomplete">
      <div
        ref={rootRef}
        className="novex-capture-autocomplete__control"
        onBlur={handleBlur}
      >
        <input
          ref={inputRef}
          className={FIELD}
          value={query}
          placeholder="Seleccione de la lista o busque coordinación…"
          onChange={(event) => {
            setQuery(event.target.value)
            openList()
          }}
          onFocus={openList}
          onClick={openList}
          aria-expanded={open}
          aria-controls="coordination-autocomplete-list"
        />

        {open ? (
          <ul
            id="coordination-autocomplete-list"
            className="novex-capture-autocomplete__list"
            role="listbox"
            aria-label="Coordinaciones disponibles"
          >
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="novex-capture-autocomplete__option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addCoordination(item.id)}
                  >
                    <span className="novex-capture-autocomplete__code">
                      {item.code}
                    </span>
                    <span className="novex-capture-autocomplete__name">
                      {' '}
                      · {item.name}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="novex-capture-autocomplete__empty" aria-live="polite">
                {available.length === 0
                  ? 'Ya seleccionó todas las coordinaciones disponibles.'
                  : 'Ninguna coordinación coincide con la búsqueda.'}
              </li>
            )}
          </ul>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div
          className="novex-capture-autocomplete__chips"
          aria-label="Coordinaciones seleccionadas"
        >
          {selected.map((item) => (
            <button
              key={item.id}
              type="button"
              className="novex-capture-chip is-selected"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => removeCoordination(item.id)}
              title="Quitar selección"
            >
              {item.shortName}
              <span aria-hidden="true" className="ml-1 opacity-70">
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CoordinationAutocompleteLegend() {
  return (
    <span className={TEXT_LABEL}>
      ¿Qué coordinaciones considera que podrían estar relacionadas?
    </span>
  )
}
