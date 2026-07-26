// Componente: consola de evaluación (estación central del cristal).
// Sprint 10.1: registros compactos de alta densidad — navegación, no tarjetas.
// Sprint 10.2: ventana fija con scroll interno para la lista de compromisos.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  Commitment,
  CommitmentStatus,
} from '@/modules/commitments/types/commitment.types'
import { getCommitmentDisplayStatus } from '@/modules/commitments/utils/commitmentValidation.utils'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { CommitmentEvaluationCard } from '@/modules/monitoring/components/CommitmentEvaluationCard'
import { getOperationalRoomVisual } from '@/modules/monitoring/constants/operationalRoomState'
import { AMBIENT_ACCENT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import { CrystalStationHeaderBracket } from '@/modules/monitoring/components/CrystalStructure'
import {
  CONSOLE_CONTROLS,
  CONSOLE_FILTER,
  CONSOLE_META,
  CONSOLE_STATION_TITLE,
  CONSOLE_ZONE,
} from '@/modules/monitoring/constants/visualHierarchy'
import {
  CONSOLE_LIST_VIEWPORT,
  CRYSTAL_CONSOLE_HEADER,
  CRYSTAL_CONSOLE_ZONE,
  CRYSTAL_DOSSIER_PAD,
  CRYSTAL_LIST_PAD,
  CRYSTAL_STRUCTURAL_DIVIDE,
  FOCUS_VISIBLE,
} from '@/modules/monitoring/constants/monitoringTheme'
import {
  CRYSTAL_CONSOLE_READING_FIELD,
  CRYSTAL_SKELETON_PULSE,
} from '@/modules/monitoring/constants/materialTheme'
import { OmegaIcon } from '@/shared/components/OmegaIcon'

interface EvaluationConsoleProps {
  commitments: Commitment[]
  selectedCommitmentId: string | null
  loading: boolean
  error: string | null
  executorWithoutArea: boolean
  /** Vista agregada (Visión General Operaciones). */
  isGlobal?: boolean
  areaLabel?: string
  canValidate?: boolean
  canApplyValidation?: boolean
  isApplyingValidation?: boolean
  onSelectCommitment: (commitmentId: string) => void
  onApplyAreaValidation?: () => void
  /** Estado del área enfocada (acento de estación en el cristal). */
  environment: EnvironmentStatus
}

/** Filtro por estado (incluye "Todos"). */
type StatusFilter = 'Todos' | CommitmentStatus
/** Orden por impacto operativo. */
type SortOrder = 'impact-desc' | 'impact-asc'

const STATUS_OPTIONS: StatusFilter[] = [
  'Todos',
  'Pendiente de validación',
  'Cumplido',
  'Incumplido',
]

const PAGE_SIZE = 3

const SELECT_CLASSES =
  `appearance-none px-2 py-0.5 ${CONSOLE_FILTER} transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/40`

const APPLY_STATES_BUTTON_CLASSES =
  'omega-console-action omega-console-action--apply shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400/40'

function ConsoleListViewport({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div
      className={CONSOLE_LIST_VIEWPORT}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  )
}

/**
 * Placeholder institucional que mantiene el layout estable durante la carga.
 */
function ConsoleSkeleton() {
  return (
    <ul
      className={`omega-scan-skeleton ${CRYSTAL_LIST_PAD} ${CRYSTAL_STRUCTURAL_DIVIDE} ${CRYSTAL_CONSOLE_READING_FIELD}`}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <li key={index} className={CRYSTAL_DOSSIER_PAD}>
          <div className="flex items-center gap-2">
            <div className={`hidden h-2 w-10 shrink-0 sm:block ${CRYSTAL_SKELETON_PULSE}`} />
            <div className={`h-3 min-w-0 flex-1 ${CRYSTAL_SKELETON_PULSE}`} />
            <div className={`h-3 w-16 shrink-0 ${CRYSTAL_SKELETON_PULSE}`} />
            <div className={`h-3 w-12 shrink-0 ${CRYSTAL_SKELETON_PULSE}`} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Estado vacío/informativo integrado en la ventana fija de la consola. */
function ConsoleNotice({
  message,
  title,
  actionHint,
  role,
  state = 'empty',
}: {
  message: string
  title?: string
  actionHint?: string
  role?: 'alert'
  state?: 'empty' | 'error'
}) {
  return (
    <div
      role={role}
      className="omega-console-notice"
      data-state={role === 'alert' ? 'error' : state}
    >
      {title ? <strong>{title}</strong> : null}
      <p>{message}</p>
      {actionHint ? <span>{actionHint}</span> : null}
    </div>
  )
}

export function EvaluationConsole({
  commitments,
  selectedCommitmentId,
  loading,
  error,
  executorWithoutArea,
  isGlobal = false,
  areaLabel,
  canValidate = false,
  canApplyValidation = false,
  isApplyingValidation = false,
  onSelectCommitment,
  onApplyAreaValidation,
  environment,
}: EvaluationConsoleProps) {
  const roomVisual = getOperationalRoomVisual(environment)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos')
  const [sortOrder, setSortOrder] = useState<SortOrder>('impact-desc')
  const [page, setPage] = useState(1)

  const visibleCommitments = useMemo(() => {
    const filtered =
      statusFilter === 'Todos'
        ? commitments
        : commitments.filter(
            (commitment) =>
              getCommitmentDisplayStatus(commitment) === statusFilter,
          )

    return [...filtered].sort((a, b) =>
      sortOrder === 'impact-desc'
        ? b.operationalImpact - a.operationalImpact
        : a.operationalImpact - b.operationalImpact,
    )
  }, [commitments, statusFilter, sortOrder])

  const totalPages = Math.max(1, Math.ceil(visibleCommitments.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageEnd = pageStart + PAGE_SIZE
  const paginatedCommitments = visibleCommitments.slice(pageStart, pageEnd)
  const visibleRangeStart = visibleCommitments.length === 0 ? 0 : pageStart + 1
  const visibleRangeEnd = Math.min(pageEnd, visibleCommitments.length)

  useEffect(() => {
    setPage((value) => Math.min(value, totalPages))
  }, [totalPages])

  useEffect(() => {
    setPage(1)
  }, [commitments])

  const hasData =
    !loading && !error && !executorWithoutArea && commitments.length > 0

  const applyDisabled =
    !canValidate ||
    isGlobal ||
    !canApplyValidation ||
    isApplyingValidation ||
    !onApplyAreaValidation

  const applyButtonTitle = isGlobal
    ? 'Seleccione un área operativa para aplicar la validación.'
    : !canApplyValidation
      ? 'Califique todos los compromisos del área para habilitar la aplicación.'
      : 'Consolidar las calificaciones y actualizar el estado del área.'

  return (
    <section
      className={`omega-evaluation-console min-h-0 flex flex-col overflow-hidden pb-4 lg:min-h-0 lg:flex-1 lg:pb-5 ${CONSOLE_ZONE} ${CRYSTAL_CONSOLE_ZONE}`}
    >
      {roomVisual.consoleVeil && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.consoleVeil}`}
        />
      )}
      <header className={`mb-3.5 shrink-0 ${CRYSTAL_CONSOLE_HEADER}`}>
        <div className="min-w-0">
          <h2 className={`flex items-center gap-2 ${CONSOLE_STATION_TITLE}`}>
            <CrystalStationHeaderBracket />
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.consoleAccent}`}
            />
            Compromisos
            {isGlobal ? (
              <span className={`ml-1.5 font-normal normal-case ${CONSOLE_META}`}>
                · todas las áreas
              </span>
            ) : null}
          </h2>
          <p className="omega-section-hint mt-1 mb-0">
            {areaLabel
              ? `Seleccione un compromiso de ${areaLabel}.`
              : 'Elija un compromiso para validarlo.'}
          </p>
        </div>

        {hasData ? (
          <div
            className={`omega-console-controls flex flex-wrap items-center gap-1.5 ${CONSOLE_CONTROLS}`}
          >
            <select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter)
                setPage(1)
              }}
              className={`omega-console-filter ${SELECT_CLASSES} ${FOCUS_VISIBLE}`}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'Todos'
                    ? 'Todos los estados'
                    : option === 'Pendiente de validación'
                      ? 'En proceso'
                      : option === 'Incumplido'
                        ? 'No cumplido'
                        : option}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`${APPLY_STATES_BUTTON_CLASSES} ${FOCUS_VISIBLE} ${
                applyDisabled ? 'omega-console-action--apply-disabled' : ''
              }`}
              aria-label="Aplicar validación del área operativa"
              title={applyButtonTitle}
              disabled={applyDisabled}
              aria-busy={isApplyingValidation}
              onClick={() => onApplyAreaValidation?.()}
            >
              <OmegaIcon name="check" size={14} />
              {isApplyingValidation ? 'Aplicando…' : 'Aplicar validación'}
            </button>
            <select
              aria-label="Ordenar por impacto operativo"
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value as SortOrder)
                setPage(1)
              }}
              className={`omega-console-filter ${SELECT_CLASSES} ${FOCUS_VISIBLE}`}
            >
              <option value="impact-desc">Mayor impacto primero</option>
              <option value="impact-asc">Menor impacto primero</option>
            </select>
            <span className={`shrink-0 ${CONSOLE_META}`}>
              {visibleRangeStart}-{visibleRangeEnd} de {visibleCommitments.length}
              {isGlobal ? ' · todas las áreas' : ''}
            </span>
            <span className="omega-help-tip" tabIndex={0} aria-label="Ayuda de validación">
              <OmegaIcon name="help" size={14} />
              <span role="tooltip">
                Primero elija un compromiso, marque Cumplido o Incumplido en el panel izquierdo y luego aplique la validación del área.
              </span>
            </span>
          </div>
        ) : (
          <span className={`shrink-0 ${CONSOLE_META}`}>
            {commitments.length} compromisos
            {isGlobal ? ' agregados' : ''}
          </span>
        )}
      </header>

      {loading ? (
        <ConsoleListViewport label="Lista de compromisos">
          <div role="status" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando compromisos…</span>
            <ConsoleSkeleton />
          </div>
        </ConsoleListViewport>
      ) : error ? (
        <ConsoleListViewport label="Lista de compromisos">
          <ConsoleNotice
            role="alert"
            state="error"
            message="No fue posible cargar los compromisos. Intente de nuevo en unos momentos."
          />
        </ConsoleListViewport>
      ) : executorWithoutArea ? (
        <ConsoleListViewport label="Lista de compromisos">
          <ConsoleNotice message="Aún no tiene un área asignada. Pida al supervisor que habilite su acceso para continuar." />
        </ConsoleListViewport>
      ) : commitments.length === 0 ? (
        <ConsoleListViewport label="Lista de compromisos">
          <ConsoleNotice
            title={isGlobal ? 'Sin compromisos registrados' : 'Área sin compromisos activos'}
            message={
              isGlobal
                ? 'Aún no hay compromisos cargados para la operación general.'
                : `No encontramos compromisos para ${areaLabel ?? 'esta área'} en este momento.`
            }
            actionHint={isGlobal ? 'Seleccione un área operativa para revisar el detalle.' : 'Cambie el área desde el selector superior para continuar.'}
          />
        </ConsoleListViewport>
      ) : visibleCommitments.length === 0 ? (
        <ConsoleListViewport label="Lista de compromisos">
          <ConsoleNotice
            title="Sin resultados para este filtro"
            message="No hay compromisos que coincidan con la vista seleccionada."
            actionHint="Pruebe otro estado o cambie el orden de revisión."
          />
        </ConsoleListViewport>
      ) : (
        <ConsoleListViewport label="Lista de compromisos">
          <ul
            className={`${CRYSTAL_LIST_PAD} ${CRYSTAL_CONSOLE_READING_FIELD}`}
          >
            {paginatedCommitments.map((commitment) => (
              <li key={commitment.id} className="relative">
                <CommitmentEvaluationCard
                  commitment={commitment}
                  selected={commitment.id === selectedCommitmentId}
                  onSelect={onSelectCommitment}
                />
              </li>
            ))}
          </ul>
          <nav
            className="omega-console-pagination"
            aria-label="Paginación de compromisos"
          >
              <button
                type="button"
                className={FOCUS_VISIBLE}
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                aria-label="Página anterior"
              >
                <OmegaIcon name="chevron-left" size={15} />
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                className={FOCUS_VISIBLE}
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                aria-label="Página siguiente"
              >
                Siguiente
                <OmegaIcon name="chevron-right" size={15} />
              </button>
          </nav>
        </ConsoleListViewport>
      )}
    </section>
  )
}
