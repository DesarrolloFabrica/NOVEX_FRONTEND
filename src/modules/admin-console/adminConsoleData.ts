import { fetchAdminOverview, type AdminOverview } from '@/modules/api/admin.api'
import { fetchOperationalOverview } from '@/modules/operational-cards/services/operational-overview.service'

/**
 * Datos de la Consola con precarga.
 *
 * El Centro llama a `prefetchAdminConsoleData` al señalar el enlace de la
 * consola (hover/foco). Si la respuesta llega antes del clic, la consola monta
 * con los datos ya puestos (`peek…`) y no pasa por el estado «Cargando», que era
 * parte del salto brusco al entrar. Una lectura vieja (más de 60 s) se descarta.
 */
const MAX_AGE_MS = 60_000

interface Entry<T> {
  value: T | null
  at: number
  pending: Promise<T> | null
}

function createCache<T>(loader: () => Promise<T>) {
  const entry: Entry<T> = { value: null, at: 0, pending: null }

  const load = (force = false): Promise<T> => {
    if (!force && entry.pending) return entry.pending
    const request = loader()
      .then((value) => {
        entry.value = value
        entry.at = Date.now()
        return value
      })
      .finally(() => {
        if (entry.pending === request) entry.pending = null
      })
    entry.pending = request
    return request
  }

  return {
    load,
    peek(): T | null {
      return entry.value && Date.now() - entry.at < MAX_AGE_MS ? entry.value : null
    },
    remember(value: T) {
      entry.value = value
      entry.at = Date.now()
    },
  }
}

const overview = createCache<AdminOverview>(fetchAdminOverview)

/** Situaciones activas: el mismo total que muestra la cabecera del Centro. */
const activeSituations = createCache<number>(async () => {
  const data = await fetchOperationalOverview()
  return data.coordinations.reduce((sum, item) => sum + item.activeProblemsCount, 0)
})

export const adminOverviewCache = overview
export const activeSituationsCache = activeSituations

/** Arranca (sin esperar) las lecturas que la consola necesita al montar. */
export function prefetchAdminConsoleData(): void {
  if (!overview.peek()) overview.load().catch(() => undefined)
  if (activeSituations.peek() === null) activeSituations.load().catch(() => undefined)
}
