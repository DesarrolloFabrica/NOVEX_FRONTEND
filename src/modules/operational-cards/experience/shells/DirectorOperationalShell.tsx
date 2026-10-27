import { DirectorOperationalLayout } from '@/modules/operational-cards/experience/layouts/DirectorOperationalLayout'
import { useDirectorKpi } from '@/modules/operational-cards/hooks/useDirectorKpi'
import { useOperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'

/**
 * DIRECTOR: Centro Operacional con lectura ejecutiva.
 * Baraja, personaje y problemas (solo lectura). KPIs en panel propio.
 * No reportar / avanzar / resolver. No fusionado con ANALISTA.
 */
export function DirectorOperationalShell() {
  const model = useOperationalShellModel('director')
  const kpi = useDirectorKpi(model.selectedCoordination?.id ?? null)
  return <DirectorOperationalLayout model={model} kpi={kpi} />
}
