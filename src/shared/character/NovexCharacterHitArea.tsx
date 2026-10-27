import type { CSSProperties } from 'react'
import {
  NOVEX_ARTBOARD_ASPECT,
  NOVEX_CHARACTER_SILHOUETTE,
} from '@/shared/character/novexCharacterRive'

/**
 * Botón accesible con la forma del personaje.
 *
 * Ocupa exactamente el artboard dentro del canvas (Fit.Contain + BottomCenter)
 * y se recorta a la silueta con `clip-path`, que también limita el hit-testing:
 * el click responde sobre ella, no sobre la caja transparente que la rodea.
 * Es un `<button>`: foco de teclado, Enter y Space vienen de serie, y el tap
 * táctil llega como `click`.
 */
const SILHOUETTE_CLIP_PATH = `polygon(${NOVEX_CHARACTER_SILHOUETTE.map(
  ([x, y]) => `${x}% ${y}%`,
).join(', ')})`

const hitStyle = {
  '--novex-artboard-aspect': NOVEX_ARTBOARD_ASPECT,
  clipPath: SILHOUETTE_CLIP_PATH,
} as CSSProperties

export interface NovexCharacterHitAreaProps {
  label: string
  onActivate: () => void
}

export function NovexCharacterHitArea({ label, onActivate }: NovexCharacterHitAreaProps) {
  return (
    <button
      type="button"
      className="novex-character__hit"
      style={hitStyle}
      aria-label={label}
      onClick={onActivate}
    />
  )
}
