import { useEffect, useReducer, useRef } from 'react'
import { getErrorMessage } from '@/shared/utils/error'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import { fetchOperationalOverview } from '@/modules/operational-cards/services/operational-overview.service'
import {
  initialOperationalCardsState,
  operationalCardsReducer,
  type OperationalCardsLevel0State,
} from '@/modules/operational-cards/state/operationalCards.reducer'

/**
 * Carga inicial de LEVEL 0: exactamente una petición por montaje.
 *
 * La app corre en StrictMode, que en desarrollo ejecuta el efecto dos veces
 * sobre la misma instancia (montar, limpiar, montar). En lugar de saltarse la
 * segunda ejecución —lo que dejaría el estado colgado en «loading», porque la
 * primera ya se canceló a sí misma— se guarda la promesa en curso y cada
 * ejecución se suscribe a ella. Resultado: una sola petición de red y un
 * estado que siempre termina en `ready` o `error`.
 *
 * Sin polling, sin refetch on focus y sin refresco manual: eso pertenece al
 * hardening final.
 */
export function useOperationalOverview(): OperationalCardsLevel0State {
  const [state, dispatch] = useReducer(
    operationalCardsReducer,
    initialOperationalCardsState,
  )
  const requestRef = useRef<Promise<OperationalOverview> | null>(null)

  useEffect(() => {
    let active = true

    if (!requestRef.current) {
      dispatch({ type: 'LOAD_OVERVIEW' })
      requestRef.current = fetchOperationalOverview()
    }

    void requestRef.current
      .then((overview) => {
        if (!active) return
        dispatch({ type: 'LOAD_OVERVIEW_SUCCESS', overview })
      })
      .catch((error: unknown) => {
        if (!active) return
        dispatch({
          type: 'LOAD_OVERVIEW_ERROR',
          message: getErrorMessage(error),
        })
      })

    return () => {
      active = false
    }
  }, [])

  return state
}
