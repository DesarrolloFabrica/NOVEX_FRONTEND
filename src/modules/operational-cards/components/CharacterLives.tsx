import { useId, type CSSProperties } from 'react'
import {
  deriveCharacterHeartStates,
  describeCharacterLives,
  formatCharacterLivesValue,
  isValidLifePoints,
  type CharacterHeartState,
} from '@/modules/operational-cards/data/characterLivesModel'
import {
  NO_LIFE_TRANSITION,
  heartFillUnits,
  type CharacterHeartTransition,
  type CharacterLifeTransition,
  type CharacterLifeTransitionKind,
  type HeartFillUnits,
} from '@/modules/operational-cards/data/characterLifeTransition'
import { useCharacterLifeTransition } from '@/modules/operational-cards/hooks/useCharacterLifeTransition'
import '@/styles/character-lives.css'

/**
 * VIDAS del personaje operacional: cinco corazones de dos puntos cada uno.
 *
 * Componente AISLADO. Solo recibe `lifePoints` ya entregado por el backend: no
 * conoce el overview, ni roles, ni reducer, ni Rive, ni mood, ni reacciones.
 * Quien lo monte decide de dónde sale el número.
 *
 * Accesibilidad: el conjunto se anuncia como UNA imagen con nombre propio
 * («Vidas del personaje: 7 de 10 puntos»); los corazones y la lectura
 * numérica son decorativos para no anunciar lo mismo dos veces. Dentro de un
 * host que ya es `role="img"` (`DirectionCharacter`) se monta con
 * `accessible={false}` y el host incluye las vidas en su propio nombre. El
 * nombre refleja siempre el valor FINAL: la animación no se anuncia.
 *
 * TRANSICIONES. Con `ownerKey` el componente recuerda la lectura anterior de
 * ese dueño y anima solo los corazones que cambian (ver
 * `data/characterLifeTransition`). El estado final se pinta de inmediato; una
 * capa superpuesta anima el TRAMO que cambia: en una pérdida el relleno
 * perdido se apaga y desaparece, en una ganancia el ganado aparece con brillo.
 * Sin animación (reduced motion) esa capa queda en su estado final y se ve el
 * valor nuevo directamente. Los corazones nunca se desmontan: claves 0..4.
 */

export type CharacterLivesSize = 'sm' | 'md' | 'lg'

export interface CharacterLivesProps {
  /** 0..10, o null si no están disponibles. Un valor inválido se trata como null. */
  lifePoints: number | null
  /** Lectura numérica discreta (`7 / 10`). Por defecto visible. */
  showValue?: boolean
  size?: CharacterLivesSize
  className?: string
  /**
   * `true` (por defecto): el conjunto se anuncia solo como `role="img"` con su
   * propio nombre. `false`: uso DECORATIVO dentro de un host que ya anuncia las
   * vidas en su nombre accesible (p. ej. `DirectionCharacter`, que es
   * `role="img"`); el componente entero queda `aria-hidden`, sin rol ni nombre,
   * para no duplicar el anuncio.
   */
  accessible?: boolean
  /**
   * Dueño de las vidas (p. ej. el código de la coordinación). Solo se anima un
   * cambio de valor del MISMO dueño; si el dueño cambia, el valor nuevo
   * reemplaza al anterior sin transición. Sin `ownerKey` no se anima nunca.
   */
  ownerKey?: string | null
}

export interface CharacterLivesViewProps
  extends Omit<CharacterLivesProps, 'ownerKey'> {
  /** Transición ya resuelta. Por defecto, ninguna. */
  transition?: CharacterLifeTransition
  /** Generación de la lectura: reinicia la animación aunque se repita el tipo. */
  generation?: number
}

/**
 * Corazón simétrico respecto a x = 12 en un viewBox 24 × 22. La simetría es lo
 * que permite partirlo EXACTAMENTE por la mitad con un recorte en x = 12.
 */
const HEART_PATH =
  'M12 20.4C5.6 15.6 2 12.3 2 8 2 4.9 4.3 2.5 7.2 2.5c1.9 0 3.7 1.1 4.8 2.8 1.1-1.7 2.9-2.8 4.8-2.8 2.9 0 5.2 2.4 5.2 5.5 0 4.3-3.6 7.6-10 12.4Z'

/** Brillo superior izquierdo: da volumen sin depender de un degradado. */
const HEART_SHINE_PATH = 'M5.2 7.6c0-1.6 1.1-2.8 2.6-2.8.9 0 1.6.4 2 1'

/** `useId` puede devolver caracteres que rompen `url(#…)`; se normaliza. */
function toSvgId(raw: string): string {
  return `cl${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

/**
 * Relleno de un tramo [from, until) en medios de corazón: [0,1) mitad
 * izquierda, [1,2) mitad derecha, [0,2) corazón entero.
 */
function FillLayer({
  from,
  until,
  ids,
  className,
  style,
}: {
  from: HeartFillUnits
  until: HeartFillUnits
  ids: { grain: string; left: string; right: string }
  className?: string
  style?: CSSProperties
}) {
  if (until <= from) return null
  const clip =
    from === 0 && until === 2
      ? undefined
      : from === 0
        ? `url(#${ids.left})`
        : `url(#${ids.right})`

  return (
    <g className={className} clipPath={clip} style={style}>
      <path className="character-lives__fill" d={HEART_PATH} />
      <path
        className="character-lives__grain"
        d={HEART_PATH}
        fill={`url(#${ids.grain})`}
      />
      {from === 0 ? (
        <path className="character-lives__shine" d={HEART_SHINE_PATH} />
      ) : null}
    </g>
  )
}

function CharacterHeart({
  state,
  index,
  idPrefix,
  transition,
  kind,
  generation,
}: {
  state: CharacterHeartState
  index: number
  idPrefix: string
  transition: CharacterHeartTransition | null
  kind: CharacterLifeTransitionKind
  generation: number
}) {
  const ids = {
    grain: `${idPrefix}-grain-${index}`,
    left: `${idPrefix}-left-${index}`,
    right: `${idPrefix}-right-${index}`,
  }
  const finalUnits = heartFillUnits(state)
  const stableUnits = transition ? transition.stableUnits : finalUnits
  const changedUntil = transition ? transition.changedUntil : finalUnits
  const hasFill = state !== 'unknown' && changedUntil > 0
  const delay = transition
    ? ({ '--cl-delay': `${transition.delayMs}ms` } as CSSProperties)
    : undefined

  return (
    <svg
      className="character-lives__heart"
      data-testid="character-lives-heart"
      data-heart-index={index}
      data-state={state}
      data-previous-state={transition ? transition.from : undefined}
      data-transition={transition ? kind : undefined}
      // Alterna el nombre de la animación entre lecturas: dos pérdidas seguidas
      // en el mismo corazón reinician el pulso sin desmontar el corazón.
      data-transition-phase={transition ? generation % 2 : undefined}
      style={delay}
      viewBox="0 0 24 22"
      aria-hidden="true"
      focusable="false"
    >
      {hasFill ? (
        <defs>
          {/* Grano vintage: puntos crema muy tenues sobre el relleno. */}
          <pattern id={ids.grain} width="3" height="3" patternUnits="userSpaceOnUse">
            <circle className="character-lives__grain-dot" cx="0.8" cy="0.8" r="0.4" />
            <circle className="character-lives__grain-dot" cx="2.3" cy="2.2" r="0.3" />
          </pattern>
          <clipPath id={ids.left}>
            <rect x="0" y="0" width="12" height="22" />
          </clipPath>
          <clipPath id={ids.right}>
            <rect x="12" y="0" width="12" height="22" />
          </clipPath>
        </defs>
      ) : null}

      {/* Fondo: el interior apagado. Queda tapado allí donde hay relleno. */}
      <path className="character-lives__base" d={HEART_PATH} />

      {state !== 'unknown' ? (
        <FillLayer from={0} until={stableUnits} ids={ids} />
      ) : null}

      {/* Tramo que cambia. Se monta de nuevo en cada lectura (`key`) para que su
          animación arranque desde el principio. */}
      {transition ? (
        <FillLayer
          key={generation}
          from={stableUnits}
          until={changedUntil}
          ids={ids}
          className={`character-lives__delta character-lives__delta--${kind}`}
          style={delay}
        />
      ) : null}

      {/* Costura suave entre la mitad llena y la vacía. */}
      {state === 'half' ? (
        <line className="character-lives__seam" x1="12" y1="5.6" x2="12" y2="19.6" />
      ) : null}

      {/* Borde por encima de todo: es lo que dibuja la silueta en cada estado. */}
      <path className="character-lives__outline" d={HEART_PATH} />
    </svg>
  )
}

/** Vista pura: pinta un valor y, si se le da, la transición que lo trajo. */
export function CharacterLivesView({
  lifePoints,
  showValue = true,
  size = 'md',
  className,
  accessible = true,
  transition = NO_LIFE_TRANSITION,
  generation = 0,
}: CharacterLivesViewProps) {
  const idPrefix = toSvgId(useId())
  const known = isValidLifePoints(lifePoints)
  const hearts = deriveCharacterHeartStates(lifePoints)

  return (
    <div
      className={['character-lives', `character-lives--${size}`, className]
        .filter(Boolean)
        .join(' ')}
      data-testid="character-lives"
      data-life-points={known ? String(lifePoints) : 'unknown'}
      data-size={size}
      data-transition={transition.kind}
      {...(accessible
        ? { role: 'img', 'aria-label': describeCharacterLives(lifePoints) }
        : { 'aria-hidden': true })}
    >
      <span className="character-lives__hearts" aria-hidden="true">
        {hearts.map((state, index) => (
          <CharacterHeart
            // Índice como clave a propósito: la posición del corazón es su
            // identidad, y la animación depende de que no se remonte.
            key={index}
            state={state}
            index={index}
            idPrefix={idPrefix}
            transition={transition.hearts[index] ?? null}
            kind={transition.kind}
            generation={generation}
          />
        ))}
      </span>

      {showValue ? (
        <span
          className="character-lives__value"
          data-testid="character-lives-value"
          aria-hidden="true"
        >
          {formatCharacterLivesValue(lifePoints)}
        </span>
      ) : null}
    </div>
  )
}

export function CharacterLives({ ownerKey, ...props }: CharacterLivesProps) {
  const snapshot = useCharacterLifeTransition(ownerKey, props.lifePoints)
  return (
    <CharacterLivesView
      {...props}
      transition={snapshot.transition}
      generation={snapshot.generation}
    />
  )
}
