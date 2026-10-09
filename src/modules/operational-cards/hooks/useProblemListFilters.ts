import { useCallback, useState } from 'react'
import {
  DEFAULT_PROBLEM_LIST_FILTERS,
  type ProblemListFilters,
} from '@/modules/operational-cards/data/coordinationProblemFilters'

/**
 * Filtros del panel de problemas, ligados a la coordinación observada: al
 * cambiar de coordinación vuelven a «Todas · Activos», para que la lista de un
 * área nueva no aparezca recortada por una elección hecha sobre otra.
 *
 * Vive fuera de la lista cuando el padre la desmonta para mostrar el detalle
 * (Dirección): así «Volver» recupera los mismos filtros.
 */
export function useProblemListFilters(
  coordinationCode: string,
): [ProblemListFilters, (next: ProblemListFilters) => void] {
  const [state, setState] = useState({
    code: coordinationCode,
    filters: DEFAULT_PROBLEM_LIST_FILTERS,
  })

  const filters =
    state.code === coordinationCode ? state.filters : DEFAULT_PROBLEM_LIST_FILTERS

  const setFilters = useCallback(
    (next: ProblemListFilters) => setState({ code: coordinationCode, filters: next }),
    [coordinationCode],
  )

  return [filters, setFilters]
}
