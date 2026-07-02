// Componente: panel de acción rápida del compromiso enfocado (Sprint 12.1–12.3).
// Material cromático permanente según el estado del compromiso.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type {
  Commitment,
  CommitmentStatus,
} from '@/modules/commitments/types/commitment.types'
import {
  HOLOGRAM_BREATH_BEAM_IDLE,
  HOLOGRAM_BREATH_HALO_IDLE,
  HOLOGRAM_BREATH_MATERIAL_IDLE,
} from '@/modules/monitoring/constants/operationalBreathing'
import {
  getHologramChromaticVisual,
  HOLOGRAM_CHROMATIC_IDLE,
  HOLOGRAM_CHROMATIC_TRANSITION,
  type HologramChromaticVisual,
} from '@/modules/monitoring/constants/hologramChromaticTheme'
import {
  HOLOGRAM_CHAMFER_INNER,
  HOLOGRAM_CHAMFER_OUTER,
  HOLOGRAM_INNER_CAVITY_INSET,
  HOLOGRAM_INNER_REVEAL_INSET,
  HOLOGRAM_PANEL_SHELL,
} from '@/modules/monitoring/constants/hologramGeometryTheme'
import { PLANE_HOLOGRAM } from '@/modules/monitoring/constants/visualPlanes'
import { HOLOGRAM_IDLE_HINT } from '@/modules/monitoring/constants/visualHierarchy'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import { PROJECTION_HOLOGRAM_HITBOX, PROJECTION_HOLOGRAM_HITBOX_IDLE, PROJECTION_HOLOGRAM_PANEL } from '@/modules/monitoring/constants/projectionTheme'

const HOLOGRAM_TRANSITION_BOOST_MS = 500

/** Padding interior compacto. */
const HOLOGRAM_CONTENT_PAD =
  'p-2 sm:p-2.5 lg:px-2.5 lg:pt-1.5 lg:pb-2'

const HOLOGRAM_IDLE_PAD =
  'flex flex-col items-center justify-center px-3 py-2 sm:min-h-[2.25rem] sm:py-2 lg:min-h-[1.75rem] lg:px-2.5 lg:py-1.5'

const HOLOGRAM_ACTIONS_FOOTER = 'mt-2 border-t pt-2 pb-0.5'

interface CommitmentHologramProps {
  commitment: Commitment | null
  canValidate?: boolean
  isUpdating?: boolean
  onValidate?: (status: 'Cumplido' | 'Incumplido') => void
}

function HologramMachinedLayers({
  visual,
  includeIdleBreath = false,
}: {
  visual: HologramChromaticVisual
  includeIdleBreath?: boolean
}) {
  return (
    <>
      {includeIdleBreath ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${HOLOGRAM_BREATH_HALO_IDLE} ${HOLOGRAM_BREATH_MATERIAL_IDLE}`}
        />
      ) : null}
      <div aria-hidden="true" className={visual.volumeHalo} />
      <div aria-hidden="true" className={`${visual.beam} ${includeIdleBreath ? HOLOGRAM_BREATH_BEAM_IDLE : ''}`} />
      <div
        aria-hidden="true"
        className={`${HOLOGRAM_CHROMATIC_TRANSITION} ${visual.edgeHalo}`}
      />
      <div
        aria-hidden="true"
        className={`${HOLOGRAM_INNER_REVEAL_INSET} ${HOLOGRAM_CHAMFER_INNER} ${HOLOGRAM_CHROMATIC_TRANSITION} ${visual.innerReveal}`}
      />
      <div
        aria-hidden="true"
        className={`${HOLOGRAM_INNER_CAVITY_INSET} ${HOLOGRAM_CHAMFER_INNER} ${HOLOGRAM_CHROMATIC_TRANSITION} ${visual.innerCavity}`}
      />
      <div
        aria-hidden="true"
        className={`${HOLOGRAM_CHROMATIC_TRANSITION} ${visual.coupleGlow}`}
      />
    </>
  )
}

function ProjectionShell({
  children,
  visual,
  transitionBoost,
}: {
  children: ReactNode
  visual: HologramChromaticVisual
  transitionBoost: boolean
}) {
  const boostClass = transitionBoost ? visual.transitionBoost : ''

  return (
    <div className={PROJECTION_HOLOGRAM_PANEL}>
      <section
        className={`${PLANE_HOLOGRAM} pointer-events-none h-full w-full ${HOLOGRAM_PANEL_SHELL} ${HOLOGRAM_CHAMFER_OUTER} ${HOLOGRAM_CHROMATIC_TRANSITION} ${visual.surface} ${boostClass}`}
      >
        <HologramMachinedLayers visual={visual} />
        <div className={PROJECTION_HOLOGRAM_HITBOX}>{children}</div>
      </section>
    </div>
  )
}

function IdleProjectionShell({ children }: { children: ReactNode }) {
  const visual = HOLOGRAM_CHROMATIC_IDLE

  return (
    <div className={PROJECTION_HOLOGRAM_PANEL}>
      <section
        className={`${PLANE_HOLOGRAM} pointer-events-none h-full w-full ${HOLOGRAM_PANEL_SHELL} ${HOLOGRAM_CHAMFER_OUTER} ${HOLOGRAM_CHROMATIC_TRANSITION} ${visual.surface}`}
      >
      <HologramMachinedLayers visual={visual} includeIdleBreath />
      <div className={PROJECTION_HOLOGRAM_HITBOX_IDLE}>{children}</div>
      </section>
    </div>
  )
}

export function CommitmentHologram({
  commitment,
  canValidate = false,
  isUpdating = false,
  onValidate,
}: CommitmentHologramProps) {
  const [optimisticStatus, setOptimisticStatus] = useState<CommitmentStatus | null>(
    null,
  )
  const [transitionBoost, setTransitionBoost] = useState(false)
  const previousCommitmentIdRef = useRef<string | null>(null)
  const previousDisplayStatusRef = useRef<CommitmentStatus | null>(null)

  const displayStatus: CommitmentStatus | null = commitment
    ? optimisticStatus ?? commitment.status
    : null

  const visual = displayStatus
    ? getHologramChromaticVisual(displayStatus)
    : HOLOGRAM_CHROMATIC_IDLE

  const shouldAnimateEntry =
    commitment !== null && previousCommitmentIdRef.current !== commitment.id

  useEffect(() => {
    previousCommitmentIdRef.current = commitment?.id ?? null
  }, [commitment?.id])

  useEffect(() => {
    setOptimisticStatus(null)
    setTransitionBoost(false)
    previousDisplayStatusRef.current = null
  }, [commitment?.id])

  useEffect(() => {
    if (!commitment || !displayStatus) return

    if (previousDisplayStatusRef.current === null) {
      previousDisplayStatusRef.current = displayStatus
      return
    }

    if (previousDisplayStatusRef.current !== displayStatus) {
      setTransitionBoost(true)
      const timer = window.setTimeout(() => {
        setTransitionBoost(false)
      }, HOLOGRAM_TRANSITION_BOOST_MS)
      previousDisplayStatusRef.current = displayStatus
      return () => window.clearTimeout(timer)
    }
  }, [commitment, displayStatus])

  useEffect(() => {
    if (!isUpdating && optimisticStatus !== null && commitment) {
      if (commitment.status === optimisticStatus) {
        setOptimisticStatus(null)
        return
      }
      if (commitment.status !== optimisticStatus) {
        setOptimisticStatus(null)
      }
    }
  }, [isUpdating, optimisticStatus, commitment])

  if (!commitment || !displayStatus) {
    return (
      <IdleProjectionShell>
        <div className={HOLOGRAM_IDLE_PAD}>
          <p className={HOLOGRAM_IDLE_HINT}>Zona de proyección en espera</p>
        </div>
      </IdleProjectionShell>
    )
  }

  const validateDisabled = !canValidate || isUpdating
  const isFulfilled = displayStatus === 'Cumplido'
  const isBreached = displayStatus === 'Incumplido'

  const handleValidateClick = (status: 'Cumplido' | 'Incumplido') => {
    setOptimisticStatus(status)
    onValidate?.(status)
  }

  const handleDetailsClick = () => {
    // Placeholder — abrirá el panel completo del compromiso en un sprint futuro.
  }

  return (
    <ProjectionShell visual={visual} transitionBoost={transitionBoost}>
      <div
        className={`lg:overflow-visible ${HOLOGRAM_CONTENT_PAD} ${
          shouldAnimateEntry ? 'omega-projection-in' : ''
        }`}
      >
        <header>
          <p className={`text-center ${visual.eyebrow}`}>Proyección operativa</p>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
            <span
              className={`${visual.statusBadge} ${HOLOGRAM_CHROMATIC_TRANSITION} ${
                transitionBoost ? visual.transitionBoost : ''
              }`}
            >
              {displayStatus}
            </span>
            <span className={visual.impactChip}>
              Impacto {commitment.operationalImpact}/5
            </span>
          </div>
        </header>

        <h2 className={`mt-2 ${visual.title}`}>{commitment.title}</h2>

        <div className={`${HOLOGRAM_ACTIONS_FOOTER} border-t ${visual.actionsDivider}`}>
          <div
            className="flex flex-wrap items-center justify-center gap-1.5"
            aria-busy={isUpdating}
          >
            <button
              type="button"
              disabled={validateDisabled}
              onClick={() => handleValidateClick('Cumplido')}
              className={`${visual.validateBtnOk} ${FOCUS_VISIBLE} ${
                isFulfilled ? visual.validateBtnOkAffirmed : ''
              }`}
            >
              Cumplido
            </button>
            <button
              type="button"
              disabled={validateDisabled}
              onClick={() => handleValidateClick('Incumplido')}
              className={`${visual.validateBtnFail} ${FOCUS_VISIBLE} ${
                isBreached ? visual.validateBtnFailAffirmed : ''
              }`}
            >
              Incumplido
            </button>
            <button
              type="button"
              onClick={handleDetailsClick}
              className={`${visual.detailsBtn} ${FOCUS_VISIBLE}`}
            >
              Más detalles
            </button>
            {isUpdating && (
              <span
                aria-live="polite"
                className={`flex basis-full items-center justify-center gap-1.5 ${visual.updatingText}`}
              >
                <span
                  className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                    isFulfilled
                      ? 'bg-emerald-400'
                      : isBreached
                        ? 'bg-red-400'
                        : 'bg-indigo-400'
                  }`}
                />
                Actualizando…
              </span>
            )}
          </div>
        </div>
      </div>
    </ProjectionShell>
  )
}
