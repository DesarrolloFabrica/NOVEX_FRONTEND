import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import type { Ref } from 'react'
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useViewModelInstanceEnum,
} from '@rive-app/react-webgl2'
import { playCharacterReaction } from '@/shared/character/characterReactionGate'
import type { ReactionLock } from '@/shared/character/characterReactionGate'
import { NovexCharacterHitArea } from '@/shared/character/NovexCharacterHitArea'
import {
  RIVE_ARTBOARD,
  RIVE_MOOD_PATH,
  RIVE_SRC,
  RIVE_STATE_MACHINE,
} from '@/shared/character/novexCharacterRive'
import type { NovexCharacterReaction } from '@/shared/character/novexCharacterRive'
import { useNovexCharacterBlink } from '@/shared/character/useNovexCharacterBlink'
import { useNovexCharacterEyeTracking } from '@/shared/character/useNovexCharacterEyeTracking'
import '@/shared/character/novex-character.css'

/**
 * Presentación del personaje NOVEX: el canvas de Rive y sus capacidades de
 * comportamiento opcionales (mood, mirada, parpadeo, reacción al click).
 *
 * No conoce el dominio operacional (estado, rótulo, reacciones por operación):
 * quien lo monta decide qué capacidades activa. El `.riv` NO parpadea, mira ni
 * reacciona por sí solo; todo lo alimenta React a través del View Model.
 *
 * Solo cliente: `useRive` necesita `<canvas>` y WebGL2. Quien lo use debe
 * montarlo tras hidratar o con carga diferida.
 */
export interface NovexCharacterFigureProps {
  className?: string
  /**
   * Valor del enum `mood` del `.riv` ('neutral', 'happy_1'…). Sin valor, el
   * personaje queda con el mood por defecto del View Model.
   */
  mood?: string
  /** Los ojos siguen al puntero en toda la ventana. */
  eyeTracking?: boolean
  /** Parpadeo automático con intervalos aleatorios. */
  autoBlink?: boolean
  /**
   * Reacción momentánea al hacer click/tap/Enter/Space sobre el personaje. No
   * cambia `mood`. Sin valor, el personaje no es interactivo.
   */
  clickReaction?: NovexCharacterReaction
  /** Nombre accesible del personaje cuando es interactivo. */
  clickLabel?: string
  /** Control programático (p. ej. reaccionar al autenticarse). */
  ref?: Ref<NovexCharacterHandle>
}

/**
 * Acciones que el personaje acepta desde fuera, sin tocar Rive ni el DOM.
 * `playReaction` usa la misma puerta que el click: si ya hay una reacción en
 * curso no la reinicia, y el parpadeo se aplaza mientras dura. Devuelve si se
 * disparó (false si el runtime aún no cargó).
 */
export interface NovexCharacterHandle {
  playReaction: (reaction: NovexCharacterReaction) => boolean
}

const DEFAULT_CLICK_LABEL = 'Saludar al personaje de NOVEX'

export function NovexCharacterFigure({
  className,
  mood,
  eyeTracking = false,
  autoBlink = false,
  clickReaction,
  clickLabel = DEFAULT_CLICK_LABEL,
  ref,
}: NovexCharacterFigureProps) {
  const layout = useMemo(
    () => new Layout({ fit: Fit.Contain, alignment: Alignment.BottomCenter }),
    [],
  )

  const { rive, canvas, RiveComponent } = useRive({
    src: RIVE_SRC,
    artboard: RIVE_ARTBOARD,
    stateMachine: RIVE_STATE_MACHINE,
    autoplay: true,
    autoBind: true,
    layout,
  })

  const { value: riveMood, setValue: setRiveMood } = useViewModelInstanceEnum(
    RIVE_MOOD_PATH,
    rive?.viewModelInstance ?? null,
  )

  // Una escritura solo cuando cambia de verdad, para no reiniciar el bucle de la máquina.
  useEffect(() => {
    if (!rive || mood === undefined) return
    if (riveMood === mood) return
    setRiveMood(mood)
  }, [rive, riveMood, mood, setRiveMood])

  /** Fin de la reacción en curso; lo comparten el click y el parpadeo. */
  const reactionLock = useRef<number>(0) as ReactionLock

  const handleActivate = useCallback(() => {
    playCharacterReaction(rive?.viewModelInstance, clickReaction, reactionLock, performance.now())
  }, [rive, clickReaction, reactionLock])

  useImperativeHandle(
    ref,
    () => ({
      playReaction: (reaction) =>
        playCharacterReaction(rive?.viewModelInstance, reaction, reactionLock, performance.now()),
    }),
    [rive, reactionLock],
  )

  useNovexCharacterEyeTracking(rive, canvas, eyeTracking)
  useNovexCharacterBlink(rive, autoBlink, reactionLock)

  return (
    <div className={className ? `novex-character ${className}` : 'novex-character'}>
      <RiveComponent aria-hidden="true" />
      {clickReaction && rive && (
        <NovexCharacterHitArea label={clickLabel} onActivate={handleActivate} />
      )}
    </div>
  )
}
