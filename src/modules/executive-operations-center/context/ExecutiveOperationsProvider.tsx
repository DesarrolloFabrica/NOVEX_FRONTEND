import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { ExecutiveOperationsContext } from '@/modules/executive-operations-center/context/executiveOperations.context'
import { loadOperationalCenterData } from '@/modules/executive-operations-center/services/operational-center.service'
import type {
  OperationalCenterData,
  OperationalCenterLoadStatus,
} from '@/modules/executive-operations-center/types/operational-center.types'
import { getErrorMessage } from '@/shared/utils/error'

/**
 * `enabled` permite montar el proveedor sin disparar su carga. La home del
 * Centro Operacional es la experiencia nueva de cartas, que trae su propio
 * LEVEL 0 en una sola petición; cargar aquí además el agregado legacy
 * añadiría cientos de peticiones que esa pantalla no usa. Panorama,
 * Inteligencia y Reportes siguen consumiéndolo igual que antes.
 */
export function ExecutiveOperationsProvider({
  children,
  enabled = true,
}: PropsWithChildren<{ enabled?: boolean }>) {
  const [data, setData] = useState<OperationalCenterData | null>(null)
  const [status, setStatus] = useState<OperationalCenterLoadStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const next = await loadOperationalCenterData()
      setData(next)
      setStatus(next.situations.length > 0 ? 'ready' : 'empty')
    } catch (loadError) {
      setData(null)
      setError(getErrorMessage(loadError))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void reload()
  }, [enabled, reload])

  const value = useMemo(
    () => ({ data, status, error, reload }),
    [data, error, reload, status],
  )

  return (
    <ExecutiveOperationsContext.Provider value={value}>
      {children}
    </ExecutiveOperationsContext.Provider>
  )
}
