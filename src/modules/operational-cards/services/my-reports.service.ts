import { fetchSituations } from '@/modules/api/situations.api'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import type {
  MyReport,
  MyReportsPage,
} from '@/modules/operational-cards/types/my-reports.types'

/**
 * «MIS REPORTES»: página de los problemas creados por el usuario autenticado.
 *
 * Se pide al servidor con `mine=true` y PAGINADO. Nunca se descarga el listado
 * completo de situaciones para filtrarlo en el navegador: además de traer datos
 * que el usuario no tiene por qué recibir, el filtro por autor vive en SQL y es
 * el servidor quien decide quién es el autor.
 *
 * A diferencia de LEVEL 1, esta lista incluye los estados CERRADOS: «mis
 * reportes» es el historial de lo que uno ha reportado, no la bandeja de lo que
 * sigue abierto.
 */

/** Tamaño de página. La lista crece por carga incremental, no de golpe. */
export const MY_REPORTS_PAGE_SIZE = 20

function toMyReport(situation: SituationResponse): MyReport {
  return {
    id: situation.id,
    title: situation.title,
    severity: situation.severity,
    status: situation.status,
    // Se conserva el null tal cual: es «Sin coordinación», no un dato ausente
    // que haya que rellenar con la coordinación del usuario.
    coordinationCode: situation.coordinationCode ?? null,
    coordinationName: situation.coordinationName ?? null,
    createdAt: situation.createdAt,
    canResolve: situation.canResolve === true,
  }
}

export async function fetchMyReports(page = 1): Promise<MyReportsPage> {
  const response = await fetchSituations({
    mine: true,
    page,
    limit: MY_REPORTS_PAGE_SIZE,
  })

  return {
    items: response.items.map(toMyReport),
    total: response.total,
    page: response.page,
    limit: response.limit,
  }
}
