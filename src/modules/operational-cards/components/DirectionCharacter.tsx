import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useViewModelInstanceEnum,
  useViewModelInstanceTrigger,
} from '@rive-app/react-webgl2'
import type { CharacterMood } from '@/modules/operational-cards/data/characterMood'
import { DEFAULT_CHARACTER_MOOD } from '@/modules/operational-cards/data/characterMood'
import type { CharacterPresentation } from '@/modules/operational-cards/types/character.types'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'

/**
 * Personaje de la Dirección de Operaciones: un reactor guardián, no una
 * mascota ni un asistente conversacional.
 *
 * EL ARTE VIVE EN RIVE. El dibujo lo resuelve una State Machine dentro del
 * `.riv`; React no anima boca, ojos, pupilas ni cabeza. Lo que React conserva
 * es el CONTRATO EXTERIOR —`data-status`, `data-orientation`,
 * `data-interaction`, el nombre accesible y la lectura textual—, que es lo que
 * leen la escena y las pruebas.
 *
 * UNA LECTURA VISIBLE. Bajo el personaje solo aparece el estado: el de la
 * coordinación seleccionada cuando hay una, o el institucional en reposo.
 * `presentation.status` gobierna el rótulo y `data-status`; `mood` gobierna la
 * cara en Rive y, con selección, refleja la misma coordinación.
 *
 * Además acepta una REACCIÓN puntual (`reactionId`) que se dispara una sola vez.
 *
 * Lo que este componente todavía NO hace: parpadeo dirigido desde React
 * (`blink`) y seguimiento de mirada (`lookX`/`lookY`). Ambos existen en el
 * `.riv` y están verificados, pero nadie ha definido qué deben expresar.
 */

/**
 * Contrato del arte exportado. Los tres nombres se verificaron contra
 * `novex-character-v1.riv`: cambiarlos aquí sin reexportar deja el canvas en
 * blanco, porque Rive no encuentra el artboard o la máquina.
 */
const RIVE_SRC = '/rive/novex-character-v1.riv'
const RIVE_ARTBOARD = 'character_main'
const RIVE_STATE_MACHINE = 'CharacterSM'

/**
 * Rutas de propiedad dentro de `CharacterVM`, VERIFICADAS en runtime contra
 * `novex-character-v1.riv` con el mismo runtime que usa la app:
 *
 *   mood        enum   ['unknown','sad_2','sad_1','happy_2','happy_1','neutral']
 *   approve     trigger
 *   disapprove  trigger
 *   blink       trigger
 *   lookX/lookY number
 *
 * La máquina `CharacterSM` NO declara inputs: todo va por data binding. Por eso
 * aquí no hay `useStateMachineInput` y nunca debe haberlo.
 */
const MOOD_PATH = 'mood'

/**
 * REACCIONES MOMENTÁNEAS. Los dos triggers se verificaron OBSERVANDO el arte,
 * no deduciendo su significado del nombre:
 *
 *   approve     la boca se abre en una sonrisa amplia  -> ALIVIO
 *   disapprove  ojos apretados, cejas quebradas, boca
 *               curvada hacia abajo                    -> MALESTAR
 *
 * Ambos son independientes de `mood`: se comprobó en runtime que dispararlos no
 * altera su valor, porque viven en otra capa del artboard. El personaje vuelve
 * por sí solo a la expresión del estado vigente y React NO tiene que
 * restaurarla ni forzarla a neutral. Dos disparos seguidos tampoco dejan el
 * View Model en un estado inconsistente.
 */
const REACTION_PATHS = {
  approve: 'approve',
  disapprove: 'disapprove',
} as const

export type CharacterReactionTrigger = keyof typeof REACTION_PATHS

/**
 * El canvas y su runtime. Vive en su propio componente porque SOLO puede
 * montarse en cliente: `useRive` necesita un `<canvas>` y un contexto WebGL2,
 * y las pruebas de este módulo renderizan con `react-dom/server`.
 *
 * `Layout` se construye aquí dentro, no en el módulo, por la misma razón: los
 * valores `Fit`/`Alignment`/`Layout` llegan del paquete CJS del runtime y en la
 * ruta de servidor pueden no resolverse. Al no evaluarse nunca fuera del
 * cliente, el import deja de ser un riesgo para el render de servidor.
 */
function CharacterFigure({
  mood,
  reactionId,
  reactionTrigger,
  onReactionPlayed,
}: {
  mood: CharacterMood
  /**
   * Identificador de la reacción pendiente, o null. Cambiar de identificador es
   * lo que dispara: así un remontaje o un refresco con el MISMO identificador no
   * la repiten.
   */
  reactionId: number | null
  /** Qué reacción representar. La decide el estado, no este componente. */
  reactionTrigger: CharacterReactionTrigger
  onReactionPlayed: (id: number) => void
}) {
  const layout = useMemo(
    () => new Layout({ fit: Fit.Contain, alignment: Alignment.BottomCenter }),
    [],
  )

  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    artboard: RIVE_ARTBOARD,
    // Singular: `stateMachines` en plural está deprecado en el runtime 4.x.
    stateMachine: RIVE_STATE_MACHINE,
    autoplay: true,
    // Enlaza el View Model por defecto del artboard. La instancia que crea aquí
    // es la que se escribe abajo: no se crea una segunda.
    autoBind: true,
    layout,
  })

  /**
   * La instancia que `autoBind` ya dejó enlazada. Se lee de la propia instancia
   * de Rive en lugar de pedir otra con `useViewModelInstance`, que crearía o
   * re-enlazaría una distinta de la que la State Machine está observando.
   *
   * Mientras el `.riv` carga esto es `null`, y el hook lo tolera: devuelve
   * `value` nulo y no escribe nada.
   */
  const { value: riveMood, setValue: setRiveMood } = useViewModelInstanceEnum(
    MOOD_PATH,
    rive?.viewModelInstance ?? null,
  )

  /**
   * Una escritura SOLO cuando el valor cambia de verdad.
   *
   * La comparación se hace contra lo que el View Model dice tener, no contra un
   * ref propio: si el mood resuelto ya coincide con el del artboard —seleccionar
   * otra coordinación igual de estable, por ejemplo— no se escribe, y la State
   * Machine no recibe una transición que reiniciaría su bucle.
   */
  useEffect(() => {
    if (!rive) return
    if (riveMood === mood) return
    setRiveMood(mood)
  }, [rive, riveMood, mood, setRiveMood])

  /**
   * REACCIÓN PUNTUAL A UNA OPERACIÓN CONFIRMADA.
   *
   * El componente no decide QUÉ significa cada operación: recibe el trigger ya
   * elegido por el estado, que es donde vive el significado funcional
   * —malestar al aparecer un problema, alivio al resolverlo—. Aquí solo se
   * traduce a la propiedad del `.riv`.
   *
   * Se dispara SOLO cuando llega un identificador nuevo, y ese identificador
   * solo aparece después de que el servidor confirme la operación: nunca al
   * pulsar el botón ni al iniciar la petición. En cuanto se dispara se avisa al
   * estado, que lo consume, de modo que ni un refresco de datos, ni un rerender
   * ni un remontaje del canvas puedan repetir un evento ya representado.
   *
   * Los dos hooks se piden SIEMPRE, en el mismo orden: son hooks de React y no
   * pueden quedar condicionados a qué reacción toque.
   */
  const { trigger: fireApprove } = useViewModelInstanceTrigger(
    REACTION_PATHS.approve,
    rive?.viewModelInstance ?? null,
  )
  const { trigger: fireDisapprove } = useViewModelInstanceTrigger(
    REACTION_PATHS.disapprove,
    rive?.viewModelInstance ?? null,
  )

  const playedRef = useRef<number | null>(null)

  useEffect(() => {
    if (!rive || reactionId === null) return
    if (playedRef.current === reactionId) return

    playedRef.current = reactionId
    if (reactionTrigger === 'disapprove') fireDisapprove()
    else fireApprove()
    onReactionPlayed(reactionId)
  }, [
    rive,
    reactionId,
    reactionTrigger,
    fireApprove,
    fireDisapprove,
    onReactionPlayed,
  ])

  /*
   * `className` aterriza en el DIV contenedor que crea el runtime, y el resto
   * de props en el `<canvas>` de dentro. Por eso la clase de geometría sigue
   * describiendo la misma caja que medían las pruebas, y el `aria-hidden` cae
   * donde debe: el canvas es decorativo, igual que lo era el SVG.
   */
  return <RiveComponent className="direction-character__figure" aria-hidden="true" />
}

/** Sin consumidor de la reacción, disparar no rompe nada. */
const noop = () => {}

export interface DirectionCharacterProps {
  /** Estado visible: atributos del contenedor y lectura textual bajo la figura. */
  presentation: CharacterPresentation
  /**
   * Expresión de la coordinación observada. Se resuelve fuera, en
   * `data/characterMood`, y llega ya traducida al vocabulario del `.riv`.
   */
  mood?: CharacterMood
  /**
   * Reacción momentánea pendiente. `null` significa que no hay ninguna; un
   * número nuevo dispara una vez y solo una.
   */
  reactionId?: number | null
  /** Qué reacción representar cuando llegue un identificador nuevo. */
  reactionTrigger?: CharacterReactionTrigger
  /** El personaje avisa de que ya la representó. */
  onReactionPlayed?: (id: number) => void
}

export function DirectionCharacter({
  presentation,
  mood = DEFAULT_CHARACTER_MOOD,
  reactionId = null,
  reactionTrigger = 'approve',
  onReactionPlayed,
}: DirectionCharacterProps) {
  const { status, orientation, interaction } = presentation
  const statusLabel = OPERATIONAL_STATUS_LABEL[status]

  /*
   * Guard de cliente. En servidor se dibuja la caja de la figura pero no el
   * runtime, así que el contenedor y su lectura textual siguen renderizando
   * sin `window`, sin `canvas` y sin WebGL.
   */
  const [clientReady, setClientReady] = useState(false)
  useEffect(() => {
    setClientReady(true)
  }, [])

  return (
    <div
      className="direction-character"
      data-testid="direction-character"
      data-status={status}
      data-orientation={orientation}
      data-interaction={interaction}
      /* Lectura semántica del mood: deja verificable desde el DOM lo que se
         escribió en el View Model, sin tener que inspeccionar el canvas. */
      data-mood={mood}
      /* Lectura verificable de la reacción en curso, sin inspeccionar el canvas. */
      data-reaction={reactionId === null ? undefined : String(reactionId)}
      data-reaction-trigger={reactionId === null ? undefined : reactionTrigger}
      role="img"
      aria-label={`Estado: ${statusLabel}.`}
    >
      {clientReady ? (
        <CharacterFigure
          mood={mood}
          reactionId={reactionId}
          reactionTrigger={reactionTrigger}
          onReactionPlayed={onReactionPlayed ?? noop}
        />
      ) : (
        /* Reserva de espacio: mantiene la caja mientras el runtime no está. */
        <div className="direction-character__figure" aria-hidden="true" />
      )}

      {/* Única lectura bajo el personaje: el estado (selección o Dirección). */}
      <p className="direction-character__readout">
        <span
          className="direction-character__status"
          data-testid="direction-character-status"
        >
          {statusLabel}
        </span>
      </p>
    </div>
  )
}
