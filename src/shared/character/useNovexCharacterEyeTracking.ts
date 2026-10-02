import { useEffect } from 'react'
import type { Rive } from '@rive-app/react-webgl2'
import {
  DEFAULT_GAZE_MAPPING,
  DEFAULT_REACH_VIEWPORT_RATIO,
  gazeTarget,
  smoothingFactor,
} from '@/shared/character/characterGaze'
import type { Point } from '@/shared/character/characterGaze'
import { RIVE_LOOK_X_PATH, RIVE_LOOK_Y_PATH } from '@/shared/character/novexCharacterRive'

/**
 * Constante de tiempo del lerp (ms). ~70 ms: llega al 90 % del objetivo en
 * ~160 ms, atento sin snap y sin quedarse flotando.
 */
const GAZE_TIME_CONSTANT_MS = 70
/** Sin movimiento durante este tiempo, la mirada vuelve al frente. */
const GAZE_IDLE_MS = 2500
/** Por debajo de esta distancia (unidades del `.riv`) la mirada se da por asentada y el RAF se detiene. */
const GAZE_SETTLE_EPSILON = 0.05
/** Con prefers-reduced-motion la mirada conserva la dirección pero recorre la mitad. */
const REDUCED_MOTION_RANGE_RATIO = 0.5

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Mirada que sigue al puntero en TODA la ventana, calculada respecto a los ojos
 * del personaje (caja del canvas), no respecto al viewport.
 *
 * Sin renders de React: `pointermove` solo guarda la posición en una variable
 * del efecto; un requestAnimationFrame calcula el objetivo, interpola y escribe
 * lookX/lookY directamente en el View Model. El RAF se detiene cuando la mirada
 * se asienta y se reactiva con el siguiente movimiento.
 *
 * El objetivo se recalcula en el RAF (no en el listener) para leer el rect del
 * canvas una vez por frame y seguir correcto si el layout cambia.
 */
export function useNovexCharacterEyeTracking(
  rive: Rive | null,
  canvas: HTMLCanvasElement | null,
  enabled: boolean,
) {
  useEffect(() => {
    if (!rive || !canvas) return

    const viewModel = rive.viewModelInstance
    const lookX = viewModel?.number(RIVE_LOOK_X_PATH) ?? null
    const lookY = viewModel?.number(RIVE_LOOK_Y_PATH) ?? null
    if (!lookX || !lookY) return

    if (!enabled) {
      // Capacidad apagada con el runtime vivo: devolver la mirada al frente.
      if (lookX.value !== 0) lookX.value = 0
      if (lookY.value !== 0) lookY.value = 0
      return
    }

    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)
    const current: Point = { x: lookX.value, y: lookY.value }
    const written: Point = { ...current }
    /** null = sin puntero activo → objetivo neutral (0, 0). */
    let pointer: Point | null = null
    let disposed = false
    let frame = 0
    let lastFrameTime = 0
    let idleTimer = 0

    const write = () => {
      if (Math.abs(current.x - written.x) > 0.01) {
        lookX.value = current.x
        written.x = current.x
      }
      if (Math.abs(current.y - written.y) > 0.01) {
        lookY.value = current.y
        written.y = current.y
      }
    }

    const tick = (now: number) => {
      frame = 0
      if (disposed) return

      const dt = lastFrameTime ? now - lastFrameTime : 16
      lastFrameTime = now

      let target: Point = { x: 0, y: 0 }
      if (pointer) {
        const rect = canvas.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          const limit = DEFAULT_GAZE_MAPPING.limit *
            (reducedMotion.matches ? REDUCED_MOTION_RANGE_RATIO : 1)
          target = gazeTarget(pointer, rect, {
            limit,
            eyeCenter: DEFAULT_GAZE_MAPPING.eyeCenter,
            reachPx: Math.max(window.innerWidth, window.innerHeight) * DEFAULT_REACH_VIEWPORT_RATIO,
          })
        }
      }

      const f = smoothingFactor(dt, GAZE_TIME_CONSTANT_MS)
      current.x += (target.x - current.x) * f
      current.y += (target.y - current.y) * f

      const settled =
        Math.abs(target.x - current.x) < GAZE_SETTLE_EPSILON &&
        Math.abs(target.y - current.y) < GAZE_SETTLE_EPSILON
      if (settled) {
        current.x = target.x
        current.y = target.y
      }

      write()

      if (settled) lastFrameTime = 0
      else frame = window.requestAnimationFrame(tick)
    }

    const wake = () => {
      if (!disposed && !frame) frame = window.requestAnimationFrame(tick)
    }

    const goNeutral = () => {
      pointer = null
      window.clearTimeout(idleTimer)
      wake()
    }

    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY }
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(goNeutral, GAZE_IDLE_MS)
      wake()
    }

    /** `relatedTarget` nulo = el puntero salió de la ventana. */
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) goNeutral()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') goNeutral()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerout', onPointerOut, { passive: true })
    window.addEventListener('blur', goNeutral)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      // Primero cortar cualquier escritura pendiente: el runtime puede estar destruyéndose.
      disposed = true
      window.cancelAnimationFrame(frame)
      window.clearTimeout(idleTimer)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('blur', goNeutral)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [rive, canvas, enabled])
}
