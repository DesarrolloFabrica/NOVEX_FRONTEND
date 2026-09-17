import type { SituationSeverity } from '@/modules/situations/types/situation.types'

/**
 * «MIS REPORTES»: los problemas que registró el usuario autenticado, en
 * CUALQUIER coordinación.
 *
 * Es una lista con vida propia, independiente de la carta seleccionada: no se
 * recarga al cambiar de coordinación y no se filtra por ella. Por eso tiene su
 * propia rama de estado y no reutiliza `problemsByCoordination`, que es caché
 * por área.
 *
 * LA IDENTIDAD NO VIAJA EN EL CLIENTE. El listado se pide con `mine=true` y el
 * backend resuelve el autor con el usuario autenticado; aquí no se envía —ni
 * existe— ningún identificador de autor.
 */
export interface MyReport {
  id: string
  title: string
  severity: SituationSeverity
  /** Estado crudo del dominio: incluye CLOSED, que esta lista sí muestra. */
  status: string
  /**
   * Coordinación RESPONSABLE. `null` es un estado legítimo del dominio —los
   * reportes históricos de analista nacieron sin área— y la interfaz lo declara
   * como «Sin coordinación» en lugar de atribuirlo a ninguna.
   */
  coordinationCode: string | null
  coordinationName: string | null
  createdAt: string
  /** `true` solo si el backend confirma que ESTE usuario puede resolverlo. */
  canResolve: boolean
}

export interface MyReportsPage {
  items: readonly MyReport[]
  total: number
  page: number
  limit: number
}
