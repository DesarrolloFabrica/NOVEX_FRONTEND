import { describe, expect, it } from 'vitest'
import { getIslandPreviewAssetPath } from '@/modules/impact-network/data/coordination-islands.config'

describe('useIslandDisplayAsset helpers', () => {
  it('prioriza el preview liviano frente al webp completo', () => {
    expect(getIslandPreviewAssetPath('/islas/CoordFabricaDeContenido.webp')).toBe(
      '/islas/CoordFabricaDeContenido.preview.webp',
    )
  })
})
