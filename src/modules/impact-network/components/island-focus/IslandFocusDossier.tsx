import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { getCoordination } from '@/modules/impact-network/data/coordination-islands.config'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { FocusedPropagation } from '@/modules/impact-network/types/impact-network.types'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { RISK_LEVEL_LABEL } from '@/modules/operational-events/components/eventPresentation'
import { NovexIcon } from '@/shared/components/NovexIcon'
import {
  isIslandFocusOrigin,
  resolveIslandAffectedBriefing,
  resolveIslandStageBriefing,
} from './island-focus.selectors'
import { IslandFocusAffectedPanel } from './IslandFocusAffectedPanel'
import { IslandFocusOriginPanel } from './IslandFocusOriginPanel'
import { IslandFocusStageInfo } from './IslandFocusStageInfo'

interface IslandFocusDossierProps {
  open: boolean
  coordinationId: CoordinationId
  propagation: FocusedPropagation
  event: OperationalEvent
  reducedMotion?: boolean
  onClose: () => void
  onExitComplete?: () => void
}

export function IslandFocusDossier({
  open,
  coordinationId,
  propagation,
  event,
  reducedMotion = false,
  onClose,
  onExitComplete,
}: IslandFocusDossierProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [exportState, setExportState] = useState<
    'idle' | 'generating' | 'error'
  >('idle')
  const isOrigin = isIslandFocusOrigin(coordinationId, propagation)
  const affectedBriefing = isOrigin
    ? null
    : resolveIslandAffectedBriefing(coordinationId, propagation, event)
  const coordination = getCoordination(coordinationId)
  const panelKicker = isOrigin ? 'Situación origen' : 'Coordinación afectada'
  const panelSubtitle = isOrigin
    ? 'Análisis ejecutivo generado por la IA'
    : affectedBriefing
      ? `Afectación ${RISK_LEVEL_LABEL[affectedBriefing.affectationLevel]} · Briefing operacional`
      : 'Briefing operacional de la coordinación'
  const stageBriefing = useMemo(
    () => resolveIslandStageBriefing(coordinationId, propagation, event),
    [coordinationId, propagation, event],
  )

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()

    function handleKeyDown(eventKey: KeyboardEvent) {
      if (eventKey.key === 'Escape') {
        eventKey.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose, open])

  async function handleExport() {
    if (exportState === 'generating') return
    setExportState('generating')
    try {
      const { exportSituationReportPdf } = await import(
        '@/modules/operational-events/utils/exportSituationReportPdf'
      )
      await exportSituationReportPdf(event)
      setExportState('idle')
    } catch {
      setExportState('error')
    }
  }

  return (
    <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
      {open ? (
        <motion.div
          className="island-focus-dossier"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={
            reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, transition: { delay: 0.18, duration: 0.14 } }
          }
          transition={{
            duration: reducedMotion ? 0.12 : 0.22,
            ease: [0.22, 0.84, 0.24, 1],
          }}
        >
          <button
            type="button"
            className="island-focus-dossier__backdrop"
            aria-label="Volver al mapa"
            onClick={onClose}
          />

          <IslandFocusStageInfo
            briefing={stageBriefing}
            reducedMotion={reducedMotion}
          />

          <motion.aside
            className="island-focus-dossier__panel"
            data-impact-tour="situation-dossier"
            initial={reducedMotion ? false : { opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    x: 24,
                    transition: { delay: 0.12, duration: 0.28, ease: [0.22, 0.84, 0.24, 1] },
                  }
            }
            transition={{
              duration: reducedMotion ? 0.12 : 0.48,
              ease: [0.22, 0.84, 0.24, 1],
            }}
          >
            <motion.header
              className="island-focus-dossier__topbar"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -4, transition: { duration: 0.14 } }
              }
              transition={{ delay: reducedMotion ? 0 : 0.06, duration: 0.36 }}
            >
              <div className="island-focus-dossier__topbar-copy">
                <span className="island-focus-dossier__topbar-kicker">
                  {isOrigin ? 'Situación' : panelKicker} · {coordination.shortName}
                </span>
                <strong>{event.title}</strong>
                <span className="island-focus-dossier__topbar-subtitle">
                  {isOrigin
                    ? 'Expediente y análisis en un solo lugar'
                    : panelSubtitle}
                </span>
              </div>
              <div className="island-focus-dossier__topbar-actions">
                {isOrigin ? (
                  <button
                    type="button"
                    className="island-focus-dossier__export"
                    onClick={() => void handleExport()}
                    disabled={exportState === 'generating'}
                    aria-busy={exportState === 'generating'}
                  >
                    <NovexIcon name="download" size={14} />
                    <span>
                      {exportState === 'generating'
                        ? 'Generando PDF…'
                        : exportState === 'error'
                          ? 'Reintentar PDF'
                          : 'Descargar PDF'}
                    </span>
                  </button>
                ) : null}
                <button
                  ref={closeRef}
                  type="button"
                  className="island-focus-dossier__close island-focus-dossier__close--back"
                  aria-label="Volver al mapa"
                  onClick={onClose}
                >
                  <span aria-hidden="true">←</span>
                  <span>Volver al mapa</span>
                </button>
              </div>
            </motion.header>

            <div id={titleId} className="island-focus-sr-only">
              {event.title}
            </div>

            {isOrigin ? (
              <dl className="island-focus-dossier__facts" aria-label="Síntesis de la situación">
                <div>
                  <dt>Riesgo</dt>
                  <dd>
                    {RISK_LEVEL_LABEL[event.interpretation?.riskLevel ?? 'moderate']}
                    {event.interpretation?.riskScore != null
                      ? ` · ${Math.round(event.interpretation.riskScore)}/100`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt>Impacto</dt>
                  <dd>
                    {propagation.affectedNames.length > 0
                      ? propagation.affectedNames.length === 1
                        ? '1 coordinación'
                        : `${propagation.affectedNames.length} coordinaciones`
                      : 'Contenido'}
                  </dd>
                </div>
                <div>
                  <dt>Origen</dt>
                  <dd>{coordination.shortName}</dd>
                </div>
              </dl>
            ) : null}

            <motion.div
              className="island-focus-dossier__content"
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 8, transition: { duration: 0.16 } }
              }
              transition={{
                delay: reducedMotion ? 0 : 0.12,
                duration: reducedMotion ? 0.12 : 0.4,
                ease: [0.22, 0.84, 0.24, 1],
              }}
            >
              {isOrigin ? (
                <IslandFocusOriginPanel
                  event={event}
                  coordinationId={coordinationId}
                />
              ) : affectedBriefing ? (
                <IslandFocusAffectedPanel briefing={affectedBriefing} />
              ) : null}
            </motion.div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
