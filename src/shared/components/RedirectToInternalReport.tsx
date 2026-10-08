import { Navigate, useLocation } from 'react-router-dom'
import { buildInternalReportUrl } from '@/modules/operational-cards/experience/reportIntent'

/**
 * `/situaciones/nueva` (y su alias legado) ya no tienen formulario propio:
 * llevan al Centro Operacional con el formulario INTERNAL abierto, la única
 * puerta de creación. Se conserva la coordinación preseleccionada que traían
 * los enlaces antiguos (`?coordination=<uuid>`).
 */
export function RedirectToInternalReport() {
  const { search } = useLocation()
  const coordination = new URLSearchParams(search).get('coordination')
  return <Navigate to={buildInternalReportUrl(coordination)} replace />
}
