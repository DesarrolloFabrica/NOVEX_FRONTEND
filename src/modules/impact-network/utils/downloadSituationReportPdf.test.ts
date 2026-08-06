import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { downloadSituationReportPdf } from './downloadSituationReportPdf'

const exportSituationReportPdf = vi.fn()

vi.mock('@/modules/operational-events/utils/exportSituationReportPdf', () => ({
  exportSituationReportPdf: (...args: unknown[]) => exportSituationReportPdf(...args),
}))

describe('downloadSituationReportPdf', () => {
  beforeEach(() => {
    exportSituationReportPdf.mockReset()
    exportSituationReportPdf.mockResolvedValue(undefined)
  })

  it('rechaza cuando no hay situación enfocada', async () => {
    await expect(downloadSituationReportPdf(null)).rejects.toThrow(
      /No hay una situación enfocada/,
    )
    expect(exportSituationReportPdf).not.toHaveBeenCalled()
  })

  it('delega en exportSituationReportPdf con el evento enfocado', async () => {
    const event = { id: 'sit-1', title: 'Corte de servicio' } as OperationalEvent
    await downloadSituationReportPdf(event)
    expect(exportSituationReportPdf).toHaveBeenCalledWith(event)
  })
})
