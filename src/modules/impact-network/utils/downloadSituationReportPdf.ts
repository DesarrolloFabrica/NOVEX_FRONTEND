import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'

export async function downloadSituationReportPdf(
  event: OperationalEvent | null | undefined,
): Promise<void> {
  if (!event) {
    throw new Error('No hay una situación enfocada para exportar a PDF.')
  }

  const { exportSituationReportPdf } = await import(
    '@/modules/operational-events/utils/exportSituationReportPdf'
  )
  await exportSituationReportPdf(event)
}
