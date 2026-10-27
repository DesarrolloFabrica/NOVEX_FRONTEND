import { useId } from 'react'
import {
  SEVERITY_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  type ProblemListFilters,
  type SeverityFilter,
  type StatusFilter,
} from '@/modules/operational-cards/data/coordinationProblemFilters'

/**
 * Dos desplegables (severidad · estado) en una fila, sin rótulos visibles:
 * cada uno se identifica por su texto («Todas las severidades», «Activos») y
 * conserva un <label> asociado solo para lectores de pantalla. Son `<select>`
 * nativos con la piel del ticket: el teclado, el lector de pantalla y el móvil
 * los entienden sin trabajo extra. Se combinan con AND.
 */
export function CoordinationProblemFilters({
  filters,
  onChange,
}: {
  filters: ProblemListFilters
  onChange: (next: ProblemListFilters) => void
}) {
  const id = useId()
  const severityId = `${id}-severity`
  const statusId = `${id}-status`

  return (
    <div
      className="coordination-panel__filters"
      data-testid="coordination-problem-filters"
      role="group"
      aria-label="Filtrar problemas"
    >
      <div className="coordination-panel__filter">
        <label className="coordination-panel__sr-only" htmlFor={severityId}>
          Filtrar por severidad
        </label>
        <select
          id={severityId}
          className="coordination-panel__filter-select"
          data-testid="coordination-filter-severity"
          autoComplete="off"
          value={filters.severity}
          onChange={(event) =>
            onChange({
              ...filters,
              severity: event.target.value as SeverityFilter,
            })
          }
        >
          {SEVERITY_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="coordination-panel__filter">
        <label className="coordination-panel__sr-only" htmlFor={statusId}>
          Filtrar por estado
        </label>
        <select
          id={statusId}
          className="coordination-panel__filter-select"
          data-testid="coordination-filter-status"
          autoComplete="off"
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as StatusFilter })
          }
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
