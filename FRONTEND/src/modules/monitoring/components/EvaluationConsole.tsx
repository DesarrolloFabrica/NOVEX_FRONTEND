// Componente: consola de evaluación (estación central del cristal).
// Sprint 10.1: registros compactos de alta densidad — navegación, no tarjetas.
// Sprint 10.2: ventana fija con scroll interno para la lista de compromisos.

import { useMemo, useState, type ReactNode } from 'react'
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

interface EvaluationConsoleProps {
  commitments: Commitment[]
  selectedCommitmentId: string | null
  loading: boolean
  error: string | null
  executorWithoutArea: boolean
  /** Vista agregada (Visión General Operaciones). */
  isGlobal?: boolean
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
      className={`${CRYSTAL_LIST_PAD} ${CRYSTAL_STRUCTURAL_DIVIDE} ${CRYSTAL_CONSOLE_READING_FIELD}`}
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
  role,
}: {
  message: string
  role?: 'alert'
}) {
  return (
    <p role={role} className="px-5 py-8 text-center text-sm text-slate-600">
      {message}
    </p>
  )
}

export function EvaluationConsole({
  commitments,
  selectedCommitmentId,
  loading,
  error,
  executorWithoutArea,
  isGlobal = false,
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
        <h2 className={`flex items-center gap-2 ${CONSOLE_STATION_TITLE}`}>
          <CrystalStationHeaderBracket />
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.consoleAccent}`}
          />
          Consola central
          {isGlobal ? (
            <span className={`ml-1.5 font-normal normal-case ${CONSOLE_META}`}>
              · Vista agregada
            </span>
          ) : null}
        </h2>

        {hasData ? (
          <div
            className={`omega-console-controls flex flex-wrap items-center gap-1.5 ${CONSOLE_CONTROLS}`}
          >
            <select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className={`omega-console-filter ${SELECT_CLASSES} ${FOCUS_VISIBLE}`}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'Todos' ? 'Todos los estados' : option}
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
              {isApplyingValidation ? 'Aplicando…' : 'Aplicar validación'}
            </button>
            <select
              aria-label="Ordenar por impacto operativo"
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value as SortOrder)
              }
              className={`omega-console-filter ${SELECT_CLASSES} ${FOCUS_VISIBLE}`}
            >
              <option value="impact-desc">Mayor impacto primero</option>
              <option value="impact-asc">Menor impacto primero</option>
            </select>
            <span className={`shrink-0 ${CONSOLE_META}`}>
              {visibleCommitments.length}/{commitments.length}
              {isGlobal ? ' · todas las áreas' : ''}
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
            message="No fue posible cargar los compromisos. Reinicia los datos o intenta nuevamente."
          />
        </ConsoleListViewport>
      ) : executorWithoutArea ? (
        <ConsoleListViewport label="Lista de compromisos">
          <ConsoleNotice message="No tienes un área operativa asignada. Contacta al supervisor para habilitar tu acceso." />
        </ConsoleListViewport>
      ) : commitments.length === 0 ? (
        <ConsoleListViewport label="Lista de compromisos">
          <ConsoleNotice
            message={
              isGlobal
                ? 'No hay compromisos registrados en las áreas operativas.'
                : 'No hay compromisos registrados para esta área.'
            }
          />
        </ConsoleListViewport>
      ) : visibleCommitments.length === 0 ? (
        <ConsoleListViewport label="Lista de compromisos">
          <ConsoleNotice message="Ningún compromiso coincide con el filtro seleccionado." />
        </ConsoleListViewport>
      ) : (
        <ConsoleListViewport label="Lista de compromisos">
          <ul
            className={`${CRYSTAL_LIST_PAD} ${CRYSTAL_CONSOLE_READING_FIELD}`}
          >
            {visibleCommitments.map((commitment) => (
              <li key={commitment.id} className="relative">
                <CommitmentEvaluationCard
                  commitment={commitment}
                  selected={commitment.id === selectedCommitmentId}
                  onSelect={onSelectCommitment}
                />
              </li>
            ))}
          </ul>
        </ConsoleListViewport>
      )}
    </section>
  )
}
