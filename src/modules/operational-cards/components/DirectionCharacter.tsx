import { useEffect, useMemo, useState } from 'react'
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useViewModelInstanceEnum,
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
 * DOS LECTURAS, DOS FUENTES. El componente recibe dos cosas independientes y no
 * hay que confundirlas:
 *
 *   `presentation` → estado INSTITUCIONAL de la Dirección. Gobierna los
 *                    atributos del contenedor y el rótulo de texto.
 *   `mood`         → expresión de la coordinación OBSERVADA. Gobierna la cara
 *                    dentro de Rive.
 *
 * Son deliberadamente distintas: el carril sigue hablando de la Dirección
 * entera mientras la cara acompaña a lo que el usuario está mirando. Por eso
 * `data-status` NO alimenta el mood, y el mood no toca `data-status`.
 *
 * Lo que este componente todavía NO hace: reacciones momentáneas
 * (`approve`/`disapprove`), parpadeo dirigido desde React y seguimiento de
 * mirada (`lookX`/`lookY`). Llegan en sus fases.
 */

/**
 * Contrato del arte exportado. Los tres nombres se verificaron contra
 * `novex-character-v1.riv`: cambiarlos aquí sin reexportar deja el canvas en
 * blanco, porque Rive no encuentra el artboard o la máquina.
 */
const RIVE_SRC = '/rive/novex-character-v1.riv'
const RIVE_ARTBOARD = 'character_main'
const RIVE_STATE_MACHINE = 'CharacterSM'

/** Ruta de la propiedad dentro de `CharacterVM`. */
const MOOD_PATH = 'mood'

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
function CharacterFigure({ mood }: { mood: CharacterMood }) {
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

  /*
   * `className` aterriza en el DIV contenedor que crea el runtime, y el resto
   * de props en el `<canvas>` de dentro. Por eso la clase de geometría sigue
   * describiendo la misma caja que medían las pruebas, y el `aria-hidden` cae
   * donde debe: el canvas es decorativo, igual que lo era el SVG.
   */
  return <RiveComponent className="direction-character__figure" aria-hidden="true" />
}

export interface DirectionCharacterProps {
  /** Estado institucional: atributos del contenedor y lectura textual. */
  presentation: CharacterPresentation
  /**
   * Expresión de la coordinación observada. Se resuelve fuera, en
   * `data/characterMood`, y llega ya traducida al vocabulario del `.riv`.
   */
  mood?: CharacterMood
}

export function DirectionCharacter({
  presentation,
  mood = DEFAULT_CHARACTER_MOOD,
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
      role="img"
      aria-label={`Dirección de Operaciones. Estado: ${statusLabel}.`}
    >
      {clientReady ? (
        <CharacterFigure mood={mood} />
      ) : (
        /* Reserva de espacio: mantiene la caja mientras el runtime no está. */
        <div className="direction-character__figure" aria-hidden="true" />
      )}

      {/* Apoyo textual accesible: discreto, no una pastilla como las cartas. */}
      <p className="direction-character__readout">
        <span className="direction-character__eyebrow">
          Dirección de Operaciones
        </span>
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
