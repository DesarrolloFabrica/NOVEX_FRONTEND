// Sistema visual de la Sala física O.M.E.G.A. (capa de escenario).
// Responsabilidad: centralizar las clases de la ESTRUCTURA externa (fondo,
// profundidad, marco y superficie principal) para que el Centro de Monitoreo
// deje de leerse como una página web y se sienta como una Sala Operativa.
// Solo presentación: no contiene lógica de negocio ni nada del dominio.

import type { OperationalRoomState } from '@/modules/monitoring/constants/operationalRoomState'
import { OPERATIONAL_ROOM_VISUAL } from '@/modules/monitoring/constants/operationalRoomState'

// --- Sala (contenedor externo) ---------------------------------------------

/**
 * Suelo base: gris institucional profundo (no negro absoluto).
 * Sprint 9.2B: viewport único sin fila inferior — la proyección flota en primer plano.
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
 * Sprint 10.3 — unidad videowall (marco + cristal + dashboard) en desktop.
 * ~20% más estrecha que el escenario anterior, centrada — aire lateral vacío.
 */
export const roomVideowallUnit =
  'mx-auto w-full max-w-none lg:h-auto lg:w-[80%] lg:max-w-[106rem]'

/**
 * @deprecated Sprint 10.3 — usar roomVideowallUnit.
 * Escenario amplio: conservado para referencia (132.5rem × 80% ≈ 106rem).
 */
export const roomMaxWidth = roomVideowallUnit

/** Márgenes exteriores mínimos — más superficie útil sin tocar el interior. */
export const roomOuterPadding = 'px-1 py-1 sm:px-2 sm:py-2 lg:px-1 lg:pt-2 lg:pb-0'

/** Fila del videowall — centrada; el aire lateral queda en la sala (Sprint 10.3). */
export const roomSceneRow =
  'relative z-10 flex min-h-0 flex-1 flex-col items-stretch overflow-visible lg:items-center lg:justify-start lg:pt-0.5 lg:pb-0 lg:overflow-visible'

/**
 * Sprint 8.1 — Cámara alejada: escala ~11% sobre la unidad visual completa.
 * La clase `room-scene-viewport` aplica zoom/scale en index.css (sin recortar).
 */
export const roomSceneViewport =
  'room-scene-viewport relative flex min-h-0 w-full flex-1 flex-col lg:h-auto lg:max-h-[calc(100dvh-8rem)] lg:flex-none lg:overflow-visible'

/**
 * Capa flotante del Sistema de Proyección (Sprint 9.2B / 12.4).
 * Desktop: absoluta sobre la sala, elevada hacia primer plano sobre el cristal.
 * Móvil: flujo normal debajo del videowall.
 */
export const roomProjectionStage =
  'relative z-[60] flex w-full flex-col overflow-visible px-1 max-lg:mt-3 max-lg:pb-3 sm:px-2 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-[5.5rem] lg:mt-0 lg:flex lg:items-center lg:justify-end lg:px-1 lg:pb-0'

/** Alineación horizontal — solo posicionamiento visual, sin capturar eventos. */
export const roomProjectionStageAlign =
  'pointer-events-none mx-auto flex w-full max-w-none justify-center lg:max-w-[132.5rem]'

/** @deprecated Sprint 9.2B — la profundidad la aporta la superposición, no una fila de aire. */
export const roomProjectionDepthAir = 'hidden'

/** @deprecated Sprint 9.1 — usar roomProjectionStage. */
export const roomForeground = roomProjectionStage

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

/** Marco envuelve solo el Cristal Maestro — no estira al suelo de la sala (Sprint 10.4B). */
export const frameStageFill =
  'max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col lg:flex lg:h-auto lg:max-h-[calc(100dvh-8rem)] lg:min-h-0 lg:flex-col lg:overflow-visible'

/** Cavidad del marco: transmite altura al cristal. */
export const frameCavityFill = 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col'

// --- Pantalla principal (superficie interna) -------------------------------

/** Superficie interna donde vive el Centro de Monitoreo. */
export const mainScreenSurface =
  'overflow-x-hidden overflow-y-visible rounded-xl bg-slate-950 ring-1 ring-inset ring-slate-900'

/** Gran pantalla: ocupa el volumen interior del marco. */
export const mainScreenFill = 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col'

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
