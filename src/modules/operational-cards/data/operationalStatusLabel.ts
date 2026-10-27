import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Etiqueta visible de cada estado. El estado nunca se comunica solo con color:
 * esta es la lectura textual que acompaña al aura.
 */
export const OPERATIONAL_STATUS_LABEL: Record<
  OperationalIntegrityStatus,
  string
> = {
  ESTABLE: 'Estable',
  ALERTA: 'Alerta',
  CRITICO: 'Crítico',
  DESCONOCIDO: 'Desconocido',
}
