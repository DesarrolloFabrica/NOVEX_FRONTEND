import { useEffect, useState } from 'react'
import { getIslandPreviewAssetPath } from '@/modules/impact-network/data/coordination-islands.config'

interface UseIslandDisplayAssetOptions {
  /** Carga el webp completo solo cuando hace falta (zoom o idle). */
  preferFullImage?: boolean
}

interface IslandDisplayAsset {
  src: string
  onError: () => void
}

function scheduleIdle(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined

  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }

  if (typeof idleWindow.requestIdleCallback === 'function') {
    const id = idleWindow.requestIdleCallback(callback, { timeout: 1800 })
    return () => idleWindow.cancelIdleCallback?.(id)
  }

  const id = window.setTimeout(callback, 480)
  return () => window.clearTimeout(id)
}

export function useIslandDisplayAsset(
  fullAsset: string,
  { preferFullImage = false }: UseIslandDisplayAssetOptions = {},
): IslandDisplayAsset {
  const previewAsset = getIslandPreviewAssetPath(fullAsset)
  const [src, setSrc] = useState(previewAsset)

  useEffect(() => {
    setSrc(previewAsset)
  }, [previewAsset])

  useEffect(() => {
    if (!preferFullImage || src === fullAsset) return undefined

    return scheduleIdle(() => {
      const image = new Image()
      image.decoding = 'async'
      image.src = fullAsset
      const reveal = () => setSrc(fullAsset)
      if (image.complete) {
        if (image.naturalWidth > 0) reveal()
        return
      }
      image.addEventListener('load', reveal, { once: true })
    })
  }, [fullAsset, preferFullImage, src])

  return {
    src,
    onError: () => {
      if (src !== fullAsset) setSrc(fullAsset)
    },
  }
}
