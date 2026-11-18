import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { canExportSituations } from '@/modules/operational-cards/export/exportAccess'
import { IconSpreadsheet } from '@/modules/operational-cards/components/OperationalIcons'
import {
  SituationsExportDialog,
  type ExportCoordinationOption,
} from '@/modules/operational-cards/export/SituationsExportDialog'
import {
  downloadActiveSituationsExcel,
  saveBlobAsFile,
  type SituationsExportOptions,
} from '@/modules/operational-cards/export/situationsExport.api'
import { ApiError } from '@/shared/api/http'
import '@/styles/situations-export.css'

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Su rol no tiene permiso para exportar situaciones.'
    if (error.status === 400) return 'Los filtros elegidos no son válidos. Revíselos e intente de nuevo.'
    return error.message
  }
  return 'No fue posible generar el archivo. Intente de nuevo.'
}

/**
 * Botón «Exportar Excel» del panel principal (ADMIN, DIRECTOR, ANALISTA).
 * Abre el diálogo de opciones y descarga el .xlsx que genera el backend.
 */
export function ExportSituationsButton({
  coordinations,
  observedCoordinationId = null,
  className = '',
}: {
  coordinations: readonly ExportCoordinationOption[]
  observedCoordinationId?: string | null
  className?: string
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  if (!canExportSituations(user)) return null

  async function handleDownload(options: SituationsExportOptions) {
    setDownloading(true)
    setError(null)
    try {
      const { blob, filename } = await downloadActiveSituationsExcel(options)
      saveBlobAsFile(blob, filename)
      if (!mountedRef.current) return
      setOpen(false)
      setNotice(`Descargado: ${filename}`)
    } catch (cause) {
      if (mountedRef.current) setError(describeError(cause))
    } finally {
      if (mountedRef.current) setDownloading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`situations-export-trigger ${className}`.trim()}
        data-testid="situations-export-open"
        aria-haspopup="dialog"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
      >
        <span className="situations-export-trigger__icon" aria-hidden="true">
          <IconSpreadsheet size={17} />
        </span>
        <span className="situations-export-trigger__label">Exportar Excel</span>
        <small className="situations-export-trigger__hint">Situaciones activas</small>
      </button>
      <span className="situations-export-trigger__notice" role="status" aria-live="polite">
        {notice}
      </span>
      {open ? (
        <SituationsExportDialog
          coordinations={coordinations}
          observedCoordinationId={observedCoordinationId}
          isDownloading={downloading}
          error={error}
          onClose={() => setOpen(false)}
          onDownload={(options) => void handleDownload(options)}
        />
      ) : null}
    </>
  )
}

