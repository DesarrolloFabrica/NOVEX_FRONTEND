import { motion } from 'motion/react'
import { RISK_LEVEL_LABEL } from '@/modules/operational-events/components/eventPresentation'
import type { IslandStageBriefing } from './island-focus.selectors'

interface IslandFocusStageInfoProps {
  briefing: IslandStageBriefing
  reducedMotion?: boolean
}

export function IslandFocusStageInfo({
  briefing,
  reducedMotion = false,
}: IslandFocusStageInfoProps) {
  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 } as const,
        animate: { opacity: 1, y: 0 } as const,
        transition: { duration: 0.42, ease: [0.22, 0.84, 0.24, 1] as const },
      }

  return (
    <div
      className="island-focus-dossier__stage"
      data-role={briefing.role}
      data-risk={briefing.riskLevel}
    >
      <motion.div
        className="island-focus-dossier__stage-card island-focus-dossier__stage-card--top"
        {...motionProps}
        transition={
          reducedMotion
            ? undefined
            : { delay: 0.08, duration: 0.42, ease: [0.22, 0.84, 0.24, 1] }
        }
      >
        <div className="island-focus-dossier__stage-meta">
          <span className="island-focus-dossier__stage-chip">
            {briefing.shortName}
          </span>
          <span
            className="island-focus-dossier__stage-status"
            data-risk={briefing.riskLevel}
          >
            {briefing.statusLabel}
          </span>
        </div>
        <span className="island-focus-dossier__stage-kicker">
          {briefing.roleLabel}
        </span>
        <strong className="island-focus-dossier__stage-title">
          {briefing.coordinationName}
        </strong>
        <p className="island-focus-dossier__stage-summary">
          {briefing.topSummary}
        </p>
      </motion.div>

      <div className="island-focus-dossier__stage-gap" aria-hidden="true" />

      <motion.div
        className="island-focus-dossier__stage-card island-focus-dossier__stage-card--bottom"
        {...motionProps}
        transition={
          reducedMotion
            ? undefined
            : { delay: 0.16, duration: 0.42, ease: [0.22, 0.84, 0.24, 1] }
        }
      >
        <dl className="island-focus-dossier__stage-metrics">
          {briefing.metrics.map((metric) => (
            <div key={metric.label} className="island-focus-dossier__stage-metric">
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
        <p className="island-focus-dossier__stage-detail">
          {briefing.bottomDetail}
        </p>
        <span className="island-focus-dossier__stage-risk">
          Riesgo {RISK_LEVEL_LABEL[briefing.riskLevel]}
        </span>
      </motion.div>
    </div>
  )
}
