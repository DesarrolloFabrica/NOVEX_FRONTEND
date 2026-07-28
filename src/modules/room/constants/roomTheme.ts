// Sistema visual de la Sala física Cunmark (capa de escenario).
// Responsabilidad: centralizar las clases de la ESTRUCTURA externa (fondo,
// profundidad, marco y superficie principal) para que el Centro de Monitoreo
// deje de leerse como una página web y se sienta como una Sala Operativa.
// Solo presentación: no contiene lógica de negocio ni nada del dominio.

import type { OperationalRoomState } from '@/modules/monitoring/constants/operationalRoomState'
import { OPERATIONAL_ROOM_VISUAL } from '@/modules/monitoring/constants/operationalRoomState'

// --- Sala (contenedor externo) ---------------------------------------------

/**
 * Suelo base: gris institucional profundo (no negro absoluto).
 * Viewport único: toda la interacción operativa permanece en el videowall.
 */
export const roomBackground =
  'min-h-screen w-full bg-[#0e1218] text-slate-200 lg:flex lg:h-dvh lg:max-h-dvh lg:flex-col lg:overflow-hidden'

/**
 * Profundidad ambiental: techo iluminado, relleno uniforme blanco-gris frío.
 * La profundidad viene del volumen iluminado, no del vacío negro.
 */
export const roomDepth =
  'bg-[radial-gradient(ellipse_130%_88%_at_50%_-14%,rgba(226,232,240,0.1)_0%,rgba(148,163,184,0.045)_28%,transparent_52%),radial-gradient(ellipse_68%_42%_at_50%_96%,rgba(15,23,42,0.06)_0%,transparent_62%),radial-gradient(ellipse_120%_100%_at_50%_50%,#1a2230_0%,#151b25_48%,#121820_100%)]'

/**
 * Unidad videowall — ancho y composición; la altura física la controla cunmark-room.css:
 *   --screen-max-height  → alto del monitor (portátil ≤900px alto: ~80vh)
 *   --screen-top-space   → reserva vertical en cálculos de altura
 *   --screen-stage-offset → desplazamiento visual del monitor (solo portátil)
 *   --screen-floor-reserve → margen inferior de la composición
 */
export const roomVideowallUnit =
  'mx-auto flex w-full max-w-none flex-col lg:w-full lg:max-w-[94rem]'

/**
 * @deprecated Sprint 10.3 — usar roomVideowallUnit.
 * Escenario amplio: conservado para referencia (132.5rem × 80% ≈ 106rem).
 */
export const roomMaxWidth = roomVideowallUnit

/** Márgenes exteriores — aire lateral; el top lo controla --screen-top-space. */
export const roomOuterPadding = 'px-2 py-0 sm:px-3 sm:py-0 lg:px-3 lg:pt-0 lg:pb-0'

/** Fila del videowall — zona superior-media de la escena. */
export const roomSceneRow =
  'relative z-10 flex min-h-0 flex-none flex-col items-stretch overflow-visible lg:items-center lg:justify-start lg:pt-0 lg:pb-0 lg:overflow-visible'

/**
 * Viewport del monitor — altura acotada para que la sala respire.
 */
export const roomSceneViewport =
  'room-scene-viewport relative flex min-h-0 w-full flex-col lg:h-full lg:max-h-full lg:flex-none lg:overflow-visible'

/** @deprecated Usar roomSceneRow — la cadena flex vive dentro del viewport escalado. */
export const roomStageFill = 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col'

// --- Marco (gran pantalla operativa) ---------------------------------------

/** Borde externo del marco: bisel metálico de chasis, no de lámina. */
export const frameBorder = 'ring-1 ring-inset ring-slate-500/48'

/** Brillo tenue y sombra del marco sobre sala iluminada (menos agresiva). */
export const frameGlow =
  'shadow-[0_0_0_1px_rgba(30,41,59,0.5),0_8px_24px_-42px_rgba(0,0,0,0.26),0_0_52px_-40px_rgba(148,163,184,0.05)]'

/** Cuerpo del marco: sólido, opaco; bisel más fino en desktop para más pantalla. */
export const frameSurface =
  'rounded-2xl bg-gradient-to-b from-[#141a24] via-[#10151c] to-[#0e1218] p-1.5 sm:p-2 lg:rounded-xl lg:p-1'

/** Marco envuelve el Cristal Maestro y llena la altura del monitor dominante. */
export const frameStageFill =
  'max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-visible'

/** Cavidad del marco: transmite altura al cristal. */
export const frameCavityFill = 'lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col'

// --- Pantalla principal (superficie interna) -------------------------------

/** Superficie interna donde vive el Centro de Monitoreo. */
export const mainScreenSurface =
  'overflow-x-hidden overflow-y-visible rounded-xl bg-slate-950 ring-1 ring-inset ring-slate-900'

/** Gran pantalla: ocupa el volumen interior del marco (altura dominante). */
export const mainScreenFill = 'lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col'

/** Cuerpo del cristal: altura disponible para el deck operativo. */
export const mainScreenBodyFill = 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden'

/** Línea de bisel superior, sutil, que remata la pantalla principal. */
export const mainScreenDivider =
  'h-px w-full bg-gradient-to-r from-transparent via-slate-500/38 to-transparent'

// --- Iluminación reactiva por estado operativo --------------------------------

/**
 * Estado ambiental de la Sala (claves del motor). Se declara local para que
 * `room` no importe tipos de dominio; solo CONSUME el valor aguas arriba.
 */
export type RoomEnvironment = 'pending' | 'healthy' | 'attention' | 'critical'

const ROOM_ENV_TO_OPERATIONAL: Record<RoomEnvironment, OperationalRoomState> = {
  pending: 'neutral',
  healthy: 'healthy',
  attention: 'attention',
  critical: 'critical',
}

/** Resuelve el tema visual operativo de la capa física de la Sala. */
export function getRoomOperationalVisual(environment: RoomEnvironment) {
  return OPERATIONAL_ROOM_VISUAL[ROOM_ENV_TO_OPERATIONAL[environment]]
}

/** @deprecated Usar getRoomOperationalVisual. */
export interface RoomAmbientTheme {
  roomTint: string
  frameRing: string
  frameGlow: string
  screenRail: string
}

/** @deprecated Usar getRoomOperationalVisual. */
export const ROOM_AMBIENT: Record<RoomEnvironment, RoomAmbientTheme> = {
  pending: {
    roomTint: OPERATIONAL_ROOM_VISUAL.neutral.backgroundOverlay,
    frameRing: OPERATIONAL_ROOM_VISUAL.neutral.frameRing,
    frameGlow: OPERATIONAL_ROOM_VISUAL.neutral.frameGlow,
    screenRail: OPERATIONAL_ROOM_VISUAL.neutral.mainRail,
  },
  healthy: {
    roomTint: OPERATIONAL_ROOM_VISUAL.healthy.backgroundOverlay,
    frameRing: OPERATIONAL_ROOM_VISUAL.healthy.frameRing,
    frameGlow: OPERATIONAL_ROOM_VISUAL.healthy.frameGlow,
    screenRail: OPERATIONAL_ROOM_VISUAL.healthy.mainRail,
  },
  attention: {
    roomTint: OPERATIONAL_ROOM_VISUAL.attention.backgroundOverlay,
    frameRing: OPERATIONAL_ROOM_VISUAL.attention.frameRing,
    frameGlow: OPERATIONAL_ROOM_VISUAL.attention.frameGlow,
    screenRail: OPERATIONAL_ROOM_VISUAL.attention.mainRail,
  },
  critical: {
    roomTint: OPERATIONAL_ROOM_VISUAL.critical.backgroundOverlay,
    frameRing: OPERATIONAL_ROOM_VISUAL.critical.frameRing,
    frameGlow: OPERATIONAL_ROOM_VISUAL.critical.frameGlow,
    screenRail: OPERATIONAL_ROOM_VISUAL.critical.mainRail,
  },
}
