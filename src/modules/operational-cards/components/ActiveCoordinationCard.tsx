import { motion, useReducedMotion } from 'motion/react'
import { hexToRgbChannels } from '@/modules/impact-network/data/coordination-islands.config'
import { ProblemRow } from '@/modules/operational-cards/components/ProblemRow'
import { buildCoordinationSummary } from '@/modules/operational-cards/services/coordination-problems.service'
import type { CoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalCardsLevel1State } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Cara operativa de la coordinación seleccionada.
 *
 * Sigue siendo una carta —grande y protagonista—, no un modal: no atrapa el
 * foco, no oscurece la pantalla y las otras catorce siguen siendo clickeables.
 *
 * El estado operacional es el de LEVEL 0 y no se recalcula con los problemas
 * cargados: el backend sigue siendo la autoridad de integridad.
 */

const SKELETON_ROWS = 3

export interface ActiveCoordinationCardProps {
  coordination: CoordinationOverview
  identity: CoordinationVisualIdentity
  level1: OperationalCardsLevel1State
  /** Preparado para la fase de la isla; la experiencia aún no lo conecta. */
  onProblemSelect?: (problemId: string) => void
}

export function ActiveCoordinationCard({
  coordination,
  identity,
  level1,
  onProblemSelect,
}: ActiveCoordinationCardProps) {
  const reducedMotion = useReducedMotion()
  const statusLabel = OPERATIONAL_STATUS_LABEL[coordination.status]

  // Frase determinística: ni IA, ni una petición extra para las áreas
  // afectadas. El conteo de problemas sale de LEVEL 1 cuando ya está cargado
  // —es la lista que el usuario tiene delante—, y de LEVEL 0 mientras carga.
  // Así la cabecera no puede decir «Todo bajo control» sobre una lista llena.
  const summary = buildCoordinationSummary({
    activeProblemsCount:
      level1.status === 'ready'
        ? level1.problems.length
        : coordination.activeProblemsCount,
    criticalCount:
      level1.status === 'ready'
        ? level1.problems.filter((problem) => problem.severity === 'CRITICAL')
            .length
        : coordination.criticalCount,
    affectedCoordinationCount: coordination.affectedCoordinationCount,
  })

  return (
    <motion.section
      className="active-card"
      data-testid="active-coordination-card"
      data-code={coordination.code}
      data-status={coordination.status}
      data-level1={level1.status}
      style={{ '--coord-rgb': hexToRgbChannels(identity.color) } as React.CSSProperties}
      aria-label={`${identity.name}. Estado operacional: ${statusLabel}.`}
      // El flip: media vuelta contenida, sin rebote ni giros múltiples. Con
      // motion reducido la carta aparece ya en su geometría final.
      initial={
        reducedMotion
          ? { opacity: 0 }
          : { rotateY: -96, scale: 0.9, opacity: 0 }
      }
      animate={
        reducedMotion
          ? { opacity: 1 }
          : { rotateY: 0, scale: 1, opacity: 1 }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 190, damping: 26, mass: 0.7 }
      }
    >
      <span className="active-card__aura" aria-hidden="true" />

      <header className="active-card__header">
        <img
          className="active-card__icon"
          src={identity.iconAsset}
          alt=""
          aria-hidden="true"
        />
        <div className="active-card__heading">
          <h2 className="active-card__name">{identity.name}</h2>
          {summary && (
            <p className="active-card__summary" data-testid="active-card-summary">
              {summary}
            </p>
          )}
        </div>
        <span className="active-card__status" data-testid="active-card-status">
          <span className="active-card__status-dot" aria-hidden="true" />
          {statusLabel}
        </span>
      </header>

      {level1.status === 'loading' || level1.status === 'idle' ? (
        <div
          className="active-card__skeleton"
          data-testid="active-card-loading"
          aria-hidden="true"
        >
          {Array.from({ length: SKELETON_ROWS }, (_unused, index) => (
            <span key={index} />
          ))}
        </div>
      ) : null}

      {level1.status === 'error' && (
        <p className="active-card__notice" data-testid="active-card-error" role="alert">
          No pudimos cargar los problemas de esta coordinación.
        </p>
      )}

      {level1.status === 'ready' &&
        (level1.problems.length === 0 ? (
          <p className="active-card__empty" data-testid="active-card-empty">
            Todo bajo control
          </p>
        ) : (
          <div
            className="active-card__problems"
            data-testid="active-card-problems"
            // Contenedor enfocable: la lista tiene scroll propio y debe poder
            // recorrerse con el teclado.
            tabIndex={0}
            role="group"
            aria-label={`Problemas activos de ${identity.shortName}`}
          >
            {level1.problems.map((problem) => (
              <ProblemRow
                key={problem.id}
                problem={problem}
                onSelect={onProblemSelect}
              />
            ))}
          </div>
        ))}
    </motion.section>
  )
}
