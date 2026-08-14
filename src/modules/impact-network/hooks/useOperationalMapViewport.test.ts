import { describe, expect, it } from 'vitest'
import {
  clampOperationalMapPan,
  clampOperationalMapZoom,
  OPERATIONAL_MAP_MAX_ZOOM,
  OPERATIONAL_MAP_MIN_ZOOM,
} from './useOperationalMapViewport'

describe('operational map viewport bounds', () => {
  it('limita el zoom al rango ejecutivo', () => {
    expect(clampOperationalMapZoom(0.2)).toBe(OPERATIONAL_MAP_MIN_ZOOM)
    expect(clampOperationalMapZoom(1.8)).toBe(OPERATIONAL_MAP_MAX_ZOOM)
    expect(clampOperationalMapZoom(1.1)).toBe(1.1)
  })

  it('evita desplazar el territorio fuera del escenario', () => {
    const size = { width: 1000, height: 600 }
    const pan = clampOperationalMapPan({ x: 5000, y: -5000 }, 1.3, size)

    expect(pan.x).toBeLessThan(380)
    expect(pan.x).toBeGreaterThan(0)
    expect(pan.y).toBeGreaterThan(-220)
    expect(pan.y).toBeLessThan(0)
  })

  it('conserva recorrido útil cuando el mapa está alejado', () => {
    const size = { width: 1000, height: 600 }
    const pan = clampOperationalMapPan({ x: 5000, y: 5000 }, 0.55, size)

    expect(pan.x).toBeGreaterThan(250)
    expect(pan.y).toBeGreaterThan(120)
  })
})
