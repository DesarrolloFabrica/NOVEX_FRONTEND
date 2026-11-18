import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  IconDownload,
  IconSpreadsheet,
} from '@/modules/operational-cards/components/OperationalIcons'
import {
  ALL_REPORT_KINDS,
  ALL_SEVERITIES,
  ALL_STATUSES,
  type ExportReportKind,
  type ExportSeverity,
  type ExportSheet,
  type ExportStatus,
  type SituationsExportOptions,
} from '@/modules/operational-cards/export/situationsExport.api'

export interface ExportCoordinationOption {
  id: string
  name: string
  activeCount: number
  color?: string
}

export interface SituationsExportDialogProps {
  coordinations: readonly ExportCoordinationOption[]
  /** Coordinación observada en la mesa: se propone al elegir coordinaciones. */
  observedCoordinationId?: string | null
  isDownloading: boolean
  error: string | null
  onClose: () => void
  onDownload: (options: SituationsExportOptions) => void
}

const STATUS_LABEL: Record<ExportStatus, string> = {
  OPEN: 'Abiertas',
  IN_PROGRESS: 'En atención',
}

const SEVERITY_LABEL: Record<ExportSeverity, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
}

const KIND_LABEL: Record<ExportReportKind, string> = {
  INTERNAL: 'Internas',
  INTER_COORDINATION: 'Dependencias entre coordinaciones',
}

const SHEETS: ReadonlyArray<{
  id: ExportSheet
  title: string
  detail: string
  locked?: boolean
}> = [
  {
    id: 'situations',
    title: 'Situaciones',
    detail:
      'Una fila por situación: categoría, coordinación responsable, afectada y relacionadas, severidad, plazo, días abierta y afectaciones.',
    locked: true,
  },
  {
    id: 'summary',
    title: 'Resumen',
    detail: 'Totales por estado, severidad, plazo, coordinación, categoría y tipo de registro.',
  },
  {
    id: 'consequences',
    title: 'Afectaciones',
    detail: 'Cada afectación registrada, con su fecha y quién la reportó.',
  },
  {
    id: 'related',
    title: 'Coordinaciones relacionadas',
    detail: 'Una fila por cada coordinación relacionada con una situación.',
  },
]

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

/**
 * Diálogo «Exportar situaciones activas a Excel»: el usuario elige alcance
 * (coordinaciones, estado, severidad, tipo) y las hojas del archivo.
 *
 * Accesibilidad: diálogo modal con título, foco inicial, foco atrapado, Esc
 * cierra (salvo mientras se genera el archivo) y el foco vuelve al botón.
 */
export function SituationsExportDialog({
  coordinations,
  observedCoordinationId = null,
  isDownloading,
  error,
  onClose,
  onDownload,
}: SituationsExportDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLFormElement>(null)
  const onCloseRef = useRef(onClose)
  const downloadingRef = useRef(isDownloading)
  useEffect(() => {
    onCloseRef.current = onClose
    downloadingRef.current = isDownloading
  }, [onClose, isDownloading])

  const sortedCoordinations = useMemo(
    () => [...coordinations].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [coordinations],
  )

  const [coordinationMode, setCoordinationMode] = useState<'all' | 'pick'>('all')
  const [pickedIds, setPickedIds] = useState<string[]>(() =>
    observedCoordinationId ? [observedCoordinationId] : [],
  )
  const [statuses, setStatuses] = useState<ExportStatus[]>([...ALL_STATUSES])
  const [severities, setSeverities] = useState<ExportSeverity[]>([...ALL_SEVERITIES])
  const [reportKinds, setReportKinds] = useState<ExportReportKind[]>([...ALL_REPORT_KINDS])
  const [sheets, setSheets] = useState<ExportSheet[]>(SHEETS.map((sheet) => sheet.id))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previous = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!downloadingRef.current) onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  const scopeCoordinations =
    coordinationMode === 'all'
      ? sortedCoordinations
      : sortedCoordinations.filter((c) => pickedIds.includes(c.id))
  const scopeActive = scopeCoordinations.reduce((sum, c) => sum + c.activeCount, 0)
  // Sin el resumen de la mesa no hay conteos: no se afirma «0».
  const countsKnown = sortedCoordinations.length > 0
  const narrowed =
    statuses.length < ALL_STATUSES.length ||
    severities.length < ALL_SEVERITIES.length ||
    reportKinds.length < ALL_REPORT_KINDS.length

  const problem =
    coordinationMode === 'pick' && pickedIds.length === 0
      ? 'Elija al menos una coordinación.'
      : statuses.length === 0
        ? 'Elija al menos un estado.'
        : severities.length === 0
          ? 'Elija al menos una severidad.'
          : reportKinds.length === 0
            ? 'Elija al menos un tipo de registro.'
            : null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (problem || isDownloading) return
    onDownload({
      coordinationIds: coordinationMode === 'all' ? [] : pickedIds,
      statuses,
      severities,
      reportKinds,
      sheets,
    })
  }

  return createPortal(
    <div className="situations-export" data-testid="situations-export-dialog">
      <div
        className="situations-export__backdrop"
        aria-hidden="true"
        onClick={() => {
          if (!isDownloading) onClose()
        }}
      />
      <form
        ref={dialogRef}
        className="situations-export__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={isDownloading}
        onSubmit={handleSubmit}
        noValidate
      >
        <header className="situations-export__header">
          <span className="situations-export__medallion" aria-hidden="true">
            <IconSpreadsheet size={24} />
          </span>
          <div className="situations-export__heading">
            <span className="situations-export__eyebrow">Exportar · Excel</span>
            <h2 className="situations-export__title" id={titleId}>
              Situaciones activas
            </h2>
            <p className="situations-export__subtitle" id={descriptionId}>
              Elija qué incluir. El archivo sale ordenado por coordinación, con las críticas primero.
            </p>
          </div>
          <button
            type="button"
            className="situations-export__close"
            onClick={onClose}
            disabled={isDownloading}
            aria-label="Cerrar sin descargar"
            data-testid="situations-export-close"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="situations-export__body">
          <fieldset className="situations-export__group">
            <legend className="situations-export__legend">Coordinaciones</legend>
            <div className="situations-export__segmented" role="radiogroup" aria-label="Alcance por coordinación">
              <label className="situations-export__segment" data-checked={coordinationMode === 'all' || undefined}>
                <input
                  type="radio"
                  name="coordination-mode"
                  value="all"
                  checked={coordinationMode === 'all'}
                  onChange={() => setCoordinationMode('all')}
                  data-initial-focus
                  data-testid="export-coordinations-all"
                />
                Todas
                {countsKnown ? (
                  <span className="situations-export__count">
                    {sortedCoordinations.reduce((sum, c) => sum + c.activeCount, 0)}
                  </span>
                ) : null}
              </label>
              <label
                className="situations-export__segment"
                data-checked={coordinationMode === 'pick' || undefined}
                data-disabled={!countsKnown || undefined}
              >
                <input
                  type="radio"
                  name="coordination-mode"
                  value="pick"
                  disabled={!countsKnown}
                  checked={coordinationMode === 'pick'}
                  onChange={() => setCoordinationMode('pick')}
                  data-testid="export-coordinations-pick"
                />
                Elegir coordinaciones
              </label>
            </div>

            {coordinationMode === 'pick' ? (
              <div className="situations-export__picker">
                <div className="situations-export__picker-actions">
                  <button
                    type="button"
                    className="situations-export__link"
                    onClick={() => setPickedIds(sortedCoordinations.map((c) => c.id))}
                  >
                    Marcar todas
                  </button>
                  <button
                    type="button"
                    className="situations-export__link"
                    onClick={() => setPickedIds([])}
                  >
                    Ninguna
                  </button>
                </div>
                <ul className="situations-export__coordinations">
                  {sortedCoordinations.map((coordination) => {
                    const checked = pickedIds.includes(coordination.id)
                    return (
                      <li key={coordination.id}>
                        <label className="situations-export__coordination" data-checked={checked || undefined}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setPickedIds((ids) => toggle(ids, coordination.id))}
                            data-testid={`export-coordination-${coordination.id}`}
                          />
                          <span
                            className="situations-export__swatch"
                            style={{ backgroundColor: coordination.color || '#b88c3c' }}
                            aria-hidden="true"
                          />
                          <span className="situations-export__coordination-name">{coordination.name}</span>
                          <span className="situations-export__count" aria-label={`${coordination.activeCount} activas`}>
                            {coordination.activeCount}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </fieldset>

          <div className="situations-export__row">
            <fieldset className="situations-export__group">
              <legend className="situations-export__legend">Estado</legend>
              <div className="situations-export__chips">
                {ALL_STATUSES.map((status) => (
                  <label key={status} className="situations-export__chip" data-checked={statuses.includes(status) || undefined}>
                    <input
                      type="checkbox"
                      checked={statuses.includes(status)}
                      onChange={() => setStatuses((list) => toggle(list, status))}
                      data-testid={`export-status-${status}`}
                    />
                    {STATUS_LABEL[status]}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="situations-export__group">
              <legend className="situations-export__legend">Tipo de registro</legend>
              <div className="situations-export__chips">
                {ALL_REPORT_KINDS.map((kind) => (
                  <label key={kind} className="situations-export__chip" data-checked={reportKinds.includes(kind) || undefined}>
                    <input
                      type="checkbox"
                      checked={reportKinds.includes(kind)}
                      onChange={() => setReportKinds((list) => toggle(list, kind))}
                      data-testid={`export-kind-${kind}`}
                    />
                    {KIND_LABEL[kind]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="situations-export__group">
            <legend className="situations-export__legend">Severidad actual</legend>
            <div className="situations-export__chips">
              {ALL_SEVERITIES.map((severity) => (
                <label
                  key={severity}
                  className="situations-export__chip"
                  data-severity={severity}
                  data-checked={severities.includes(severity) || undefined}
                >
                  <input
                    type="checkbox"
                    checked={severities.includes(severity)}
                    onChange={() => setSeverities((list) => toggle(list, severity))}
                    data-testid={`export-severity-${severity}`}
                  />
                  <span className="situations-export__dot" aria-hidden="true" />
                  {SEVERITY_LABEL[severity]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="situations-export__group">
            <legend className="situations-export__legend">Hojas del archivo</legend>
            <ul className="situations-export__sheets">
              {SHEETS.map((sheet) => {
                const checked = sheet.locked || sheets.includes(sheet.id)
                return (
                  <li key={sheet.id}>
                    <label className="situations-export__sheet" data-checked={checked || undefined} data-locked={sheet.locked || undefined}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={sheet.locked}
                        onChange={() => setSheets((list) => toggle(list, sheet.id))}
                        data-testid={`export-sheet-${sheet.id}`}
                      />
                      <span className="situations-export__sheet-text">
                        <strong>
                          {sheet.title}
                          {sheet.locked ? <small> · siempre incluida</small> : null}
                        </strong>
                        <span>{sheet.detail}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        </div>

        <footer className="situations-export__footer">
          <p className="situations-export__estimate" aria-live="polite" data-testid="situations-export-estimate">
            {problem ? (
              <span className="situations-export__problem">{problem}</span>
            ) : error ? (
              <span className="situations-export__error" role="alert">{error}</span>
            ) : !countsKnown ? (
              'Incluirá todas las situaciones activas que cumplan los filtros.'
            ) : (
              <>
                {narrowed ? 'Hasta ' : ''}
                <strong>{scopeActive}</strong>{' '}
                {scopeActive === 1 ? 'situación activa' : 'situaciones activas'}
                {coordinationMode === 'pick'
                  ? ` en ${pickedIds.length} ${pickedIds.length === 1 ? 'coordinación' : 'coordinaciones'}`
                  : ' en todas las coordinaciones'}
              </>
            )}
          </p>
          <div className="situations-export__actions">
            <button
              type="button"
              className="situations-export__secondary"
              onClick={onClose}
              disabled={isDownloading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="situations-export__primary"
              disabled={Boolean(problem) || isDownloading}
              data-testid="situations-export-submit"
            >
              {isDownloading ? (
                <>
                  <span className="situations-export__spinner" aria-hidden="true" />
                  Generando…
                </>
              ) : (
                <>
                  <IconDownload size={17} />
                  Descargar Excel
                </>
              )}
            </button>
          </div>
        </footer>
      </form>
    </div>,
    document.body,
  )
}
