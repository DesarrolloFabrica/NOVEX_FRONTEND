// Capa decorativa de consolas 2D (placeholders CSS + imágenes opcionales Blender).
// pointer-events: none — no bloquea la UI.
//
// Assets Blender (WebP/PNG exportados):
//   Colocar en FRONTEND/public/scene/
//   - console-front.webp  → proyector/base frontal (debajo del holograma)
//   - console-left.webp   → consola lateral izquierda
//   - console-right.webp  → consola lateral derecha
// Si un archivo no existe, onError oculta solo esa imagen; el placeholder CSS sigue.

import { useCallback, useState } from 'react'

const SCENE_ASSETS = {
  front: '/scene/console-front.webp',
  left: '/scene/console-left.webp',
  right: '/scene/console-right.webp',
} as const

type ConsoleSlot = keyof typeof SCENE_ASSETS

const CONSOLE_IMAGE_SLOTS = [
  { slot: 'left' as const, imgClass: 'console-left-img' },
  { slot: 'right' as const, imgClass: 'console-right-img' },
  { slot: 'front' as const, imgClass: 'console-front-img' },
] as const

/**
 * Consolas laterales + frontal.
 * Placeholders CSS siempre visibles; las <img> solo aparecen si cargan (onError → hide).
 */
export function RoomConsoleLayer() {
  const [loaded, setLoaded] = useState<Record<ConsoleSlot, boolean>>({
    front: false,
    left: false,
    right: false,
  })
  const [failed, setFailed] = useState<Record<ConsoleSlot, boolean>>({
    front: false,
    left: false,
    right: false,
  })

  const handleLoad = useCallback((slot: ConsoleSlot) => {
    setLoaded((prev) => ({ ...prev, [slot]: true }))
  }, [])

  const handleError = useCallback((slot: ConsoleSlot) => {
    setFailed((prev) => ({ ...prev, [slot]: true }))
    setLoaded((prev) => ({ ...prev, [slot]: false }))
  }, [])

  const hasAnyImage = loaded.front || loaded.left || loaded.right

  return (
    <div
      className={`room-console-layer${hasAnyImage ? ' has-console-images' : ''}`}
      aria-hidden="true"
    >
      {/* Placeholders CSS — base sólida sin assets */}
      <div className="console console-left" />
      <div className="console console-right" />
      <div className="console console-front" />

      {/* Imágenes reales — opcionales; no rompen si faltan */}
      {CONSOLE_IMAGE_SLOTS.map(({ slot, imgClass }) =>
        failed[slot] ? null : (
          <img
            key={slot}
            src={SCENE_ASSETS[slot]}
            alt=""
            draggable={false}
            className={`console-img ${imgClass}${loaded[slot] ? '' : ' is-loading'}`}
            onLoad={() => handleLoad(slot)}
            onError={() => handleError(slot)}
          />
        ),
      )}
    </div>
  )
}
